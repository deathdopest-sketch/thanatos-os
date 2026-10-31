// One connection to the Thanatos bridge per open room tab. It lives here, not in the
// page, so the site's content-security-policy can't block it.
const BRIDGE = 'ws://127.0.0.1:4180/tap';

chrome.runtime.onConnect.addListener((port) => {
  const room = port.name;
  const open = new Set();   // the room's own sockets that are open right now
  const pending = [];       // frames seen before the bridge connection is up
  let ws = null;
  let gone = false;
  let stopped = false;
  let retryMs = 1000;

  const connect = () => {
    if (gone || stopped) return;
    ws = new WebSocket(BRIDGE);
    const mine = ws;
    mine.onopen = () => {
      retryMs = 1000;
      mine.send(JSON.stringify({ type: 'tap-hello', room }));
      for (const id of open) mine.send(JSON.stringify({ type: 'tap-ws', id, open: true }));
      for (const json of pending.splice(0)) mine.send(json);
      port.postMessage({ type: 'tap-reset' }); // resend the cam list
    };
    mine.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'tap-stop') stopped = true;
        if (msg.type !== 'tap-ready') port.postMessage(msg);
      } catch { /* ignore */ }
    };
    mine.onclose = () => {
      if (ws === mine) ws = null;
      if (!gone && !stopped) { setTimeout(connect, retryMs); retryMs = Math.min(retryMs * 2, 15000); }
    };
  };

  port.onMessage.addListener((msg) => {
    if (msg.type === 'tap-ws') { if (msg.open) open.add(msg.id); else open.delete(msg.id); }
    const json = JSON.stringify(msg);
    if (ws && ws.readyState === 1) ws.send(json);
    else if (msg.type === 'tap-frame' || msg.type === 'tap-ws') { pending.push(json); if (pending.length > 500) pending.shift(); }
  });
  port.onDisconnect.addListener(() => { gone = true; ws?.close(); });
  connect();
});
