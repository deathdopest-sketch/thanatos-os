import { useEffect, useRef, useState } from 'react';
import { Network, X } from 'lucide-react';
import clsx from 'clsx';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { PingPoint } from '../../lib/desktop-types';

export function NetworkMonitorApp() {
  const [data, setData] = useState<PingPoint[]>([]);
  const [running, setRunning] = useState(false);
  const intv = useRef(0);
  const start = () => {
    setRunning(true); setData([]);
    intv.current = window.setInterval(() => {
      const spike = Math.random() > 0.93;
      const ms = Math.round(18 + Math.random() * 64 + (spike ? 180 + Math.random() * 120 : 0));
      setData((p) => [...p.slice(-50), { t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), ms }]);
    }, 800);
  };
  const stop = () => { window.clearInterval(intv.current); setRunning(false); };
  useEffect(() => () => window.clearInterval(intv.current), []);
  const last = data[data.length - 1];
  return (
    <div className="network-app">
      <div className="network-toolbar">
        {!running ? <button type="button" onClick={start}><Network size={15} /> Start Monitor</button> : <button type="button" onClick={stop}><X size={15} /> Stop</button>}
        {last && <code className="ping-display">{last.ms}ms</code>}
        {last && <span className={clsx('ping-label', last.ms > 150 ? 'ping-bad' : last.ms > 80 ? 'ping-warn' : 'ping-good')}>{last.ms > 150 ? 'SPIKE' : last.ms > 80 ? 'HIGH' : 'OK'}</span>}
      </div>
      <div className="network-chart">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <YAxis domain={[0, 400]} tick={{ fill: '#c7a45e', fontSize: 11 }} width={36} />
            <Tooltip contentStyle={{ background: '#0a0305', border: '1px solid rgba(255,0,48,.3)', color: '#fff4ec', fontSize: 12 }} />
            <Line type="monotone" dataKey="ms" stroke="#ff315e" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="media-status">Simulated latency graph. Use bridge daemon for real metrics.</p>
    </div>
  );
}
