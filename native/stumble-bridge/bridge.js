#!/usr/bin/env node
'use strict';

/**
 * Thanatos StumbleChat bridge
 *
 * Opens a dedicated Chrome window where you sign in to StumbleChat yourself, keeps
 * one tab per room open, and streams each room's chat (read from the page's own
 * WebSocket over the DevTools protocol) and the cams you pick (~5 fps JPEG) to the
 * Thanatos desktop on ws://127.0.0.1:4180.
 *
 * Rooms stay connected because Chrome runs with background throttling off, so
 * StumbleChat's own page keeps answering its keep-alive pings even when the window
 * is hidden. If StumbleChat closes a room, the tab is reloaded after a pause.
 *
 * The process itself is light and can run all the time (thanatos-stumble.service).
 * Chrome only opens when the desktop asks for it ({type:'start'}, sent when you open
 * the StumbleChat or Stumble Live app) or with --open. Closing Chrome leaves the
 * bridge idle, ready to open it again, and your rooms are remembered.
 *
 * Env: STUMBLE_BRIDGE_PORT (4180), THANATOS_ORIGINS (who may connect),
 *      STUMBLE_PROFILE (Chrome profile dir), STUMBLE_CAM_FPS (5), BROWSER_PATH,
 *      STUMBLE_URL (https://stumblechat.com; tests point it at a local fake).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { RoomState } = require('./room-state');
const { ensureSecret, verifyDesktop } = require('../lib/desktop-check');

puppeteer.use(StealthPlugin());

const DATA_DIR = path.join(os.homedir(), '.local', 'share', 'thanatos');

// Chrome for Testing has no ARM Linux build; ARM Chromebooks use Debian's Chromium.
function defaultBrowser() {
  if (process.env.BROWSER_PATH) return process.env.BROWSER_PATH;
  if (process.arch !== 'x64') return ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  return undefined;
}
const CONFIG = {
  stumbleUrl: (process.env.STUMBLE_URL || 'https://stumblechat.com').replace(/\/+$/, ''),
  port: Number(process.env.STUMBLE_BRIDGE_PORT || 4180),
  origins: (process.env.THANATOS_ORIGINS || 'http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map((s) => s.trim()).filter(Boolean),
  profile: process.env.STUMBLE_PROFILE || path.join(DATA_DIR, 'stumble-chrome'),
  roomsFile: process.env.STUMBLE_ROOMS_FILE || path.join(DATA_DIR, 'stumble-rooms.json'),
  camFps: Math.min(15, Math.max(1, Number(process.env.STUMBLE_CAM_FPS || 5))),
  reopenDelayMs: Number(process.env.STUMBLE_REOPEN_MS || 30000),
  browserPath: defaultBrowser(),
};

const ROOM_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const log = (...a) => console.log(new Date().toISOString(), '[stumble-bridge]', ...a);

// Runs inside each room tab: report the cam tiles on the page and capture the
// watched ones at low frame rate. setInterval, not requestAnimationFrame, so it
// keeps going in background tabs.
function camScript(fps) {
  if (window.top !== window) return;
  window.__thanatosWatch = [];
  let lastCams = '';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const tiles = () => Array.from(document.querySelectorAll('video[video-id]')).map((video) => {
    const wrapper = video.closest('[class*="video"],[class*="user"],[class*="cam"]') || video.parentElement;
    const nick = wrapper?.querySelector('span.nickname,.nickname')?.textContent?.trim() || video.getAttribute('title') || '';
    return { handle: video.getAttribute('video-id'), nick: nick.slice(0, 64), video };
  });

  setInterval(() => {
    const cams = tiles().map(({ handle, nick }) => ({ handle, nick }));
    const json = JSON.stringify(cams);
    if (json !== lastCams && window.__thanatosCams) { lastCams = json; window.__thanatosCams(json); }
  }, 2000);

  setInterval(() => {
    const watch = window.__thanatosWatch;
    if (!watch.length || !window.__thanatosFrame) return;
    for (const { handle, video } of tiles()) {
      if (!watch.includes(handle) || video.readyState < 2 || !video.videoWidth) continue;
      const w = 320;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 240;
      canvas.width = w;
      canvas.height = h;
      try {
        ctx.drawImage(video, 0, 0, w, h);
        window.__thanatosFrame(handle, canvas.toDataURL('image/jpeg', 0.6));
      } catch { /* cross-origin video: can't capture */ }
    }
  }, Math.round(1000 / fps));
}

