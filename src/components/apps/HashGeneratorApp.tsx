import { useState } from 'react';
import { Copy, Hash } from 'lucide-react';
import { cp } from '../../lib/storage';

export function HashGeneratorApp() {
  const [text, setText] = useState('thanatos');
  const [digest, setDigest] = useState('');
  const [algo, setAlgo] = useState<'SHA-256' | 'SHA-1' | 'SHA-512'>('SHA-256');
  const hash = async () => {
    const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
    setDigest(Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join(''));
  };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={algo} onChange={(e) => setAlgo(e.target.value as typeof algo)} className="api-method-select">
          <option>SHA-256</option><option>SHA-1</option><option>SHA-512</option>
        </select>
        <button type="button" onClick={() => void hash()}><Hash size={15} /> Hash</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <code style={{ wordBreak: 'break-all', padding: 12 }}>{digest || 'hash output here'}</code>
      {digest && <button type="button" onClick={() => cp(digest)}><Copy size={15} /> Copy Hash</button>}
    </div>
  );
}
