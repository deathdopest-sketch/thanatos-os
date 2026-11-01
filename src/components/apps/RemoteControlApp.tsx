import { useEffect, useRef, useState } from 'react';
import { Play, Send, Wifi, X } from 'lucide-react';
import type { BridgeMsg } from '../../lib/desktop-types';

export function RemoteControlApp() {
  const [wsUrl, setWsUrl] = useState('ws://localhost:6660');
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>(['Thanatos Remote Bridge — not connected.', 'Start bridge/thanatos-bridge.py on your PC.', 'Use Tailscale: set THANATOS_BIND to your PC\'s Tailscale IP.']);
  const [cmd, setCmd] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => { setLog((p) => [...p.slice(-200), msg]); window.requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }); };

  const connect = () => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => addLog('[bridge] connected — authenticating...');
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as BridgeMsg;
        if (msg.type === 'hello') { addLog(`[bridge] ${String(msg.payload)}`); ws.send(JSON.stringify({ type: 'auth', payload: token })); }
        else if (msg.type === 'auth' && msg.payload === 'ok') { setConnected(true); addLog('[bridge] authenticated ✓ — remote shell ready'); }
        else if (msg.type === 'auth' && msg.payload === 'denied') { addLog('[bridge] AUTH DENIED — check token'); ws.close(); }
        else if (msg.type === 'output') { addLog(String(msg.payload)); }
      } catch { addLog(e.data as string); }
    };
    ws.onclose = () => { setConnected(false); addLog('[bridge] disconnected'); };
    ws.onerror = () => addLog('[bridge] error — is the daemon running?');
    wsRef.current = ws;
  };
  const disconnect = () => { wsRef.current?.close(); wsRef.current = null; };
  const sendCmd = () => {
    if (!cmd.trim() || !wsRef.current || !connected) return;
    wsRef.current.send(JSON.stringify({ type: 'exec', payload: cmd }));
    addLog(`> ${cmd}`); setCmd('');
  };
  useEffect(() => () => { wsRef.current?.close(); }, []);

  return (
    <div className="remote-app">
      <div className="remote-toolbar">
        <Wifi size={15} style={{ color: connected ? '#5effa4' : '#ff315e', flexShrink: 0 }} />
        <input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} style={{ flex: 1 }} disabled={connected} placeholder="ws://..." />
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="token" type="password" style={{ width: 110 }} disabled={connected} />
        {!connected ? <button type="button" onClick={connect}><Send size={15} /> Connect</button> : <button type="button" onClick={disconnect}><X size={15} /> Disconnect</button>}
      </div>
      <div className="terminal-output remote-log" ref={logRef}>{log.map((l, i) => <p key={i}>{l}</p>)}</div>
      <div className="terminal-input">
        <span>$</span>
        <input value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendCmd()} disabled={!connected} placeholder={connected ? 'Send command to PC...' : 'Connect first...'} autoComplete="off" />
        <button type="button" onClick={sendCmd} disabled={!connected}><Play size={15} /></button>
      </div>
    </div>
  );
}
