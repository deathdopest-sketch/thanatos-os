import { useEffect, useState } from 'react';
import { Camera, DoorOpen, ExternalLink, Globe, Plus, Settings, Trash2 } from 'lucide-react';
import { openChatWindow, STUMBLECHAT_URL } from './RotViceApp';
import { readStoredValue, writeStoredValue } from '../../lib/storage';
import { useStumbleLive } from '../../lib/stumble-live-store';

export type StumbleRole = 'owner' | 'supermod' | 'mod' | 'member';
export type StumbleRoom = { id: string; slug: string; role: StumbleRole };
export type StumbleSettings = { username: string; rooms: StumbleRoom[] };

export const STUMBLE_SETTINGS_KEY = 'thanatos.stumblechat';
export const STUMBLE_ROLES: { id: StumbleRole; label: string; tools: string }[] = [
  { id: 'owner', label: 'Owner', tools: 'Automod actions and autobans (coming next).' },
  { id: 'supermod', label: 'Super mod', tools: 'Automod actions and autobans (coming next).' },
  { id: 'mod', label: 'Mod', tools: 'Basic mod toolkit (coming next).' },
  { id: 'member', label: 'Member', tools: 'Room shortcut only.' }
];

export function loadStumbleSettings(): StumbleSettings {
  try {
    const parsed = JSON.parse(readStoredValue(STUMBLE_SETTINGS_KEY) ?? '') as Partial<StumbleSettings>;
    const rooms = Array.isArray(parsed.rooms)
      ? parsed.rooms.filter((r): r is StumbleRoom => typeof r?.slug === 'string' && STUMBLE_ROLES.some((role) => role.id === r.role))
      : [];
    return { username: typeof parsed.username === 'string' ? parsed.username : '', rooms };
  } catch {
    return { username: '', rooms: [] };
  }
}

