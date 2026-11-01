import { useState } from 'react';
import { Copy, Wand2 } from 'lucide-react';
import { cp } from '../../lib/storage';

const LOREM = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident'];

export function LoremIpsumApp() {
  const [count, setCount] = useState(3);
  const [type, setType] = useState<'words' | 'sentences' | 'paragraphs'>('paragraphs');
  const [output, setOutput] = useState('');
  const gen = () => {
    const w = () => LOREM[Math.floor(Math.random() * LOREM.length)];
    const sent = () => Array.from({ length: 8 + Math.floor(Math.random() * 8) }, (_, i) => i === 0 ? w().charAt(0).toUpperCase() + w().slice(1) : w()).join(' ') + '.';
    const para = () => Array.from({ length: 4 + Math.floor(Math.random() * 3) }, sent).join(' ');
    if (type === 'words') setOutput(Array.from({ length: count }, w).join(' '));
    else if (type === 'sentences') setOutput(Array.from({ length: count }, sent).join(' '));
    else setOutput(Array.from({ length: count }, para).join('\n\n'));
  };
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="number" value={count} min={1} max={20} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 60 }} />
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="api-method-select">
          <option value="words">Words</option><option value="sentences">Sentences</option><option value="paragraphs">Paragraphs</option>
        </select>
        <button type="button" onClick={gen}><Wand2 size={15} /> Generate</button>
        {output && <button type="button" onClick={() => cp(output)}><Copy size={15} /> Copy</button>}
      </div>
      <textarea value={output} readOnly style={{ minHeight: 180 }} placeholder="Generated text here..." />
    </div>
  );
}
