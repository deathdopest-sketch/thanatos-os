import type { AudioPulse } from './desktop-types';

export const idlePulse: AudioPulse = { level: 0, bass: 0, mid: 0, bands: Array.from({ length: 24 }, () => 0), source: 'idle' };

export function emitAudioPulse(pulse: AudioPulse) {
  document.documentElement.style.setProperty('--audio-level', pulse.level.toFixed(3));
  document.documentElement.style.setProperty('--audio-bass', pulse.bass.toFixed(3));
  document.documentElement.style.setProperty('--audio-mid', pulse.mid.toFixed(3));
  window.dispatchEvent(new CustomEvent<AudioPulse>('thanatos:audio-pulse', { detail: pulse }));
}

export function getAudioPulse(freq: Uint8Array, source: AudioPulse['source']): AudioPulse {
  const read = (from: number, to: number) => {
    const slice = freq.slice(from, Math.min(to, freq.length));
    return slice.length ? slice.reduce((sum, value) => sum + value, 0) / (slice.length * 255) : 0;
  };
  const level = read(0, freq.length);
  const bass = read(0, 24);
  const mid = read(24, 96);
  const bands = Array.from({ length: 24 }, (_, i) => {
    const start = Math.floor((i / 24) * freq.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / 24) * freq.length));
    return read(start, end);
  });
  return { level, bass, mid, bands, source };
}
