import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Canvas } from '@react-three/fiber';
import { Rnd } from 'react-rnd';
import gsap from 'gsap';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import QRCode from 'qrcode';
import {
  format as dateFmt,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AudioLines,
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudSun,
  Code2,
  Copy,
  Eraser,
  Eye,
  File,
  FilePlus2,
  Film,
  Fingerprint,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Hash,
  Image,
  LayoutGrid,
  Lock,
  Mail,
  Maximize2,
  Mic,
  Minus,
  Monitor,
  Music,
  Network,
  Paintbrush,
  Play,
  QrCode,
  RadioTower,
  RefreshCcw,
  Save,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Shuffle,
  Skull,
  Square,
  Wand2,
  Wifi,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { appCategories, appRegistry, type AppCategory, type ThanatosApp } from './apps';
import LillyClock from './components/LillyClock';
import { normalizePath } from './lib/vfs';
import { useVfsListing } from './lib/use-vfs-listing';

// ─── types ────────────────────────────────────────────────────────────────────

type OpenWindow = {
  id: string;
  app: ThanatosApp;
  z: number;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};
type VaultEntry = {
  id: string;
  service: string;
  email: string;
  username: string;
  password: string;
  createdAt: string;
};
type AccessUser = {
  usernameHash: string;
  displayName: string;
  status: 'pending' | 'active';
  recoveryHash?: string;
  recoverySalt?: string;
  pendingWrappedVaultKey?: EncryptedPayload;
  salt?: string;
  verifier?: string;
  wrappedVaultKey?: EncryptedPayload;
};
type AccessStore = {
  version: 1;
  ownerSalt?: string;
  ownerVerifier?: string;
  users: AccessUser[];
};
type AccessInvite = {
  version: 1;
  kind: 'thanatos.pending-user';
  createdAt: string;
  user: AccessUser;
};
type EncryptedPayload = {
  iv: string;
  data: string;
};
type AccessSession = {
  username: string;
  vaultKey: CryptoKey;
  startedAt: number;
};
type MusicTrack = {
  id: string;
  name: string;
  type: string;
  blob: Blob;
};
type MusicTrackView = MusicTrack & {
  url: string;
};
type ThanatosTheme = 'lilly' | 'lilly-garden' | 'death' | 'zombitious';
type PingPoint = { t: string; ms: number };
type WeatherData = { temp: number; desc: string; wind: number };
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type BridgeMsg = { type: string; payload?: unknown };
type MumbleChatStats = {
  loggedIn: boolean | null; userId: number | null; username: string | null; displayName: string | null;
  avatarUrl: string | null; unreadPms: number | null; onlineFriends: string[]; offlineFriends: string[];
  totalFriends: number | null; lastUpdated: string | null; status: 'idle' | 'checking' | 'online' | 'unavailable' | 'blocked'; message: string;
};
type MumbleChatPayload = {
  type?: string; loggedIn?: unknown; userId?: unknown; username?: unknown; displayName?: unknown;
  avatarUrl?: unknown; unreadPms?: unknown; onlineFriends?: unknown; offlineFriends?: unknown; totalFriends?: unknown;
};
type AudioPulse = {
  level: number;
  bass: number;
  mid: number;
  bands: number[];
  source: 'music' | 'capture' | 'idle';
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ─── constants ────────────────────────────────────────────────────────────────

const PUBLIC_CMDS = ['help', 'status', 'apps', 'date', 'skull', 'clear', 'ls', 'whoami', 'uname'];

const QUOTES = [
  'EVERY PROCESS ENDS.', 'THE KERNEL REMEMBERS THE DEAD.', 'ALL WINDOWS CLOSE EVENTUALLY.',
  'ROOT WAITS BELOW.', 'THE MACHINE BLEEDS IN SILENCE.', 'NO DAEMON ESCAPES THE REAPER.',
  'YOUR SESSION HAS A GRAVE.', 'ASH IS JUST MEMORY WITH THE LIGHT REMOVED.',
  'DEATH IS THE ONLY ROOT ACCESS.', 'NULL POINTER TO THE VOID.',
  'SEGMENTATION FAULT IN YOUR SOUL.', 'EVEN THE CPU GROWS COLD.'
];

const WX_CODES: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Moderate showers', 82: 'Violent showers', 95: 'Thunderstorm'
};

const MAN_DB: Record<string, string> = {
  ls: 'ls [OPTION]... [FILE]...\n\nList directory contents.\n\n  -a   show hidden files\n  -l   long format\n  -h   human-readable sizes\n  -R   recursive\n  -t   sort by time\n  -S   sort by size',
  cd: 'cd [DIR]\n\nChange directory.\n\n  cd ~    home directory\n  cd -    previous directory\n  cd ..   parent directory',
  grep: 'grep [OPTION]... PATTERN [FILE]...\n\nSearch text patterns.\n\n  -i   ignore case\n  -r   recursive\n  -n   line numbers\n  -v   invert match\n  -E   extended regex',
  find: 'find [PATH] [EXPRESSION]\n\nSearch for files.\n\n  -name "*.txt"   by name\n  -type f         files only\n  -type d         dirs only\n  -mtime -7       modified last 7 days\n  -size +10M      larger than 10MB',
  cat: 'cat [OPTION]... [FILE]...\n\nConcatenate and print files.\n\n  -n   number lines\n  -A   show special chars\n  -s   squeeze blank lines',
  chmod: 'chmod MODE FILE\n\nChange file permissions.\n\n  chmod 755 file   rwxr-xr-x\n  chmod 644 file   rw-r--r--\n  chmod +x file    add execute',
  ssh: 'ssh [USER@]HOST\n\nSecure shell remote login.\n\n  -p PORT   custom port\n  -i KEY    identity file\n  -L PORT:HOST:PORT  local port forward',
  tar: 'tar [OPTION]... [FILE]...\n\nArchive utility.\n\n  -czf archive.tar.gz dir/   create gzip\n  -xzf archive.tar.gz        extract\n  -tf  archive.tar.gz        list contents',
  ps: 'ps [OPTION]...\n\nReport process status.\n\n  ps aux    all processes\n  ps -ef    POSIX style\n  ps -p PID specific process',
  kill: 'kill [OPTION]... PID\n\nSend signal to process.\n\n  kill PID     SIGTERM (graceful)\n  kill -9 PID  SIGKILL (force)\n  kill -l      list signals',
  curl: 'curl [OPTION]... URL\n\nTransfer data with URLs.\n\n  -X POST           HTTP method\n  -H "Header: val"  add header\n  -d "data"         request body\n  -o file           output to file\n  -L                follow redirects',
  git: 'git <command>\n\nVersion control.\n\n  git init        initialize\n  git clone URL   clone\n  git add .       stage all\n  git commit -m   commit\n  git push        push\n  git pull        fetch+merge\n  git log --oneline  short log',
  docker: 'docker <command>\n\nContainer runtime.\n\n  docker ps        list running\n  docker run IMG   run container\n  docker build -t  build image\n  docker stop ID   stop\n  docker images    list images',
  vim: 'vim [FILE]\n\nModal text editor.\n\n  i      insert mode\n  Esc    normal mode\n  :w     save\n  :q     quit\n  :wq    save and quit\n  /pat   search',
  nano: 'nano [FILE]\n\nSimple editor.\n\n  Ctrl+O  save\n  Ctrl+X  exit\n  Ctrl+W  search\n  Ctrl+K  cut line',
  systemctl: 'systemctl [CMD] [SVC]\n\nManage systemd services.\n\n  systemctl start svc\n  systemctl stop svc\n  systemctl restart svc\n  systemctl status svc\n  systemctl enable svc',
  apt: 'apt [CMD] [PKG]\n\nDebian package manager.\n\n  apt update        refresh lists\n  apt upgrade       upgrade all\n  apt install PKG   install\n  apt remove PKG    remove\n  apt search TERM   search',
  pacman: 'pacman [OPTION] [PKG]\n\nArch package manager.\n\n  -Syu      full upgrade\n  -S PKG    install\n  -R PKG    remove\n  -Ss TERM  search',
  rsync: 'rsync [OPTION]... SRC DEST\n\nFile synchronization.\n\n  -a   archive (recursive+preserve)\n  -v   verbose\n  -z   compress\n  -P   show progress\n  --delete  delete extras',
  crontab: 'crontab [OPTION]\n\nSchedule commands.\n\n  crontab -e    edit\n  crontab -l    list\n  crontab -r    remove\n\nFMT: MIN HOUR DOM MON DOW CMD\n  0 * * * *   every hour',
  awk: "awk [PROGRAM] [FILE]\n\nText processing.\n\n  awk '{print $1}'        first column\n  awk -F: '{print $1}'    colon-separated\n  awk 'NR==5'             print line 5",
  sed: "sed [SCRIPT] [FILE]\n\nStream editor.\n\n  sed 's/old/new/'    replace first\n  sed 's/old/new/g'   replace all\n  sed -i 's/a/b/g' f  edit in place",
  wget: 'wget [OPTION]... URL\n\nFile downloader.\n\n  -O file    output filename\n  -q         quiet\n  -r         recursive\n  -np        no parent dirs'
};

const LOREM = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident'];
const ACCESS_KEY = 'thanatos.access.v1';
const LEGACY_VAULT_KEY = 'thanatos.accountVault';
const SECURE_VAULT_KEY = 'thanatos.accountVault.secure.v1';
const WINDOW_STATE_KEY = 'thanatos.windowState.v1';
const MUSIC_DB = 'thanatos.musicLibrary.v1';
const MUSIC_STORE = 'tracks';
const MAIL_WEBMAIL_URL = 'https://mail.mumblechat.online/webmail/';
const MAIL_ADMIN_URL = 'https://mail.mumblechat.online/admin/';
const MAIL_DOMAIN = 'mumblechat.online';

const idlePulse: AudioPulse = { level: 0, bass: 0, mid: 0, bands: Array.from({ length: 24 }, () => 0), source: 'idle' };

function emitAudioPulse(pulse: AudioPulse) {
  document.documentElement.style.setProperty('--audio-level', pulse.level.toFixed(3));
  document.documentElement.style.setProperty('--audio-bass', pulse.bass.toFixed(3));
  document.documentElement.style.setProperty('--audio-mid', pulse.mid.toFixed(3));
  window.dispatchEvent(new CustomEvent<AudioPulse>('thanatos:audio-pulse', { detail: pulse }));
}

function getAudioPulse(freq: Uint8Array, source: AudioPulse['source']): AudioPulse {
  const read = (from: number, to: number) => {
    const slice = freq.slice(from, Math.min(to, freq.length));
    return slice.length ? slice.reduce((sum, value) => sum + value, 0) / (slice.length * 255) : 0;
  };
  const level = read(0, freq.length);
  const bass = read(0, 24);
  const mid = read(24, 96);
  const bands = Array.from({ length: 24 }, (_, i) => {
    const start = Math.floor((i / 24) * freq.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / 24) * freq.length));
    return read(start, end);
  });
  return { level, bass, mid, bands, source };
}

// ─── 3D / ambient ─────────────────────────────────────────────────────────────

function AshField() {
  const positions = useMemo(() => {
    const pts = new Float32Array(900 * 3);
    for (let i = 0; i < pts.length; i += 3) {
      pts[i] = (Math.random() - 0.5) * 28;
      pts[i + 1] = (Math.random() - 0.5) * 18;
      pts[i + 2] = (Math.random() - 0.5) * 18;
    }
    return pts;
  }, []);
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#ff174d" size={0.038} transparent opacity={0.52} blending={2} depthWrite={false} />
    </points>
  );
}

function BootLayer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; onDone(); } };
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });
    const fb = window.setTimeout(finish, 1900);
    tl.fromTo('.boot-sigil', { rotate: -18, scale: 0.7, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 0.5 })
      .fromTo('.boot-glyph', { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.035, duration: 0.45 }, '-=0.18')
      .to('.boot-panel', { opacity: 0, scale: 1.04, duration: 0.55, delay: 0.4 });
    return () => { window.clearTimeout(fb); tl.kill(); };
  }, [onDone]);
  return (
    <div className="boot-panel">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}><AshField /></Canvas>
      <div className="boot-sprite" aria-hidden="true" />
      <div className="boot-mark" aria-label="Thanatos OS booting">
        <Skull className="boot-sigil" size={86} />
        <div>{'THANATOS OS'.split('').map((c, i) => <span className="boot-glyph" key={`${c}-${i}`}>{c === ' ' ? ' ' : c}</span>)}</div>
        <small>DEATH KERNEL ONLINE</small>
      </div>
    </div>
  );
}

