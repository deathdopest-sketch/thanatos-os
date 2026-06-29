import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Copy,
  Eraser,
  Eye,
  File,
  FilePlus2,
  FileText,
  Fingerprint,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Hash,
  Image,
  Lock,
  Mail,
  Maximize2,
  MessageCircle,
  Mic,
  Minus,
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
  Settings,
  ShieldCheck,
  Shuffle,
  Skull,
  Square,
  StickyNote,
  TerminalSquare,
  Wand2,
  Wifi,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { appCategories, appRegistry, type AppCategory, type ThanatosApp } from './apps';
import { normalizePath } from './lib/vfs';
import { useVfsListing } from './lib/use-vfs-listing';

// ─── types ────────────────────────────────────────────────────────────────────

type OpenWindow = { id: string; app: ThanatosApp; z: number; minimized: boolean; maximized: boolean };
type ThanatosTheme = 'lilly' | 'death' | 'zombitious';
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

// ─── constants ────────────────────────────────────────────────────────────────

const CMDS = ['help', 'status', 'apps', 'date', 'skull', 'clear', 'ls', 'whoami', 'uname'];

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

// ─── system apps ──────────────────────────────────────────────────────────────

function TerminalApp({ openWindows }: { openWindows: OpenWindow[] }) {
  const [lines, setLines] = useState<string[]>(['thanatos@crypt:~$ status', 'death kernel awake', 'vfs: indexeddb', 'remote bridge: offline', '', 'type "help" for commands']);
  const [input, setInput] = useState('');
  const outRef = useRef<HTMLDivElement>(null);

  const run = () => {
    const cmd = input.trim();
    if (!cmd) return;
    if (cmd === 'clear') { setLines([]); setInput(''); return; }
    const out: Record<string, string[]> = {
      help: [`commands: ${CMDS.join(', ')}`],
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
      // eslint-disable-next-line no-new-func
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

function ClockApp() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(i); }, []);
  return <div className="clock-panel"><strong>{now.toLocaleTimeString()}</strong><span>{now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>;
}

function SettingsApp({ theme, onThemeChange }: { theme: ThanatosTheme; onThemeChange: (t: ThanatosTheme) => void }) {
  const [crt, setCrt] = useState(true);
  const [vol, setVol] = useState(85);
  return (
    <div className="settings-grid">
      <section className="theme-section">
        <h3>Theme</h3>
        <div className="theme-options">
          {(['lilly','death','zombitious'] as ThanatosTheme[]).map((t) => (
            <button key={t} type="button" className={theme === t ? 'selected' : ''} onClick={() => onThemeChange(t)}>
              {t === 'lilly' ? 'Lilly' : t === 'death' ? 'Death' : 'zomBitious'}
            </button>
          ))}
        </div>
        <p>{theme === 'death' ? 'Reaper active.' : theme === 'zombitious' ? 'zomBitious active.' : 'Lilly active.'}</p>
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
  const [playlist, setPlaylist] = useState<Array<{ name: string; url: string }>>([]);
  const [current, setCurrent] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="music-player-app">
      <input ref={inputRef} type="file" accept="audio/*" multiple onChange={(e) => { setPlaylist(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))); setCurrent(0); }} style={{ display: 'none' }} />
      {playlist.length === 0 ? <div className="player-empty"><Music size={48} /><p>No tracks</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Music</button></div>
        : <>
            <div className="music-now-playing"><Music size={28} /><span>{playlist[current]?.name ?? ''}</span></div>
            <audio src={playlist[current]?.url} controls autoPlay onEnded={() => setCurrent((c) => (c + 1) % playlist.length)} className="music-audio" />
            <div className="music-controls">
              <button type="button" onClick={() => setCurrent((c) => (c - 1 + playlist.length) % playlist.length)}><ChevronLeft size={15} /></button>
              <span>{current + 1}/{playlist.length}</span>
              <button type="button" onClick={() => setCurrent((c) => (c + 1) % playlist.length)}><ChevronRight size={15} /></button>
              <button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Add</button>
            </div>
            <div className="music-playlist">
              {playlist.map((t, i) => <button key={t.url} type="button" className={clsx('playlist-item', i === current && 'active-track')} onClick={() => setCurrent(i)}><Music size={14} /><span>{t.name}</span></button>)}
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

function AudioVisualizerApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState('Share a browser tab with audio enabled to start.');
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0);

  const stop = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close();
    streamRef.current = null; ctxRef.current = null; setActive(false); setLevel(0);
    document.documentElement.style.setProperty('--audio-level', '0');
    document.documentElement.style.setProperty('--audio-bass', '0');
    document.documentElement.style.setProperty('--audio-mid', '0');
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    stop();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = stream.getAudioTracks();
      stream.getVideoTracks().forEach((t) => t.stop());
      if (!audioTracks.length) { stream.getTracks().forEach((t) => t.stop()); setStatus('No audio track. Enable "Share audio" when picking a tab.'); return; }
      const actx = new AudioContext();
      const analyser = actx.createAnalyser();
      analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.72;
      actx.createMediaStreamSource(new MediaStream(audioTracks)).connect(analyser);
      streamRef.current = stream; ctxRef.current = actx; setActive(true); setStatus('Audio curse active.');
      const freq = new Uint8Array(analyser.frequencyBinCount);
      const wave = new Uint8Array(analyser.fftSize);
      const canvas = canvasRef.current;
      const c2d = canvas?.getContext('2d');
      const draw = () => {
        analyser.getByteFrequencyData(freq); analyser.getByteTimeDomainData(wave);
        const bass = freq.slice(0, 24).reduce((s, v) => s + v, 0) / (24 * 255);
        const mid = freq.slice(24, 96).reduce((s, v) => s + v, 0) / (72 * 255);
        const intensity = freq.reduce((s, v) => s + v, 0) / (freq.length * 255);
        setLevel(intensity);
        document.documentElement.style.setProperty('--audio-level', intensity.toFixed(3));
        document.documentElement.style.setProperty('--audio-bass', bass.toFixed(3));
        document.documentElement.style.setProperty('--audio-mid', mid.toFixed(3));
        if (canvas && c2d) {
          const w = canvas.clientWidth * devicePixelRatio, h = canvas.clientHeight * devicePixelRatio;
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
          c2d.clearRect(0, 0, w, h); c2d.fillStyle = 'rgba(3,1,2,.44)'; c2d.fillRect(0, 0, w, h);
          c2d.save(); c2d.translate(w / 2, h / 2);
          const r = Math.min(w, h) * (0.16 + bass * 0.08);
          for (let i = 0; i < 96; i++) {
            const v = freq[i] / 255, len = r + v * Math.min(w, h) * 0.28;
            c2d.rotate((Math.PI * 2) / 96);
            c2d.strokeStyle = `rgba(255,${Math.floor(22 + v * 80)},${Math.floor(54 + mid * 80)},${0.35 + v * 0.55})`;
            c2d.lineWidth = 2 + v * 5; c2d.beginPath(); c2d.moveTo(r, 0); c2d.lineTo(len, 0); c2d.stroke();
          }
          c2d.restore();
          c2d.strokeStyle = `rgba(255,225,210,${0.26 + intensity * 0.42})`; c2d.lineWidth = 2; c2d.beginPath();
          wave.forEach((v, i) => { const x = (i / (wave.length - 1)) * w, y = h * 0.5 + ((v - 128) / 128) * h * (0.18 + mid * 0.18); i === 0 ? c2d.moveTo(x, y) : c2d.lineTo(x, y); });
          c2d.stroke();
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Capture failed.'); stop(); }
  };

  return (
    <div className="visualizer-app">
      <canvas ref={canvasRef} />
      <div className="visualizer-controls">
        <button type="button" onClick={() => void start()}><RadioTower size={15} /> Capture Audio</button>
        <button type="button" onClick={stop} disabled={!active}><X size={15} /> Stop</button>
        <span>{Math.round(level * 100)}%</span>
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
      // eslint-disable-next-line no-new-func
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

function PasswordGeneratorApp() {
  const [pw, setPw] = useState('');
  const [len, setLen] = useState(24);
  const gen = () => {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const v = crypto.getRandomValues(new Uint32Array(len));
    setPw(Array.from(v, (n) => a[n % a.length]).join(''));
  };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="number" value={len} min={8} max={64} onChange={(e) => setLen(Number(e.target.value))} style={{ width: 64 }} />
        <button type="button" onClick={gen}><RefreshCcw size={15} /> Generate</button>
      </div>
      <code style={{ wordBreak: 'break-all', padding: 12 }}>{pw || 'press generate'}</code>
      {pw && <button type="button" onClick={() => cp(pw)}><Copy size={15} /> Copy</button>}
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

function AppContent({ app, openWindows, theme, onThemeChange }: { app: ThanatosApp; openWindows: OpenWindow[]; theme: ThanatosTheme; onThemeChange: (t: ThanatosTheme) => void }) {
  if (app.locked) return <PrivateGate app={app} />;
  switch (app.id) {
    case 'terminal': return <TerminalApp openWindows={openWindows} />;
    case 'files': return <FileManagerApp />;
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
    case 'visualizer': return <AudioVisualizerApp />;
    case 'vscode': return <CodeStudioApp />;
    case 'compiler': return <CompilerApp />;
    case 'git': return <GitClientApp />;
    case 'api': return <ApiClientApp />;
    case 'json': return <JsonFormatterApp />;
    case 'diff': return <DiffCheckerApp />;
    case 'hex': return <HexEditorApp />;
    case 'hash': return <HashGeneratorApp />;
    case 'passwords': return <PasswordGeneratorApp />;
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

function DesktopWindow({ openWindow, active, openWindows, theme, onThemeChange, onFocus, onClose, onMinimize, onMaximize }: { openWindow: OpenWindow; active: boolean; openWindows: OpenWindow[]; theme: ThanatosTheme; onThemeChange: (t: ThanatosTheme) => void; onFocus: () => void; onClose: () => void; onMinimize: () => void; onMaximize: () => void }) {
  if (openWindow.minimized) return null;
  const seed = Array.from(openWindow.id).reduce((s, c) => s + c.charCodeAt(0), 0);
  const size = openWindow.maximized ? { width: 'calc(100vw - 24px)', height: 'calc(100vh - 86px)' } : { width: 780, height: 520 };
  const position = openWindow.maximized ? { x: 12, y: 12 } : { x: 58 + (seed % 7) * 28, y: 44 + (seed % 5) * 24 };
  return (
    <Rnd bounds="parent" size={size} position={position} disableDragging={openWindow.maximized} enableResizing={!openWindow.maximized} minWidth={360} minHeight={260} dragHandleClassName="window-titlebar" style={{ zIndex: openWindow.z }} onMouseDown={onFocus} className={clsx('desktop-window', active && 'active-window')}>
      <div className="window-titlebar">
        <div className="window-title"><openWindow.app.icon size={17} /><span>{openWindow.app.name}</span></div>
        <div className="window-controls">
          <button type="button" aria-label="Minimize" onClick={onMinimize}><Minus size={15} /></button>
          <button type="button" aria-label="Maximize" onClick={onMaximize}><Maximize2 size={15} /></button>
          <button type="button" aria-label="Close" onClick={onClose}><X size={15} /></button>
        </div>
      </div>
      <div className="window-content"><AppContent app={openWindow.app} openWindows={openWindows} theme={theme} onThemeChange={onThemeChange} /></div>
    </Rnd>
  );
}

// ─── start menu ───────────────────────────────────────────────────────────────

function StartMenu({ onLaunch }: { onLaunch: (app: ThanatosApp) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AppCategory>('System');
  const apps = appRegistry.filter((a) => a.category === category && `${a.name} ${a.description}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <motion.div className="start-menu" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}>
      <div className="start-menu-title"><Skull size={25} /><strong>Death Console</strong></div>
      <div className="search-row"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the underworld" autoFocus /></div>
      <div className="category-tabs">{appCategories.map((cat) => <button key={cat} type="button" className={cat === category ? 'selected' : ''} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
      <div className="app-grid">{apps.map((app) => <button key={app.id} type="button" className="launcher-tile" onClick={() => onLaunch(app)}><app.icon size={23} /><span>{app.name}</span>{app.locked ? <Lock size={13} /> : null}</button>)}</div>
    </motion.div>
  );
}

// ─── main desktop ─────────────────────────────────────────────────────────────

export function ThanatosDesktop() {
  const [booted, setBooted] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [clock, setClock] = useState(() => new Date());
  const [theme, setTheme] = useState<ThanatosTheme>(() => {
    const s = localStorage.getItem('thanatos.theme');
    return s === 'death' || s === 'zombitious' || s === 'lilly' ? s : 'lilly';
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
      return [...ws, { id: nanoid(), app, z: topZ + 1, minimized: false, maximized: false }];
    });
    setStartOpen(false);
  };

  const patch = (id: string, p: Partial<OpenWindow>) => setWindows((ws) => ws.map((w) => w.id === id ? { ...w, ...p } : w));

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
          <DesktopWindow key={w.id} openWindow={w} openWindows={windows} theme={theme} onThemeChange={changeTheme} active={w.id === activeId}
            onFocus={() => patch(w.id, { z: topZ + 1 })}
            onClose={() => setWindows((ws) => ws.filter((x) => x.id !== w.id))}
            onMinimize={() => patch(w.id, { minimized: true })}
            onMaximize={() => patch(w.id, { maximized: !w.maximized, z: topZ + 1 })} />
        ))}
      </div>
      <AnimatePresence>{startOpen ? <StartMenu onLaunch={launch} /> : null}</AnimatePresence>
      <nav className="taskbar">
        <button type="button" className="start-button" onClick={() => setStartOpen((v) => !v)}><Skull size={19} /><span>Thanatos</span></button>
        <div className="task-items">
          {windows.map((w) => <button key={w.id} type="button" className={clsx('task-item', w.id === activeId && !w.minimized && 'active-task')} onClick={() => patch(w.id, { minimized: false, z: topZ + 1 })}><w.app.icon size={16} /><span>{w.app.name}</span></button>)}
        </div>
        <div className="tray"><ShieldCheck size={17} /><span>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
      </nav>
    </main>
  );
}
