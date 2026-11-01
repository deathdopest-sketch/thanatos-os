import { useRef, useState } from 'react';
import { BookOpen, FolderOpen } from 'lucide-react';

export function PdfViewerApp() {
  const [src, setSrc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="media-player-app">
      <input ref={inputRef} type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSrc(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
      {!src ? <div className="player-empty"><BookOpen size={48} /><p>No PDF</p><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open PDF</button></div>
        : <div className="pdf-container"><object data={src} type="application/pdf" className="pdf-embed"><a href={src} target="_blank" rel="noreferrer">Open in new tab</a></object><button type="button" onClick={() => inputRef.current?.click()}><FolderOpen size={15} /> Open Different</button></div>}
    </div>
  );
}