function QuoteFlash() {
  const [quote, setQuote] = useState('');
  useEffect(() => {
    let tid = 0;
    const flash = () => { setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]); window.clearTimeout(tid); tid = window.setTimeout(() => setQuote(''), 2400); };
    const first = window.setTimeout(flash, 1800);
    const intv = window.setInterval(flash, 7000);
    return () => { window.clearTimeout(first); window.clearTimeout(tid); window.clearInterval(intv); };
  }, []);
  return (
    <AnimatePresence>
      {quote ? (
        <motion.div className="quote-flash" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.04, y: -8 }}>
          {quote}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SkullFlash() {
  const [flashes, setFlashes] = useState<Array<{ id: string; x: number; y: number; size: number; rot: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    let t = 0;
    const schedule = () => {
      t = window.setTimeout(() => {
        if (cancelled) return;
        const count = 1 + Math.floor(Math.random() * 4);
        setFlashes(Array.from({ length: count }, () => ({ id: nanoid(), x: 6 + Math.random() * 88, y: 6 + Math.random() * 76, size: 36 + Math.random() * 110, rot: -25 + Math.random() * 50 })));
        window.setTimeout(() => setFlashes([]), 900);
        schedule();
      }, 6000 + Math.random() * 12000);
    };
    schedule();
    return () => { cancelled = true; window.clearTimeout(t); };
  }, []);
  return (
    <div className="skull-flash-layer" aria-hidden="true">
      {flashes.map((f) => <Skull key={f.id} style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.size, height: f.size, transform: `translate(-50%,-50%) rotate(${f.rot}deg)`, position: 'absolute' }} />)}
    </div>
  );
}

