import { create } from 'zustand';
import {
  STUMBLE_BRIDGE_URL, appendLines, isMention, parseBridgeMessage,
  type FriendToast, type StumbleLine, type StumbleLiveRoom
} from './stumble-live';

// One connection to the StumbleChat bridge for the whole desktop session, shared by
// the desktop widget, the Stumble Live window and the mention toasts. It lives here,
// not in a component, so closing or minimizing a window never drops it.

export type StumbleToast = { id: number; line: StumbleLine };
export { type FriendToast };
type Link = 'connecting' | 'online' | 'offline';
type WidgetPrefs = { visible: boolean; collapsed: boolean; sound: boolean; x: number; y: number };

const PREFS_KEY = 'thanatos.stumblelive.widget';
const FRIENDS_KEY = 'thanatos.stumble.friends';
const DEFAULT_PREFS: WidgetPrefs = { visible: true, collapsed: false, sound: true, x: -1, y: 64 };
const TOAST_MS = 7000;

function loadFriends(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(FRIENDS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((s: unknown): s is string => typeof s === 'string') : [];
  } catch { return []; }
}
function saveFriends(friends: string[]) {
  try { localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends)); } catch { /* storage off */ }
}

function loadPrefs(): WidgetPrefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }; } catch { return DEFAULT_PREFS; }
}

// Your StumbleChat username from the StumbleChat app's settings: a fallback for
// spotting mentions before the bridge has learned your nick in a room.
function savedUsername() {
  try { return String(JSON.parse(localStorage.getItem('thanatos.stumblechat') ?? '{}').username ?? ''); } catch { return ''; }
}

type StumbleLiveState = {
  link: Link;
  chrome: boolean;
  rooms: StumbleLiveRoom[];
  lines: StumbleLine[];
  frames: Record<string, string>;
  error: string | null;
  sayFailed: { room: string; message: string } | null;
  toasts: StumbleToast[];
  unread: number;
  prefs: WidgetPrefs;
  focusRoom: string | null;
  liveRequest: number;
  friends: string[];
  /** lc-nick → { room, since } for friends currently seen in a room */
  onlineFriends: Record<string, { room: string; since: number }>;
  friendToasts: FriendToast[];
  connect: () => void;
  send: (msg: object) => void;
  /** Ask the bridge to open its Chrome window (or bring it forward). Waits for the connection if needed. */
  openChrome: () => void;
  dismissToast: (id: number) => void;
  clearUnread: () => void;
  clearSayFailed: () => void;
  setPrefs: (p: Partial<WidgetPrefs>) => void;
  setFocusRoom: (room: string | null) => void;
  /** Open the Stumble Live window, optionally on a room. */
  showLive: (room?: string) => void;
  addFriend: (nick: string) => void;
  removeFriend: (nick: string) => void;
  dismissFriendToast: (id: number) => void;
};

let ws: WebSocket | null = null;
let started = false;
// an 'open' asked for while the bridge was unreachable; dropped if it's stale, so
// Chrome doesn't pop up long after you clicked
let pendingOpenAt = 0;
let toastId = 0;

// A short two-note chime, synthesized so there's no sound file to ship.
let audio: AudioContext | null = null;
let lastChime = 0;
function ensureAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch { /* no audio */ }
  return audio;
}
// Browsers only allow sound after you've interacted with the page; keep trying to
// wake the audio on input until it's running.
function unlockAudio() {
  if (ensureAudio()?.state !== 'running') return;
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
}
function chime() {
  const now = Date.now();
  if (!ensureAudio() || !audio || now - lastChime < 1500) return;
  lastChime = now;
  const t = audio.currentTime;
  for (const [i, freq] of [880, 1318.5].entries()) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.22, t + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.45);
    osc.connect(gain).connect(audio.destination);
    osc.start(t + i * 0.12);
    osc.stop(t + i * 0.12 + 0.5);
  }
}