// Accepts a bare room name or a pasted room link (stumblechat.com/room/<name>).
function stumbleRoomSlug(input: string) {
  const trimmed = input.trim();
  const fromLink = trimmed.match(/stumblechat\.com\/room\/([^/?#\s]+)/i);
  return (fromLink ? decodeURIComponent(fromLink[1]) : trimmed).replace(/^\/+|\/+$/g, '');
}

const stumbleRoomUrl = (slug: string) => `${STUMBLECHAT_URL}/room/${encodeURIComponent(slug)}`;

export function StumbleChatApp() {
  const [tab, setTab] = useState<'rooms' | 'settings'>('rooms');
  const bridge = useStumbleLive((st) => st.link === 'online');
  const chromeOpen = useStumbleLive((st) => st.chrome);
  const openChrome = useStumbleLive((st) => st.openChrome);
  const send = useStumbleLive((st) => st.send);
  // Opening this app opens StumbleChat in the bridge's Chrome window, ready to sign in.
  // Without the bridge, rooms open in a normal popup window instead.
  useEffect(() => { openChrome(); }, [openChrome]);
  const openStumble = () => (bridge ? openChrome() : openChatWindow(STUMBLECHAT_URL));
  const openRoom = (slug: string) => {
    if (!bridge) { openChatWindow(stumbleRoomUrl(slug)); return; }
    send({ type: 'join', room: slug });
    useStumbleLive.getState().showLive(slug);
  };
  const [settings, setSettings] = useState<StumbleSettings>(loadStumbleSettings);
  const [roomInput, setRoomInput] = useState('');
  const [roleInput, setRoleInput] = useState<StumbleRole>('member');

  const save = (next: StumbleSettings) => {
    setSettings(next);
    writeStoredValue(STUMBLE_SETTINGS_KEY, JSON.stringify(next));
  };

  const addRoom = () => {
    const slug = stumbleRoomSlug(roomInput);
    if (!slug || settings.rooms.some((r) => r.slug.toLowerCase() === slug.toLowerCase())) return;
    save({ ...settings, rooms: [...settings.rooms, { id: crypto.randomUUID(), slug, role: roleInput }] });
    setRoomInput('');
  };

  const roleLabel = (role: StumbleRole) => STUMBLE_ROLES.find((r) => r.id === role)?.label ?? role;

  return (
    <div className="chat-app">
      <div className="chat-toolbar">
        <button type="button" className={tab === 'rooms' ? 'primary-action' : ''} onClick={() => setTab('rooms')}><DoorOpen size={15} /> Rooms</button>
        <button type="button" className={tab === 'settings' ? 'primary-action' : ''} onClick={() => setTab('settings')}><Settings size={15} /> Settings</button>
        <button type="button" onClick={openStumble}><ExternalLink size={15} /> Open StumbleChat</button>
        {bridge ? <button type="button" title="Your normal browser, with your camera and mic. Use it to go on cam." onClick={() => openChatWindow(STUMBLECHAT_URL)}><Globe size={15} /> In my browser</button> : null}
      </div>

      {tab === 'rooms' ? (
        <div className="chat-panel">
          <p className="chat-hint">
            {settings.username ? <>Account: <strong>{settings.username}</strong>. </> : null}
            {bridge
              ? chromeOpen
                ? 'StumbleChat is open in the bridge window. Sign in there if you haven\'t yet; Thanatos never sees your password. Rooms you open here stay connected in the background.'
                : 'Opening StumbleChat in the bridge window…'
              : 'Rooms open in their own window. Sign in there yourself; Thanatos never sees your password. For rooms that stay connected and live chat on the desktop, run thanatos stumble install once.'}
          </p>
          {settings.rooms.length === 0 ? (
            <div className="chat-empty">
              <p>No rooms yet.</p>
              <button type="button" onClick={() => setTab('settings')}><Plus size={15} /> Add a room</button>
            </div>
          ) : (
            <ul className="chat-room-list">
              {settings.rooms.map((room) => (
                <li key={room.id}>
                  <div>
                    <strong>{room.slug}</strong>
                    <span className={`chat-role ${room.role}`}>{roleLabel(room.role)}</span>
                  </div>
                  <button type="button" onClick={() => openRoom(room.slug)}><ExternalLink size={15} /> Open</button>
                  {bridge ? (
                    <button type="button" title="Open this room in your normal browser, with your camera and mic, to go on cam" onClick={() => openChatWindow(stumbleRoomUrl(room.slug))}>
                      <Camera size={15} /> Go on cam
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="chat-panel">
          <section className="chat-settings-section">
            <h3>Account</h3>
            <label>
              StumbleChat username
              <input value={settings.username} onChange={(e) => save({ ...settings, username: e.target.value })} placeholder="your username" />
            </label>
            <p className="chat-hint">Only the name is saved, on this device. Log in on StumbleChat itself.</p>
          </section>

          <section className="chat-settings-section">
            <h3>Rooms</h3>
            <div className="chat-room-form">
              <input value={roomInput} onChange={(e) => setRoomInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addRoom(); }} placeholder="room name or stumblechat.com/room/… link" />
              <select value={roleInput} onChange={(e) => setRoleInput(e.target.value as StumbleRole)}>
                {STUMBLE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <button type="button" onClick={addRoom}><Plus size={15} /> Add</button>
            </div>
            <ul className="chat-room-list">
              {settings.rooms.map((room) => (
                <li key={room.id}>
                  <div>
                    <strong>{room.slug}</strong>
                    <small>{STUMBLE_ROLES.find((r) => r.id === room.role)?.tools}</small>
                  </div>
                  <select value={room.role} aria-label={`Role in ${room.slug}`} onChange={(e) => save({ ...settings, rooms: settings.rooms.map((r) => r.id === room.id ? { ...r, role: e.target.value as StumbleRole } : r) })}>
                    {STUMBLE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <button type="button" aria-label={`Remove ${room.slug}`} onClick={() => save({ ...settings, rooms: settings.rooms.filter((r) => r.id !== room.id) })}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
