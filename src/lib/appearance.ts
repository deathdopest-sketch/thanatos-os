import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { del, get as idbGet, set as idbSet } from 'idb-keyval';

// Your own look for the desktop: background media (pictures, GIFs, video),
// colours, and which effects run. Uploaded files live in IndexedDB (they're too
// big for localStorage); everything else is a small JSON blob in localStorage.

export type EffectKey = 'sprite' | 'bloodDrips' | 'bloodRain' | 'crt' | 'skulls' | 'quotes' | 'audioCurse' | 'brand' | 'vignette' | 'grain';
export type Effects = Record<EffectKey, boolean>;
export type ColorKey = 'primary' | 'accent' | 'text' | 'base';
export type MediaKind = 'image' | 'video';
export type MediaItem = { id: string; name: string; kind: MediaKind; size: number };

export type Background =
  | { kind: 'theme' }
  | { kind: 'media'; mediaId: string }
  | { kind: 'url'; url: string; media: MediaKind };

export type Appearance = {
  colors: Record<ColorKey, string | null>; // hex, or null for the theme's own colour
  background: Background;
  fit: 'cover' | 'contain' | 'tile';
  dim: number;   // 0..0.85, darkens the background so windows stay readable
  blur: number;  // px
  effects: Effects;
  intensity: number; // 0..1, strength of the overlay effects
};

export type CustomTheme = { id: string; name: string; base: string; appearance: Appearance };

export const EFFECTS: { key: EffectKey; label: string; hint: string }[] = [
  { key: 'sprite', label: 'Theme art', hint: "The theme's own artwork behind everything" },
  { key: 'bloodDrips', label: 'Blood drips', hint: 'Drips running down from the top' },
  { key: 'bloodRain', label: 'Blood rain', hint: 'Falling streaks' },
  { key: 'crt', label: 'CRT scanlines', hint: 'Old-monitor lines over the screen' },
  { key: 'skulls', label: 'Skull flashes', hint: 'Skulls that flicker in now and then' },
  { key: 'quotes', label: 'Quote flashes', hint: 'Lines that fade in over the desktop' },
  { key: 'audioCurse', label: 'Audio pulse', hint: 'Glow that pulses with music' },
  { key: 'brand', label: 'THANATOS mark', hint: 'The big watermark' },
  { key: 'vignette', label: 'Vignette', hint: 'Darkened edges' },
  { key: 'grain', label: 'Film grain', hint: 'Subtle moving noise' }
];

export const DEFAULT_APPEARANCE: Appearance = {
  colors: { primary: null, accent: null, text: null, base: null },
  background: { kind: 'theme' },
  fit: 'cover',
  dim: 0.25,
  blur: 0,
  effects: { sprite: true, bloodDrips: true, bloodRain: true, crt: true, skulls: true, quotes: true, audioCurse: true, brand: true, vignette: false, grain: false },
  intensity: 1
};

export const MAX_MEDIA_BYTES = 150 * 1024 * 1024;
const KEY = 'thanatos.appearance';
const mediaKey = (id: string) => `thanatos.media.${id}`;

type Saved = { appearance: Appearance; themes: CustomTheme[]; media: MediaItem[] };

function load(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
    const a = raw.appearance ?? DEFAULT_APPEARANCE;
    return {
      appearance: { ...DEFAULT_APPEARANCE, ...a, colors: { ...DEFAULT_APPEARANCE.colors, ...a.colors }, effects: { ...DEFAULT_APPEARANCE.effects, ...a.effects } },
      themes: Array.isArray(raw.themes) ? raw.themes : [],
      media: Array.isArray(raw.media) ? raw.media : []
    };
  } catch {
    return { appearance: DEFAULT_APPEARANCE, themes: [], media: [] };
  }
}

export function mediaKindOf(mime: string, name = ''): MediaKind | null {
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video';
  if (mime.startsWith('image/') || /\.(gif|png|jpe?g|webp|avif|svg)$/i.test(name)) return 'image';
  return null;
}

