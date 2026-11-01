import { useState } from 'react';
import { Play } from 'lucide-react';

export function CompilerApp() {
  const [code, setCode] = useState('// Thanatos JS Sandbox\nconst greet = n => `death greets ${n}`;\nconsole.log(greet("kernel"));\n[1,2,3].map(n => n * 666).forEach(n => console.log(n));');
  const [output, setOutput] = useState('');
  const [err, setErr] = useState('');

  const run = () => {
    const logs: string[] = [];
    const orig = { log: console.log, warn: console.warn, error: console.error };
    console.log = (...a) => logs.push(a.map((x) => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' '));
    console.warn = (...a) => logs.push('WARN: ' + a.join(' '));
    console.error = (...a) => logs.push('ERR: ' + a.join(' '));
    try {
      new Function(code)();
      setErr('');
    } catch (e) { setErr(e instanceof Error ? `${e.name}: ${e.message}` : String(e)); }
    finally { Object.assign(console, orig); }
    setOutput(logs.join('\n') || '(no output)');
  };

  return (
    <div className="compiler-app">
      <div className="compiler-toolbar">
        <button type="button" onClick={run}><Play size={15} /> Run JS</button>
        <span className="compiler-note">sandbox: JS only · no network</span>
      </div>
      <div className="compiler-split">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} className="code-textarea" spellCheck={false} />
        <div className="compiler-output">
          {err && <div className="compiler-error">{err}</div>}
          <pre>{output || 'Output appears here...'}</pre>
        </div>
      </div>
    </div>
  );
}
