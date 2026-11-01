import { useRef, useState } from 'react';
import { Mic, Save, Square } from 'lucide-react';

export function VoiceRecorderApp() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [status, setStatus] = useState('Press Start to record.');

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => { const b = new Blob(chunks.current, { type: 'audio/webm' }); setAudioUrl(URL.createObjectURL(b)); stream.getTracks().forEach((t) => t.stop()); setStatus('Recording saved.'); };
      rec.start(); recRef.current = rec; setRecording(true); setStatus('Recording...');
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Mic denied.'); }
  };
  const stop = () => { recRef.current?.stop(); setRecording(false); };

  return (
    <div className="recorder-app">
      <div className="recorder-status">{recording && <span className="rec-dot" />}<span>{recording ? 'RECORDING' : 'IDLE'}</span></div>
      {!recording ? <button type="button" onClick={() => void start()}><Mic size={15} /> Start</button> : <button type="button" onClick={stop}><Square size={15} /> Stop</button>}
      {audioUrl && <div className="recorder-result"><audio src={audioUrl} controls /><a href={audioUrl} download={`thanatos-rec-${Date.now()}.webm`}><button type="button"><Save size={15} /> Download</button></a></div>}
      <p className="media-status">{status}</p>
    </div>
  );
}
