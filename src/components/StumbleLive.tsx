import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Radio, Video, VideoOff, X } from 'lucide-react';
import clsx from 'clsx';
import { MAX_WATCHED_CAMS, isMention, type StumbleLine } from '../lib/stumble-live';
import { useStumbleLive } from '../lib/stumble-live-store';

// The full view of the rooms the bridge keeps open. The connection itself lives in
// the shared store, so closing this window doesn't drop anything.
export default function StumbleLive({ savedRooms }: { savedRooms: string[] }) {
  const { link, chrome, rooms, lines, frames, error, send, focusRoom, setFocusRoom, clearUnread, openChrome } = useStumbleLive();
  const [active, setActive] = useState<string | null>(focusRoom);
  const [joinInput, setJoinInput] = useState('');

  // opening this app opens StumbleChat in the bridge's Chrome window (sign in there)
  useEffect(() => { useStumbleLive.getState().openChrome(); clearUnread(); }, [clearUnread]);
  // a toast or the widget asked to show a particular room
  useEffect(() => { if (focusRoom) { setActive(focusRoom); setFocusRoom(null); } }, [focusRoom, setFocusRoom]);

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

  if (link !== 'online' || !chrome) {
    return (
      <div className="chat-app">
        <div className="chat-panel chat-launch">
          <h3>Stumble Live</h3>
          {link === 'connecting' ? <p className="chat-hint">Connecting to the StumbleChat bridge…</p>
            : link === 'offline' ? (
              <>
                <p className="chat-hint">The StumbleChat bridge isn&apos;t set up on this machine yet.</p>
                <p className="chat-hint">
                  Run <code>thanatos stumble install</code> once in the Linux terminal. After that it runs in the background,
                  and opening this app opens StumbleChat for you.
                </p>
              </>
            ) : (
              <>
                <p className="chat-hint">Opening StumbleChat in its own Chrome window. Sign in there if it asks; you only need to do that once.</p>
                <button type="button" className="primary-action" onClick={openChrome}><Radio size={15} /> Open StumbleChat</button>
              </>
            )}
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
            <ChatFeed lines={roomLines} self={room.self} />
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

export const ChatFeed = memo(function ChatFeed({ lines, self }: { lines: StumbleLine[]; self: string | null }) {
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
        <div key={`${l.ts}-${i}`} className={clsx('stumble-line', l.kind, isMention(l, [self]) && 'mention')}>
          <time>{new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          {l.kind === 'system' ? <span>{l.text}</span> : <><strong>{l.nick ?? '?'}</strong><span>{l.text}</span></>}
        </div>
      ))}
    </div>
  );
});