function BloodDrips() {
  const drips = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i, left: Math.floor(i * 4.6 + Math.sin(i * 1.9) * 2),
    delay: (i * 0.67) % 9, duration: 2.8 + (i % 5) * 0.9,
    width: 3 + (i % 4), height: 36 + (i % 4) * 22
  })), []);
  return (
    <div className="blood-drips" aria-hidden="true">
      {drips.map((d) => <div key={d.id} className="blood-drip" style={{ left: `${d.left}%`, width: d.width, height: d.height, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s` }} />)}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function mdToHtml(input: string) {
  const esc = input.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .split('\n').map((l) => {
      if (l.startsWith('### ')) return `<h3>${l.slice(4)}</h3>`;
      if (l.startsWith('## ')) return `<h2>${l.slice(3)}</h2>`;
      if (l.startsWith('# ')) return `<h1>${l.slice(2)}</h1>`;
      if (l.startsWith('- ')) return `<li>${l.slice(2)}</li>`;
      return l.trim() ? `<p>${l}</p>` : '<br />';
    }).join('');
  return DOMPurify.sanitize(esc.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>'));
}

const cp = (text: string) => void navigator.clipboard.writeText(text);

function readStoredValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Thanatos still works when browser storage is blocked.
  }
}

function randomToken(length: number, alphabet = 'abcdefghijkmnopqrstuvwxyz23456789') {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToB64(bytes: Uint8Array) {
  let bin = '';
  bytes.forEach((byte) => { bin += String.fromCharCode(byte); });
  return btoa(bin);
}

function b64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function b64UrlEncode(value: string) {
  return bytesToB64(textEncoder.encode(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function b64UrlDecode(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return textDecoder.decode(b64ToBytes(padded));
}

function exactBuffer(bytes: Uint8Array) {
  return bytes.slice().buffer as ArrayBuffer;
}

function randomB64(bytes = 16) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return bytesToB64(values);
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return bytesToB64(new Uint8Array(hash));
}

async function derivePassKey(password: string, saltB64: string) {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: 250_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function keyVerifier(key: CryptoKey) {
  const raw = await crypto.subtle.exportKey('raw', key);
  const hash = await crypto.subtle.digest('SHA-256', raw);
  return bytesToB64(new Uint8Array(hash));
}

async function encryptBytes(key: CryptoKey, bytes: Uint8Array): Promise<EncryptedPayload> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: exactBuffer(iv) }, key, exactBuffer(bytes));
  return { iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(data)) };
}

async function decryptBytes(key: CryptoKey, payload: EncryptedPayload) {
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: exactBuffer(b64ToBytes(payload.iv)) }, key, exactBuffer(b64ToBytes(payload.data)));
  return new Uint8Array(data);
}

async function encryptJson(key: CryptoKey, value: unknown) {
  return encryptBytes(key, textEncoder.encode(JSON.stringify(value)));
}

async function decryptJson<T>(key: CryptoKey, payload: EncryptedPayload) {
  return JSON.parse(textDecoder.decode(await decryptBytes(key, payload))) as T;
}

async function generateVaultKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function wrapVaultKey(userKey: CryptoKey, vaultKey: CryptoKey) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', vaultKey));
  return encryptBytes(userKey, raw);
}

async function unwrapVaultKey(userKey: CryptoKey, payload: EncryptedPayload) {
  const raw = await decryptBytes(userKey, payload);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

function readAccessStore(): AccessStore {
  try {
    const parsed = JSON.parse(readStoredValue(ACCESS_KEY) ?? '') as AccessStore;
    return parsed?.version === 1 && Array.isArray(parsed.users) ? parsed : { version: 1, users: [] };
  } catch {
    return { version: 1, users: [] };
  }
}

function writeAccessStore(store: AccessStore) {
  writeStoredValue(ACCESS_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('thanatos:access-store'));
}

function makeAccessInvite(user: AccessUser) {
  const invite: AccessInvite = {
    version: 1,
    kind: 'thanatos.pending-user',
    createdAt: new Date().toISOString(),
    user
  };
  return `thanatos_invite_${b64UrlEncode(JSON.stringify(invite))}`;
}

function readAccessInvite(code: string): AccessInvite {
  const trimmed = code.trim();
  if (!trimmed.startsWith('thanatos_invite_')) throw new Error('Invalid invite prefix');
  const parsed = JSON.parse(b64UrlDecode(trimmed.slice('thanatos_invite_'.length))) as AccessInvite;
  if (parsed.version !== 1 || parsed.kind !== 'thanatos.pending-user' || parsed.user?.status !== 'pending') {
    throw new Error('Invalid invite payload');
  }
  if (!parsed.user.usernameHash || !parsed.user.displayName || !parsed.user.recoveryHash || !parsed.user.recoverySalt || !parsed.user.pendingWrappedVaultKey) {
    throw new Error('Incomplete invite payload');
  }
  return parsed;
}

function importAccessInvite(code: string) {
  const invite = readAccessInvite(code);
  const store = readAccessStore();
  const existing = store.users.find((user) => user.usernameHash === invite.user.usernameHash);
  if (existing?.status === 'active') return { status: 'active' as const, username: existing.displayName };
  if (existing?.status === 'pending') {
    Object.assign(existing, invite.user);
  } else {
    store.users.push(invite.user);
  }
  writeAccessStore(store);
  return { status: 'pending' as const, username: invite.user.displayName };
}

async function readVault(vaultKey: CryptoKey): Promise<VaultEntry[]> {
  const secure = readStoredValue(SECURE_VAULT_KEY);
  if (!secure) return [];
  return decryptJson<VaultEntry[]>(vaultKey, JSON.parse(secure) as EncryptedPayload);
}

async function writeVault(vaultKey: CryptoKey, entries: VaultEntry[]) {
  writeStoredValue(SECURE_VAULT_KEY, JSON.stringify(await encryptJson(vaultKey, entries)));
  window.dispatchEvent(new CustomEvent('thanatos:vault-updated'));
}

function readLegacyVault() {
  try {
    return JSON.parse(readStoredValue(LEGACY_VAULT_KEY) ?? '[]') as VaultEntry[];
  } catch {
    return [];
  }
}

async function ensureVaultInitialized(vaultKey: CryptoKey) {
  if (readStoredValue(SECURE_VAULT_KEY)) return;
  const legacy = readLegacyVault();
  await writeVault(vaultKey, legacy);
  if (legacy.length) localStorage.removeItem(LEGACY_VAULT_KEY);
}

function normalizeUser(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
}

async function makeUserHash(username: string) {
  return sha256(`user:${normalizeUser(username)}`);
}

function openMusicDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MUSIC_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MUSIC_STORE)) db.createObjectStore(MUSIC_STORE, { keyPath: 'id' });
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function readMusicTracks(): Promise<MusicTrack[]> {
  const db = await openMusicDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUSIC_STORE, 'readonly');
    const req = tx.objectStore(MUSIC_STORE).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as MusicTrack[]);
    tx.oncomplete = () => db.close();
  });
}

async function writeMusicTracks(tracks: MusicTrack[]) {
  const db = await openMusicDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MUSIC_STORE, 'readwrite');
    const store = tx.objectStore(MUSIC_STORE);
    store.clear();
    tracks.forEach((track) => store.put(track));
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

// ─── system apps ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyTerminalApp({ openWindows }: { openWindows: OpenWindow[] }) {
  const [lines, setLines] = useState<string[]>(['thanatos@crypt:~$ status', 'death kernel awake', 'vfs: indexeddb', 'remote bridge: offline', '', 'type "help" for commands']);
  const [input, setInput] = useState('');
  const outRef = useRef<HTMLDivElement>(null);

  const run = () => {
    const cmd = input.trim();
    if (!cmd) return;
    if (cmd === 'clear') { setLines([]); setInput(''); return; }
    const out: Record<string, string[]> = {
      help: [`commands: ${PUBLIC_CMDS.join(', ')}`],
      status: ['kernel: THANATOS v2.0', `windows: ${openWindows.length}`, 'vfs: indexeddb persistent', 'remote: offline', 'theme: death'],
      apps: appRegistry.slice(0, 20).map((a) => `${a.id.padEnd(18)} ${a.name}`),
      date: [new Date().toString()],
      skull: ['☠ skull pulse armed'],
      ls: ['/home/death  /vault  /tmp  /dev/null'],
      whoami: ['root — always root here'],
      uname: ['Thanatos OS 2.0 Death-Kernel x86_death']
    };
    setLines((c) => [...c, `$ ${cmd}`, ...(out[cmd] ?? [`not found: ${cmd}`])]);
    setInput('');
    window.requestAnimationFrame(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; });
  };

  return (
    <div className="terminal-app">
      <div className="terminal-output" ref={outRef}>{lines.map((l, i) => <p key={`${l}-${i}`}>{l || ' '}</p>)}</div>
      <div className="terminal-input">
        <span>$</span>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} autoFocus />
        <button type="button" onClick={run}><Play size={15} /></button>
      </div>
    </div>
  );
}

type TerminalFlow =
  | { kind: 'idle' }
  | { kind: 'rip-owner-bootstrap'; username: string; step: 'set' | 'confirm'; first: string }
  | { kind: 'rip-owner-auth'; username: string }
  | { kind: 'schadelkoph-username' }
  | { kind: 'schadelkoph-recovery'; username: string }
  | { kind: 'schadelkoph-set-password'; username: string; recoveryId: string; step: 'set' | 'confirm'; first: string }
  | { kind: 'schadelkoph-password'; username: string };

function TerminalApp({ openWindows, session, onSessionChange }: { openWindows: OpenWindow[]; session: AccessSession | null; onSessionChange: (session: AccessSession | null) => void }) {
  const [lines, setLines] = useState<string[]>(['thanatos@crypt:~$ status', 'death kernel awake', 'vfs: indexeddb', 'remote bridge: offline', '', 'type "help" for commands']);
  const [input, setInput] = useState('');
  const [flow, setFlow] = useState<TerminalFlow>({ kind: 'idle' });
  const outRef = useRef<HTMLDivElement>(null);

  const pushLines = (next: string[]) => {
    setLines((current) => [...current, ...next]);
    window.requestAnimationFrame(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; });
  };

  const finishRip = async (username: string, ownerPass: string) => {
    const store = readAccessStore();
    if (!store.ownerSalt || !store.ownerVerifier) {
      const ownerSalt = randomB64();
      const ownerKey = await derivePassKey(ownerPass, ownerSalt);
      store.ownerSalt = ownerSalt;
      store.ownerVerifier = await keyVerifier(ownerKey);
    } else {
      const ownerKey = await derivePassKey(ownerPass, store.ownerSalt);
      if (await keyVerifier(ownerKey) !== store.ownerVerifier) {
        pushLines(['owner passphrase rejected.', 'use the exact passphrase set on the first successful rip command.']);
        return;
      }
    }
    const normalized = normalizeUser(username);
    const usernameHash = await makeUserHash(normalized);
    if (store.users.some((user) => user.usernameHash === usernameHash)) {
      pushLines([`${normalized} is already marked by the reaper.`]);
      return;
    }
    const recoveryId = `reap_${randomToken(18)}`;
    const recoverySalt = randomB64();
    const recoveryKey = await derivePassKey(recoveryId, recoverySalt);
    if (readStoredValue(SECURE_VAULT_KEY) && !session) {
      pushLines(['vault is already sealed. unlock with schadelkoph before adding another user.']);
      return;
    }
    const vaultKey = session?.vaultKey ?? await generateVaultKey();
    await ensureVaultInitialized(vaultKey);
    const pendingUser: AccessUser = {
      usernameHash,
      displayName: normalized,
      status: 'pending',
      recoveryHash: await sha256(`recovery:${recoveryId}`),
      recoverySalt,
      pendingWrappedVaultKey: await wrapVaultKey(recoveryKey, vaultKey)
    };
    store.users.push(pendingUser);
    writeAccessStore(store);
    pushLines([
      `marked ${normalized}.`,
      `recovery id: ${recoveryId}`,
      `invite code: ${makeAccessInvite(pendingUser)}`,
      'give them username + recovery id + invite code. they import it once, then claim with schadelkoph.'
    ]);
  };

  const claimUser = async (username: string, recoveryId: string, password: string) => {
    const store = readAccessStore();
    const normalized = normalizeUser(username);
    const usernameHash = await makeUserHash(normalized);
    const user = store.users.find((item) => item.usernameHash === usernameHash);
    if (!user || user.status !== 'pending' || !user.recoverySalt || !user.pendingWrappedVaultKey || user.recoveryHash !== await sha256(`recovery:${recoveryId}`)) {
      pushLines(['the reaper does not recognize that mark.']);
      return;
    }
    const salt = randomB64();
    const userKey = await derivePassKey(password, salt);
    const recoveryKey = await derivePassKey(recoveryId, user.recoverySalt);
    const vaultKey = await unwrapVaultKey(recoveryKey, user.pendingWrappedVaultKey);
    user.status = 'active';
    user.salt = salt;
    user.verifier = await keyVerifier(userKey);
    user.wrappedVaultKey = await wrapVaultKey(userKey, vaultKey);
    delete user.recoveryHash;
    delete user.recoverySalt;
    delete user.pendingWrappedVaultKey;
    writeAccessStore(store);
    onSessionChange({ username: normalized, vaultKey, startedAt: Date.now() });
    pushLines([`welcome, ${normalized}.`, 'reaper eyes online. account vault unlocked for this session.']);
  };

  const loginUser = async (username: string, password: string) => {
    const normalized = normalizeUser(username);
    const store = readAccessStore();
    const usernameHash = await makeUserHash(normalized);
    const user = store.users.find((item) => item.usernameHash === usernameHash);
    if (!user || user.status !== 'active' || !user.salt || !user.verifier || !user.wrappedVaultKey) {
      pushLines(['unknown or unclaimed user.']);
      return;
    }
    try {
      const userKey = await derivePassKey(password, user.salt);
      if (await keyVerifier(userKey) !== user.verifier) {
        pushLines(['password rejected.']);
        return;
      }
      const vaultKey = await unwrapVaultKey(userKey, user.wrappedVaultKey);
      await ensureVaultInitialized(vaultKey);
      onSessionChange({ username: normalized, vaultKey, startedAt: Date.now() });
      pushLines([`welcome back, ${normalized}.`, 'account vault unlocked for this session.']);
    } catch {
      pushLines(['vault key could not be opened.']);
    }
  };

  const handleFlow = async (value: string) => {
    if (flow.kind === 'rip-owner-bootstrap') {
      if (flow.step === 'set') {
        setFlow({ ...flow, step: 'confirm', first: value });
        pushLines(['confirm owner passphrase:']);
      } else if (value === flow.first) {
        setFlow({ kind: 'idle' });
        await finishRip(flow.username, value);
      } else {
        setFlow({ kind: 'idle' });
        pushLines(['owner passphrase mismatch. rip aborted.', 'nothing was saved. run rip again when both entries match.']);
      }
      return;
    }
    if (flow.kind === 'rip-owner-auth') {
      setFlow({ kind: 'idle' });
      await finishRip(flow.username, value);
      return;
    }
    if (flow.kind === 'schadelkoph-username') {
      const username = normalizeUser(value);
      const store = readAccessStore();
      const usernameHash = await makeUserHash(username);
      const user = store.users.find((item) => item.usernameHash === usernameHash);
      if (!user) {
        setFlow({ kind: 'idle' });
        pushLines(['you are not on the access list.']);
      } else if (user.status === 'pending') {
        setFlow({ kind: 'schadelkoph-recovery', username });
        pushLines(['recovery id:']);
      } else {
        setFlow({ kind: 'schadelkoph-password', username });
        pushLines(['password:']);
      }
      return;
    }
    if (flow.kind === 'schadelkoph-recovery') {
      setFlow({ kind: 'schadelkoph-set-password', username: flow.username, recoveryId: value, step: 'set', first: '' });
      pushLines(["set your password. if you lose it, you're basically fucked.", "if you've been entrusted with the reapers eyes, make sure to leave the others blind", 'set password:']);
      return;
    }
    if (flow.kind === 'schadelkoph-set-password') {
      if (flow.step === 'set') {
        if (value.length < 10) {
          pushLines(['password needs at least 10 characters. set password:']);
          return;
        }
        setFlow({ ...flow, step: 'confirm', first: value });
        pushLines(['confirm password:']);
      } else if (value === flow.first) {
        setFlow({ kind: 'idle' });
        await claimUser(flow.username, flow.recoveryId, value);
      } else {
        setFlow({ kind: 'idle' });
        pushLines(['password mismatch. claim aborted.']);
      }
      return;
    }
    if (flow.kind === 'schadelkoph-password') {
      setFlow({ kind: 'idle' });
      await loginUser(flow.username, value);
    }
  };

  const run = async () => {
    const cmd = input.trim();
    const commandKey = cmd.toLowerCase();
    if (!cmd) return;
    setInput('');
    if (flow.kind !== 'idle') {
      pushLines([`$ ${'*'.repeat(Math.min(cmd.length, 18))}`]);
      await handleFlow(cmd);
      return;
    }
    if (commandKey === 'clear') { setLines([]); return; }
    if (commandKey.startsWith('schadelkoph import ')) {
      const inviteCode = cmd.slice(cmd.toLowerCase().indexOf(' import ') + ' import '.length).trim();
      try {
        const imported = importAccessInvite(inviteCode);
        pushLines([
          '$ schadelkoph import [invite]',
          imported.status === 'active'
            ? `${imported.username} is already claimed on this browser.`
            : `invite imported for ${imported.username}. run schadelkoph to claim with username and recovery id.`
        ]);
      } catch {
        pushLines(['$ schadelkoph import [invite]', 'invite rejected. paste the full thanatos_invite code.']);
      }
      return;
    }
    if (commandKey === 'schadelkoph logout') {
      onSessionChange(null);
      pushLines([`$ ${cmd}`, 'reaper eyes sealed.']);
      return;
    }
    if (commandKey === 'schadelkoph whoami') {
      pushLines([`$ ${cmd}`, session ? `${session.username} since ${new Date(session.startedAt).toLocaleTimeString()}` : 'no one. the vault is blind.']);
      return;
    }
    if (commandKey === 'schadelkoph') {
      setFlow({ kind: 'schadelkoph-username' });
      pushLines([`$ ${cmd}`, 'And who are you in Death']);
      return;
    }
    if (commandKey.startsWith('rip ')) {
      const username = normalizeUser(cmd.slice(cmd.indexOf(' ') + 1));
      if (!username) {
        pushLines(['$ rip', 'usage: rip <username>']);
        return;
      }
      const store = readAccessStore();
      setFlow(store.ownerVerifier ? { kind: 'rip-owner-auth', username } : { kind: 'rip-owner-bootstrap', username, step: 'set', first: '' });
      pushLines([`$ rip ${username}`, store.ownerVerifier ? 'owner passphrase:' : 'set owner passphrase:']);
      return;
    }
    const out: Record<string, string[]> = {
      help: [`commands: ${PUBLIC_CMDS.join(', ')}`],
      status: ['kernel: THANATOS v2.0', `windows: ${openWindows.length}`, 'vfs: indexeddb persistent', 'remote: offline', 'theme: death'],
      apps: appRegistry.slice(0, 20).map((a) => `${a.id.padEnd(18)} ${a.name}`),
      date: [new Date().toString()],
      skull: ['skull pulse armed'],
      ls: ['/home/death  /vault  /tmp  /dev/null'],
      whoami: [session ? `${session.username} (schadelkoph)` : 'root - local shell only'],
      uname: ['Thanatos OS 2.0 Death-Kernel x86_death']
    };
    pushLines([`$ ${cmd}`, ...(out[commandKey] ?? [`not found: ${cmd}`])]);
  };

  return (
    <div className="terminal-app">
      <div className="terminal-output" ref={outRef}>{lines.map((l, i) => <p key={`${l}-${i}`}>{l || ' '}</p>)}</div>
      <div className="terminal-input">
        <span>$</span>
        <input value={input} type={flow.kind === 'idle' || flow.kind === 'schadelkoph-username' ? 'text' : 'password'} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void run()} autoFocus />
        <button type="button" onClick={() => void run()}><Play size={15} /></button>
      </div>
    </div>
  );
}

function FileManagerApp() {
  const { cwd, listing, selectedFile, error, openDirectory, openFile, createDemoFile, createFolder } = useVfsListing();
  const parentPath = cwd === '/' ? '/' : normalizePath(cwd.split('/').slice(0, -1).join('/') || '/');
  return (
    <div className="file-manager">
      <div className="file-toolbar">
        <button type="button" onClick={() => openDirectory(parentPath)} disabled={cwd === '/'}><ChevronUp size={16} /><span>Up</span></button>
        <button type="button" onClick={createFolder}><FolderPlus size={16} /><span>Folder</span></button>
        <button type="button" onClick={createDemoFile}><FilePlus2 size={16} /><span>File</span></button>
        <code>{cwd}</code>
      </div>
      {error ? <div className="vfs-error">{error}</div> : null}
      <div className="file-layout">
        <div className="file-list">
          {listing?.directories.map((d) => <button key={d.path} type="button" className="file-row" onClick={() => openDirectory(d.path)}><Folder size={17} /><span>{d.name}</span><small>dir</small></button>)}
          {listing?.files.map((f) => <button key={f.path} type="button" className="file-row" onClick={() => openFile(f.path)}><File size={17} /><span>{f.name}</span><small>{f.size} B</small></button>)}
        </div>
        <pre className="file-preview">{selectedFile?.content ?? 'Select a file to preview.'}</pre>
      </div>
    </div>
  );
}

function CalculatorApp() {
  const [expr, setExpr] = useState('13 * 13 + 6');
  const [result, setResult] = useState('175');
  const calc = () => {
    if (!/^[\d+\-*/(). %]+$/.test(expr)) { setResult('blocked'); return; }
    try {
      const v = Function(`"use strict"; return (${expr.replaceAll('%', '/100')});`)();
      setResult(Number.isFinite(v as number) ? String(v) : 'invalid');
    } catch { setResult('invalid'); }
  };
  return (
    <div className="tool-panel calculator-panel">
      <input value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && calc()} />
      <strong>{result}</strong>
      <button type="button" onClick={calc}><Play size={15} /> Calculate</button>
    </div>
  );
}

function NotesApp() {
  const [text, setText] = useState(() => localStorage.getItem('thanatos.notes') ?? 'Blood oath:\n- Build the OS\n- Own the machine\n');
  return (
    <div className="editor-panel">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" onClick={() => localStorage.setItem('thanatos.notes', text)}><Save size={15} /> Save</button>
    </div>
  );
}

function MarkdownApp() {
  const [text, setText] = useState('# Thanatos Log\n\n- VFS online\n- Shell armed\n- Skull flash enabled\n');
  return (
    <div className="split-panel">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />
    </div>
  );
}

function CalendarApp() {
  const [view, setView] = useState(new Date());
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(view)), end: endOfWeek(endOfMonth(view)) });
  return (
    <div className="calendar-app">
      <div className="cal-header">
        <button type="button" onClick={() => setView((d) => subMonths(d, 1))}><ChevronLeft size={16} /></button>
        <strong>{dateFmt(view, 'MMMM yyyy')}</strong>
        <button type="button" onClick={() => setView((d) => addMonths(d, 1))}><ChevronRight size={16} /></button>
      </div>
      <div className="cal-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {days.map((day) => <div key={day.toISOString()} className={clsx('cal-day', !isSameMonth(day, view) && 'other-month', isToday(day) && 'today')}>{dateFmt(day, 'd')}</div>)}
      </div>
    </div>
  );
}

function WeatherApp() {
  const [city, setCity] = useState('New York');
  const [wx, setWx] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchWx = async () => {
    setLoading(true); setErr('');
    try {
      const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
      const gd = (await geo.json()) as Array<{ lat: string; lon: string }>;
      if (!gd[0]) throw new Error('City not found');
      const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${gd[0].lat}&longitude=${gd[0].lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit`);
      const wxd = (await wxRes.json()) as { current: { temperature_2m: number; weather_code: number; wind_speed_10m: number } };
      setWx({ temp: Math.round(wxd.current.temperature_2m), desc: WX_CODES[wxd.current.weather_code] ?? 'Unknown', wind: Math.round(wxd.current.wind_speed_10m) });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Fetch failed'); }
    setLoading(false);
  };

  return (
    <div className="weather-app">
      <div className="weather-search">
        <input value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void fetchWx()} placeholder="City..." />
        <button type="button" onClick={() => void fetchWx()} disabled={loading}><CloudSun size={15} /> {loading ? '...' : 'Fetch'}</button>
      </div>
      {err && <div className="vfs-error">{err}</div>}
      {wx && <div className="weather-display"><div className="weather-temp">{wx.temp}°F</div><div className="weather-desc">{wx.desc}</div><div>Wind: {wx.wind} mph</div></div>}
      {!wx && !err && <p className="media-status">Powered by Open-Meteo — no API key needed.</p>}
    </div>
  );
}

function MailApp() {
  return (
    <div className="mail-app">
      <Mail size={46} />
      <h3>MumbleChat Mail</h3>
      <p>Use real MumbleChat mailboxes through Mailu. Account creation stays manual until the Mailu API bridge is added.</p>
      <div className="mail-links">
        <a href={MAIL_WEBMAIL_URL} target="_blank" rel="noreferrer"><button type="button"><Mail size={15} /> Webmail</button></a>
        <a href={MAIL_ADMIN_URL} target="_blank" rel="noreferrer"><button type="button"><ShieldCheck size={15} /> Admin</button></a>
        <button type="button" onClick={() => cp(MAIL_WEBMAIL_URL)}><Copy size={15} /> Copy webmail</button>
      </div>
      <code>{MAIL_DOMAIN}</code>
    </div>
  );
}

function ClockApp() {
  return <LillyClock />;
}

function SettingsApp({ theme, onThemeChange }: { theme: ThanatosTheme; onThemeChange: (t: ThanatosTheme) => void }) {
  const [crt, setCrt] = useState(true);
  const [vol, setVol] = useState(85);
  return (
    <div className="settings-grid">
      <section className="theme-section">
        <h3>Theme</h3>
        <div className="theme-options">
          {(['lilly','lilly-garden','death','zombitious'] as ThanatosTheme[]).map((t) => (
            <button key={t} type="button" className={theme === t ? 'selected' : ''} onClick={() => onThemeChange(t)}>
              {t === 'lilly' ? 'Lilly' : t === 'lilly-garden' ? "Lilly's Garden" : t === 'death' ? 'Death' : 'zomBitious'}
            </button>
          ))}
        </div>
        <p>
          {theme === 'death'
            ? 'Reaper active.'
            : theme === 'zombitious'
              ? 'zomBitious active.'
              : theme === 'lilly-garden'
                ? "Lilly's Garden active."
                : 'Lilly active.'}
        </p>
      </section>
      <section>
        <h3>Blood Intensity</h3>
        <input type="range" min="0" max="100" value={vol} onChange={(e) => setVol(Number(e.target.value))} />
        <p>{vol}% crimson</p>
      </section>
      <section>
        <h3>CRT Veil</h3>
        <button type="button" onClick={() => setCrt((v) => !v)}><Eye size={15} /> {crt ? 'Enabled' : 'Disabled'}</button>
      </section>
      <section>
        <h3>Remote Control</h3>
        <p>Developer → Remote Control to pair via bridge daemon over Tailscale.</p>
      </section>
    </div>
  );
}

function TaskManagerApp({ openWindows }: { openWindows: OpenWindow[] }) {
  return (
    <div className="system-table">
      <div className="system-row header"><span>Process</span><span>State</span><span>Z</span></div>
      {openWindows.map((w) => <div className="system-row" key={w.id}><span>{w.app.name}</span><span>{w.minimized ? 'min' : 'active'}</span><span>{w.z}</span></div>)}
    </div>
  );
}

// ─── media apps ───────────────────────────────────────────────────────────────

function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#ff0030');
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#030101';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => { drawing.current = true; last.current = pos(e); };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const p = pos(e);
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const clear = () => { const c = canvasRef.current!; const ctx = c.getContext('2d')!; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#030101'; ctx.fillRect(0, 0, c.width, c.height); };
  const download = () => { const a = document.createElement('a'); a.download = `thanatos-${Date.now()}.png`; a.href = canvasRef.current!.toDataURL(); a.click(); };

  return (
    <div className="paint-app">
      <div className="paint-toolbar">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Color" />
        <input type="range" min="1" max="40" value={size} onChange={(e) => setSize(Number(e.target.value))} title="Size" />
        <button type="button" className={tool === 'brush' ? 'selected' : ''} onClick={() => setTool('brush')}><Paintbrush size={15} /> Brush</button>
        <button type="button" className={tool === 'eraser' ? 'selected' : ''} onClick={() => setTool('eraser')}><Eraser size={15} /> Eraser</button>
        <button type="button" onClick={clear}><X size={15} /> Clear</button>
        <button type="button" onClick={download}><Save size={15} /> Save</button>
      </div>
      <canvas ref={canvasRef} className="paint-canvas" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => { drawing.current = false; }} onMouseLeave={() => { drawing.current = false; }} />
    </div>
  );
}

