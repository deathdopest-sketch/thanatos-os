// Draws a RotVice / ZomB pet sprite sheet into a canvas.
//
// Port of mumblechat's js/pet-sprite.js (same frame maths and background keying),
// plus a looping mode so a pet can keep walking. Sheet meta comes from the RotVice
// bridge: { path, cols, rows, rowCols?, row<N>Cols?, frameInset?, rowMap?, fps?, pixel? }.
// Rows on 5-row stage sheets: 0 idle · 1 move · 2 action · 3 react · 4 closeup.

export type PetAnim = 'idle' | 'move' | 'action' | 'react' | 'closeup';

export type PetSpriteMeta = {
  path?: string;
  cols?: number;
  rows?: number;
  rowCols?: number[];
  frameInset?: number;
  rowMap?: Partial<Record<PetAnim, number>>;
  fps?: Partial<Record<PetAnim, number>>;
  pixel?: boolean;
  passiveIdleOnly?: boolean;
  [rowCols: `row${number}Cols`]: number | undefined;
};

type Rect = { sx: number; sy: number; sw: number; sh: number };

const ROWS: Record<PetAnim, number> = { idle: 0, move: 1, action: 2, react: 3, closeup: 4 };
const FPS: Record<PetAnim, number> = { idle: 5, move: 6, action: 8, react: 3, closeup: 4 };
const MAX_FRAME = 256;

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const frameCache = new Map<string, HTMLCanvasElement>();

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function loadOnce(src: string, crossOrigin: boolean) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Sheets are served from another origin. With CORS we can read pixels and key out
// the background; if the server doesn't send CORS headers, fall back to a plain
// load and draw the frames as they are.
function loadImage(src: string) {
  let hit = imageCache.get(src);
  if (!hit) {
    hit = loadOnce(src, true).catch(() => loadOnce(src, false));
    imageCache.set(src, hit);
  }
  return hit;
}

function colsForRow(meta: PetSpriteMeta, row: number) {
  const fromArray = Array.isArray(meta.rowCols) ? Number(meta.rowCols[row]) : 0;
  const cols = Number(meta[`row${row + 1}Cols`] || fromArray || meta.cols || 1);
  return Math.max(1, Math.floor(cols));
}

const edge = (total: number, parts: number, index: number) => Math.round((total * index) / parts);

function sourceRect(meta: PetSpriteMeta, img: HTMLImageElement, row: number, cell: number): Rect {
  const rows = Math.max(1, Math.floor(Number(meta.rows || 1)));
  const r = Math.max(0, Math.min(rows - 1, row));
  const cols = colsForRow(meta, r);
  const c = Math.max(0, Math.min(cols - 1, cell));
  const w = img.naturalWidth, h = img.naturalHeight;
  const sx = edge(w, cols, c), sw = edge(w, cols, c + 1) - sx;
  const sy = edge(h, rows, r), sh = edge(h, rows, r + 1) - sy;
  const inset = Math.max(0, Number(meta.frameInset || 0));
  return { sx: sx + inset, sy: sy + inset, sw: Math.max(1, sw - inset * 2), sh: Math.max(1, sh - inset * 2) };
}

// Make a frame's solid background transparent: take the commonest edge colour and
// flood-fill it inward from the edge, so dark/white parts inside the outline stay.
function removeBackground(px: Uint8ClampedArray, w: number, h: number) {
  let clear = 0, edgeN = 0;
  for (let x = 0; x < w; x += 2) {
    edgeN += 2;
    if (px[x * 4 + 3] < 16) clear++;
    if (px[((h - 1) * w + x) * 4 + 3] < 16) clear++;
  }
  if (clear > edgeN * 0.6) return; // already transparent

  const counts = new Map<string, number>();
  let best = -1, bestN = 0;
  const tally = (i: number) => {
    const k = `${px[i] >> 4},${px[i + 1] >> 4},${px[i + 2] >> 4}`;
    const n = (counts.get(k) ?? 0) + 1;
    counts.set(k, n);
    if (n > bestN) { bestN = n; best = i; }
  };
  for (let x = 0; x < w; x++) { tally(x * 4); tally(((h - 1) * w + x) * 4); }
  for (let y = 0; y < h; y++) { tally(y * w * 4); tally((y * w + w - 1) * 4); }
  if (best < 0) return;

  let br = px[best], bg = px[best + 1], bb = px[best + 2];
  const TOL = 54;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const near = (p: number) => {
    const i = p * 4;
    return Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb) <= TOL;
  };
  const push = (p: number) => { if (!seen[p] && near(p)) { seen[p] = 1; stack.push(p); } };
  const fill = () => {
    while (stack.length) {
      const p = stack.pop() as number;
      px[p * 4 + 3] = 0;
      const x = p % w, y = (p - x) / w;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
  };
  const touchesRemoved = (q: number) => {
    const x = q % w;
    return (x > 0 && seen[q - 1]) || (x < w - 1 && seen[q + 1]) || (q >= w && seen[q - w]) || (q < w * (h - 1) && seen[q + w]);
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  fill();

  // Some sheets frame each cell (dark border, light inside): peel up to two more
  // neutral layers that clearly differ from the one just removed.
  for (let pass = 0; pass < 2; pass++) {
    const boundary: number[] = [];
    const tally2 = new Map<string, number>();
    let top = -1, topN = 0;
    for (let q = 0; q < w * h; q++) {
      if (seen[q] || !touchesRemoved(q)) continue;
      boundary.push(q);
      const k = `${px[q * 4] >> 4},${px[q * 4 + 1] >> 4},${px[q * 4 + 2] >> 4}`;
      const n = (tally2.get(k) ?? 0) + 1;
      tally2.set(k, n);
      if (n > topN) { topN = n; top = q; }
    }
    if (top < 0 || topN < boundary.length * 0.45 || topN < (w + h) / 2) break;
    const nr = px[top * 4], ng = px[top * 4 + 1], nb = px[top * 4 + 2];
    const neutral = Math.max(nr, ng, nb) - Math.min(nr, ng, nb) < 28;
    const differs = Math.abs(nr - br) + Math.abs(ng - bg) + Math.abs(nb - bb) > 90;
    if (!neutral || !differs) break;
    br = nr; bg = ng; bb = nb;
    for (const q of boundary) push(q);
    fill();
  }

  // soften the cut edge
  for (let q = 0; q < w * h; q++) {
    if (!seen[q] && touchesRemoved(q)) px[q * 4 + 3] = Math.min(px[q * 4 + 3], 200);
  }
}

function keyedFrame(img: HTMLImageElement, r: Rect, pixel: boolean) {
  const key = `${pixel ? 'px|' : ''}${img.src}|${r.sx},${r.sy},${r.sw},${r.sh}`;
  const hit = frameCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  if (pixel) {
    // pixel-art sheets are already transparent: cut the cell out untouched
    c.width = r.sw; c.height = r.sh;
    c.getContext('2d')?.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, r.sw, r.sh);
  } else {
    const inset = Math.round(Math.min(r.sw, r.sh) * 0.04); // crop cell frame lines
    const sw = r.sw - inset * 2, sh = r.sh - inset * 2;
    const scale = Math.min(1, MAX_FRAME / Math.max(sw, sh));
    c.width = Math.max(1, Math.round(sw * scale));
    c.height = Math.max(1, Math.round(sh * scale));
    const g = c.getContext('2d', { willReadFrequently: true });
    if (g) {
      g.imageSmoothingEnabled = true;
      g.drawImage(img, r.sx + inset, r.sy + inset, sw, sh, 0, 0, c.width, c.height);
      try {
        const data = g.getImageData(0, 0, c.width, c.height);
        removeBackground(data.data, c.width, c.height);
        g.putImageData(data, 0, 0);
      } catch {
        // loaded without CORS: pixels can't be read, draw as-is
      }
    }
  }
  if (frameCache.size > 600) frameCache.clear();
  frameCache.set(key, c);
  return c;
}

