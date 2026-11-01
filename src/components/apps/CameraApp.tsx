import { useEffect, useRef, useState } from 'react';
import { AudioLines, Camera, Save, X } from 'lucide-react';

export function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [photo, setPhoto] = useState('');
  const [status, setStatus] = useState('Camera inactive.');

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream; setActive(true); setStatus('Camera active.');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Camera denied.'); }
  };
  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setActive(false); setStatus('Camera stopped.'); };
  const capture = () => {
    const c = canvasRef.current!, v = videoRef.current!;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setPhoto(c.toDataURL('image/jpeg', 0.92)); setStatus('Photo captured.');
  };

  return (
    <div className="camera-app">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {active && <video ref={videoRef} autoPlay muted playsInline className="camera-video" />}
      {photo && !active && <img src={photo} alt="Capture" className="photo-preview" />}
      <div className="camera-controls">
        {!active && <button type="button" onClick={() => void start()}><Camera size={15} /> Start</button>}
        {active && <button type="button" onClick={capture}><AudioLines size={15} /> Capture</button>}
        {active && <button type="button" onClick={stop}><X size={15} /> Stop</button>}
        {photo && <a href={photo} download={`thanatos-photo-${Date.now()}.jpg`}><button type="button"><Save size={15} /> Download</button></a>}
      </div>
      <p className="media-status">{status}</p>
    </div>
  );
}
