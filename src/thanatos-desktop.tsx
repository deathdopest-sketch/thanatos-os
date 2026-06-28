import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Rnd } from 'react-rnd';
import gsap from 'gsap';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, File, FilePlus2, Folder, FolderPlus, Lock, Maximize2, Minus, Power, Search, ShieldCheck, X } from 'lucide-react';
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

function AshField() {
  const positions = useMemo(() => {
    const points = new Float32Array(500 * 3);
    for (let index = 0; index < points.length; index += 3) {
      points[index] = (Math.random() - 0.5) * 26;
      points[index + 1] = (Math.random() - 0.5) * 16;
      points[index + 2] = (Math.random() - 0.5) * 18;
    }
    return points;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d9fff4" size={0.035} transparent opacity={0.48} blending={2} depthWrite={false} />
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
    const timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: finish
    });
    const fallback = window.setTimeout(finish, 1800);
    timeline
      .fromTo('.boot-glyph', { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.045, duration: 0.5 })
      .to('.boot-panel', { opacity: 0, scale: 1.02, duration: 0.45, delay: 0.45 });
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
      <div className="boot-mark" aria-label="Thanatos OS booting">
        {'THANATOS OS'.split('').map((char, index) => (
          <span className="boot-glyph" key={`${char}-${index}`}>
            {char === ' ' ? '\u00a0' : char}
          </span>
        ))}
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

function AppContent({ app }: { app: ThanatosApp }) {
  if (app.id === 'terminal') {
    return (
      <div className="terminal-body">
        <p>thanatos@chromebook:~$ status</p>
        <p>desktop shell online</p>
        <p>secure remote control: broker not paired</p>
        <p>thanatos@chromebook:~$</p>
      </div>
    );
  }

  if (app.id === 'files') {
    return <FileManagerApp />;
  }

  if (app.id === 'settings') {
    return (
      <div className="settings-grid">
        <section>
          <h3>Security</h3>
          <p>Private apps require a PIN gate before launch.</p>
        </section>
        <section>
          <h3>Remote Control</h3>
          <p>Use WireGuard/Tailscale reachability with short-lived WebRTC control tokens.</p>
        </section>
        <section>
          <h3>Display</h3>
          <p>CRT overlay, glass density, and accent color controls belong here.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="generic-app">
      <app.icon size={42} />
      <h3>{app.name}</h3>
      <p>{app.description}</p>
      {app.locked ? <span className="security-chip">PIN gate required</span> : null}
    </div>
  );
}

function DesktopWindow({
  window,
  active,
  onFocus,
  onClose,
  onMinimize,
  onMaximize
}: {
  window: OpenWindow;
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  if (window.minimized) {
    return null;
  }

  const size = window.maximized ? { width: 'calc(100vw - 24px)', height: 'calc(100vh - 86px)' } : { width: 720, height: 460 };
  const position = window.maximized ? { x: 12, y: 12 } : { x: 96 + window.z * 12, y: 72 + window.z * 8 };

  return (
    <Rnd
      bounds="parent"
      size={size}
      position={position}
      disableDragging={window.maximized}
      enableResizing={!window.maximized}
      minWidth={360}
      minHeight={260}
      dragHandleClassName="window-titlebar"
      style={{ zIndex: window.z }}
      onMouseDown={onFocus}
      className={clsx('desktop-window', active && 'active-window')}
    >
      <div className="window-titlebar">
        <div className="window-title">
          <window.app.icon size={17} />
          <span>{window.app.name}</span>
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
        <AppContent app={window.app} />
      </div>
    </Rnd>
  );
}

function StartMenu({ onLaunch }: { onLaunch: (app: ThanatosApp) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AppCategory>('System');
  const apps = appRegistry.filter((app) => {
    const inCategory = app.category === category;
    const matchesQuery = `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase());
    return inCategory && matchesQuery;
  });

  return (
    <motion.div className="start-menu" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}>
      <div className="search-row">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps" />
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
      <div className="crt-overlay" />
      <div className="window-layer">
        {windows.map((item) => (
          <DesktopWindow
            key={item.id}
            window={item}
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
          <Power size={18} />
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
