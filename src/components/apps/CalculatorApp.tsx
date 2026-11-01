import { useState } from 'react';
import { Play } from 'lucide-react';

export function CalculatorApp() {
  const [expr, setExpr] = useState('13 * 13 + 6');
  const [result, setResult] = useState('175');
  const calc = () => {
    if (!/^[\d+\-*/(). %]+$/.test(expr)) { setResult('blocked'); return; }
    try {
      const v = Function(`"use strict"; return (${expr.replaceAll('%', '/100')});`)();
      setResult(Number.isFinite(v as number) ? String(v) : 'invalid');
    } catch { setResult('invalid'); }
  };
  return (
    <div className="tool-panel calculator-panel">
      <input value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && calc()} />
      <strong>{result}</strong>
      <button type="button" onClick={calc}><Play size={15} /> Calculate</button>
    </div>
  );
}
