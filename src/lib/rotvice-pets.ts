import { create } from 'zustand';
import type { PetSpriteMeta } from './pet-sprite';

export type DesktopPet = {
  slot: number;
  name: string;
  speciesName: string;
  level: number;
  mood: string;
  sprite: PetSpriteMeta;
  spriteUrl: string;
};

type PetStore = { pets: DesktopPet[]; setPets: (pets: DesktopPet[]) => void };

// Last pet list RotVice reported. Kept outside the RotVice window so pets stay on
// the desktop while that window is minimized (minimizing unmounts the app).
export const useRotvicePets = create<PetStore>((set) => ({
  pets: [],
  setPets: (pets) => set({ pets }),
}));

/** Validate the bridge payload's pets and resolve sprite paths against the RotVice origin. */
export function parseRotvicePets(raw: unknown, origin: string): DesktopPet[] {
  const list = (raw as { list?: unknown } | null)?.list;
  if (!Array.isArray(list)) return [];
  const pets: DesktopPet[] = [];
  for (const item of list) {
    const p = item as Partial<DesktopPet> & { sprite?: PetSpriteMeta };
    const path = p?.sprite?.path;
    if (typeof path !== 'string' || !path) continue;
    let url: URL;
    try { url = new URL(path, origin); } catch { continue; }
    if (url.origin !== origin) continue; // only sheets from RotVice itself
    pets.push({
      slot: Number(p.slot) || pets.length + 1,
      name: typeof p.name === 'string' ? p.name : 'pet',
      speciesName: typeof p.speciesName === 'string' ? p.speciesName : '',
      level: Number(p.level) || 1,
      mood: typeof p.mood === 'string' ? p.mood : '',
      sprite: p.sprite as PetSpriteMeta,
      spriteUrl: url.href,
    });
  }
  return pets;
}