export const useStumbleLive = create<StumbleLiveState>((set, get) => ({
  link: 'connecting',
  chrome: false,
  rooms: [],
  lines: [],
  frames: {},
  error: null,
  sayFailed: null,
  toasts: [],
  unread: 0,
  prefs: loadPrefs(),
  focusRoom: null,
  liveRequest: 0,
  friends: loadFriends(),
  onlineFriends: {},
  friendToasts: [],

  connect: () => {
    if (started) return;
    started = true;
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    let retry = 0;
    const open = () => {
      set({ link: 'connecting' });
      ws = new WebSocket(STUMBLE_BRIDGE_URL);
      ws.onopen = () => {
        retry = 0;
        set({ link: 'online', error: null });
        if (Date.now() - pendingOpenAt < 30_000) get().send({ type: 'start' });
        pendingOpenAt = 0;
      };
      ws.onmessage = (e) => {
        const m = parseBridgeMessage(String(e.data));
        if (!m) return;
        if (m.type === 'hello') set({ chrome: m.chrome, rooms: m.rooms, lines: appendLines([], m.history) });
        else if (m.type === 'rooms') {
          const removedRooms = new Set(get().rooms.filter((r) => !m.rooms.some((nr) => nr.room === r.room)).map((r) => r.room));
          if (removedRooms.size) {
            const newOnline = { ...get().onlineFriends };
            for (const [k, v] of Object.entries(newOnline)) if (removedRooms.has(v.room)) delete newOnline[k];
            set({ rooms: m.rooms, onlineFriends: newOnline });
          } else {
            set({ rooms: m.rooms });
          }
        }
        else if (m.type === 'frame') set((s) => ({ frames: { ...s.frames, [`${m.room}/${m.handle}`]: m.data } }));
        else if (m.type === 'status') set({ chrome: m.chrome });
        else if (m.type === 'error') set({ error: m.message });
        else if (m.type === 'say-failed') set({ sayFailed: { room: m.room, message: m.message } });
        else if (m.type === 'chat') {
          const { rooms, prefs, friends, onlineFriends } = get();
          const self = rooms.find((r) => r.room === m.line.room)?.self;
          const mention = isMention(m.line, [self, savedUsername()]);
          set((s) => ({ lines: appendLines(s.lines, [m.line]) }));
          if (mention) {
            const toast = { id: ++toastId, line: m.line };
            set((s) => ({ toasts: [...s.toasts.slice(-3), toast], unread: s.unread + 1 }));
            window.setTimeout(() => get().dismissToast(toast.id), TOAST_MS);
            if (prefs.sound) chime();
          }
          // friend join/leave detection
          if (m.line.kind === 'system' && m.line.nick) {
            const lc = m.line.nick.toLowerCase();
            if (friends.some((f) => f.toLowerCase() === lc)) {
              const isJoin = m.line.text === `${m.line.nick} joined`;
              const isLeave = m.line.text === `${m.line.nick} left`;
              if (isJoin || isLeave) {
                const newOnline = { ...onlineFriends };
                if (isJoin) newOnline[lc] = { room: m.line.room, since: m.line.ts };
                else delete newOnline[lc];
                const ft: FriendToast = { id: ++toastId, nick: m.line.nick, room: m.line.room, online: isJoin };
                set((s) => ({ onlineFriends: newOnline, friendToasts: [...s.friendToasts.slice(-3), ft] }));
                window.setTimeout(() => get().dismissFriendToast(ft.id), TOAST_MS);
              }
            }
          }
        }
      };
      ws.onclose = () => {
        set({ link: 'offline' });
        window.setTimeout(open, Math.min(30_000, 1000 * 2 ** retry++));
      };
    };
    open();
  },

  send: (msg) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); },
  openChrome: () => {
    get().connect();
    if (ws?.readyState === WebSocket.OPEN) get().send({ type: 'start' });
    else pendingOpenAt = Date.now();
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearUnread: () => set({ unread: 0 }),
  clearSayFailed: () => set({ sayFailed: null }),
  setPrefs: (p) => {
    const prefs = { ...get().prefs, ...p };
    set({ prefs });
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage off */ }
  },
  setFocusRoom: (focusRoom) => set({ focusRoom }),
  showLive: (room) => set((st) => ({ focusRoom: room ?? st.focusRoom, liveRequest: st.liveRequest + 1 })),
  addFriend: (nick) => {
    const friends = [...get().friends.filter((f) => f.toLowerCase() !== nick.toLowerCase()), nick];
    set({ friends });
    saveFriends(friends);
  },
  removeFriend: (nick) => {
    const lc = nick.toLowerCase();
    const friends = get().friends.filter((f) => f.toLowerCase() !== lc);
    const newOnline = { ...get().onlineFriends };
    delete newOnline[lc];
    set({ friends, onlineFriends: newOnline });
    saveFriends(friends);
  },
  dismissFriendToast: (id) => set((s) => ({ friendToasts: s.friendToasts.filter((t) => t.id !== id) })),
}));