function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [photo, setPhoto] = useState('');
  const [status, setStatus] = useState('Camera inactive.');

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream; setActive(true); setStatus('Camera active.');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Camera denied.'); }
  };
  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setActive(false); setStatus('Camera stopped.'); };
  const capture = () => {
    const c = canvasRef.current!, v = videoRef.current!;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setPhoto(c.toDataURL('image/jpeg', 0.92)); setStatus('Photo captured.');
  };

  return (
    <div className="camera-app">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {active && <video ref={videoRef} autoPlay muted playsInline className="camera-video" />}
      {photo && !active && <img src={photo} alt="Capture" className="photo-preview" />}
      <div className="camera-controls">
        {!active && <button type="button" onClick={() => void start()}><Camera size={15} /> Start</button>}
        {active && <button type="button" onClick={capture}><AudioLines size={15} /> Capture</button>}
        {active && <button type="button" onClick={stop}><X size={15} /> Stop</button>}
        {photo && <a href={photo} download={`thanatos-photo-${Date.now()}.jpg`}><button type="button"><Save size={15} /> Download</button></a>}
      </div>
      <p className="media-status">{status}</p>
    </div>
  );
}

function VoiceRecorderApp() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [status, setStatus] = useState('Press Start to record.');

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => { const b = new Blob(chunks.current, { type: 'audio/webm' }); setAudioUrl(URL.createObjectURL(b)); stream.getTracks().forEach((t) => t.stop()); setStatus('Recording saved.'); };
      rec.start(); recRef.current = rec; setRecording(true); setStatus('Recording...');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Mic denied.'); }
  };
  const stop = () => { recRef.current?.stop(); setRecording(false); };

  return (
    <div className="recorder-app">
      <div className="recorder-status">{recording && <span className="rec-dot" />}<span>{recording ? 'RECORDING' : 'IDLE'}</span></div>
      {!recording ? <button type="button" onClick={() => void start()}><Mic size={15} /> Start</button> : <button type="button" onClick={stop}><Square size={15} /> Stop</button>}
      {audioUrl && <div className="recorder-result"><audio src={audioUrl} controls /><a href={audioUrl} download={`thanatos-rec-${Date.now()}.webm`}><button type="button"><Save size={15} /> Download</button></a></div>}
      <p className="media-status">{status}</p>
    </div>
  );
}

function VideoPlayerApp() {
  const [src, setSrc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="media-player-app">
      <input ref={inputRef} type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
      {!src ? <div className="player-empty"><Mail size={48} /><p>No video</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Video</button></div>
        : <div className="video-container"><video src={src} controls autoPlay className="video-element" /><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Different</button></div>}
    </div>
  );
}

function ImageViewerApp() {
  const [src, setSrc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="media-player-app">
      <input ref={inputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
      {!src ? <div className="player-empty"><Image size={48} /><p>No image</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Image</button></div>
        : <div className="image-container"><img src={src} alt="viewer" className="image-display" /><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Different</button></div>}
    </div>
  );
}

function MusicPlayerApp() {
  const [playlist, setPlaylist] = useState<MusicTrackView[]>([]);
  const [current, setCurrent] = useState(0);
  const [musicStatus, setMusicStatus] = useState('Music library loading...');
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef(0);
  const playlistRef = useRef<MusicTrackView[]>([]);

  const stopMusicPulse = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    emitAudioPulse(idlePulse);
  }, []);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    let cancelled = false;
    void readMusicTracks()
      .then((tracks) => {
        if (cancelled) return;
        setPlaylist(tracks.map((track) => ({ ...track, url: URL.createObjectURL(track.blob) })));
        setMusicStatus(tracks.length ? `Loaded ${tracks.length} saved track${tracks.length === 1 ? '' : 's'}.` : 'No saved tracks.');
      })
      .catch(() => setMusicStatus('Music library unavailable.'));
    return () => {
      cancelled = true;
      stopMusicPulse();
      void audioCtxRef.current?.close();
      playlistRef.current.forEach((track) => URL.revokeObjectURL(track.url));
    };
  }, [stopMusicPulse]);

  const startMusicPulse = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current ?? new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 1024;
        analyserRef.current.smoothingTimeConstant = 0.76;
      }
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
      const analyser = analyserRef.current;
      const freq = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (audio.paused || audio.ended) {
          stopMusicPulse();
          return;
        }
        analyser.getByteFrequencyData(freq);
        emitAudioPulse(getAudioPulse(freq, 'music'));
        rafRef.current = window.requestAnimationFrame(tick);
      };
      window.cancelAnimationFrame(rafRef.current);
      tick();
    } catch (error) {
      console.warn('Thanatos music analyzer unavailable', error);
      stopMusicPulse();
    }
  };

  const persistMusic = async (tracks: MusicTrackView[]) => {
    await writeMusicTracks(tracks.map(({ id, name, type, blob }) => ({ id, name, type, blob })));
  };

  const loadTracks = async (files: FileList | null) => {
    const next = [
      ...playlist,
      ...Array.from(files ?? []).map((file) => ({
        id: nanoid(),
        name: file.name,
        type: file.type,
        blob: file,
        url: URL.createObjectURL(file)
      }))
    ];
    setPlaylist(next);
    setCurrent(0);
    stopMusicPulse();
    await persistMusic(next);
    setMusicStatus(`Saved ${next.length} track${next.length === 1 ? '' : 's'} locally.`);
  };

  const removeTrack = async (id: string) => {
    const target = playlist.find((track) => track.id === id);
    if (target) URL.revokeObjectURL(target.url);
    const next = playlist.filter((track) => track.id !== id);
    setPlaylist(next);
    setCurrent((value) => Math.min(value, Math.max(0, next.length - 1)));
    stopMusicPulse();
    await persistMusic(next);
    setMusicStatus(`Saved ${next.length} track${next.length === 1 ? '' : 's'} locally.`);
  };

  const clearTracks = async () => {
    playlist.forEach((track) => URL.revokeObjectURL(track.url));
    setPlaylist([]);
    setCurrent(0);
    stopMusicPulse();
    await persistMusic([]);
    setMusicStatus('Music library cleared.');
  };

  return (
    <div className="music-player-app">
      <input ref={inputRef} type="file" accept="audio/*" multiple onChange={(e) => void loadTracks(e.target.files)} style={{ display: 'none' }} />
      {playlist.length === 0 ? <div className="player-empty"><Music size={48} /><p>No tracks</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Music</button></div>
        : <>
            <div className="music-now-playing"><Music size={28} /><span>{playlist[current]?.name ?? ''}</span></div>
            <audio
              ref={audioRef}
              src={playlist[current]?.url}
              controls
              autoPlay
              onPlay={() => void startMusicPulse()}
              onPause={stopMusicPulse}
              onEnded={() => { stopMusicPulse(); setCurrent((c) => (c + 1) % playlist.length); }}
              className="music-audio"
            />
            <div className="music-controls">
              <button type="button" onClick={() => setCurrent((c) => (c - 1 + playlist.length) % playlist.length)}><ChevronLeft size={15} /></button>
              <span>{current + 1}/{playlist.length}</span>
              <button type="button" onClick={() => setCurrent((c) => (c + 1) % playlist.length)}><ChevronRight size={15} /></button>
              <button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Add</button>
              <button type="button" onClick={() => void clearTracks()}><X size={15} /> Clear</button>
            </div>
            <p className="media-status">Visualizer attached while playing. {musicStatus}</p>
            <div className="music-playlist">
              {playlist.map((t, i) => (
                <div key={t.id} className={clsx('playlist-item', i === current && 'active-track')}>
                  <button type="button" onClick={() => setCurrent(i)}><Music size={14} /><span>{t.name}</span></button>
                  <button type="button" aria-label={`Remove ${t.name}`} onClick={() => void removeTrack(t.id)}><X size={13} /></button>
                </div>
              ))}
            </div>
          </>}
    </div>
  );
}

function PdfViewerApp() {
  const [src, setSrc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="media-player-app">
      <input ref={inputRef} type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
      {!src ? <div className="player-empty"><BookOpen size={48} /><p>No PDF</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open PDF</button></div>
        : <div className="pdf-container"><object data={src} type="application/pdf" className="pdf-embed"><a href={src} target="_blank" rel="noreferrer">Open in new tab</a></object><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Different</button></div>}
    </div>
  );
}

const matrixCells = Array.from({ length: 100 }, (_, index) => {
  const row = Math.floor(index / 10);
  const col = index % 10;
  const type = index === 0 || index === 99 ? 'logo'
    : [1, 8, 90, 98].includes(index) ? 'status'
      : row === 0 || row === 9 || col === 0 || col === 9 ? 'data'
        : (index + row) % 7 === 0 ? 'sprite'
          : 'meter';
  return { id: index, row, col, type };
});