class Bridge {
  constructor(config) {
    this.config = config;
    this.rooms = new Map(); // room → { page, cdp, state, socketIds:Set, cams, watch:Set, reopenTimer }
    this.clients = new Set();
    this.browser = null;
    this.home = null;      // the StumbleChat tab you sign in on
    this.starting = null;  // promise while Chrome is opening
  }

  // ── browser ──────────────────────────────────────────────────────────────

  get chromeOpen() { return !!this.browser?.connected; }

  /**
   * Open Chrome (and your saved rooms) if it isn't open; otherwise bring the
   * StumbleChat tab to the front so you can sign in or check on it.
   */
  start() {
    if (this.chromeOpen) return this.showHome();
    this.starting ??= (async () => {
      try {
        await this.launch();
        this.broadcast({ type: 'status', chrome: true });
        for (const room of this.savedRooms()) await this.openRoom(room).catch((e) => log(room, e.message));
        await this.showHome();
      } finally {
        this.starting = null;
      }
    })();
    return this.starting;
  }

  async showHome() {
    if (!this.chromeOpen) return;
    if (!this.home || this.home.isClosed()) {
      this.home = await this.browser.newPage();
      await this.home.goto(this.config.stumbleUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    }
    await this.home.bringToFront().catch(() => {});
  }

  /** Close Chrome but keep running, so the desktop can open it again. Rooms are remembered. */
  async stopChrome() {
    await this.browser?.close().catch(() => {});
  }

  async launch() {
    fs.mkdirSync(this.config.profile, { recursive: true });
    this.browser = await puppeteer.launch({
      headless: false,
      executablePath: this.config.browserPath ?? defaultBrowser(),
      userDataDir: this.config.profile,   // keeps your StumbleChat login between runs
      defaultViewport: null,
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--autoplay-policy=no-user-gesture-required',
        // keep hidden tabs/windows fully awake so the site's pings are answered
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-media-suspend',
        '--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion',
        '--window-size=1280,860',
        // Chrome refuses to run as root without this (containers, CI)
        ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
      ],
    });
    const browser = this.browser;
    browser.on('disconnected', () => {
      if (this.browser !== browser) return;
      // Chrome closed: forget the open tabs but keep the saved room list for next time.
      for (const entry of this.rooms.values()) clearTimeout(entry.reopenTimer);
      this.rooms.clear();
      this.browser = null;
      this.home = null;
      log('Chrome closed; waiting for the desktop to open it again');
      this.broadcast({ type: 'status', chrome: false });
      this.broadcastRooms();
      this.onChromeClosed?.();
    });
    // First tab: StumbleChat itself, for signing in.
    const [home] = await browser.pages();
    this.home = home || await browser.newPage();
    await this.home.goto(this.config.stumbleUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
  }

  async openRoom(room) {
    if (!ROOM_RE.test(room)) throw new Error(`bad room name: ${room}`);
    if (this.rooms.has(room)) return;
    if (!this.chromeOpen) { await this.start(); if (this.rooms.has(room)) return; }
    const entry = { page: null, cdp: null, state: new RoomState(room), socketIds: new Set(), cams: [], watch: new Set(), reopenTimer: null };
    this.rooms.set(room, entry);
    this.saveRooms();
    await this.attach(room, entry);
    this.broadcastRooms();
  }

  async attach(room, entry) {
    const page = await this.browser.newPage();
    entry.page = page;
    entry.socketIds.clear();
    entry.cams = [];

    await page.exposeFunction('__thanatosCams', (json) => {
      try { entry.cams = JSON.parse(json).filter((c) => c && c.handle); } catch { return; }
      for (const c of entry.cams) if (c.nick) entry.state.rememberNick(c.handle, c.nick);
      this.broadcastRooms();
    });
    await page.exposeFunction('__thanatosFrame', (handle, data) => {
      if (!entry.watch.has(handle) || typeof data !== 'string' || !data.startsWith('data:image/jpeg')) return;
      this.broadcast({ type: 'frame', room, handle, data });
    });
    await page.evaluateOnNewDocument(camScript, this.config.camFps);

    const cdp = await page.createCDPSession();
    entry.cdp = cdp;
    await cdp.send('Network.enable');
    const isRoomSocket = (url) => /stumblechat/i.test(url) || !/^https:\/\/stumblechat\.com$/i.test(this.config.stumbleUrl);
    cdp.on('Network.webSocketCreated', ({ requestId, url }) => {
      if (isRoomSocket(url)) entry.socketIds.add(requestId);
    });
    cdp.on('Network.webSocketFrameReceived', ({ requestId, response }) => {
      if (!entry.socketIds.has(requestId) || response.opcode !== 1) return;
      const lines = entry.state.ingest(response.payloadData);
      for (const line of lines) this.broadcast({ type: 'chat', line });
      if (entry.state.closed) this.scheduleReopen(room, entry, 'closed by StumbleChat');
    });
    cdp.on('Network.webSocketClosed', ({ requestId }) => {
      if (!entry.socketIds.has(requestId)) return;
      entry.socketIds.delete(requestId);
      this.broadcastRooms();
      if (entry.socketIds.size === 0) this.scheduleReopen(room, entry, 'connection dropped');
    });

    page.on('close', () => {
      // You closed the tab yourself: stop tracking that room. Wait a few seconds first,
      // because closing the whole Chrome window closes every tab too, and that
      // shouldn't wipe your saved rooms. Chrome can be slow to disconnect, so also
      // check whether any tabs are left: none means the whole window is closing.
      setTimeout(async () => {
        if (!this.chromeOpen) return;
        const open = await this.browser.pages().catch(() => []);
        if (!this.chromeOpen || open.length === 0) return;
        if (this.rooms.get(room) === entry && entry.page === page && !entry.reopening) {
          clearTimeout(entry.reopenTimer);
          this.rooms.delete(room);
          this.saveRooms();
          this.broadcastRooms();
        }
      }, 3000);
    });

    await page.goto(`${this.config.stumbleUrl}/room/${encodeURIComponent(room)}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      .catch((e) => log(room, 'load failed:', e.message));
    if (entry.watch.size) await this.pushWatch(entry);
  }

  scheduleReopen(room, entry, why) {
    if (entry.reopenTimer || this.rooms.get(room) !== entry) return;
    log(room, `${why}; reopening in ${Math.round(this.config.reopenDelayMs / 1000)}s`);
    entry.reopenTimer = setTimeout(async () => {
      entry.reopenTimer = null;
      if (this.rooms.get(room) !== entry) return;
      entry.reopening = true;
      try {
        await entry.page?.close().catch(() => {});
        entry.state.closed = false;
        await this.attach(room, entry);
      } finally {
        entry.reopening = false;
        this.broadcastRooms();
      }
    }, this.config.reopenDelayMs);
    this.broadcastRooms(); // after the timer is set, so the desktop sees "reopening"
  }

  async closeRoom(room) {
    const entry = this.rooms.get(room);
    if (!entry) return;
    this.rooms.delete(room);
    clearTimeout(entry.reopenTimer);
    this.saveRooms();
    await entry.page?.close().catch(() => {});
    this.broadcastRooms();
  }

  async setWatch(room, handles) {
    const entry = this.rooms.get(room);
    if (!entry || !Array.isArray(handles)) return;
    entry.watch = new Set(handles.map(String).slice(0, 12));
    await this.pushWatch(entry);
    this.broadcastRooms();
  }

  /** Type a message into the room's own chat box and send it, as you would. */
  async say(room, text) {
    const entry = this.rooms.get(room);
    const line = String(text).replace(/\s+/g, ' ').trim().slice(0, 1000);
    if (!entry?.page || !line) return;
    const box = await entry.page.$('textarea#textarea');
    if (!box) throw new Error(`${room}: the chat box isn't on the page yet`);
    await box.click();
    await box.type(line);
    await entry.page.keyboard.press('Enter');
  }

  async pushWatch(entry) {
    await entry.page?.evaluate((list) => { window.__thanatosWatch = list; }, [...entry.watch]).catch(() => {});
  }

  // ── persistence ──────────────────────────────────────────────────────────

  savedRooms() {
    try {
      const list = JSON.parse(fs.readFileSync(this.config.roomsFile, 'utf8'));
      return Array.isArray(list) ? list.filter((r) => ROOM_RE.test(r)) : [];
    } catch { return []; }
  }

  saveRooms() {
    try {
      fs.mkdirSync(path.dirname(this.config.roomsFile), { recursive: true });
      fs.writeFileSync(this.config.roomsFile, JSON.stringify([...this.rooms.keys()]));
    } catch (e) { log('could not save rooms:', e.message); }
  }

  // ── desktop connection ───────────────────────────────────────────────────

  summary() {
    return [...this.rooms.entries()].map(([room, e]) => ({
      room,
      self: e.state.selfHandle ? e.state.nickFor(e.state.selfHandle) : null, // your nick, for mentions
      connected: e.socketIds.size > 0 && !e.state.closed,
      reopening: !!e.reopenTimer,
      cams: e.cams,
      watching: [...e.watch],
    }));
  }

  broadcastRooms() { this.broadcast({ type: 'rooms', rooms: this.summary() }); }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.clients) if (ws.readyState === 1) ws.send(data);
  }

