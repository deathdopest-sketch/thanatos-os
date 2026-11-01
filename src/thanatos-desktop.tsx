import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Rnd } from 'react-rnd';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Code2,
  Film,
  Folder,
  Image,
  LayoutGrid,
  Lock,
  Maximize2,
  Minus,
  Monitor,
  Paintbrush,
  Play,
  RadioTower,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Skull,
  TerminalSquare,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { appRegistry, type AppCategory, type ThanatosApp } from './apps';
import LillyClock from './components/LillyClock';
import DesktopPets from './components/DesktopPets';
import CustomBackground from './components/CustomBackground';
import { appearanceVars, useAppearance } from './lib/appearance';
import StumbleLive from './components/StumbleLive';
import { StumbleToasts, StumbleTrayButton, StumbleWidget } from './components/StumbleWidget';
import { useStumbleLive } from './lib/stumble-live-store';
import { useDesktopBus } from './lib/desktop-bus';
import { RotViceCompanion } from './components/RotViceCompanion';
import { BootLayer, BloodDrips, QuoteFlash, SkullFlash } from './components/DesktopEffects';
import { readStoredValue, writeStoredValue, WINDOW_STATE_KEY } from './lib/storage';
import type { OpenWindow, ThanatosTheme, AccessSession } from './lib/desktop-types';

// App imports
import { TerminalApp } from './components/apps/TerminalApp';
import { FileManagerApp } from './components/apps/FileManagerApp';
import { CalculatorApp } from './components/apps/CalculatorApp';
import { NotesApp } from './components/apps/NotesApp';
import { MarkdownApp } from './components/apps/MarkdownApp';
import { CalendarApp } from './components/apps/CalendarApp';
import { WeatherApp } from './components/apps/WeatherApp';
import { MailApp } from './components/apps/MailApp';
import { SettingsApp } from './components/apps/SettingsApp';
import { TaskManagerApp } from './components/apps/TaskManagerApp';
import { PaintApp } from './components/apps/PaintApp';
import { CameraApp } from './components/apps/CameraApp';
import { VoiceRecorderApp } from './components/apps/VoiceRecorderApp';
import { VideoPlayerApp } from './components/apps/VideoPlayerApp';
import { ImageViewerApp } from './components/apps/ImageViewerApp';
import { MusicPlayerApp } from './components/apps/MusicPlayerApp';
import { PdfViewerApp } from './components/apps/PdfViewerApp';
import { AudioVisualizerApp } from './components/apps/AudioVisualizerApp';
import { CodeStudioApp } from './components/apps/CodeStudioApp';
import { CompilerApp } from './components/apps/CompilerApp';
import { GitClientApp } from './components/apps/GitClientApp';
import { ApiClientApp } from './components/apps/ApiClientApp';
import { JsonFormatterApp } from './components/apps/JsonFormatterApp';
import { DiffCheckerApp } from './components/apps/DiffCheckerApp';
import { HexEditorApp } from './components/apps/HexEditorApp';
import { HashGeneratorApp } from './components/apps/HashGeneratorApp';
import { PasswordGeneratorApp } from './components/apps/PasswordGeneratorApp';
import { Base64App } from './components/apps/Base64App';
import { RegexTesterApp } from './components/apps/RegexTesterApp';
import { QrCodeApp } from './components/apps/QrCodeApp';
import { MinifierApp } from './components/apps/MinifierApp';
import { LoremIpsumApp } from './components/apps/LoremIpsumApp';
import { UrlShortenerApp } from './components/apps/UrlShortenerApp';
import { ManPagesApp } from './components/apps/ManPagesApp';
import { NetworkMonitorApp } from './components/apps/NetworkMonitorApp';
import { ColorPickerApp } from './components/apps/ColorPickerApp';
import { RemoteControlApp } from './components/apps/RemoteControlApp';
import { RotViceApp } from './components/apps/RotViceApp';
import { StumbleChatApp, loadStumbleSettings } from './components/apps/StumbleChatApp';
import { ChatCommonApp } from './components/apps/ChatCommonApp';
import { SlotMachineApp } from './components/apps/SlotMachineApp';
import { LoveDiceApp } from './components/apps/LoveDiceApp';