type AppearanceState = Saved & {
  update: (p: Partial<Appearance>) => void;
  setColor: (k: ColorKey, hex: string | null) => void;
  setEffect: (k: EffectKey, on: boolean) => void;
  addMedia: (file: File) => Promise<MediaItem>;
  removeMedia: (id: string) => Promise<void>;
  saveTheme: (name: string, base: string) => void;
  deleteTheme: (id: string) => void;
  reset: () => void;
};

export const useAppearance = create<AppearanceState>((set, get) => {
  const persist = () => {
    const { appearance, themes, media } = get();
    try { localStorage.setItem(KEY, JSON.stringify({ appearance, themes, media })); } catch { /* storage off */ }
  };
  const setAppearance = (appearance: Appearance) => { set({ appearance }); persist(); };

  return {
    ...load(),
    update: (p) => setAppearance({ ...get().appearance, ...p }),
    setColor: (k, hex) => setAppearance({ ...get().appearance, colors: { ...get().appearance.colors, [k]: hex } }),
    setEffect: (k, on) => setAppearance({ ...get().appearance, effects: { ...get().appearance.effects, [k]: on } }),

    addMedia: async (file) => {
      const kind = mediaKindOf(file.type, file.name);
      if (!kind) throw new Error('That file isn’t a picture, GIF or video.');
      if (file.size > MAX_MEDIA_BYTES) throw new Error('That file is over 150 MB. Try a shorter or smaller video.');
      const item: MediaItem = { id: crypto.randomUUID(), name: file.name.slice(0, 120), kind, size: file.size };
      await idbSet(mediaKey(item.id), file);
      set({ media: [...get().media, item] });
      persist();
      return item;
    },

    removeMedia: async (id) => {
      await del(mediaKey(id));
      const { appearance, themes } = get();
      const usesIt = (a: Appearance) => a.background.kind === 'media' && a.background.mediaId === id;
      set({
        media: get().media.filter((m) => m.id !== id),
        appearance: usesIt(appearance) ? { ...appearance, background: { kind: 'theme' } } : appearance,
        themes: themes.map((t) => (usesIt(t.appearance) ? { ...t, appearance: { ...t.appearance, background: { kind: 'theme' } } } : t))
      });
      persist();
    },

    saveTheme: (name, base) => {
      const trimmed = name.trim().slice(0, 40) || 'My theme';
      const existing = get().themes.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
      const theme: CustomTheme = { id: existing?.id ?? crypto.randomUUID(), name: trimmed, base, appearance: structuredClone(get().appearance) };
      set({ themes: existing ? get().themes.map((t) => (t.id === existing.id ? theme : t)) : [...get().themes, theme] });
      persist();
    },

    deleteTheme: (id) => { set({ themes: get().themes.filter((t) => t.id !== id) }); persist(); },
    reset: () => setAppearance(DEFAULT_APPEARANCE)
  };
});

/** An object URL for an uploaded file, revoked when it's no longer shown. */
export function useMediaUrl(id: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) { setUrl(null); return; }
    let cancelled = false;
    let made: string | null = null;
    idbGet<Blob>(mediaKey(id)).then((blob) => {
      if (cancelled || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    }).catch(() => setUrl(null));
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made); };
  }, [id]);
  return url;
}

const hexToRgb = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

/** CSS variables for the desktop root: your colour overrides on top of the theme. */
export function appearanceVars(a: Appearance): Record<string, string> {
  const vars: Record<string, string> = { '--fx-intensity': String(a.intensity) };
  const map: Record<ColorKey, string> = { primary: '--curse-primary', accent: '--curse-accent', text: '--ui-text', base: '--curse-shadow' };
  for (const k of Object.keys(map) as ColorKey[]) {
    const rgb = a.colors[k] ? hexToRgb(a.colors[k]!) : null;
    if (rgb) vars[map[k]] = rgb;
  }
  return vars;
}
