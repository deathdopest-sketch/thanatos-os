import { useState } from 'react';
import { Play } from 'lucide-react';
import clsx from 'clsx';
import type { HttpMethod } from '../../lib/desktop-types';

export function ApiClientApp() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [body, setBody] = useState('');
  const [hdrs, setHdrs] = useState('{"Content-Type": "application/json"}');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    setLoading(true);
    try {
      let h: Record<string, string> = {};
      try { h = JSON.parse(hdrs) as Record<string, string>; } catch { /* ignore */ }
      const res = await fetch(url, { method, headers: h, body: method !== 'GET' && body ? body : undefined });
      const text = await res.text();
      setStatus(`${res.status} ${res.statusText}`);
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)); } catch { setResponse(text); }
    } catch (e) { setStatus('Error'); setResponse(e instanceof Error ? e.message : 'Failed'); }
    setLoading(false);
  };

  return (
    <div className="api-client">
      <div className="api-toolbar">
        <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)} className="api-method-select">
          {(['GET','POST','PUT','DELETE','PATCH'] as HttpMethod[]).map((m) => <option key={m}>{m}</option>)}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1 }} placeholder="https://..." />
        <button type="button" onClick={() => void send()} disabled={loading}><Play size={15} /> {loading ? '...' : 'Send'}</button>
      </div>
      {method !== 'GET' && <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Request body (JSON)..." className="api-body" />}
      <textarea value={hdrs} onChange={(e) => setHdrs(e.target.value)} className="api-headers" />
      {status && <div className={clsx('api-status', status.startsWith('2') ? 'api-ok' : 'api-err')}>{status}</div>}
      <pre className="api-response">{response || 'Response here...'}</pre>
    </div>
  );
}
