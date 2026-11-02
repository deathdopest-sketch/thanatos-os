import { readStoredValue } from './storage';

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