function getVisualizerPalette(theme: ThanatosTheme) {
  if (theme === 'lilly-garden') return { accent: '#9cff4f', hot: '#ff8a2a', dim: '#112610', sprite: 'lilly-garden' };
  if (theme === 'zombitious') return { accent: '#83ff9b', hot: '#ff4fbd', dim: '#102818', sprite: 'zombitious' };
  if (theme === 'lilly') return { accent: '#ff75ce', hot: '#a56bff', dim: '#24102f', sprite: 'lilly' };
  return { accent: '#ff234f', hot: '#7b000d', dim: '#230307', sprite: 'death' };
}

function AudioVisualizerApp({ theme }: { theme: ThanatosTheme }) {
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState('Listening for Music Player audio. Capture is optional.');
  const [active, setActive] = useState(false);
  const [pulse, setPulse] = useState<AudioPulse>(idlePulse);
  const [error, setError] = useState(false);
  const palette = getVisualizerPalette(theme);

  const stop = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    setActive(false);
    setError(false);
    setStatus('Listening for Music Player audio. Capture is optional.');
    emitAudioPulse(idlePulse);
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const onPulse = (event: Event) => {
      const detail = (event as CustomEvent<AudioPulse>).detail;
      if (!detail) return;
      setPulse(detail);
      if (detail.source === 'music') {
        setError(false);
        setStatus('Auto-attached to Music Player.');
      } else if (detail.source === 'capture') {
        setError(false);
        setStatus('Audio capture active.');
      }
    };
    window.addEventListener('thanatos:audio-pulse', onPulse);
    return () => window.removeEventListener('thanatos:audio-pulse', onPulse);
  }, []);

  const start = async () => {
    stop();
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError(true);
        setStatus('Screen audio capture is not available in this browser. Play a track in Music Player instead.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = stream.getAudioTracks();
      stream.getVideoTracks().forEach((t) => t.stop());
      if (!audioTracks.length) {
        stream.getTracks().forEach((t) => t.stop());
        setError(true);
        setStatus('No audio track. Enable "Share audio" when picking a tab, or use Music Player.');
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        setError(true);
        setStatus('Web Audio is not available in this browser.');
        return;
      }
      const actx = new AudioCtx();
      const analyser = actx.createAnalyser();
      analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.72;
      actx.createMediaStreamSource(new MediaStream(audioTracks)).connect(analyser);
      streamRef.current = stream; ctxRef.current = actx; setActive(true); setError(false); setStatus('Audio capture active.');
      const freq = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(freq);
        emitAudioPulse(getAudioPulse(freq, 'capture'));
        rafRef.current = window.requestAnimationFrame(draw);
      };
      draw();
    } catch (e) {
      stop();
      setError(true);
      setStatus(e instanceof Error ? e.message : 'Capture failed.');
    }
  };

  const sourceLabel = pulse.source === 'music' ? 'MUSIC PLAYER' : pulse.source === 'capture' ? 'TAB CAPTURE' : 'IDLE';
  const matrixClass = error ? 'matrix-error' : pulse.level > 0.02 ? 'matrix-active' : 'matrix-idle';

  return (
    <div className="visualizer-app">
      <div
        className={clsx('thanatos-matrix', matrixClass, `matrix-theme-${theme}`)}
        style={{
          '--matrix-accent': palette.accent,
          '--matrix-hot': palette.hot,
          '--matrix-dim': palette.dim,
          '--audio-level': pulse.level,
          '--audio-bass': pulse.bass,
          '--audio-mid': pulse.mid
        } as CSSProperties}
      >
        {matrixCells.map((cell) => {
          const band = pulse.bands[cell.id % pulse.bands.length] ?? 0;
          if (cell.type === 'logo') {
            return <div key={cell.id} className="matrix-cell matrix-logo" style={{ '--cell-level': band } as CSSProperties}>XO</div>;
          }
          if (cell.type === 'status') {
            return <div key={cell.id} className="matrix-cell data-text-cell" style={{ '--cell-level': band } as CSSProperties}>{cell.id < 10 ? sourceLabel : `${Math.round(pulse.level * 100)}%`}</div>;
          }
          if (cell.type === 'data') {
            return <div key={cell.id} className="matrix-cell data-text-cell" style={{ '--cell-level': band } as CSSProperties}>R{cell.row}C{cell.col}<br />{Math.round(band * 99).toString().padStart(2, '0')}</div>;
          }
          if (cell.type === 'sprite') {
            return <div key={cell.id} className="matrix-cell" style={{ '--cell-level': band } as CSSProperties}><span className={clsx('matrix-sprite', `sprite-${palette.sprite}`)} /></div>;
          }
          return <div key={cell.id} className="matrix-cell" style={{ '--cell-level': band } as CSSProperties}><span className="matrix-meter" /></div>;
        })}
      </div>
      <div className="visualizer-controls">
        <button type="button" onClick={() => void start()}><RadioTower size={15} /> Capture Audio</button>
        <button type="button" onClick={stop} disabled={!active}><X size={15} /> Stop</button>
        <span>{sourceLabel}</span>
        <span>{Math.round(pulse.level * 100)}%</span>
      </div>
      <p>{status}</p>
    </div>
  );
}

// ─── developer apps ───────────────────────────────────────────────────────────

function CodeStudioApp() {
  const [code, setCode] = useState('// Thanatos Code Studio\n\nconst reaper = (name) => `${name} has been claimed`;\nconsole.log(reaper("the living"));\n');
  const [lang, setLang] = useState('javascript');
  return (
    <div className="code-studio">
      <div className="code-toolbar">
        {['javascript','python','rust','css','html','json'].map((l) => <button key={l} type="button" className={lang === l ? 'selected' : ''} onClick={() => setLang(l)}>{l}</button>)}
        <button type="button" onClick={() => cp(code)} style={{ marginLeft: 'auto' }}><Copy size={15} /> Copy</button>
      </div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} className="code-textarea" spellCheck={false} />
    </div>
  );
}

function CompilerApp() {
  const [code, setCode] = useState('// Thanatos JS Sandbox\nconst greet = n => `death greets ${n}`;\nconsole.log(greet("kernel"));\n[1,2,3].map(n => n * 666).forEach(n => console.log(n));');
  const [output, setOutput] = useState('');
  const [err, setErr] = useState('');

  const run = () => {
    const logs: string[] = [];
    const orig = { log: console.log, warn: console.warn, error: console.error };
    console.log = (...a) => logs.push(a.map((x) => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '));
    console.warn = (...a) => logs.push('WARN: ' + a.join(' '));
    console.error = (...a) => logs.push('ERR: ' + a.join(' '));
    try {
      new Function(code)();
      setErr('');
    } catch (e) { setErr(e instanceof Error ? `${e.name}: ${e.message}` : String(e)); }
    finally { Object.assign(console, orig); }
    setOutput(logs.join('\n') || '(no output)');
  };

  return (
    <div className="compiler-app">
      <div className="compiler-toolbar">
        <button type="button" onClick={run}><Play size={15} /> Run JS</button>
        <span className="compiler-note">sandbox: JS only · no network</span>
      </div>
      <div className="compiler-split">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} className="code-textarea" spellCheck={false} />
        <div className="compiler-output">
          {err && <div className="compiler-error">{err}</div>}
          <pre>{output || 'Output appears here...'}</pre>
        </div>
      </div>
    </div>
  );
}

function GitClientApp() {
  const [repo, setRepo] = useState('https://github.com/deathdopest-sketch/thanatos-os');
  const branches = ['main', 'feature/death-mode', 'feature/remote-bridge'];
  const commits = [{ hash: '88f4ab9', msg: 'Overhaul Thanatos death shell' }, { hash: 'a4f5ad6', msg: 'Initialize Thanatos OS' }];
  return (
    <div className="git-client">
      <div className="git-toolbar">
        <input value={repo} onChange={(e) => setRepo(e.target.value)} style={{ flex: 1 }} />
        <a href={repo} target="_blank" rel="noreferrer"><button type="button"><Globe size={15} /> Open</button></a>
      </div>
      <div className="git-branches">{branches.map((b) => <div key={b} className="git-branch"><Shuffle size={14} /><span>{b}</span></div>)}</div>
      <div className="git-log">{commits.map((c) => <div key={c.hash} className="git-commit"><code>{c.hash}</code><span>{c.msg}</span></div>)}</div>
      <p className="media-status">Use Remote Control + bridge daemon to run real git commands on your PC.</p>
    </div>
  );
}

function ApiClientApp() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [body, setBody] = useState('');
  const [hdrs, setHdrs] = useState('{"Content-Type": "application/json"}');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      let h: Record<string, string> = {};
      try { h = JSON.parse(hdrs) as Record<string, string>; } catch { /* ignore */ }
      const res = await fetch(url, { method, headers: h, body: method !== 'GET' && body ? body : undefined });
      const text = await res.text();
      setStatus(`${res.status} ${res.statusText}`);
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)); } catch { setResponse(text); }
    } catch (e) { setStatus('Error'); setResponse(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  };

  return (
    <div className="api-client">
      <div className="api-toolbar">
        <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)} className="api-method-select">
          {(['GET','POST','PUT','DELETE','PATCH'] as HttpMethod[]).map((m) => <option key={m}>{m}</option>)}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} placeholder="https://..." />
        <button type="button" onClick={() => void send()} disabled={loading}><Play size={15} /> {loading ? '...' : 'Send'}</button>
      </div>
      {method !== 'GET' && <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Request body (JSON)..." className="api-body" />}
      <textarea value={hdrs} onChange={(e) => setHdrs(e.target.value)} className="api-headers" />
      {status && <div className={clsx('api-status', status.startsWith('2') ? 'api-ok' : 'api-err')}>{status}</div>}
      <pre className="api-response">{response || 'Response here...'}</pre>
    </div>
  );
}

