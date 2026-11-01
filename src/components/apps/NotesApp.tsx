import { useState } from 'react';
import { Save } from 'lucide-react';

export function NotesApp() {
  const [text, setText] = useState(() => localStorage.getItem('thanatos.notes') ?? 'Blood oath:\n- Build the OS\n- Own the machine\n');
  return (
    <div className="editor-panel">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" onClick={() => localStorage.setItem('thanatos.notes', text)}><Save size={15} /> Save</button>
    </div>
  );
}
