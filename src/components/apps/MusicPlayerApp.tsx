import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, Music, X } from 'lucide-react';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { openMusicDb, readMusicTracks, writeMusicTracks } from '../../lib/music-db';
import { idlePulse, emitAudioPulse, getAudioPulse } from '../../lib/audio';
import type { MusicTrack, MusicTrackView } from '../../lib/desktop-types';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function MusicPlayerApp() {
  const [playlist, setPlaylist] = useState<MusicTrackView[]>([]);
  const [current, setCurrent] = useState(0);
  const [musicStatus, setMusicStatus] = useState('Music library loading...');
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef(0);
  const playlistRef = useRef<MusicTrackView[]>([]);

  const stopMusicPulse = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    emitAudioPulse(idlePulse);
  }, []);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    let cancelled = false;
    void readMusicTracks()
      .then((tracks) => {
        if (cancelled) return;
        setPlaylist(tracks.map((track) => ({ ...track, url: URL.createObjectURL(track.blob) })));
        setMusicStatus(tracks.length ? `Loaded ${tracks.length} saved track${tracks.length === 1 ? '' : 's'}.` : 'No saved tracks.');
      })
      .catch(() => setMusicStatus('Music library unavailable.'));
    return () => {
      cancelled = true;
      stopMusicPulse();
      void audioCtxRef.current?.close();
      playlistRef.current.forEach((track) => URL.revokeObjectURL(track.url));
    };
  }, [stopMusicPulse]);

  const startMusicPulse = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current ?? new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 1024;
        analyserRef.current.smoothingTimeConstant = 0.76;
      }
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
      const analyser = analyserRef.current;
      const freq = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (audio.paused || audio.ended) {
          stopMusicPulse();
          return;
        }
        analyser.getByteFrequencyData(freq);
        emitAudioPulse(getAudioPulse(freq, 'music'));
        rafRef.current = window.requestAnimationFrame(tick);
      };
      window.cancelAnimationFrame(rafRef.current);
      tick();
    } catch (error) {
      console.warn('Thanatos music analyzer unavailable', error);
      stopMusicPulse();
    }
  };

  const persistMusic = async (tracks: MusicTrackView[]) => {
    await writeMusicTracks(tracks.map(({ id, name, type, blob }) => ({ id, name, type, blob })));
  };

  const loadTracks = async (files: FileList | null) => {
    const next = [
      ...playlist,
      ...Array.from(files ?? []).map((file) => ({
        id: nanoid(),
        name: file.name,
        type: file.type,
        blob: file,
        url: URL.createObjectURL(file)
      }))
    ];
    setPlaylist(next);
    setCurrent(0);
    stopMusicPulse();
    await persistMusic(next);
    setMusicStatus(`Saved ${next.length} track${next.length === 1 ? '' : 's'} locally.`);
  };

  const removeTrack = async (id: string) => {
    const target = playlist.find((track) => track.id === id);
    if (target) URL.revokeObjectURL(target.url);
    const next = playlist.filter((track) => track.id !== id);
    setPlaylist(next);
    setCurrent((value) => Math.min(value, Math.max(0, next.length - 1)));
    stopMusicPulse();
    await persistMusic(next);
    setMusicStatus(`Saved ${next.length} track${next.length === 1 ? '' : 's'} locally.`);
  };

  const clearTracks = async () => {
    playlist.forEach((track) => URL.revokeObjectURL(track.url));
    setPlaylist([]);
    setCurrent(0);
    stopMusicPulse();
    await persistMusic([]);
    setMusicStatus('Music library cleared.');
  };

  return (
    <div className="music-player-app">
      <input ref={inputRef} type="file" accept="audio/*" multiple onChange={(e) => void loadTracks(e.target.files)} style={{ display: 'none' }} />
      {playlist.length === 0 ? <div className="player-empty"><Music size={48} /><p>No tracks</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Music</button></div>
        : <>
            <div className="music-now-playing"><Music size={28} /><span>{playlist[current]?.name ?? ''}</span></div>
            <audio
              ref={audioRef}
              src={playlist[current]?.url}
              controls
              autoPlay
              onPlay={() => void startMusicPulse()}
              onPause={stopMusicPulse}
              onEnded={() => { stopMusicPulse(); setCurrent((c) => (c + 1) % playlist.length); }}
              className="music-audio"
            />
            <div className="music-controls">
              <button type="button" onClick={() => setCurrent((c) => (c - 1 + playlist.length) % playlist.length)}><ChevronLeft size={15} /></button>
              <span>{current + 1}/{playlist.length}</span>
              <button type="button" onClick={() => setCurrent((c) => (c + 1) % playlist.length)}><ChevronRight size={15} /></button>
              <button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Add</button>
              <button type="button" onClick={() => void clearTracks()}><X size={15} /> Clear</button>
            </div>
            <p className="media-status">Visualizer attached while playing. {musicStatus}</p>
            <div className="music-playlist">
              {playlist.map((t, i) => (
                <div key={t.id} className={clsx('playlist-item', i === current && 'active-track')}>
                  <button type="button" onClick={() => setCurrent(i)}><Music size={14} /><span>{t.name}</span></button>
                  <button type="button" aria-label={`Remove ${t.name}`} onClick={() => void removeTrack(t.id)}><X size={13} /></button>
                </div>
              ))}
            </div>
          </>}
    </div>
  );
}

// Re-export types needed by other modules
export type { MusicTrack, MusicTrackView };
