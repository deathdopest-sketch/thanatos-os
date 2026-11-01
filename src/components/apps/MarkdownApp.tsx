import { useState } from 'react';
import DOMPurify from 'dompurify';

function mdToHtml(input: string) {
  const esc = input.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .split('\n').map((l) => {
      if (l.startsWith('### ')) return `<h3>${l.slice(4)}</h3>`;
      if (l.startsWith('## ')) return `<h2>${l.slice(3)}</h2>`;
      if (l.startsWith('# ')) return `<h1>${l.slice(2)}</h1>`;
      if (l.startsWith('- ')) return `<li>${l.slice(2)}</li>`;
      return l.trim() ? `<p>${l}</p>` : '<br />';
    }).join('');
  return DOMPurify.sanitize(esc.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>'));
}

export function MarkdownApp() {
  const [text, setText] = useState('# Thanatos Log\n\n- VFS online\n- Shell armed\n- Skull flash enabled\n');
  return (
    <div className="split-panel">
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />
    </div>
  );
}
