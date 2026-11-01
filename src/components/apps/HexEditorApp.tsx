import { useState } from 'react';

export function HexEditorApp() {
  const [text, setText] = useState('Thanatos OS — Death Kernel');
  const bytes = Array.from(new TextEncoder().encode(text));
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase());
  const chunks: string[][] = [];
  for (let i = 0; i < hex.length; i += 16) chunks.push(hex.slice(i, i + 16));
  return (
    <div className="hex-editor">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type text to convert..." />
      <div className="hex-display">
        <div className="hex-header"><span>OFFSET</span><span>HEX</span><span>ASCII</span></div>
        {chunks.map((chunk, i) => (
          <div key={i} className="hex-row">
            <span className="hex-offset">{(i * 16).toString(16).padStart(8, '0').toUpperCase()}</span>
            <span className="hex-bytes">{chunk.join(' ')}</span>
            <span className="hex-ascii">{chunk.map((h) => { const cp = parseInt(h, 16); return cp >= 32 && cp < 127 ? String.fromCharCode(cp) : '.'; }).join('')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
