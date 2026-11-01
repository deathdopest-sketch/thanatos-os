import { useState } from 'react';
import clsx from 'clsx';

export function DiffCheckerApp() {
  const [left, setLeft] = useState('Thanatos\nDeath\nKernel\nReaper');
  const [right, setRight] = useState('Thanatos\nBlood\nKernel\nShadow');
  const ll = left.split('\n'), rl = right.split('\n'), max = Math.max(ll.length, rl.length);
  return (
    <div className="diff-app">
      <div className="diff-inputs"><textarea value={left} onChange={(e) => setLeft(e.target.value)} placeholder="Left..." /><textarea value={right} onChange={(e) => setRight(e.target.value)} placeholder="Right..." /></div>
      <div className="diff-result">
        {Array.from({ length: max }, (_, i) => { const l = ll[i] ?? '', r = rl[i] ?? '', ch = l !== r; return <div key={i} className={clsx('diff-row', ch && 'diff-changed')}><span className="diff-left">{l}</span><span className="diff-sep">{ch ? '≠' : '='}</span><span className="diff-right">{r}</span></div>; })}
      </div>
    </div>
  );
}
