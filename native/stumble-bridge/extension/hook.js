// Runs in the page, before the room's own scripts: wraps WebSocket and hands what the
// room's socket receives to relay.js. Also sends your replies down the room's socket.
(() => {
  if (window.top !== window) return;
  const Native = window.WebSocket;
  let pageWs = null;
  let nextId = 0;
  const post = (msg) => window.postMessage({ thanatosTap: true, ...msg }, location.origin);

  window.WebSocket = new Proxy(Native, {
    construct(target, args) {
      const ws = new target(...args);
      if (String(args[0]).includes('stumblechat')) {
        const id = nextId++;
        const opened = () => { pageWs = ws; post({ type: 'tap-ws', id, open: true }); };
        if (ws.readyState === 1) opened(); else ws.addEventListener('open', opened);
        ws.addEventListener('message', (e) => { if (typeof e.data === 'string') post({ type: 'tap-frame', payload: e.data }); });
        ws.addEventListener('close', () => {
          if (pageWs === ws) pageWs = null;
          post({ type: 'tap-ws', id, open: false });
        });
      }
      return ws;
    },
  });

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data?.thanatosCmd || e.data.type !== 'tap-say') return;
    if (pageWs && pageWs.readyState === 1 && typeof e.data.text === 'string') pageWs.send(JSON.stringify({ stumble: 'msg', text: e.data.text }));
  });
})();
