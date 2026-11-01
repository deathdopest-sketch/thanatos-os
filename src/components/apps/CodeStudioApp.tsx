import { useState } from 'react';
import { Copy } from 'lucide-react';
import { cp } from '../../lib/storage';

export function CodeStudioApp() {
  const [code, setCode] = useState('// Thanatos Code Studio\n\nconst reaper = (name) => `${name} has been claimed`;\nconsole.log(reaper("the living"));\n');
  const [lang, setLang] = useState('javascript');
  return (
    <div className="code-studio">
      <div className="code-toolbar">
        {['javascript','python','rust','css','html','json'].map((l) => <button key={l} type="button" className={lang === l ? 'selected' : ''} onClick={() => setLang(l)}>{l}</button>)}
        <button type="button" onClick={() => cp(code)} style={{ marginLeft: 'auto' }}><Copy size={15} /> Copy</button>
      </div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} className="code-textarea" spellCheck={false} />
    </div>
  );
}
