import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AtSign, Maximize2, Minus, Radio, Volume2, VolumeX, X } from 'lucide-react';
import clsx from 'clsx';
import { useStumbleLive } from '../lib/stumble-live-store';
import { ChatFeed } from './StumbleLive';

const WIDTH = 340;

// Live StumbleChat on the desktop itself: a small draggable widget that shows while
// the bridge is running, plus a toast (and chime) whenever someone mentions you.
export function StumbleWidget({ onOpen }: { onOpen: () => void }) {
  const { link, rooms, lines, frames, prefs, unread, setPrefs, setFocusRoom, clearUnread } = useStumbleLive();
  const [active, setActive] = useState<string | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => { useStumbleLive.getState().connect(); }, []);
  useEffect(() => {
    if (!rooms.length) setActive(null);
    else if (!active || !rooms.some((r) => r.room === active)) setActive(rooms[0].room);
  }, [rooms, active]);

  const room = rooms.find((r) => r.room === active) ?? null;
  const roomLines = useMemo(() => lines.filter((l) => l.room === active).slice(-80), [lines, active]);

  if (link !== 'online' || !prefs.visible) return null;

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

// Taskbar icon: shows the bridge state and unread mentions; click to show or hide the widget.
export function StumbleTrayButton() {
  const { link, rooms, unread, prefs, setPrefs, clearUnread } = useStumbleLive();
  useEffect(() => { useStumbleLive.getState().connect(); }, []);
  const live = link === 'online';
  const title = !live ? 'StumbleChat bridge offline (thanatos stumble start)' : `${rooms.length} room${rooms.length === 1 ? '' : 's'} open. Click to ${prefs.visible ? 'hide' : 'show'} the widget`;
  return (
    <button type="button" className={clsx('tb-stumble', live && 'live')} title={title} aria-label={title}
      onClick={() => { if (live) { setPrefs({ visible: !prefs.visible, collapsed: false }); clearUnread(); } }}>
      <Radio size={14} />
      {unread ? <span className="stumble-badge">{unread}</span> : null}
    </button>
  );
}
