import type { OpenWindow } from '../../lib/desktop-types';

export function TaskManagerApp({ openWindows }: { openWindows: OpenWindow[] }) {
  return (
    <div className="system-table">
      <div className="system-row header"><span>Process</span><span>State</span><span>Z</span></div>
      {openWindows.map((w) => <div className="system-row" key={w.id}><span>{w.app.name}</span><span>{w.minimized ? 'min' : 'active'}</span><span>{w.z}</span></div>)}
    </div>
  );
}