// ─── window ───────────────────────────────────────────────────────────────────

type SnapZone = 'left' | 'right' | 'max';

// Where a window lands if you let go of it here: drag to the left or right edge
// for half the screen, or to the top to maximize.
function snapZoneAt(x: number, y: number): SnapZone | null {
  if (y <= 6) return 'max';
  if (x <= 6) return 'left';
  if (x >= window.innerWidth - 7) return 'right';
  return null;
}

function pointerOf(e: MouseEvent | TouchEvent) {
  if ('touches' in e) { const t = e.touches[0] ?? e.changedTouches[0]; return t ? { x: t.clientX, y: t.clientY } : null; }
  return { x: e.clientX, y: e.clientY };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDefaultWindowSize(appId: string) {
  if (appId === 'rotvice') return { width: Math.min(1160, window.innerWidth - 48), height: Math.min(760, window.innerHeight - 112), maximized: true };
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

// ─── private gate ─────────────────────────────────────────────────────────────

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
    case 'rotvice': return <RotViceApp />;
    case 'stumblechat': return <StumbleChatApp />;
    case 'stumblelive': return <StumbleLive savedRooms={loadStumbleSettings().rooms.map((r) => r.slug)} />;
    case 'chatcommon': return <ChatCommonApp />;
    case 'settings': return <SettingsApp theme={theme} onThemeChange={onThemeChange} />;
    case 'tasks': return <TaskManagerApp openWindows={openWindows} />;
    case 'clock': return <LillyClock />;
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

// ─── desktop window ───────────────────────────────────────────────────────────

function DesktopWindow({ openWindow, active, openWindows, theme, session, onSessionChange, onThemeChange, onFocus, onMove, onResize, onClose, onMinimize, onMaximize, onSnapPreview, onSnap }: { openWindow: OpenWindow; active: boolean; openWindows: OpenWindow[]; theme: ThanatosTheme; session: AccessSession | null; onSessionChange: (session: AccessSession | null) => void; onThemeChange: (t: ThanatosTheme) => void; onFocus: () => void; onMove: (x: number, y: number) => void; onResize: (width: number, height: number, x: number, y: number) => void; onClose: () => void; onMinimize: () => void; onMaximize: () => void; onSnapPreview: (zone: SnapZone | null) => void; onSnap: (zone: SnapZone) => void }) {
  // Minimized windows stay mounted (just hidden), so a shell, a video or a chat
  // keeps running, like on any desktop.
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
      style={{ zIndex: openWindow.z, display: openWindow.minimized ? 'none' : undefined }}
      onMouseDown={onFocus}
      onDrag={(e) => { const p = pointerOf(e as MouseEvent | TouchEvent); onSnapPreview(p ? snapZoneAt(p.x, p.y) : null); }}
      onDragStop={(e, data) => {
        const p = pointerOf(e as MouseEvent | TouchEvent);
        const zone = p ? snapZoneAt(p.x, p.y) : null;
        onSnapPreview(null);
        if (zone) onSnap(zone); else onMove(data.x, data.y);
      }}
      onResizeStop={(_, __, ref, ___, nextPosition) => onResize(ref.offsetWidth, ref.offsetHeight, nextPosition.x, nextPosition.y)}
      className={clsx('desktop-window', active && 'active-window')}
    >
      <div className="window-titlebar" onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest('button')) onMaximize(); }}>
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

