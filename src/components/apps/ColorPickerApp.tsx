import { useState } from 'react';
import { cp } from '../../lib/storage';

export function ColorPickerApp() {
  const [color, setColor] = useState('#8f001d');
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return (
    <div className="color-panel">
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      <div style={{ background: color }} />
      <div className="color-values">
        <code onClick={() => cp(color)} title="Copy">{color}</code>
        <code onClick={() => cp(`rgb(${r},${g},${b})`)} title="Copy">rgb({r},{g},{b})</code>
        <small style={{ color: '#c7a45e' }}>Click values to copy</small>
      </div>
    </div>
  );
}
