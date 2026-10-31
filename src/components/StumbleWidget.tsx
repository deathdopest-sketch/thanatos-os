import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AtSign, ExternalLink, Globe, Maximize2, Minus, Power, Radio, Volume2, VolumeX, X } from 'lucide-react';
import clsx from 'clsx';
import { useStumbleLive } from '../lib/stumble-live-store';
import { ChatFeed } from './StumbleLive';

const WIDTH = 340;

// Live StumbleChat on the desktop itself: a small draggable widget that shows while
// the bridge is running, plus a toast (and chime) whenever someone mentions you.
export function StumbleWidget({ onOpen }: { onOpen: () => void }) {
  const { link, chrome, rooms, lines, frames, prefs, unread, setPrefs, setFocusRoom, clearUnread } = useStumbleLive();
  const [active, setActive] = useState<string | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => { useStumbleLive.getState().connect(); }, []);
  useEffect(() => {
    if (!rooms.length) setActive(null);
    else if (!active || !rooms.some((r) => r.room === active)) setActive(rooms[0].room);
  }, [rooms, active]);

  const room = rooms.find((r) => r.room === active) ?? null;
  const roomLines = useMemo(() => lines.filter((l) => l.room === active).slice(-80), [lines, active]);

  // rooms fed in from your own browser count even when the bridge's Chrome window is closed
  if (link !== 'online' || !(chrome || rooms.length) || !prefs.visible) return null;

  const x = prefs.x < 0 ? window.innerWidth - WIDTH - 16 : Math.min(prefs.x, window.innerWidth - 120);
  const y = Math.max(8, Math.min(prefs.y, window.innerHeight - 120));
  const open = () => { if (room) setFocusRoom(room.room); clearUnread(); onOpen(); };

  const startDrag = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button, select')) return;
    drag.current = { dx: e.clientX - x, dy: e.clientY - y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: ReactPointerEvent) => {
    if (drag.current) setPrefs({ x: Math.max(0, e.clientX - drag.current.dx), y: Math.max(0, e.clientY - drag.current.dy) });
  };

  if (prefs.collapsed) {
    return (
      <button type="button" className="stumble-widget-pill" style={{ left: x, top: y }} onClick={() => { setPrefs({ collapsed: false }); clearUnread(); }}>
        <i className={clsx('stumble-dot', room?.connected ? 'on' : room?.reopening ? 'wait' : 'off')} />
        {room ? room.room : 'Stumble Live'}
        {unread ? <span className="stumble-badge">{unread}</span> : null}
      </button>
    );
  }

  return (
    <section className="stumble-widget" style={{ left: x, top: y, width: WIDTH }} aria-label="Stumble Live widget">
      <header onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }}>
        <Radio size={14} />
        {rooms.length > 1 ? (
          <select value={active ?? ''} onChange={(e) => setActive(e.target.value)} aria-label="Room">
            {rooms.map((r) => <option key={r.room} value={r.room}>{r.room}</option>)}
          </select>
        ) : <strong>{room?.room ?? 'No rooms'}</strong>}
        {room ? <i className={clsx('stumble-dot', room.connected ? 'on' : room.reopening ? 'wait' : 'off')} /> : null}
        <span className="stumble-widget-spacer" />
        <button type="button" title={prefs.sound ? 'Mute mention sound' : 'Unmute mention sound'} onClick={() => setPrefs({ sound: !prefs.sound })}>
          {prefs.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
        <button type="button" title="Open Stumble Live" onClick={open}><Maximize2 size={14} /></button>
        <button type="button" title="Collapse" onClick={() => setPrefs({ collapsed: true })}><Minus size={14} /></button>
        <button type="button" title="Hide (bring it back from the taskbar)" onClick={() => setPrefs({ visible: false })}><X size={14} /></button>
      </header>
      {room?.watching.length ? (
        <div className="stumble-widget-cams">
          {room.watching.map((h) => {
            const src = frames[`${room.room}/${h}`];
            const nick = room.cams.find((c) => c.handle === h)?.nick ?? h;
            return src ? <img key={h} src={src} alt={nick} title={nick} /> : null;
          })}
        </div>
      ) : null}
      {room ? <ChatFeed lines={roomLines} self={room.self} /> : (
        <p className="chat-hint stumble-widget-empty">No rooms open. <button type="button" onClick={open}>Join one</button></p>
      )}
    </section>
  );
}

