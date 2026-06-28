import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Rnd } from 'react-rnd';
import gsap from 'gsap';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
  ChevronUp,
  Eye,
  File,
  FilePlus2,
  Folder,
  FolderPlus,
  Globe,
  Lock,
  Maximize2,
  Minus,
  Play,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Skull,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { appCategories, appRegistry, type AppCategory, type ThanatosApp } from './apps';
import { normalizePath } from './lib/vfs';
import { useVfsListing } from './lib/use-vfs-listing';

type OpenWindow = {
  id: string;
  app: ThanatosApp;
  z: number;
  minimized: boolean;
  maximized: boolean;
};

type MumbleChatStats = {
  loggedIn: boolean | null;
  userId: number | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  unreadPms: number | null;
  onlineFriends: string[];
  offlineFriends: string[];
  totalFriends: number | null;
  lastUpdated: string | null;
  status: 'idle' | 'checking' | 'online' | 'unavailable' | 'blocked';
  message: string;
};

type MumbleChatStatsPayload = {
  type?: string;
  loggedIn?: unknown;
  userId?: unknown;
  username?: unknown;
  displayName?: unknown;
  avatarUrl?: unknown;
  unreadPms?: unknown;
  onlineFriends?: unknown;
  offlineFriends?: unknown;
  totalFriends?: unknown;
};

const bloodCommands = ['help', 'status', 'apps', 'date', 'skull', 'clear'];
const darkQuotes = [
  'EVERY PROCESS ENDS.',
  'THE KERNEL REMEMBERS THE DEAD.',
  'ALL WINDOWS CLOSE EVENTUALLY.',
  'ROOT WAITS BELOW.',
  'THE MACHINE BLEEDS IN SILENCE.',
  'NO DAEMON ESCAPES THE REAPER.',
  'YOUR SESSION HAS A GRAVE.',
  'ASH IS JUST MEMORY WITH THE LIGHT REMOVED.'
];

function AshField() {
  const positions = useMemo(() => {
    const points = new Float32Array(900 * 3);
    for (let index = 0; index < points.length; index += 3) {
      points[index] = (Math.random() - 0.5) * 28;
      points[index + 1] = (Math.random() - 0.5) * 18;
      points[index + 2] = (Math.random() - 0.5) * 18;
    }
    return points;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ff174d" size={0.038} transparent opacity={0.52} blending={2} depthWrite={false} />
    </points>
  );
}

function BootLayer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    let completed = false;
    const finish = () => {
      if (!completed) {
        completed = true;
        onDone();
      }
    };
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });
    const fallback = window.setTimeout(finish, 1900);
    timeline
      .fromTo('.boot-sigil', { rotate: -18, scale: 0.7, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 0.5 })
      .fromTo('.boot-glyph', { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.035, duration: 0.45 }, '-=0.18')
      .to('.boot-panel', { opacity: 0, scale: 1.04, duration: 0.55, delay: 0.4 });
    return () => {
      window.clearTimeout(fallback);
      timeline.kill();
    };
  }, [onDone]);

  return (
    <div className="boot-panel">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}>
        <AshField />
      </Canvas>
      <div className="boot-sprite" aria-hidden="true" />
      <div className="boot-mark" aria-label="Thanatos OS booting">
        <Skull className="boot-sigil" size={86} />
        <div>
          {'THANATOS OS'.split('').map((char, index) => (
            <span className="boot-glyph" key={`${char}-${index}`}>
              {char === ' ' ? '\u00a0' : char}
            </span>
          ))}
        </div>
        <small>DEATH KERNEL ONLINE</small>
      </div>
    </div>
  );
}

