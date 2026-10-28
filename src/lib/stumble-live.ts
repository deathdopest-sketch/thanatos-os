// Messages from the local StumbleChat bridge (native/stumble-bridge). The bridge
// keeps your rooms open in its own Chrome window; this is the desktop's view of it.

export const STUMBLE_BRIDGE_URL = 'ws://127.0.0.1:4180';
export const MAX_WATCHED_CAMS = 12;
const MAX_LINES = 600;

export type StumbleLine = { room: string; kind: 'chat' | 'self' | 'system'; nick: string | null; text: string; ts: number };
export type StumbleCam = { handle: string; nick: string | null };
export type StumbleLiveRoom = { room: string; connected: boolean; reopening: boolean; cams: StumbleCam[]; watching: string[] };

export type BridgeMessage =
  | { type: 'hello'; rooms: StumbleLiveRoom[]; history: StumbleLine[] }
  | { type: 'rooms'; rooms: StumbleLiveRoom[] }
  | { type: 'chat'; line: StumbleLine }
  | { type: 'frame'; room: string; handle: string; data: string }
  | { type: 'status'; chrome: boolean }
  | { type: 'error'; message: string };

const str = (v: unknown) => (typeof v === 'string' ? v : null);

function parseLine(v: unknown): StumbleLine | null {
  const o = v as Record<string, unknown> | null;
  const room = str(o?.room);
  const text = str(o?.text);
  if (!room || text === null) return null;
  const kind = o?.kind === 'self' || o?.kind === 'system' ? o.kind : 'chat';
  return { room, kind, nick: str(o?.nick), text, ts: typeof o?.ts === 'number' ? o.ts : Date.now() };
}

function parseRooms(v: unknown): StumbleLiveRoom[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((r) => {
    const room = str(r?.room);
    if (!room) return [];
    const cams = Array.isArray(r.cams)
      ? r.cams.flatMap((c: unknown) => {
          const cam = c as Record<string, unknown> | null;
          const handle = cam?.handle != null ? String(cam.handle) : null;
          return handle ? [{ handle, nick: str(cam?.nick) }] : [];
        })
      : [];
    const watching = Array.isArray(r.watching) ? r.watching.map(String) : [];
    return [{ room, connected: r.connected === true, reopening: r.reopening === true, cams, watching }];
  });
}

export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let m: Record<string, unknown>;
  try { m = JSON.parse(raw); } catch { return null; }
  switch (m?.type) {
    case 'hello': {
      const history = Array.isArray(m.history) ? m.history.map(parseLine).filter((l): l is StumbleLine => l !== null) : [];
      return { type: 'hello', rooms: parseRooms(m.rooms), history };
    }
    case 'rooms': return { type: 'rooms', rooms: parseRooms(m.rooms) };
    case 'chat': {
      const line = parseLine(m.line);
      return line ? { type: 'chat', line } : null;
    }
    case 'frame': {
      const room = str(m.room); const handle = str(m.handle); const data = str(m.data);
      // only JPEG data URLs from the bridge's own canvas capture
      return room && handle && data?.startsWith('data:image/jpeg;base64,') ? { type: 'frame', room, handle, data } : null;
    }
    case 'status': return { type: 'status', chrome: m.chrome === true };
    case 'error': return { type: 'error', message: str(m.message) ?? 'bridge error' };
    default: return null;
  }
}

export function appendLines(lines: StumbleLine[], more: StumbleLine[]) {
  const next = lines.concat(more);
  return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
}