export function StumbleToasts({ onOpen }: { onOpen: () => void }) {
  const { toasts, dismissToast, setFocusRoom, clearUnread } = useStumbleLive();
  if (!toasts.length) return null;
  return (
    <div className="stumble-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="stumble-toast">
          <button type="button" className="stumble-toast-body" onClick={() => { setFocusRoom(t.line.room); clearUnread(); dismissToast(t.id); onOpen(); }}>
            <AtSign size={16} />
            <span>
              <small>{t.line.nick ?? 'Someone'} in {t.line.room}</small>
              {t.line.text}
            </span>
          </button>
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)}><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// Taskbar icon: green while a room is open, grey when the bridge is idle, dark when the
// bridge isn't installed or running. Red badge = unread mentions. Click for the manage menu.
export function StumbleTrayButton() {
  const { link, chrome, rooms, unread, prefs, setPrefs, clearUnread, openChrome, send, showLive } = useStumbleLive();
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => { useStumbleLive.getState().connect(); }, []);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc); };
  }, [menu]);

  const online = link === 'online';
  const live = online && (chrome || rooms.length > 0);
  const title = !online
    ? 'StumbleChat bridge not running. Click for details'
    : `StumbleChat bridge: ${rooms.length} room${rooms.length === 1 ? '' : 's'} open. Click to manage`;
  const act = (fn: () => void) => () => { fn(); setMenu(false); };

  return (
    <span className="tb-stumble-wrap" ref={wrap}>
      <button type="button" className={clsx('tb-stumble', live && 'live', online && !live && 'idle')} title={title} aria-label={title}
        aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
        <Radio size={14} />
        {unread ? <span className="stumble-badge">{unread}</span> : null}
      </button>
      {menu ? (
        <div className="stumble-menu" role="menu">
          <header>
            <i className={clsx('stumble-dot', online ? (live ? 'on' : 'wait') : 'off')} />
            <strong>StumbleChat bridge</strong>
            <span>{!online ? 'not running' : live ? 'online' : 'idle'}</span>
          </header>
          {!online ? (
            <p className="chat-hint">
              {link === 'connecting' ? 'Looking for the bridge…' : <>Set it up once in the Shell tab: <code>thanatos stumble install</code></>}
            </p>
          ) : (
            <>
              <ul className="stumble-menu-rooms">
                {rooms.map((r) => (
                  <li key={r.room}>
                    <i className={clsx('stumble-dot', r.connected ? 'on' : r.reopening ? 'wait' : 'off')} />
                    <span>{r.room}</span>
                    <small>{r.browser ? 'your browser' : 'bridge Chrome'}</small>
                    <button type="button" title={`Leave ${r.room}`} onClick={() => send({ type: 'leave', room: r.room })}><X size={12} /></button>
                  </li>
                ))}
              </ul>
              {!rooms.length ? <p className="chat-hint">No rooms open. Join one in your browser (tap extension) or from Stumble Live.</p> : null}
              <button type="button" role="menuitem" onClick={act(() => { showLive(rooms[0]?.room); clearUnread(); })}><ExternalLink size={13} /> Open Stumble Live</button>
              <button type="button" role="menuitem" onClick={act(() => { setPrefs({ visible: !prefs.visible, collapsed: false }); clearUnread(); })}>
                <Maximize2 size={13} /> {prefs.visible ? 'Hide' : 'Show'} the widget
              </button>
              <button type="button" role="menuitem" onClick={() => setPrefs({ sound: !prefs.sound })}>
                {prefs.sound ? <Volume2 size={13} /> : <VolumeX size={13} />} Mention sound: {prefs.sound ? 'on' : 'off'}
              </button>
              <button type="button" role="menuitem" onClick={act(() => (chrome ? send({ type: 'stop' }) : openChrome()))}>
                {chrome ? <Power size={13} /> : <Globe size={13} />} {chrome ? 'Close' : 'Open'} the bridge's Chrome window
              </button>
            </>
          )}
        </div>
      ) : null}
    </span>
  );
}
