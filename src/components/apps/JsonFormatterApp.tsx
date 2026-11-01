import { useState } from 'react';
import { Copy, RefreshCcw } from 'lucide-react';
import { cp } from '../../lib/storage';

export function JsonFormatterApp() {
  const [text, setText] = useState('{"system":"thanatos","state":"awake","version":2}');
  const [err, setErr] = useState('');
  const format = () => { try { setText(JSON.stringify(JSON.parse(text), null, 2)); setErr(''); } catch (e) { setErr(e instanceof Error ? e.message : 'Invalid JSON'); } };
  return (
    <div className="editor-panel">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      {err && <div className="vfs-error">{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={format}><RefreshCcw size={15} /> Format</button>
        <button type="button" onClick={() => cp(text)}><Copy size={15} /> Copy</button>
      </div>
    </div>
  );
}
