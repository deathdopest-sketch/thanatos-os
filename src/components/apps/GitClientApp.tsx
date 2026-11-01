import { useState } from 'react';
import { Globe, Shuffle } from 'lucide-react';

export function GitClientApp() {
  const [repo, setRepo] = useState('https://github.com/deathdopest-sketch/thanatos-os');
  const branches = ['main', 'feature/death-mode', 'feature/remote-bridge'];
  const commits = [{ hash: '88f4ab9', msg: 'Overhaul Thanatos death shell' }, { hash: 'a4f5ad6', msg: 'Initialize Thanatos OS' }];
  return (
    <div className="git-client">
      <div className="git-toolbar">
        <input value={repo} onChange={(e) => setRepo(e.target.value)} style={{ flex: 1 }} />
        <a href={repo} target="_blank" rel="noreferrer"><button type="button"><Globe size={15} /> Open</button></a>
      </div>
      <div className="git-branches">{branches.map((b) => <div key={b} className="git-branch"><Shuffle size={14} /><span>{b}</span></div>)}</div>
      <div className="git-log">{commits.map((c) => <div key={c.hash} className="git-commit"><code>{c.hash}</code><span>{c.msg}</span></div>)}</div>
      <p className="media-status">Use Remote Control + bridge daemon to run real git commands on your PC.</p>
    </div>
  );
}
