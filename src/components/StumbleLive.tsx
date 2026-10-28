import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Radio, Video, VideoOff, X } from 'lucide-react';
import clsx from 'clsx';
import {
  MAX_WATCHED_CAMS, STUMBLE_BRIDGE_URL, appendLines, parseBridgeMessage,
  type StumbleLine, type StumbleLiveRoom
} from '../lib/stumble-live';

type Link = 'connecting' | 'online' | 'offline';

// Live chat + cams from the rooms the bridge keeps open. Closing or minimizing this
// window only drops the view: the bridge stays in the rooms and replays recent chat.
export default function StumbleLive({ savedRooms }: { savedRooms: string[] }) {
  const [link, setLink] = useState<Link>('connecting');
  const [chrome, setChrome] = useState(true);
  const [rooms, setRooms] = useState<StumbleLiveRoom[]>([]);
  const [lines, setLines] = useState<StumbleLine[]>([]);
  const [frames, setFrames] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let stopped = false;
    let retry = 0;
    let timer = 0;
    const connect = () => {
      setLink('connecting');
      const ws = new WebSocket(STUMBLE_BRIDGE_URL);
      wsRef.current = ws;
      ws.onopen = () => { retry = 0; setLink('online'); setError(null); setChrome(true); };
      ws.onmessage = (e) => {
        const m = parseBridgeMessage(String(e.data));
        if (!m) return;
        if (m.type === 'hello') { setRooms(m.rooms); setLines(m.history.slice(-600)); }
        else if (m.type === 'rooms') setRooms(m.rooms);
        else if (m.type === 'chat') setLines((l) => appendLines(l, [m.line]));
        else if (m.type === 'frame') setFrames((f) => ({ ...f, [`${m.room}/${m.handle}`]: m.data }));
        else if (m.type === 'status') setChrome(m.chrome);
        else if (m.type === 'error') setError(m.message);
      };
      ws.onclose = () => {
        if (stopped) return;
        setLink('offline');
        timer = window.setTimeout(connect, Math.min(15_000, 1000 * 2 ** retry++));
      };
    };
    connect();
    return () => { stopped = true; window.clearTimeout(timer); wsRef.current?.close(); };
  }, []);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }, []);

  // keep a valid room selected
  useEffect(() => {
    if (!rooms.length) setActive(null);
    else if (!active || !rooms.some((r) => r.room === active)) setActive(rooms[0].room);
  }, [rooms, active]);

  const room = rooms.find((r) => r.room === active) ?? null;
  const roomLines = useMemo(() => lines.filter((l) => l.room === active), [lines, active]);
  const unjoined = savedRooms.filter((s) => !rooms.some((r) => r.room.toLowerCase() === s.toLowerCase()));

  const join = (name: string) => {
    const slug = name.trim().replace(/^.*stumblechat\.com\/room\//i, '').replace(/[/?#].*$/, '');
    if (!slug) return;
    send({ type: 'join', room: slug });
    setActive(slug);
    setJoinInput('');
  };

  const toggleCam = (handle: string) => {
    if (!room) return;
    const on = room.watching.includes(handle);
    if (!on && room.watching.length >= MAX_WATCHED_CAMS) return;
    send({ type: 'watch', room: room.room, handles: on ? room.watching.filter((h) => h !== handle) : [...room.watching, handle] });
  };

  if (link !== 'online') {
    return (
      <div className="chat-app">
        <div className="chat-panel chat-launch">
          <h3>Stumble Live</h3>
          <p className="chat-hint">
            {link === 'connecting' ? 'Connecting to the StumbleChat bridge…' : 'The StumbleChat bridge is not running.'}
          </p>
          <p className="chat-hint">
            Start it in the Linux terminal with <code>thanatos stumble start</code>. It opens its own Chrome window:
            sign in to StumbleChat there yourself, then join rooms here. It keeps the rooms open even when this window is closed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app stumble-live">
      <div className="chat-toolbar">
        {rooms.map((r) => (
          <span key={r.room} className={clsx('stumble-tab', r.room === active && 'active')}>
            <button type="button" onClick={() => setActive(r.room)} title={r.reopening ? 'reopening' : r.connected ? 'connected' : 'connecting'}>
              <i className={clsx('stumble-dot', r.connected ? 'on' : r.reopening ? 'wait' : 'off')} />
              {r.room}
            </button>
            <button type="button" aria-label={`Leave ${r.room}`} onClick={() => send({ type: 'leave', room: r.room })}><X size={13} /></button>
          </span>
        ))}
        <form className="stumble-join" onSubmit={(e) => { e.preventDefault(); join(joinInput); }}>
          <input value={joinInput} onChange={(e) => setJoinInput(e.target.value)} list="stumble-saved-rooms" placeholder="join room…" aria-label="Room to join" />
          <datalist id="stumble-saved-rooms">{unjoined.map((s) => <option key={s} value={s} />)}</datalist>
          <button type="submit"><Plus size={15} /> Join</button>
        </form>
      </div>

      {!chrome ? <p className="chat-hint stumble-warn">The bridge's Chrome window closed. Run <code>thanatos stumble start</code> again.</p> : null}
      {error ? <p className="chat-hint stumble-warn">{error}</p> : null}

      {room ? (
        <div className="stumble-body">
          <div className="stumble-main">
            {room.watching.length ? (
              <div className="stumble-cams">
                {room.watching.map((h) => {
                  const cam = room.cams.find((c) => c.handle === h);
                  const src = frames[`${room.room}/${h}`];
                  return (
                    <figure key={h}>
                      {src ? <img src={src} alt={cam?.nick ?? `cam ${h}`} /> : <div className="stumble-cam-wait"><Video size={18} /></div>}
                      <figcaption>{cam?.nick ?? (cam ? h : `${h} (off cam)`)}</figcaption>
                    </figure>
                  );
                })}
              </div>
            ) : null}
            <ChatFeed lines={roomLines} />
          </div>
          <aside className="chat-stats stumble-side">
            <h3>Cams</h3>
            {room.cams.length === 0 ? <p>No one is on cam.</p> : (
              <ul>
                {room.cams.map((c) => (
                  <li key={c.handle}>
                    <label>
                      <input type="checkbox" checked={room.watching.includes(c.handle)} onChange={() => toggleCam(c.handle)} />
                      {c.nick ?? `user ${c.handle}`}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p>{room.reopening ? 'StumbleChat dropped the room. Reopening…' : room.connected ? 'Connected. The bridge answers the site’s pings in its own Chrome window.' : 'Opening the room…'}</p>
            {room.watching.length ? (
              <button type="button" onClick={() => send({ type: 'watch', room: room.room, handles: [] })}><VideoOff size={14} /> Stop all cams</button>
            ) : null}
          </aside>
        </div>
      ) : (
        <div className="chat-panel chat-empty">
          <p className="chat-hint"><Radio size={14} /> No rooms open. Join one above{savedRooms.length ? ', or pick one of your saved StumbleChat rooms' : ''}.</p>
          {unjoined.map((s) => <button key={s} type="button" onClick={() => join(s)}><Plus size={15} /> {s}</button>)}
        </div>
      )}
    </div>
  );
}

const ChatFeed = memo(function ChatFeed({ lines }: { lines: StumbleLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lines]);
  return (
    <div className="stumble-feed" ref={ref} onScroll={(e) => {
      const el = e.currentTarget;
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    }}>
      {lines.length === 0 ? <p className="chat-hint">Waiting for chat…</p> : lines.map((l, i) => (
        <div key={`${l.ts}-${i}`} className={clsx('stumble-line', l.kind)}>
          <time>{new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          {l.kind === 'system' ? <span>{l.text}</span> : <><strong>{l.nick ?? '?'}</strong><span>{l.text}</span></>}
        </div>
      ))}
    </div>
  );
});
