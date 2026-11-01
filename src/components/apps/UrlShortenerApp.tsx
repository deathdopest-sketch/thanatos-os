import { useState } from 'react';
import { Copy, Fingerprint } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cp } from '../../lib/storage';

export function UrlShortenerApp() {
  const [url, setUrl] = useState('');
  const [aliases, setAliases] = useState<Array<{ key: string; target: string }>>([]);
  const shorten = () => { if (!url.trim()) return; setAliases((p) => [{ key: nanoid(6), target: url }, ...p]); setUrl(''); };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && shorten()} placeholder="https://..." style={{ flex: 1 }} />
        <button type="button" onClick={shorten}><Fingerprint size={15} /> Shorten</button>
      </div>
      <div className="url-list">
        {aliases.map((a) => <div key={a.key} className="url-row"><code>/{a.key}</code><span>→</span><span className="url-target">{a.target}</span><button type="button" onClick={() => cp(a.target)}><Copy size={12} /></button></div>)}
        {aliases.length === 0 && <p style={{ color: '#c6b7aa', margin: 0 }}>No aliases yet. Session only.</p>}
      </div>
    </div>
  );
}
