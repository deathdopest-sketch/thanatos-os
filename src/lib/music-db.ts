import type { MusicTrack } from './desktop-types';

export const MUSIC_DB = 'thanatos.musicLibrary.v1';
export const MUSIC_STORE = 'tracks';

export function openMusicDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MUSIC_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MUSIC_STORE)) db.createObjectStore(MUSIC_STORE, { keyPath: 'id' });
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function readMusicTracks(): Promise<MusicTrack[]> {
  const db = await openMusicDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUSIC_STORE, 'readonly');
    const req = tx.objectStore(MUSIC_STORE).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as MusicTrack[]);
    tx.oncomplete = () => db.close();
  });
}

export async function writeMusicTracks(tracks: MusicTrack[]) {
  const db = await openMusicDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MUSIC_STORE, 'readwrite');
    const store = tx.objectStore(MUSIC_STORE);
    store.clear();
    tracks.forEach((track) => store.put(track));
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}