function StartMenu({ onLaunch, onClose }: { onLaunch: (app: ThanatosApp) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AppCategory | 'All'>('All');
  const [cursor, setCursor] = useState(0);

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
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={(e) => {
              // type, then Enter: launches the highlighted app. Arrows move the highlight.
              if (e.key === 'Enter' && filtered[cursor]) { e.preventDefault(); onLaunch(filtered[cursor]); }
              else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setCursor((c) => Math.min(filtered.length - 1, c + (e.key === 'ArrowDown' ? 2 : 1))); }
              else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setCursor((c) => Math.max(0, c - (e.key === 'ArrowUp' ? 2 : 1))); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }}
            placeholder="Search apps… (Enter to open)"
            aria-label="Search apps"
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
              onClick={() => { setCategory(id); setQuery(''); setCursor(0); }}
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
              {filtered.map((app, i) => (
                <button
                  key={app.id}
                  type="button"
                  className={clsx('sm-app-card', app.locked && 'locked', i === cursor && 'highlighted')}
                  onClick={() => onLaunch(app)}
                  onMouseEnter={() => setCursor(i)}
                  ref={i === cursor ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
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

// Right-click on the desktop.
function DesktopMenu({ x, y, onClose, onLaunch, onShowDesktop }: { x: number; y: number; onClose: () => void; onLaunch: (id: string) => void; onShowDesktop: () => void }) {
  const item = (label: string, Icon: LucideIcon, act: () => void, hint?: string) => (
    <button type="button" role="menuitem" onClick={() => { act(); onClose(); }}>
      <Icon size={15} /> <span>{label}</span>{hint ? <kbd>{hint}</kbd> : null}
    </button>
  );
  return (
    <div className="desktop-menu" role="menu" style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()}>
      {item('Terminal', TerminalSquare, () => onLaunch('terminal'))}
      {item('Files', Folder, () => onLaunch('files'))}
      {item('Stumble Live', RadioTower, () => onLaunch('stumblelive'))}
      <hr />
      {item('Change background…', Image, () => useDesktopBus.getState().openSettings('background'))}
      {item('Colours & effects…', Paintbrush, () => useDesktopBus.getState().openSettings('colours'))}
      {item('Settings', Settings, () => onLaunch('settings'))}
      <hr />
      {item('Show desktop', Minus, onShowDesktop)}
      {item('All apps', Skull, () => document.querySelector<HTMLButtonElement>('.tb-start')?.click(), 'Alt+Space')}
    </div>
  );
}

// ─── main desktop ─────────────────────────────────────────────────────────────

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
  const look = useAppearance((st) => st.appearance);
  const fx = look.effects;
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
      const defaultX = saved?.x ?? (app.id === 'rotvice' ? Math.max(18, (window.innerWidth - defaultWidth) / 2) : 58 + (placementSeed % 7) * 28);
      const defaultY = saved?.y ?? (app.id === 'rotvice' ? 18 : 44 + (placementSeed % 5) * 24);
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

  const openStumbleLive = () => {
    const app = appRegistry.find((a) => a.id === 'stumblelive');
    if (app) launch(app);
  };
  // other apps (StumbleChat's room buttons) ask for the Stumble Live window this way
  const liveRequest = useStumbleLive((st) => st.liveRequest);
  useEffect(() => { if (liveRequest) openStumbleLive(); }, [liveRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const [snapPreview, setSnapPreview] = useState<SnapZone | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const snapWindow = (id: string, zone: SnapZone) => {
    if (zone === 'max') { patch(id, { maximized: true, z: topZ + 1 }); return; }
    const width = Math.round(window.innerWidth / 2);
    patch(id, { maximized: false, x: zone === 'left' ? 0 : width, y: 0, width, height: window.innerHeight - 60, z: topZ + 1 });
  };

  // Apps, the console and the right-click menu open apps through the desktop bus.
  const appRequest = useDesktopBus((st) => st.appRequest);
  useEffect(() => {
    const app = appRequest && appRegistry.find((a) => a.id === appRequest.id);
    if (app) launch(app);
  }, [appRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alt+Space opens the start menu; Escape closes menus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') { e.preventDefault(); setMenu(null); setStartOpen((v) => !v); }
      else if (e.key === 'Escape') { setMenu(null); setStartOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const patch = (id: string, p: Partial<OpenWindow>) => setWindows((ws) => ws.map((w) => {
    if (w.id !== id) return w;
    const next = { ...w, ...p };
    writeWindowState(next.app.id, { x: next.x, y: next.y, width: next.width, height: next.height, maximized: next.maximized });
    return next;
  }));

  return (
    <main className={`desktop-shell theme-${theme}`} style={appearanceVars(look) as CSSProperties}
      onMouseDown={(e) => {
        // clicking anywhere else closes the start menu and the right-click menu
        const t = e.target as HTMLElement;
        if (!t.closest('.start-menu, .tb-start')) setStartOpen(false);
        if (!t.closest('.desktop-menu')) setMenu(null);
      }}
      onContextMenu={(e) => {
        // right-click on the desktop itself (not inside a window or the taskbar)
        const t = e.target as HTMLElement;
        if (t.closest('.desktop-window, .taskbar, .start-menu, .stumble-widget, .stumble-toasts, input, textarea')) return;
        e.preventDefault();
        setStartOpen(false);
        setMenu({ x: Math.min(e.clientX, window.innerWidth - 230), y: Math.min(e.clientY, window.innerHeight - 300) });
      }}>
      {!booted ? <BootLayer onDone={handleBootDone} /> : null}
      <div className="desktop-wallpaper" />
      {fx.sprite && look.background.kind === 'theme' ? <div className="sprite-background" aria-hidden="true" /> : null}
      <CustomBackground />
      <div className="fx-layer" aria-hidden="true">
        {fx.bloodDrips ? <BloodDrips /> : null}
        {fx.bloodRain ? <div className="blood-rain" /> : null}
        {fx.crt ? <div className="crt-overlay" /> : null}
        {fx.audioCurse ? <div className="audio-curse" /> : null}
        {fx.skulls ? <SkullFlash /> : null}
        {fx.vignette ? <div className="fx-vignette" /> : null}
        {fx.grain ? <div className="fx-grain" /> : null}
      </div>
      {booted && fx.quotes ? <QuoteFlash /> : null}
      {fx.brand ? <div className="death-brand"><Skull size={38} /><span>THANATOS</span></div> : null}
      <div className="window-layer">
        {windows.map((w) => (
          <DesktopWindow key={w.id} openWindow={w} openWindows={windows} theme={theme} session={session} onSessionChange={setSession} onThemeChange={changeTheme} active={w.id === activeId}
            onFocus={() => patch(w.id, { z: topZ + 1 })}
            onMove={(x, y) => patch(w.id, { x, y })}
            onResize={(width, height, x, y) => patch(w.id, { width, height, x, y })}
            onClose={() => setWindows((ws) => ws.filter((x) => x.id !== w.id))}
            onMinimize={() => patch(w.id, { minimized: true })}
            onSnapPreview={setSnapPreview}
            onSnap={(zone) => snapWindow(w.id, zone)}
            onMaximize={() => patch(w.id, { maximized: !w.maximized, z: topZ + 1 })} />
        ))}
      </div>
      {snapPreview ? <div className={`snap-preview snap-${snapPreview}`} aria-hidden="true" /> : null}
      {menu ? (
        <DesktopMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} onLaunch={(id) => { const app = appRegistry.find((a) => a.id === id); if (app) launch(app); }}
          onShowDesktop={() => setWindows((ws) => ws.map((w) => ({ ...w, minimized: true })))} />
      ) : null}
      {booted ? <DesktopPets visible={windows.some((w) => w.app.id === 'rotvice')} /> : null}
      {booted ? <RotViceCompanion /> : null}
      {booted ? <StumbleWidget onOpen={openStumbleLive} /> : null}
      {booted ? <StumbleToasts onOpen={openStumbleLive} /> : null}
      <AnimatePresence>{startOpen ? <StartMenu onLaunch={launch} onClose={() => setStartOpen(false)} /> : null}</AnimatePresence>
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
              className={clsx('tb-app', w.id === activeId && !w.minimized && 'active', w.minimized && 'minimized')}
              title={`${w.app.name}: click to ${w.id === activeId && !w.minimized ? 'minimize' : 'show'}, middle-click to close`}
              // like any taskbar: clicking the window in front minimizes it, otherwise brings it forward
              onClick={() => patch(w.id, w.id === activeId && !w.minimized ? { minimized: true } : { minimized: false, z: topZ + 1 })}
              onAuxClick={(e) => { if (e.button === 1) setWindows((ws) => ws.filter((x) => x.id !== w.id)); }}
            >
              <w.app.icon size={14} />
              <span className="tb-app-label">{w.app.name}</span>
            </button>
          ))}
        </div>
        <div className="tb-tray">
          <StumbleTrayButton />
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