function QuoteFlash() {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    let clearTimeoutId = 0;
    const flash = () => {
      setQuote(darkQuotes[Math.floor(Math.random() * darkQuotes.length)]);
      window.clearTimeout(clearTimeoutId);
      clearTimeoutId = window.setTimeout(() => setQuote(''), 2200);
    };
    const firstTimeout = window.setTimeout(flash, 1800);
    const interval = window.setInterval(flash, 6200);
    return () => {
      window.clearTimeout(firstTimeout);
      window.clearTimeout(clearTimeoutId);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence>
      {quote ? (
        <motion.div
          className="quote-flash"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04, y: -8 }}
        >
          {quote}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SkullFlash() {
  const [flashes, setFlashes] = useState<Array<{ id: string; x: number; y: number; size: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    let timeout = 0;
    const schedule = () => {
      timeout = window.setTimeout(
        () => {
          if (cancelled) {
            return;
          }
          const count = 2 + Math.floor(Math.random() * 3);
          const next = Array.from({ length: count }, () => ({
            id: nanoid(),
            x: 8 + Math.random() * 84,
            y: 8 + Math.random() * 72,
            size: 42 + Math.random() * 86
          }));
          setFlashes(next);
          window.setTimeout(() => setFlashes([]), 850);
          schedule();
        },
        7000 + Math.random() * 9000
      );
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="skull-flash-layer" aria-hidden="true">
      {flashes.map((flash) => (
        <Skull key={flash.id} style={{ left: `${flash.x}%`, top: `${flash.y}%`, width: flash.size, height: flash.size }} />
      ))}
    </div>
  );
}

function markdownToHtml(input: string) {
  const escaped = input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .split('\n')
    .map((line) => {
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
      return line.trim() ? `<p>${line}</p>` : '<br />';
    })
    .join('');
  return DOMPurify.sanitize(escaped.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>'));
}

function TerminalApp({ openWindows }: { openWindows: OpenWindow[] }) {
  const [lines, setLines] = useState<string[]>([
    'thanatos@crypt:~$ status',
    'death kernel awake',
    'vfs mounted at /home/death',
    'remote bridge offline until paired'
  ]);
  const [input, setInput] = useState('');

  const run = () => {
    const command = input.trim();
    if (!command) return;
    if (command === 'clear') {
      setLines([]);
      setInput('');
      return;
    }
    const output: Record<string, string[]> = {
      help: [`commands: ${bloodCommands.join(', ')}`],
      status: ['shell: online', `windows: ${openWindows.length}`, 'vfs: persistent indexeddb', 'threat posture: locked'],
      apps: appRegistry.slice(0, 18).map((app) => `${app.id.padEnd(16, ' ')} ${app.name}`),
      date: [new Date().toString()],
      skull: ['skull pulse armed; watch the glass']
    };
    setLines((current) => [...current, `thanatos@crypt:~$ ${command}`, ...(output[command] ?? [`unknown command: ${command}`])]);
    setInput('');
  };

  return (
    <div className="terminal-app">
      <div className="terminal-output">
        {lines.map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
      <div className="terminal-input">
        <span>$</span>
        <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && run()} autoFocus />
        <button type="button" onClick={run}>
          <Play size={15} />
        </button>
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
        <button type="button" onClick={() => openDirectory(parentPath)} disabled={cwd === '/'}>
          <ChevronUp size={16} />
          <span>Up</span>
        </button>
        <button type="button" onClick={createFolder}>
          <FolderPlus size={16} />
          <span>Folder</span>
        </button>
        <button type="button" onClick={createDemoFile}>
          <FilePlus2 size={16} />
          <span>File</span>
        </button>
        <code>{cwd}</code>
      </div>
      {error ? <div className="vfs-error">{error}</div> : null}
      <div className="file-layout">
        <div className="file-list">
          {listing?.directories.map((directory) => (
            <button key={directory.path} type="button" className="file-row" onClick={() => openDirectory(directory.path)}>
              <Folder size={17} />
              <span>{directory.name}</span>
              <small>dir</small>
            </button>
          ))}
          {listing?.files.map((file) => (
            <button key={file.path} type="button" className="file-row" onClick={() => openFile(file.path)}>
              <File size={17} />
              <span>{file.name}</span>
              <small>{file.size} B</small>
            </button>
          ))}
        </div>
        <pre className="file-preview">{selectedFile?.content ?? 'Select a file to preview its persisted content.'}</pre>
      </div>
    </div>
  );
}

function CalculatorApp() {
  const [expression, setExpression] = useState('13 * 13 + 6');
  const [result, setResult] = useState('175');
  const calculate = () => {
    if (!/^[\d+\-*/(). %]+$/.test(expression)) {
      setResult('blocked');
      return;
    }
    try {
      const value = Function(`"use strict"; return (${expression.replaceAll('%', '/100')});`)();
      setResult(Number.isFinite(value) ? String(value) : 'invalid');
    } catch {
      setResult('invalid');
    }
  };
  return (
    <div className="tool-panel calculator-panel">
      <input value={expression} onChange={(event) => setExpression(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && calculate()} />
      <strong>{result}</strong>
      <button type="button" onClick={calculate}>
        <Play size={15} /> Calculate
      </button>
    </div>
  );
}

function NotesApp() {
  const [text, setText] = useState(() => localStorage.getItem('thanatos.notes') ?? 'Blood oath:\n- Build the OS\n- Own the machine\n');
  const save = () => localStorage.setItem('thanatos.notes', text);
  return (
    <div className="editor-panel">
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <button type="button" onClick={save}>
        <Save size={15} /> Save local note
      </button>
    </div>
  );
}

function MarkdownApp() {
  const [text, setText] = useState('# Thanatos Log\n\n- VFS online\n- Shell armed\n- Skull flash enabled\n');
  return (
    <div className="split-panel">
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />
    </div>
  );
}

function JsonFormatterApp() {
  const [text, setText] = useState('{"system":"thanatos","state":"awake"}');
  const [error, setError] = useState('');
  const format = () => {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid JSON');
    }
  };
  return (
    <div className="editor-panel">
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      {error ? <div className="vfs-error">{error}</div> : null}
      <button type="button" onClick={format}>
        <RefreshCcw size={15} /> Format JSON
      </button>
    </div>
  );
}

function HashGeneratorApp() {
  const [text, setText] = useState('thanatos');
  const [digest, setDigest] = useState('');
  const hash = async () => {
    const bytes = new TextEncoder().encode(text);
    const buffer = await crypto.subtle.digest('SHA-256', bytes);
    setDigest(Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join(''));
  };
  return (
    <div className="tool-panel">
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <button type="button" onClick={hash}>
        <Play size={15} /> SHA-256
      </button>
      <code>{digest || 'hash output waits here'}</code>
    </div>
  );
}

function PasswordGeneratorApp() {
  const [password, setPassword] = useState('');
  const generate = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const values = crypto.getRandomValues(new Uint32Array(24));
    setPassword(Array.from(values, (value) => alphabet[value % alphabet.length]).join(''));
  };
  return (
    <div className="tool-panel">
      <button type="button" onClick={generate}>
        <RefreshCcw size={15} /> Generate 24-char key
      </button>
      <code>{password || 'press generate'}</code>
    </div>
  );
}

function Base64App() {
  const [plain, setPlain] = useState('Thanatos OS');
  const [encoded, setEncoded] = useState('');
  const encode = () => setEncoded(btoa(String.fromCharCode(...new TextEncoder().encode(plain))));
  const decode = () => {
    try {
      const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
      setPlain(new TextDecoder().decode(bytes));
    } catch {
      setPlain('decode failed');
    }
  };
  return (
    <div className="split-panel compact">
      <textarea value={plain} onChange={(event) => setPlain(event.target.value)} />
      <textarea value={encoded} onChange={(event) => setEncoded(event.target.value)} />
      <button type="button" onClick={encode}>
        Encode
      </button>
      <button type="button" onClick={decode}>
        Decode
      </button>
    </div>
  );
}

function RegexTesterApp() {
  const [pattern, setPattern] = useState('death|blood|skull');
  const [sample, setSample] = useState('the death kernel bleeds red skull light');
  const matches = useMemo(() => {
    try {
      return [...sample.matchAll(new RegExp(pattern, 'gi'))].map((match) => match[0]);
    } catch {
      return ['invalid pattern'];
    }
  }, [pattern, sample]);
  return (
    <div className="tool-panel">
      <input value={pattern} onChange={(event) => setPattern(event.target.value)} />
      <textarea value={sample} onChange={(event) => setSample(event.target.value)} />
      <code>{matches.join(', ') || 'no matches'}</code>
    </div>
  );
}

function ColorPickerApp() {
  const [color, setColor] = useState('#8f001d');
  return (
    <div className="color-panel">
      <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      <div style={{ background: color }} />
      <code>{color}</code>
    </div>
  );
}

function MumbleChatApp() {
  const [frameKey, setFrameKey] = useState(0);
  const [stats, setStats] = useState<MumbleChatStats>({
    loggedIn: null,
    userId: null,
    username: null,
    displayName: null,
    avatarUrl: null,
    unreadPms: null,
    onlineFriends: [],
    offlineFriends: [],
    totalFriends: null,
    lastUpdated: null,
    status: 'idle',
    message: 'Open MumbleChat, then press Live Stats. Thanatos will poll the approved bridge every 30 seconds.'
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://mumblechat.online') {
        return;
      }

      const payload = event.data as MumbleChatStatsPayload;
      if (payload.type !== 'mumblechat:stats') {
        return;
      }

      setStats({
        loggedIn: typeof payload.loggedIn === 'boolean' ? payload.loggedIn : null,
        userId: typeof payload.userId === 'number' ? payload.userId : null,
        username: typeof payload.username === 'string' ? payload.username : null,
        displayName: typeof payload.displayName === 'string' ? payload.displayName : null,
        avatarUrl: typeof payload.avatarUrl === 'string' ? payload.avatarUrl : null,
        unreadPms: typeof payload.unreadPms === 'number' ? payload.unreadPms : null,
        onlineFriends: Array.isArray(payload.onlineFriends) ? payload.onlineFriends.map(String) : [],
        offlineFriends: Array.isArray(payload.offlineFriends) ? payload.offlineFriends.map(String) : [],
        totalFriends: typeof payload.totalFriends === 'number' ? payload.totalFriends : null,
        lastUpdated: new Date().toLocaleTimeString(),
        status: payload.loggedIn === false ? 'unavailable' : 'online',
        message: payload.loggedIn === false ? 'MumbleChat responded: user is not logged in.' : 'Live MumbleChat stats received.'
      });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const requestStats = useCallback(() => {
    setStats((current) => ({
      ...current,
      status: 'checking',
      message: 'Requesting approved MumbleChat stats from the embedded frame...'
    }));

    const frame = document.querySelector<HTMLIFrameElement>('#mumblechat-frame');
    frame?.contentWindow?.postMessage({ type: 'thanatos:request-stats' }, 'https://mumblechat.online');

    window.setTimeout(() => {
      setStats((current) => {
        if (current.status !== 'checking') {
          return current;
        }
        return {
          ...current,
          status: 'blocked',
          lastUpdated: new Date().toLocaleTimeString(),
          message:
            'No mumblechat:stats response yet. Check that THANATOS_ORIGIN exactly matches this Thanatos origin and that MumbleChat allows iframe embedding.'
        };
      });
    }, 1800);
  }, []);

  useEffect(() => {
    const initialRequest = window.setTimeout(requestStats, 2200);
    const poll = window.setInterval(requestStats, 30_000);
    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(poll);
    };
  }, [frameKey, requestStats]);

  return (
    <div className="mumblechat-app">
      <div className="mumblechat-toolbar">
        <button type="button" onClick={requestStats}>
          <RefreshCcw size={15} /> Live Stats
        </button>
        <button type="button" onClick={() => setFrameKey((value) => value + 1)}>
          <RefreshCcw size={15} /> Reload
        </button>
        <a href="https://mumblechat.online" target="_blank" rel="noreferrer">
          <Globe size={15} /> Open Site
        </a>
      </div>
      <div className="mumblechat-layout">
        <iframe
          key={frameKey}
          id="mumblechat-frame"
          title="MumbleChat"
          src="https://mumblechat.online"
          referrerPolicy="no-referrer"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
        <aside className="mumblechat-stats">
          <h3>Live Stats</h3>
          <div className={`status-orb ${stats.status}`} />
          <div className="mumblechat-profile">
            {stats.avatarUrl ? <img src={stats.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div>{(stats.displayName ?? stats.username ?? '?').slice(0, 1)}</div>}
            <span>{stats.displayName ?? stats.username ?? 'Unknown user'}</span>
          </div>
          <dl>
            <dt>Login</dt>
            <dd>{stats.loggedIn === null ? 'unknown' : stats.loggedIn ? 'logged in' : 'logged out'}</dd>
            <dt>User ID</dt>
            <dd>{stats.userId ?? 'unknown'}</dd>
            <dt>Username</dt>
            <dd>{stats.username ?? 'unknown'}</dd>
            <dt>Unread PMs</dt>
            <dd>{stats.unreadPms === null ? 'unknown' : stats.unreadPms}</dd>
            <dt>Total Friends</dt>
            <dd>{stats.totalFriends === null ? 'unknown' : stats.totalFriends}</dd>
            <dt>Online Friends</dt>
            <dd>{stats.onlineFriends.length ? stats.onlineFriends.join(', ') : 'unknown'}</dd>
            <dt>Offline Friends</dt>
            <dd>{stats.offlineFriends.length ? stats.offlineFriends.join(', ') : 'unknown'}</dd>
            <dt>Updated</dt>
            <dd>{stats.lastUpdated ?? 'never'}</dd>
          </dl>
          <p>{stats.message}</p>
          <code>postMessage: mumblechat:stats</code>
        </aside>
      </div>
    </div>
  );
}

function ClockApp() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <div className="clock-panel">
      <strong>{now.toLocaleTimeString()}</strong>
      <span>{now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
  );
}

function SettingsApp() {
  const [crt, setCrt] = useState(true);
  const [violence, setViolence] = useState(85);
  return (
    <div className="settings-grid">
      <section>
        <h3>Visual Severity</h3>
        <input type="range" min="0" max="100" value={violence} onChange={(event) => setViolence(Number(event.target.value))} />
        <p>{violence}% blood glass intensity</p>
      </section>
      <section>
        <h3>CRT Veil</h3>
        <button type="button" onClick={() => setCrt((value) => !value)}>
          {crt ? <Eye size={15} /> : <Eye size={15} />} {crt ? 'Enabled' : 'Disabled'}
        </button>
      </section>
      <section>
        <h3>Remote Control</h3>
        <p>Pair only through Tailscale/WireGuard and short-lived local bridge tokens.</p>
      </section>
    </div>
  );
}

function TaskManagerApp({ openWindows }: { openWindows: OpenWindow[] }) {
  return (
    <div className="system-table">
      <div className="system-row header">
        <span>Process</span>
        <span>State</span>
        <span>Z</span>
      </div>
      {openWindows.map((item) => (
        <div className="system-row" key={item.id}>
          <span>{item.app.name}</span>
          <span>{item.minimized ? 'minimized' : 'active'}</span>
          <span>{item.z}</span>
        </div>
      ))}
    </div>
  );
}

function PrivateGate({ app }: { app: ThanatosApp }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  if (unlocked) {
    return (
      <div className="private-panel">
        <Skull size={48} />
        <h3>{app.name}</h3>
        <p>Private sandbox unlocked for this session. Real vault encryption comes next.</p>
      </div>
    );
  }
  return (
    <div className="private-panel">
      <Lock size={44} />
      <h3>{app.name}</h3>
      <input value={pin} onChange={(event) => setPin(event.target.value)} placeholder="PIN" type="password" />
      <button type="button" onClick={() => setUnlocked(pin === '1313')}>
        Unlock
      </button>
      <small>dev PIN: 1313</small>
    </div>
  );
}

function GenericWorkingApp({ app }: { app: ThanatosApp }) {
  const [output, setOutput] = useState(`${app.name} ready.`);
  return (
    <div className="generic-app">
      <app.icon size={42} />
      <h3>{app.name}</h3>
      <p>{app.description}</p>
      <button type="button" onClick={() => setOutput(`${app.name} executed at ${new Date().toLocaleTimeString()}`)}>
        <Play size={15} /> Run
      </button>
      <code>{output}</code>
    </div>
  );
}

function AppContent({ app, openWindows }: { app: ThanatosApp; openWindows: OpenWindow[] }) {
  if (app.locked) return <PrivateGate app={app} />;
  if (app.id === 'terminal') return <TerminalApp openWindows={openWindows} />;
  if (app.id === 'files') return <FileManagerApp />;
  if (app.id === 'mumblechat') return <MumbleChatApp />;
  if (app.id === 'settings') return <SettingsApp />;
  if (app.id === 'tasks') return <TaskManagerApp openWindows={openWindows} />;
  if (app.id === 'clock') return <ClockApp />;
  if (app.id === 'calculator') return <CalculatorApp />;
  if (app.id === 'notes' || app.id === 'writer' || app.id === 'story') return <NotesApp />;
  if (app.id === 'markdown' || app.id === 'vscode') return <MarkdownApp />;
  if (app.id === 'json') return <JsonFormatterApp />;
  if (app.id === 'hash') return <HashGeneratorApp />;
  if (app.id === 'passwords') return <PasswordGeneratorApp />;
  if (app.id === 'base64') return <Base64App />;
  if (app.id === 'regex') return <RegexTesterApp />;
  if (app.id === 'colors') return <ColorPickerApp />;
  return <GenericWorkingApp app={app} />;
}

function DesktopWindow({
  openWindow,
  active,
  openWindows,
  onFocus,
  onClose,
  onMinimize,
  onMaximize
}: {
  openWindow: OpenWindow;
  active: boolean;
  openWindows: OpenWindow[];
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  if (openWindow.minimized) return null;

  const placementSeed = Array.from(openWindow.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const size = openWindow.maximized ? { width: 'calc(100vw - 24px)', height: 'calc(100vh - 86px)' } : { width: 760, height: 500 };
  const position = openWindow.maximized ? { x: 12, y: 12 } : { x: 58 + (placementSeed % 7) * 28, y: 44 + (placementSeed % 5) * 24 };

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
      className={clsx('desktop-window', active && 'active-window')}
    >
      <div className="window-titlebar">
        <div className="window-title">
          <openWindow.app.icon size={17} />
          <span>{openWindow.app.name}</span>
        </div>
        <div className="window-controls">
          <button type="button" aria-label="Minimize" onClick={onMinimize}>
            <Minus size={15} />
          </button>
          <button type="button" aria-label="Maximize" onClick={onMaximize}>
            <Maximize2 size={15} />
          </button>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="window-content">
        <AppContent app={openWindow.app} openWindows={openWindows} />
      </div>
    </Rnd>
  );
}

function StartMenu({ onLaunch }: { onLaunch: (app: ThanatosApp) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AppCategory>('System');
  const apps = appRegistry.filter((app) => app.category === category && `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <motion.div className="start-menu" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}>
      <div className="start-menu-title">
        <Skull size={25} />
        <strong>Death Console</strong>
      </div>
      <div className="search-row">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the underworld" />
      </div>
      <div className="category-tabs">
        {appCategories.map((item) => (
          <button key={item} type="button" className={item === category ? 'selected' : ''} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="app-grid">
        {apps.map((app) => (
          <button key={app.id} type="button" className="launcher-tile" onClick={() => onLaunch(app)}>
            <app.icon size={23} />
            <span>{app.name}</span>
            {app.locked ? <Lock size={13} /> : null}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function ThanatosDesktop() {
  const [booted, setBooted] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [clock, setClock] = useState(() => new Date());
  const handleBootDone = useCallback(() => setBooted(true), []);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const topZ = windows.reduce((max, item) => Math.max(max, item.z), 10);
  const activeId = windows.reduce((highest, item) => (item.z > highest.z ? item : highest), windows[0] ?? { id: '', z: 0 }).id;

  const launch = (app: ThanatosApp) => {
    setWindows((current) => {
      const existing = current.find((item) => item.app.id === app.id);
      if (existing) {
        return current.map((item) => (item.id === existing.id ? { ...item, minimized: false, z: topZ + 1 } : item));
      }
      return [...current, { id: nanoid(), app, z: topZ + 1, minimized: false, maximized: false }];
    });
    setStartOpen(false);
  };

  const patchWindow = (id: string, patch: Partial<OpenWindow>) => {
    setWindows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <main className="desktop-shell">
      {!booted ? <BootLayer onDone={handleBootDone} /> : null}
      <div className="desktop-wallpaper" />
      <div className="sprite-background" aria-hidden="true" />
      <div className="blood-rain" />
      <div className="crt-overlay" />
      {booted ? <QuoteFlash /> : null}
      <SkullFlash />
      <div className="death-brand">
        <Skull size={38} />
        <span>THANATOS</span>
      </div>
      <div className="window-layer">
        {windows.map((item) => (
          <DesktopWindow
            key={item.id}
            openWindow={item}
            openWindows={windows}
            active={item.id === activeId}
            onFocus={() => patchWindow(item.id, { z: topZ + 1 })}
            onClose={() => setWindows((current) => current.filter((open) => open.id !== item.id))}
            onMinimize={() => patchWindow(item.id, { minimized: true })}
            onMaximize={() => patchWindow(item.id, { maximized: !item.maximized, z: topZ + 1 })}
          />
        ))}
      </div>
      <AnimatePresence>{startOpen ? <StartMenu onLaunch={launch} /> : null}</AnimatePresence>
      <nav className="taskbar">
        <button type="button" className="start-button" onClick={() => setStartOpen((value) => !value)}>
          <Skull size={19} />
          <span>Thanatos</span>
        </button>
        <div className="task-items">
          {windows.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx('task-item', item.id === activeId && !item.minimized && 'active-task')}
              onClick={() => patchWindow(item.id, { minimized: false, z: topZ + 1 })}
            >
              <item.app.icon size={16} />
              <span>{item.app.name}</span>
            </button>
          ))}
        </div>
        <div className="tray">
          <ShieldCheck size={17} />
          <span>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </nav>
    </main>
  );
}