function JsonFormatterApp() {
  const [text, setText] = useState('{"system":"thanatos","state":"awake","version":2}');
  const [err, setErr] = useState('');
  const format = () => { try { setText(JSON.stringify(JSON.parse(text), null, 2)); setErr(''); } catch (e) { setErr(e instanceof Error ? e.message : 'Invalid JSON'); } };
  return (
    <div className="editor-panel">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      {err && <div className="vfs-error">{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={format}><RefreshCcw size={15} /> Format</button>
        <button type="button" onClick={() => cp(text)}><Copy size={15} /> Copy</button>
      </div>
    </div>
  );
}

function DiffCheckerApp() {
  const [left, setLeft] = useState('Thanatos\nDeath\nKernel\nReaper');
  const [right, setRight] = useState('Thanatos\nBlood\nKernel\nShadow');
  const ll = left.split('\n'), rl = right.split('\n'), max = Math.max(ll.length, rl.length);
  return (
    <div className="diff-app">
      <div className="diff-inputs"><textarea value={left} onChange={(e) => setLeft(e.target.value)} placeholder="Left..." /><textarea value={right} onChange={(e) => setRight(e.target.value)} placeholder="Right..." /></div>
      <div className="diff-result">
        {Array.from({ length: max }, (_, i) => { const l = ll[i] ?? '', r = rl[i] ?? '', ch = l !== r; return <div key={i} className={clsx('diff-row', ch && 'diff-changed')}><span className="diff-left">{l}</span><span className="diff-sep">{ch ? '≠' : '='}</span><span className="diff-right">{r}</span></div>; })}
      </div>
    </div>
  );
}

function HexEditorApp() {
  const [text, setText] = useState('Thanatos OS — Death Kernel');
  const bytes = Array.from(new TextEncoder().encode(text));
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase());
  const chunks: string[][] = [];
  for (let i = 0; i < hex.length; i += 16) chunks.push(hex.slice(i, i + 16));
  return (
    <div className="hex-editor">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type text to convert..." />
      <div className="hex-display">
        <div className="hex-header"><span>OFFSET</span><span>HEX</span><span>ASCII</span></div>
        {chunks.map((chunk, i) => (
          <div key={i} className="hex-row">
            <span className="hex-offset">{(i * 16).toString(16).padStart(8, '0').toUpperCase()}</span>
            <span className="hex-bytes">{chunk.join(' ')}</span>
            <span className="hex-ascii">{chunk.map((h) => { const cp = parseInt(h, 16); return cp >= 32 && cp < 127 ? String.fromCharCode(cp) : '.'; }).join('')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HashGeneratorApp() {
  const [text, setText] = useState('thanatos');
  const [digest, setDigest] = useState('');
  const [algo, setAlgo] = useState<'SHA-256' | 'SHA-1' | 'SHA-512'>('SHA-256');
  const hash = async () => {
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
    setDigest(Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join(''));
  };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={algo} onChange={(e) => setAlgo(e.target.value as typeof algo)} className="api-method-select">
          <option>SHA-256</option><option>SHA-1</option><option>SHA-512</option>
        </select>
        <button type="button" onClick={() => void hash()}><Hash size={15} /> Hash</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <code style={{ wordBreak: 'break-all', padding: 12 }}>{digest || 'hash output here'}</code>
      {digest && <button type="button" onClick={() => cp(digest)}><Copy size={15} /> Copy Hash</button>}
    </div>
  );
}

function PasswordGeneratorApp({ session }: { session: AccessSession | null }) {
  const [service, setService] = useState('mumblechat-work');
  const [domain, setDomain] = useState(MAIL_DOMAIN);
  const [localPart, setLocalPart] = useState('');
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [vaultStatus, setVaultStatus] = useState(session ? 'Decrypting vault...' : 'Run schadelkoph in Terminal to unlock the account vault.');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadVault() {
      if (!session) {
        setVault([]);
        setVaultStatus('Run schadelkoph in Terminal to unlock the account vault.');
        return;
      }
      try {
        await ensureVaultInitialized(session.vaultKey);
        const entries = await readVault(session.vaultKey);
        if (!cancelled) {
          setVault(entries);
          setVaultStatus(`Vault unlocked for ${session.username}.`);
        }
      } catch {
        if (!cancelled) setVaultStatus('Vault decrypt failed. Log out and unlock again.');
      }
    }
    void loadVault();
    const onVault = () => void loadVault();
    window.addEventListener('thanatos:vault-updated', onVault);
    return () => { cancelled = true; window.removeEventListener('thanatos:vault-updated', onVault); };
  }, [session]);

  const persistVault = async (nextVault: VaultEntry[]) => {
    if (!session) return;
    setVault(nextVault);
    await writeVault(session.vaultKey, nextVault);
    setVaultStatus(`Encrypted ${nextVault.length} account kit${nextVault.length === 1 ? '' : 's'}.`);
  };

  const generatePassword = () => {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    return randomToken(28, a);
  };

  const normalize = (value: string, fallback: string) => value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || fallback;

  const generate = () => {
    const normalizedService = normalize(service, 'account');
    const normalizedDomain = domain.trim().toLowerCase().replace(/^@/, '') || 'mumblechat.online';
    const generatedLocal = localPart.trim()
      ? normalize(localPart, normalizedService)
      : `${normalizedService}.${randomToken(6)}`;
    const nextEntry: VaultEntry = {
      id: nanoid(),
      service: normalizedService,
      email: `${generatedLocal}@${normalizedDomain}`,
      username: `${normalizedService}-${randomToken(5)}`,
      password: generatePassword(),
      createdAt: new Date().toLocaleString()
    };
    setEntry(nextEntry);
  };

  const save = () => {
    if (!entry || !session) return;
    void persistVault([entry, ...vault.filter((item) => item.id !== entry.id)]);
  };

  const remove = (id: string) => { void persistVault(vault.filter((item) => item.id !== id)); };

  const copyKit = (item = entry) => {
    if (!item) return;
    cp(`service=${item.service}\nemail=${item.email}\nusername=${item.username}\npassword=${item.password}\nwebmail=${MAIL_WEBMAIL_URL}`);
  };

  const exportBackup = () => {
    const access = readStoredValue(ACCESS_KEY);
    const secureVault = readStoredValue(SECURE_VAULT_KEY);
    if (!access || !secureVault) return;
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), access: JSON.parse(access), secureVault: JSON.parse(secureVault) }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `thanatos-vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as { version?: number; access?: AccessStore; secureVault?: EncryptedPayload };
      if (backup.version !== 1 || !backup.access || !backup.secureVault) throw new Error('Invalid backup');
      writeStoredValue(ACCESS_KEY, JSON.stringify(backup.access));
      writeStoredValue(SECURE_VAULT_KEY, JSON.stringify(backup.secureVault));
      setVaultStatus('Backup imported. Run schadelkoph again with username, password, and recovery context.');
    } catch {
      setVaultStatus('Backup import failed.');
    }
  };

  if (!session) {
    return (
      <div className="account-vault locked-vault">
        <div className="vault-lock-panel">
          <Lock size={46} />
          <h3>Schadelkoph Gate Sealed</h3>
          <p>{vaultStatus}</p>
          <button type="button" onClick={() => importRef.current?.click()}><FilePlus2 size={15} /> Import encrypted backup</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
        </div>
      </div>
    );
  }

  return (
    <div className="account-vault">
      <input ref={importRef} type="file" accept="application/json" hidden onChange={(event) => void importBackup(event.target.files?.[0])} />
      <div className="account-generator">
        <label>
          Service
          <input value={service} onChange={(event) => setService(event.target.value)} placeholder="new-staff-account" />
        </label>
        <label>
          Mail domain
          <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="mumblechat.online" />
        </label>
        <label>
          Email name
          <input value={localPart} onChange={(event) => setLocalPart(event.target.value)} placeholder="blank = auto alias" />
        </label>
        <button type="button" onClick={generate}>
          <RefreshCcw size={15} /> Generate account kit
        </button>
      </div>

      <div className="account-kit">
        <strong>{entry ? entry.service : 'No account kit generated'}</strong>
        <code>{entry ? `email: ${entry.email}` : 'email waits here'}</code>
        <code>{entry ? `user: ${entry.username}` : 'username waits here'}</code>
        <code>{entry ? `pass: ${entry.password}` : 'password waits here'}</code>
        <div className="account-actions">
          <button type="button" onClick={save} disabled={!entry}>
            <Save size={15} /> Save to vault
          </button>
          <button type="button" onClick={() => copyKit()} disabled={!entry}>
            <Copy size={15} /> Copy kit
          </button>
        </div>
        <small>Mailboxes are manual in Mailu for now. This vault stores encrypted account kits only.</small>
      </div>

      <div className="mail-dns-card">
        <strong>MumbleChat Mail</strong>
        <code>domain: {MAIL_DOMAIN}</code>
        <code>webmail: {MAIL_WEBMAIL_URL}</code>
        <code>admin: {MAIL_ADMIN_URL}</code>
        <div className="account-actions">
          <button type="button" onClick={() => cp(MAIL_WEBMAIL_URL)}><Copy size={14} /> Copy webmail</button>
          <button type="button" onClick={exportBackup}><Save size={14} /> Export backup</button>
          <button type="button" onClick={() => importRef.current?.click()}><FilePlus2 size={14} /> Import backup</button>
        </div>
        <small>{vaultStatus}</small>
      </div>

      <div className="vault-list">
        {vault.length ? vault.map((item) => (
          <div key={item.id} className="vault-row">
            <strong>{item.service}</strong>
            <span>{item.email}</span>
            <code>{item.password}</code>
            <small>{item.createdAt}</small>
            <button type="button" onClick={() => cp(item.email)}><Copy size={14} /> Email</button>
            <button type="button" onClick={() => cp(item.username)}><Copy size={14} /> User</button>
            <button type="button" onClick={() => cp(item.password)}><Copy size={14} /> Pass</button>
            <button type="button" onClick={() => copyKit(item)}><Copy size={14} /> Kit</button>
            <button type="button" onClick={() => remove(item.id)} aria-label={`Delete ${item.service}`}>
              <X size={14} />
            </button>
          </div>
        )) : <p>No encrypted account kits yet.</p>}
      </div>
    </div>
  );
}

function Base64App() {
  const [plain, setPlain] = useState('Thanatos OS');
  const [encoded, setEncoded] = useState('');
  const encode = () => setEncoded(btoa(String.fromCharCode(...new TextEncoder().encode(plain))));
  const decode = () => { try { setPlain(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)))); } catch { setPlain('decode failed'); } };
  return (
    <div className="split-panel compact">
      <textarea value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="Plain text..." />
      <textarea value={encoded} onChange={(e) => setEncoded(e.target.value)} placeholder="Base64..." />
      <button type="button" onClick={encode}>Encode →</button>
      <button type="button" onClick={decode}>← Decode</button>
    </div>
  );
}

function RegexTesterApp() {
  const [pattern, setPattern] = useState('death|blood|skull');
  const [sample, setSample] = useState('the death kernel bleeds red skull light into the blood dark');
  const [flags, setFlags] = useState('gi');
  const result = useMemo(() => {
    try {
      const matches = [...sample.matchAll(new RegExp(pattern, flags))].map((m) => m[0]);
      const hl = sample.replace(new RegExp(pattern, flags), (m) => `【${m}】`);
      return { matches, hl, error: '' };
    } catch (e) { return { matches: [], hl: '', error: e instanceof Error ? e.message : 'Invalid' }; }
  }, [pattern, sample, flags]);
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="regex..." style={{ flex: 1 }} />
        <input value={flags} onChange={(e) => setFlags(e.target.value)} style={{ width: 56 }} placeholder="flags" />
      </div>
      <textarea value={sample} onChange={(e) => setSample(e.target.value)} />
      {result.error && <div className="vfs-error">{result.error}</div>}
      <code style={{ padding: 12 }}>{result.hl || 'matches shown here'}</code>
      <small style={{ color: '#c7a45e' }}>{result.matches.length} match(es): {result.matches.join(', ')}</small>
    </div>
  );
}

function QrCodeApp() {
  const [text, setText] = useState('https://github.com/deathdopest-sketch/thanatos-os');
  const [dataUrl, setDataUrl] = useState('');
  const [err, setErr] = useState('');
  const gen = async () => { try { setDataUrl(await QRCode.toDataURL(text, { color: { dark: '#ff0030', light: '#030101' }, width: 280, margin: 2 })); setErr(''); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } };
  useEffect(() => { void gen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="qr-app">
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void gen()} />
      <button type="button" onClick={() => void gen()}><QrCode size={15} /> Generate</button>
      {err && <div className="vfs-error">{err}</div>}
      {dataUrl && <img src={dataUrl} alt="QR" className="qr-image" />}
      {dataUrl && <a href={dataUrl} download="thanatos-qr.png"><button type="button"><Save size={15} /> Download</button></a>}
    </div>
  );
}

function MinifierApp() {
  const [input, setInput] = useState('body {\n  background: #000;\n  color: #fff;\n}');
  const [output, setOutput] = useState('');
  const [type, setType] = useState<'js' | 'css' | 'html'>('css');
  const minify = () => {
    let r = input.replace(/\/\*[\s\S]*?\*\//g, '');
    if (type === 'js') r = r.replace(/\/\/[^\n]*/g, '');
    if (type === 'html') r = r.replace(/<!--[\s\S]*?-->/g, '');
    setOutput(r.replace(/\s*([{}:;,>~+|=])\s*/g, '$1').replace(/\s+/g, ' ').trim());
  };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="api-method-select">
          <option value="js">JS</option><option value="css">CSS</option><option value="html">HTML</option>
        </select>
        <button type="button" onClick={minify}><Shuffle size={15} /> Minify</button>
        {output && <button type="button" onClick={() => cp(output)}><Copy size={15} /> Copy</button>}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      {output && <textarea value={output} readOnly />}
    </div>
  );
}

function LoremIpsumApp() {
  const [count, setCount] = useState(3);
  const [type, setType] = useState<'words' | 'sentences' | 'paragraphs'>('paragraphs');
  const [output, setOutput] = useState('');
  const gen = () => {
    const w = () => LOREM[Math.floor(Math.random() * LOREM.length)];
    const sent = () => Array.from({ length: 8 + Math.floor(Math.random() * 8) }, (_, i) => i === 0 ? w().charAt(0).toUpperCase() + w().slice(1) : w()).join(' ') + '.';
    const para = () => Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sent).join(' ');
    if (type === 'words') setOutput(Array.from({ length: count }, w).join(' '));
    else if (type === 'sentences') setOutput(Array.from({ length: count }, sent).join(' '));
    else setOutput(Array.from({ length: count }, para).join('\n\n'));
  };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="number" value={count} min={1} max={20} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 60 }} />
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="api-method-select">
          <option value="words">Words</option><option value="sentences">Sentences</option><option value="paragraphs">Paragraphs</option>
        </select>
        <button type="button" onClick={gen}><Wand2 size={15} /> Generate</button>
        {output && <button type="button" onClick={() => cp(output)}><Copy size={15} /> Copy</button>}
      </div>
      <textarea value={output} readOnly style={{ minHeight: 180 }} placeholder="Generated text here..." />
    </div>
  );
}

function UrlShortenerApp() {
  const [url, setUrl] = useState('');
  const [aliases, setAliases] = useState<Array<{ key: string; target: string }>>([]);
  const shorten = () => { if (!url.trim()) return; setAliases((p) => [{ key: nanoid(6), target: url }, ...p]); setUrl(''); };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && shorten()} placeholder="https://..." style={{ flex: 1 }} />
        <button type="button" onClick={shorten}><Fingerprint size={15} /> Shorten</button>
      </div>
      <div className="url-list">
        {aliases.map((a) => <div key={a.key} className="url-row"><code>/{a.key}</code><span>→</span><span className="url-target">{a.target}</span><button type="button" onClick={() => cp(a.target)}><Copy size={12} /></button></div>)}
        {aliases.length === 0 && <p style={{ color: '#c6b7aa', margin: 0 }}>No aliases yet. Session only.</p>}
      </div>
    </div>
  );
}

function ManPagesApp() {
  const [cmd, setCmd] = useState('ls');
  const commands = Object.keys(MAN_DB);
  const content = MAN_DB[cmd] ?? (commands.filter((c) => c.startsWith(cmd.toLowerCase())).length > 0 ? `Did you mean: ${commands.filter((c) => c.startsWith(cmd.toLowerCase())).join(', ')}?` : `Not found. Try: ${commands.slice(0, 8).join(', ')}`);
  return (
    <div className="man-app">
      <div className="man-search"><Search size={15} style={{ color: '#c7a45e', flexShrink: 0 }} /><input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Search command..." /></div>
      <div className="man-layout">
        <div className="man-sidebar">{commands.map((c) => <button key={c} type="button" className={c === cmd ? 'selected' : ''} onClick={() => setCmd(c)}>{c}</button>)}</div>
        <pre className="man-content">{content}</pre>
      </div>
    </div>
  );
}

function NetworkMonitorApp() {
  const [data, setData] = useState<PingPoint[]>([]);
  const [running, setRunning] = useState(false);
  const intv = useRef(0);
  const start = () => {
    setRunning(true); setData([]);
    intv.current = window.setInterval(() => {
      const spike = Math.random() > 0.93;
      const ms = Math.round(18 + Math.random() * 64 + (spike ? 180 + Math.random() * 120 : 0));
      setData((p) => [...p.slice(-50), { t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), ms }]);
    }, 800);
  };
  const stop = () => { window.clearInterval(intv.current); setRunning(false); };
  useEffect(() => () => window.clearInterval(intv.current), []);
  const last = data[data.length - 1];
  return (
    <div className="network-app">
      <div className="network-toolbar">
        {!running ? <button type="button" onClick={start}><Network size={15} /> Start Monitor</button> : <button type="button" onClick={stop}><X size={15} /> Stop</button>}
        {last && <code className="ping-display">{last.ms}ms</code>}
        {last && <span className={clsx('ping-label', last.ms > 150 ? 'ping-bad' : last.ms > 80 ? 'ping-warn' : 'ping-good')}>{last.ms > 150 ? 'SPIKE' : last.ms > 80 ? 'HIGH' : 'OK'}</span>}
      </div>
      <div className="network-chart">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <YAxis domain={[0, 400]} tick={{ fill: '#c7a45e', fontSize: 11 }} width={36} />
            <Tooltip contentStyle={{ background: '#0a0305', border: '1px solid rgba(255,0,48,.3)', color: '#fff4ec', fontSize: 12 }} />
            <Line type="monotone" dataKey="ms" stroke="#ff315e" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="media-status">Simulated latency graph. Use bridge daemon for real metrics.</p>
    </div>
  );
}

function ColorPickerApp() {
  const [color, setColor] = useState('#8f001d');
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return (
    <div className="color-panel">
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      <div style={{ background: color }} />
      <div className="color-values">
        <code onClick={() => cp(color)} title="Copy">{color}</code>
        <code onClick={() => cp(`rgb(${r},${g},${b})`)} title="Copy">rgb({r},{g},{b})</code>
        <small style={{ color: '#c7a45e' }}>Click values to copy</small>
      </div>
    </div>
  );
}

function RemoteControlApp() {
  const [wsUrl, setWsUrl] = useState('ws://localhost:6660');
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>(['Thanatos Remote Bridge — not connected.', 'Start bridge/thanatos-bridge.py on your PC.', 'Use Tailscale: set THANATOS_BIND to your PC\'s Tailscale IP.']);
  const [cmd, setCmd] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => { setLog((p) => [...p.slice(-200), msg]); window.requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }); };

  const connect = () => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => addLog('[bridge] connected — authenticating...');
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as BridgeMsg;
        if (msg.type === 'hello') { addLog(`[bridge] ${String(msg.payload)}`); ws.send(JSON.stringify({ type: 'auth', payload: token })); }
        else if (msg.type === 'auth' && msg.payload === 'ok') { setConnected(true); addLog('[bridge] authenticated ✓ — remote shell ready'); }
        else if (msg.type === 'auth' && msg.payload === 'denied') { addLog('[bridge] AUTH DENIED — check token'); ws.close(); }
        else if (msg.type === 'output') { addLog(String(msg.payload)); }
      } catch { addLog(e.data as string); }
    };
    ws.onclose = () => { setConnected(false); addLog('[bridge] disconnected'); };
    ws.onerror = () => addLog('[bridge] error — is the daemon running?');
    wsRef.current = ws;
  };
  const disconnect = () => { wsRef.current?.close(); wsRef.current = null; };
  const sendCmd = () => {
    if (!cmd.trim() || !wsRef.current || !connected) return;
    wsRef.current.send(JSON.stringify({ type: 'exec', payload: cmd }));
    addLog(`> ${cmd}`); setCmd('');
  };
  useEffect(() => () => { wsRef.current?.close(); }, []);

  return (
    <div className="remote-app">
      <div className="remote-toolbar">
        <Wifi size={15} style={{ color: connected ? '#5effa4' : '#ff315e', flexShrink: 0 }} />
        <input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} style={{ flex: 1 }} disabled={connected} placeholder="ws://..." />
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="token" type="password" style={{ width: 110 }} disabled={connected} />
        {!connected ? <button type="button" onClick={connect}><Send size={15} /> Connect</button> : <button type="button" onClick={disconnect}><X size={15} /> Disconnect</button>}
      </div>
      <div className="terminal-output remote-log" ref={logRef}>{log.map((l, i) => <p key={i}>{l}</p>)}</div>
      <div className="terminal-input">
        <span>$</span>
        <input value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendCmd()} disabled={!connected} placeholder={connected ? 'Send command to PC...' : 'Connect first...'} autoComplete="off" />
        <button type="button" onClick={sendCmd} disabled={!connected}><Play size={15} /></button>
      </div>
    </div>
  );
}

// ─── mumble chat ──────────────────────────────────────────────────────────────

function MumbleChatApp() {
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [stats, setStats] = useState<MumbleChatStats>({
    loggedIn: null, userId: null, username: null, displayName: null, avatarUrl: null,
    unreadPms: null, onlineFriends: [], offlineFriends: [], totalFriends: null, lastUpdated: null,
    status: 'idle', message: 'Sign in inside the frame. Polls every 30s.'
  });

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin !== 'https://mumblechat.online') return;
      const p = e.data as MumbleChatPayload;
      if (p.type !== 'mumblechat:stats') return;
      setStats({
        loggedIn: typeof p.loggedIn === 'boolean' ? p.loggedIn : null,
        userId: typeof p.userId === 'number' ? p.userId : null,
        username: typeof p.username === 'string' ? p.username : null,
        displayName: typeof p.displayName === 'string' ? p.displayName : null,
        avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl : null,
        unreadPms: typeof p.unreadPms === 'number' ? p.unreadPms : null,
        onlineFriends: Array.isArray(p.onlineFriends) ? p.onlineFriends.map(String) : [],
        offlineFriends: Array.isArray(p.offlineFriends) ? p.offlineFriends.map(String) : [],
        totalFriends: typeof p.totalFriends === 'number' ? p.totalFriends : null,
        lastUpdated: new Date().toLocaleTimeString(),
        status: p.loggedIn === false ? 'unavailable' : 'online',
        message: p.loggedIn === false ? 'Not logged in.' : 'Live stats received.'
      });
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);

  const requestStats = useCallback(() => {
    setStats((s) => ({ ...s, status: 'checking', message: frameLoaded ? 'Requesting stats...' : 'Waiting for frame...' }));
    const frame = document.querySelector<HTMLIFrameElement>('#mumblechat-frame');
    frame?.contentWindow?.postMessage({ type: 'thanatos:request-stats' }, 'https://mumblechat.online');
    window.setTimeout(() => setStats((s) => s.status !== 'checking' ? s : { ...s, status: 'blocked', lastUpdated: new Date().toLocaleTimeString(), message: 'No response from MumbleChat.' }), 1800);
  }, [frameLoaded]);

  useEffect(() => { const p = window.setInterval(requestStats, 30_000); return () => window.clearInterval(p); }, [frameKey, requestStats]);

  return (
    <div className="mumblechat-app">
      <div className="mumblechat-toolbar">
        <button type="button" onClick={requestStats}><RefreshCcw size={15} /> Stats</button>
        <button type="button" onClick={() => { setFrameLoaded(false); setFrameKey((k) => k + 1); }}><RefreshCcw size={15} /> Reload</button>
        <a href="https://mumblechat.online" target="_blank" rel="noreferrer"><Globe size={15} /> Open</a>
      </div>
      <div className="mumblechat-layout">
        <iframe key={frameKey} id="mumblechat-frame" title="MumbleChat" src="https://mumblechat.online" referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" onLoad={() => { setFrameLoaded(true); window.setTimeout(requestStats, 900); }} />
        <aside className="mumblechat-stats">
          <h3>Live Stats</h3>
          <div className={`status-orb ${stats.status}`} />
          <div className="mumblechat-profile">
            {stats.avatarUrl ? <img src={stats.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div>{(stats.displayName ?? stats.username ?? '?').slice(0, 1)}</div>}
            <span>{stats.displayName ?? stats.username ?? 'Unknown'}</span>
          </div>
          <dl>
            <dt>Login</dt><dd>{stats.loggedIn === null ? 'unknown' : stats.loggedIn ? 'logged in' : 'logged out'}</dd>
            <dt>Username</dt><dd>{stats.username ?? 'unknown'}</dd>
            <dt>Unread PMs</dt><dd>{stats.unreadPms ?? 'unknown'}</dd>
            <dt>Online Friends</dt><dd>{stats.onlineFriends.length ? stats.onlineFriends.join(', ') : 'none'}</dd>
            <dt>Updated</dt><dd>{stats.lastUpdated ?? 'never'}</dd>
          </dl>
          <p>{stats.message}</p>
        </aside>
      </div>
    </div>
  );
}

// ─── private apps ─────────────────────────────────────────────────────────────

function SlotMachineApp() {
  const symbols = ['☠', '\u{1F578}', '⚰', '\u{1F339}', '\u{1F52E}', '\u{1F987}', '☠', '\u{1F56F}'];
  const [reels, setReels] = useState(['☠', '\u{1F578}', '☠']);
  const [spinning, setSpinning] = useState(false);
  const [msg, setMsg] = useState('Pull the lever...');
  const spin = () => {
    setSpinning(true); setMsg('Spinning...');
    let ticks = 0;
    const iv = window.setInterval(() => {
      setReels([symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]]);
      ticks++;
      if (ticks >= 18) {
        window.clearInterval(iv);
        const final = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
        setReels(final); setSpinning(false);
        setMsg(final[0] === final[1] && final[1] === final[2] ? '☠ JACKPOT ☠' : final[0] === final[1] || final[1] === final[2] ? 'Close... death teases.' : 'No match. Death waits.');
      }
    }, 80);
  };
  return (
    <div className="slot-machine">
      <div className="slot-reels">{reels.map((s, i) => <div key={i} className={clsx('slot-reel', spinning && 'spinning')}>{s}</div>)}</div>
      <button type="button" onClick={spin} disabled={spinning} className="slot-btn">{spinning ? 'Spinning...' : '☠ PULL ☠'}</button>
      <p className="slot-msg">{msg}</p>
    </div>
  );
}

function LoveDiceApp() {
  const dares = ['Whisper your darkest secret.', 'Send a midnight message.', 'Draw something hauntingly beautiful.', 'Listen to a sad song together.', 'Write three lines of dark poetry.', 'Describe your ideal underworld date.', 'Name something that makes your soul ache.', 'Tell me what color your heartbreak is.', 'Confess a forbidden thought.', 'Describe your shadow self.'];
  const [result, setResult] = useState<{ d1: number; d2: number; dare: string } | null>(null);
  const roll = () => { const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6); setResult({ d1, d2, dare: dares[Math.floor(Math.random() * dares.length)] }); };
  return (
    <div className="love-dice-app">
      <button type="button" onClick={roll} className="slot-btn">🎲 Roll the Bones 🎲</button>
      {result && <div className="dice-result"><div className="dice-faces"><div className="dice-face">{result.d1}</div><span>+</span><div className="dice-face">{result.d2}</div><span>= {result.d1 + result.d2}</span></div><div className="dice-dare">{result.dare}</div></div>}
    </div>
  );
}

function PrivateGate({ app }: { app: ThanatosApp }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const unlock = () => setUnlocked(pin === '1313');
  if (unlocked) {
    if (app.id === 'slots') return <SlotMachineApp />;
    if (app.id === 'dice') return <LoveDiceApp />;
    if (app.id === 'story') return <NotesApp />;
    return <div className="private-panel"><Skull size={48} /><h3>{app.name}</h3><p>Vault unlocked for this session.</p></div>;
  }
  return (
    <div className="private-panel">
      <Lock size={44} />
      <h3>{app.name}</h3>
      <p>PIN-protected vault</p>
      <input value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="PIN" type="password" />
      <button type="button" onClick={unlock}>Unlock</button>
      <small>dev PIN: 1313</small>
    </div>
  );
}

function GenericWorkingApp({ app }: { app: ThanatosApp }) {
  const [out, setOut] = useState(`${app.name} ready.`);
  return (
    <div className="generic-app">
      <app.icon size={42} />
      <h3>{app.name}</h3>
      <p>{app.description}</p>
      <button type="button" onClick={() => setOut(`${app.name} at ${new Date().toLocaleTimeString()}`)}><Play size={15} /> Run</button>
      <code>{out}</code>
    </div>
  );
}

// ─── routing ──────────────────────────────────────────────────────────────────

function AppContent({ app, openWindows, theme, session, onSessionChange, onThemeChange }: { app: ThanatosApp; openWindows: OpenWindow[]; theme: ThanatosTheme; session: AccessSession | null; onSessionChange: (session: AccessSession | null) => void; onThemeChange: (t: ThanatosTheme) => void }) {
  if (app.locked) return <PrivateGate app={app} />;
  switch (app.id) {
    case 'terminal': return <TerminalApp openWindows={openWindows} session={session} onSessionChange={onSessionChange} />;
    case 'files': return <FileManagerApp />;
    case 'mail': return <MailApp />;
    case 'mumblechat': return <MumbleChatApp />;
    case 'settings': return <SettingsApp theme={theme} onThemeChange={onThemeChange} />;
    case 'tasks': return <TaskManagerApp openWindows={openWindows} />;
    case 'clock': return <ClockApp />;
    case 'calculator': return <CalculatorApp />;
    case 'notes': case 'writer': return <NotesApp />;
    case 'markdown': return <MarkdownApp />;
    case 'calendar': return <CalendarApp />;
    case 'weather': return <WeatherApp />;
    case 'paint': return <PaintApp />;
    case 'camera': return <CameraApp />;
    case 'recorder': return <VoiceRecorderApp />;
    case 'video': return <VideoPlayerApp />;
    case 'image': return <ImageViewerApp />;
    case 'music': return <MusicPlayerApp />;
    case 'pdf': return <PdfViewerApp />;
    case 'visualizer': return <AudioVisualizerApp theme={theme} />;
    case 'vscode': return <CodeStudioApp />;
    case 'compiler': return <CompilerApp />;
    case 'git': return <GitClientApp />;
    case 'api': return <ApiClientApp />;
    case 'json': return <JsonFormatterApp />;
    case 'diff': return <DiffCheckerApp />;
    case 'hex': return <HexEditorApp />;
    case 'hash': return <HashGeneratorApp />;
    case 'passwords': return <PasswordGeneratorApp session={session} />;
    case 'regex': return <RegexTesterApp />;
    case 'base64': return <Base64App />;
    case 'qr': return <QrCodeApp />;
    case 'minifier': return <MinifierApp />;
    case 'lorem': return <LoremIpsumApp />;
    case 'shortener': return <UrlShortenerApp />;
    case 'man': return <ManPagesApp />;
    case 'network': return <NetworkMonitorApp />;
    case 'colors': return <ColorPickerApp />;
    case 'remote': return <RemoteControlApp />;
    default: return <GenericWorkingApp app={app} />;
  }
}

// ─── window ───────────────────────────────────────────────────────────────────

function DesktopWindow({ openWindow, active, openWindows, theme, session, onSessionChange, onThemeChange, onFocus, onMove, onResize, onClose, onMinimize, onMaximize }: { openWindow: OpenWindow; active: boolean; openWindows: OpenWindow[]; theme: ThanatosTheme; session: AccessSession | null; onSessionChange: (session: AccessSession | null) => void; onThemeChange: (t: ThanatosTheme) => void; onFocus: () => void; onMove: (x: number, y: number) => void; onResize: (width: number, height: number, x: number, y: number) => void; onClose: () => void; onMinimize: () => void; onMaximize: () => void }) {
  if (openWindow.minimized) return null;
  const size = openWindow.maximized ? { width: Math.max(360, window.innerWidth - 24), height: Math.max(260, window.innerHeight - 86) } : { width: openWindow.width, height: openWindow.height };
  const position = openWindow.maximized ? { x: 12, y: 12 } : { x: openWindow.x, y: openWindow.y };
  return (
    <Rnd
      bounds="parent"
      size={size}
      position={position}
      disableDragging={openWindow.maximized}
      enableResizing={!openWindow.maximized}
      minWidth={360}
      minHeight={260}
      dragHandleClassName="window-titlebar"
      style={{ zIndex: openWindow.z }}
      onMouseDown={onFocus}
      onDragStop={(_, data) => onMove(data.x, data.y)}
      onResizeStop={(_, __, ref, ___, nextPosition) => onResize(ref.offsetWidth, ref.offsetHeight, nextPosition.x, nextPosition.y)}
      className={clsx('desktop-window', active && 'active-window')}
    >
      <div className="window-titlebar">
        <div className="window-title"><openWindow.app.icon size={17} /><span>{openWindow.app.name}</span></div>
        <div className="window-controls">
          <button type="button" aria-label="Minimize" onClick={onMinimize}><Minus size={15} /></button>
          <button type="button" aria-label="Maximize" onClick={onMaximize}><Maximize2 size={15} /></button>
          <button type="button" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
      </div>
      <div className="window-content"><AppContent app={openWindow.app} openWindows={openWindows} theme={theme} session={session} onSessionChange={onSessionChange} onThemeChange={onThemeChange} /></div>
    </Rnd>
  );
}

// ─── start menu ───────────────────────────────────────────────────────────────

const SM_CATS: { id: AppCategory | 'All'; label: string; Icon: LucideIcon }[] = [
  { id: 'All', label: 'All Apps', Icon: LayoutGrid },
  { id: 'System', label: 'System', Icon: Monitor },
  { id: 'Media', label: 'Media', Icon: Film },
  { id: 'Developer', label: 'Developer', Icon: Code2 },
  { id: 'Private', label: 'Private', Icon: Shield },
];

function StartMenu({ onLaunch }: { onLaunch: (app: ThanatosApp) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AppCategory | 'All'>('All');

  const filtered = appRegistry.filter((a) => {
    const matchCat = category === 'All' || a.category === category;
    const matchQ = query === '' || `${a.name} ${a.description}`.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <motion.div
      className="start-menu"
      initial={{ opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 14 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <div className="sm-header">
        <div className="sm-logo">
          <Skull size={18} />
          <span>THANATOS OS</span>
        </div>
        <div className="sm-search-wrap">
          <Search size={13} className="sm-search-icon" />
          <input
            className="sm-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications..."
            autoFocus
          />
          {query && (
            <button type="button" className="sm-search-clear" onClick={() => setQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="sm-body">
        <nav className="sm-sidebar">
          {SM_CATS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={clsx('sm-cat-btn', category === id && 'active')}
              onClick={() => { setCategory(id); setQuery(''); }}
            >
              <Icon size={15} />
              <span className="sm-cat-label">{label}</span>
              {id !== 'All' && (
                <span className="sm-cat-count">
                  {appRegistry.filter((a) => a.category === id).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sm-content">
          <div className="sm-section-label">
            {query ? `Results for "${query}"` : category === 'All' ? 'All Applications' : category}
            <span className="sm-count-chip">{filtered.length}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="sm-empty">No applications found</div>
          ) : (
            <div className="sm-app-grid">
              {filtered.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className={clsx('sm-app-card', app.locked && 'locked')}
                  onClick={() => onLaunch(app)}
                >
                  <div className="sm-app-icon">
                    <app.icon size={19} />
                  </div>
                  <div className="sm-app-info">
                    <div className="sm-app-name">
                      {app.name}
                      {app.locked && <Lock size={9} />}
                    </div>
                    <div className="sm-app-desc">{app.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── main desktop ─────────────────────────────────────────────────────────────

function getDefaultWindowSize(appId: string) {
  if (appId === 'mumblechat') return { width: Math.min(1160, window.innerWidth - 48), height: Math.min(760, window.innerHeight - 112), maximized: true };
  if (appId === 'visualizer') return { width: 760, height: 720, maximized: false };
  if (appId === 'music') return { width: 760, height: 620, maximized: false };
  if (appId === 'passwords') return { width: 900, height: 680, maximized: false };
  return { width: 780, height: 520, maximized: false };
}

function readWindowState() {
  try {
    return JSON.parse(readStoredValue(WINDOW_STATE_KEY) ?? '{}') as Record<string, Pick<OpenWindow, 'x' | 'y' | 'width' | 'height' | 'maximized'>>;
  } catch {
    return {};
  }
}

function writeWindowState(appId: string, state: Pick<OpenWindow, 'x' | 'y' | 'width' | 'height' | 'maximized'>) {
  writeStoredValue(WINDOW_STATE_KEY, JSON.stringify({ ...readWindowState(), [appId]: state }));
}

export function ThanatosDesktop() {
  const [booted, setBooted] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [session, setSession] = useState<AccessSession | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [theme, setTheme] = useState<ThanatosTheme>(() => {
    const s = localStorage.getItem('thanatos.theme');
    return s === 'death' || s === 'zombitious' || s === 'lilly' || s === 'lilly-garden' ? s : 'lilly';
  });
  const handleBootDone = useCallback(() => setBooted(true), []);
  useEffect(() => { const i = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(i); }, []);
  const changeTheme = useCallback((t: ThanatosTheme) => { setTheme(t); localStorage.setItem('thanatos.theme', t); }, []);
  const topZ = windows.reduce((m, w) => Math.max(m, w.z), 10);
  const activeId = windows.reduce((h, w) => (w.z > h.z ? w : h), windows[0] ?? { id: '', z: 0 }).id;

  const launch = (app: ThanatosApp) => {
    setWindows((ws) => {
      const ex = ws.find((w) => w.app.id === app.id);
      if (ex) return ws.map((w) => w.id === ex.id ? { ...w, minimized: false, z: topZ + 1 } : w);
      const id = nanoid();
      const placementSeed = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const saved = readWindowState()[app.id];
      const defaults = getDefaultWindowSize(app.id);
      const defaultWidth = saved?.width ?? defaults.width;
      const defaultHeight = saved?.height ?? defaults.height;
      const defaultX = saved?.x ?? (app.id === 'mumblechat' ? Math.max(18, (window.innerWidth - defaultWidth) / 2) : 58 + (placementSeed % 7) * 28);
      const defaultY = saved?.y ?? (app.id === 'mumblechat' ? 18 : 44 + (placementSeed % 5) * 24);
      return [...ws, {
        id,
        app,
        z: topZ + 1,
        minimized: false,
        maximized: saved?.maximized ?? defaults.maximized,
        x: Math.max(8, Math.min(defaultX, window.innerWidth - 120)),
        y: Math.max(8, Math.min(defaultY, window.innerHeight - 140)),
        width: defaultWidth,
        height: defaultHeight
      }];
    });
    setStartOpen(false);
  };

  const patch = (id: string, p: Partial<OpenWindow>) => setWindows((ws) => ws.map((w) => {
    if (w.id !== id) return w;
    const next = { ...w, ...p };
    writeWindowState(next.app.id, { x: next.x, y: next.y, width: next.width, height: next.height, maximized: next.maximized });
    return next;
  }));

  return (
    <main className={`desktop-shell theme-${theme}`}>
      {!booted ? <BootLayer onDone={handleBootDone} /> : null}
      <div className="desktop-wallpaper" />
      <div className="sprite-background" aria-hidden="true" />
      <BloodDrips />
      <div className="blood-rain" />
      <div className="crt-overlay" />
      <div className="audio-curse" aria-hidden="true" />
      {booted ? <QuoteFlash /> : null}
      <SkullFlash />
      <div className="death-brand"><Skull size={38} /><span>THANATOS</span></div>
      <div className="window-layer">
        {windows.map((w) => (
          <DesktopWindow key={w.id} openWindow={w} openWindows={windows} theme={theme} session={session} onSessionChange={setSession} onThemeChange={changeTheme} active={w.id === activeId}
            onFocus={() => patch(w.id, { z: topZ + 1 })}
            onMove={(x, y) => patch(w.id, { x, y })}
            onResize={(width, height, x, y) => patch(w.id, { width, height, x, y })}
            onClose={() => setWindows((ws) => ws.filter((x) => x.id !== w.id))}
            onMinimize={() => patch(w.id, { minimized: true })}
            onMaximize={() => patch(w.id, { maximized: !w.maximized, z: topZ + 1 })} />
        ))}
      </div>
      <AnimatePresence>{startOpen ? <StartMenu onLaunch={launch} /> : null}</AnimatePresence>
      <nav className="taskbar">
        <button type="button" className={clsx('tb-start', startOpen && 'open')} onClick={() => setStartOpen((v) => !v)}>
          <Skull size={16} />
          <span>Thanatos</span>
        </button>
        <div className="tb-apps">
          {windows.map((w) => (
            <button
              key={w.id}
              type="button"
              className={clsx('tb-app', w.id === activeId && !w.minimized && 'active')}
              onClick={() => patch(w.id, { minimized: false, z: topZ + 1 })}
            >
              <w.app.icon size={14} />
              <span className="tb-app-label">{w.app.name}</span>
            </button>
          ))}
        </div>
        <div className="tb-tray">
          <ShieldCheck size={14} />
          <div className="tb-clock">
            <span className="tb-clock-time">{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="tb-clock-date">{clock.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </nav>
    </main>
  );
}