export class PetSprite {
  private img: HTMLImageElement | null = null;
  private anim: PetAnim = 'idle';
  private loopAnim: PetAnim = 'idle';
  private frame = 0;
  private timer: number | undefined;
  private running = false;
  private stopped = false;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly meta: PetSpriteMeta, src: string) {
    loadImage(src)
      .then((img) => { this.img = img; if (!this.stopped) this.start(); })
      .catch(() => this.drawFallback());
  }

  /** Animation to repeat when nothing else is playing (idle or move). */
  setLoop(anim: PetAnim) {
    if (this.loopAnim === anim) return;
    const wasLooping = this.anim === this.loopAnim;
    this.loopAnim = anim;
    if (wasLooping) { this.anim = anim; this.frame = 0; }
    if (!this.running) this.start();
  }

  /** Play an animation once, then go back to the loop. */
  play(anim: PetAnim) {
    if (!this.img || this.stopped || reduceMotion()) return;
    this.anim = anim;
    this.frame = 0;
    if (!this.running) this.start();
  }

  stop() {
    this.stopped = true;
    this.running = false;
    window.clearTimeout(this.timer);
  }

  private rowFor(anim: PetAnim) {
    const rows = Math.max(1, Number(this.meta.rows || 1));
    const row = (this.meta.rowMap ?? ROWS)[anim] ?? 0;
    return Math.min(row, rows - 1);
  }

  private draw() {
    if (!this.img) return;
    const row = this.meta.passiveIdleOnly ? 0 : this.rowFor(this.anim);
    const cols = colsForRow(this.meta, row);
    const pixel = !!this.meta.pixel;
    const f = keyedFrame(this.img, sourceRect(this.meta, this.img, row, this.frame % cols), pixel);
    const c = this.canvas, ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = !pixel;
    ctx.clearRect(0, 0, c.width, c.height);
    let scale = Math.min(c.width / f.width, c.height / f.height);
    if (pixel && scale >= 1) scale = Math.floor(scale);
    const dw = Math.max(1, Math.round(f.width * scale)), dh = Math.max(1, Math.round(f.height * scale));
    // feet on the floor: bottom-aligned, centred horizontally
    ctx.drawImage(f, 0, 0, f.width, f.height, Math.round((c.width - dw) / 2), c.height - dh, dw, dh);
  }

  private tick = () => {
    if (!this.running) return;
    this.draw();
    const cols = colsForRow(this.meta, this.rowFor(this.anim));
    this.frame++;
    if (this.anim !== this.loopAnim && this.frame >= cols) { this.anim = this.loopAnim; this.frame = 0; }
    if (reduceMotion() && this.anim === 'idle') { this.running = false; return; }
    const fps = this.meta.fps?.[this.anim] ?? FPS[this.anim] ?? 5;
    this.timer = window.setTimeout(this.tick, 1000 / fps);
  };

  private start() {
    if (this.running || !this.img || this.stopped) return;
    this.running = true;
    this.tick();
  }

  private drawFallback() {
    const c = this.canvas, ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(143,133,125,.55)';
    ctx.font = `${Math.round(c.height * 0.55)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠', c.width / 2, c.height / 2);
  }
}
