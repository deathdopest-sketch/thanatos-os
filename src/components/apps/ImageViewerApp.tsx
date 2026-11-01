import { useRef, useState } from 'react';
import { FolderOpen, Image } from 'lucide-react';

export function ImageViewerApp() {
  const [src, setSrc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="media-player-app">
      <input ref={inputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
      {!src ? <div className="player-empty"><Image size={48} /><p>No image</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Image</button></div>
        : <div className="image-container"><img src={src} alt="viewer" className="image-display" /><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Different</button></div>}
    </div>
  );
}