  async handle(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    try {
      if (msg.type === 'start') await this.start();
      else if (msg.type === 'stop') await this.stopChrome();
      else if (msg.type === 'join' && typeof msg.room === 'string') await this.openRoom(msg.room.trim());
      else if (msg.type === 'leave' && typeof msg.room === 'string') await this.closeRoom(msg.room);
      else if (msg.type === 'say' && typeof msg.room === 'string' && typeof msg.text === 'string') await this.say(msg.room, msg.text);
      else if (msg.type === 'watch' && typeof msg.room === 'string') await this.setWatch(msg.room, msg.handles);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  }

  listen() {
    const server = http.createServer((req, res) => {
      const reply = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
      if (req.url === '/health') return reply(200, { ok: true, chrome: this.chromeOpen, rooms: this.rooms.size });
      // For the `thanatos stumble` command. The custom header means a web page
      // can't trigger these: browsers won't send it cross-origin without a CORS
      // preflight, which this server never approves.
      if (req.method === 'POST' && req.headers['x-thanatos'] === '1' && (req.url === '/start' || req.url === '/stop')) {
        const act = req.url === '/start' ? this.start() : this.stopChrome();
        return act.then(() => reply(200, { ok: true, chrome: this.chromeOpen }), (e) => reply(500, { ok: false, error: e.message }));
      }
      return reply(404, {});
    });
    // Only the Thanatos desktop may read your rooms: the right Origin, served by
    // the real Thanatos web server (native/lib/desktop-check.js).
    const secret = this.config.secret ?? ensureSecret();
    const wss = new WebSocketServer({
      server,
      maxPayload: 64 * 1024,
      verifyClient: ({ origin }, done) => {
        if (!this.config.origins.includes(origin)) return done(false, 401);
        verifyDesktop(origin, secret).then((ok) => {
          if (!ok) log(`refused ${origin}: the server there isn't the Thanatos desktop`);
          done(ok, 401);
        });
      },
    });
    wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('message', (raw) => this.handle(ws, String(raw)));
      const history = [...this.rooms.values()].flatMap((e) => e.state.history);
      ws.send(JSON.stringify({ type: 'hello', chrome: this.chromeOpen, rooms: this.summary(), history }));
    });
    return new Promise((resolve) => server.listen(this.config.port, '127.0.0.1', () => {
      log(`listening on ws://127.0.0.1:${this.config.port} (origins: ${this.config.origins.join(', ')})`);
      resolve(server);
    }));
  }
}

let stopping = false;

async function main() {
  const bridge = new Bridge(CONFIG);
  const stop = async () => { stopping = true; await bridge.browser?.close().catch(() => {}); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  await bridge.listen();
  if (process.argv.includes('--open')) await bridge.start();
}

if (require.main === module) {
  main().catch((e) => {
    if (stopping) return; // stopped while Chrome was still starting
    console.error('[stumble-bridge]', e);
    process.exit(1);
  });
}

module.exports = { Bridge, CONFIG, camScript };
