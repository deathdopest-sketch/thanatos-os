import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { RadioTower, X } from 'lucide-react';
import clsx from 'clsx';
import { idlePulse, emitAudioPulse, getAudioPulse } from '../../lib/audio';
import type { ThanatosTheme, AudioPulse } from '../../lib/desktop-types';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const matrixCells = Array.from({ length: 100 }, (_, index) => {
  const row = Math.floor(index / 10);
  const col = index % 10;
  const type = index === 0 || index === 99 ? 'logo'
    : [1, 8, 90, 98].includes(index) ? 'status'
      : row === 0 || row === 9 || col === 0 || col === 9 ? 'data'
        : (index + row) % 7 === 0 ? 'sprite'
          : 'meter';
  return { id: index, row, col, type };
});

function getVisualizerPalette(theme: ThanatosTheme) {
  if (theme === 'lilly-garden') return { accent: '#9cff4f', hot: '#ff8a2a', dim: '#112610', sprite: 'lilly-garden' };
  if (theme === 'zombitious') return { accent: '#83ff9b', hot: '#ff4fbd', dim: '#102818', sprite: 'zombitious' };
  if (theme === 'lilly') return { accent: '#ff75ce', hot: '#a56bff', dim: '#24102f', sprite: 'lilly' };
  return { accent: '#ff234f', hot: '#7b000d', dim: '#230307', sprite: 'death' };
}

export function AudioVisualizerApp({ theme }: { theme: ThanatosTheme }) {
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState('Listening for Music Player audio. Capture is optional.');
  const [active, setActive] = useState(false);
  const [pulse, setPulse] = useState<AudioPulse>(idlePulse);
  const [error, setError] = useState(false);
  const palette = getVisualizerPalette(theme);

  const stop = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    setActive(false);
    setError(false);
    setStatus('Listening for Music Player audio. Capture is optional.');
    emitAudioPulse(idlePulse);
  }, []);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const onPulse = (event: Event) => {
      const detail = (event as CustomEvent<AudioPulse>).detail;
      if (!detail) return;
      setPulse(detail);
      if (detail.source === 'music') {
        setError(false);
        setStatus('Auto-attached to Music Player.');
      } else if (detail.source === 'capture') {
        setError(false);
        setStatus('Audio capture active.');
      }
    };
    window.addEventListener('thanatos:audio-pulse', onPulse);
    return () => window.removeEventListener('thanatos:audio-pulse', onPulse);
  }, []);

  const start = async () => {
    stop();
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError(true);
        setStatus('Screen audio capture is not available in this browser. Play a track in Music Player instead.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = stream.getAudioTracks();
      stream.getVideoTracks().forEach((t) => t.stop());
      if (!audioTracks.length) {
        stream.getTracks().forEach((t) => t.stop());
        setError(true);
        setStatus('No audio track. Enable "Share audio" when picking a tab, or use Music Player.');
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        setError(true);
        setStatus('Web Audio is not available in this browser.');
        return;
      }
      const actx = new AudioCtx();
      const analyser = actx.createAnalyser();
      analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.72;
      actx.createMediaStreamSource(new MediaStream(audioTracks)).connect(analyser);
      streamRef.current = stream; ctxRef.current = actx; setActive(true); setError(false); setStatus('Audio capture active.');
      const freq = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(freq);
        emitAudioPulse(getAudioPulse(freq, 'capture'));
        rafRef.current = window.requestAnimationFrame(draw);
      };
      draw();
    } catch (e) {
      stop();
      setError(true);
      setStatus(e instanceof Error ? e.message : 'Capture failed.');
    }
  };

  const sourceLabel = pulse.source === 'music' ? 'MUSIC PLAYER' : pulse.source === 'capture' ? 'TAB CAPTURE' : 'IDLE';
  const matrixClass = error ? 'matrix-error' : pulse.level > 0.02 ? 'matrix-active' : 'matrix-idle';

  return (
    <div className="visualizer-app">
      <div
        className={clsx('thanatos-matrix', matrixClass, `matrix-theme-${theme}`)}
        style={{
          '--matrix-accent': palette.accent,
          '--matrix-hot': palette.hot,
          '--matrix-dim': palette.dim,
          '--audio-level': pulse.level,
          '--audio-bass': pulse.bass,
          '--audio-mid': pulse.mid
        } as CSSProperties}
      >
        {matrixCells.map((cell) => {
          const band = pulse.bands[cell.id % pulse.bands.length] ?? 0;
          if (cell.type === 'logo') {
            return <div key={cell.id} className="matrix-cell matrix-logo" style={{ '--cell-level': band } as CSSProperties}>XO</div>;
          }
          if (cell.type === 'status') {
            return <div key={cell.id} className="matrix-cell data-text-cell" style={{ '--cell-level': band } as CSSProperties}>{cell.id < 10 ? sourceLabel : `${Math.round(pulse.level * 100)}%`}</div>;
          }
          if (cell.type === 'data') {
            return <div key={cell.id} className="matrix-cell data-text-cell" style={{ '--cell-level': band } as CSSProperties}>R{cell.row}C{cell.col}<br />{Math.round(band * 99).toString().padStart(2, '0')}</div>;
          }
          if (cell.type === 'sprite') {
            return <div key={cell.id} className="matrix-cell" style={{ '--cell-level': band } as CSSProperties}><span className={clsx('matrix-sprite', `sprite-${palette.sprite}`)} /></div>;
          }
          return <div key={cell.id} className="matrix-cell" style={{ '--cell-level': band } as CSSProperties}><span className="matrix-meter" /></div>;
        })}
      </div>
      <div className="visualizer-controls">
        <button type="button" onClick={() => void start()}><RadioTower size={15} /> Capture Audio</button>
        <button type="button" onClick={stop} disabled={!active}><X size={15} /> Stop</button>
        <span>{sourceLabel}</span>
        <span>{Math.round(pulse.level * 100)}%</span>
      </div>
      <p>{status}</p>
    </div>
  );
}
