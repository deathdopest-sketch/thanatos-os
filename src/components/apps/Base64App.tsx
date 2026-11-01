import { useState } from 'react';

export function Base64App() {
  const [plain, setPlain] = useState('Thanatos OS');
  const [encoded, setEncoded] = useState('');
  const encode = () => setEncoded(btoa(String.fromCharCode(...new TextEncoder().encode(plain))));
  const decode = () => { try { setPlain(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)))); } catch { setPlain('decode failed'); } };
  return (
    <div className="split-panel compact">
      <textarea value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="Plain text..." />
      <textarea value={encoded} onChange={(e) => setEncoded(e.target.value)} placeholder="Base64..." />
      <button type="button" onClick={encode}>Encode →</button>
      <button type="button" onClick={decode}>← Decode</button>
    </div>
  );
}
