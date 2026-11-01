import { useState } from 'react';
import { Copy, Shuffle } from 'lucide-react';
import { cp } from '../../lib/storage';

export function MinifierApp() {
  const [input, setInput] = useState('body {\n  background: #000;\n  color: #fff;\n}');
  const [output, setOutput] = useState('');
  const [type, setType] = useState<'js' | 'css' | 'html'>('css');
  const minify = () => {
    let r = input.replace(/\/\*[\s\S]*?\*\//g, '');
    if (type === 'js') r = r.replace(/\/\/[^\n]*/g, '');
    if (type === 'html') r = r.replace(/<!--[\s\S]*?-->/g, '');
    setOutput(r.replace(/\s*([{}:;,>~+|=])\s*/g, '$1').replace(/\s+/g, ' ').trim());
  };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="api-method-select">
          <option value="js">JS</option><option value="css">CSS</option><option value="html">HTML</option>
        </select>
        <button type="button" onClick={minify}><Shuffle size={15} /> Minify</button>
        {output && <button type="button" onClick={() => cp(output)}><Copy size={15} /> Copy</button>}
      </div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      {output && <textarea value={output} readOnly />}
    </div>
  );
}
