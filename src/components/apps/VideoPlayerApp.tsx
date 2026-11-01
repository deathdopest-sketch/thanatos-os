import { useRef, useState } from 'react';
import { FolderOpen, Mail } from 'lucide-react';

export function VideoPlayerApp() {
  const [src, setSrc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="media-player-app">
      <input ref={inputRef} type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
      {!src ? <div className="player-empty"><Mail size={48} /><p>No video</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Video</button></div>
        : <div className="video-container"><video src={src} controls autoPlay className="video-element" /><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Different</button></div>}
    </div>
  );
}
