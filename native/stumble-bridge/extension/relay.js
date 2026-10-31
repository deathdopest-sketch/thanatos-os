// Content script (isolated world): passes hook.js's messages to the background worker,
// which holds the connection to the bridge, and watches the cam tiles on the page.
(() => {
  if (window.top !== window) return;
  const m = location.pathname.match(/^\/room\/([^/]+)/);
  if (!m) return;
  const CAM_FPS = 5;
  let watch = [];
  let stopped = false;
  const port = chrome.runtime.connect({ name: decodeURIComponent(m[1]) });
  const send = (msg) => { try { port.postMessage(msg); } catch { /* extension reloaded */ } };

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data?.thanatosTap) return;
    const { thanatosTap, ...msg } = e.data;
    send(msg);
  });
  port.onMessage.addListener((msg) => {
    if (msg.type === 'tap-say') window.postMessage({ thanatosCmd: true, type: 'tap-say', text: msg.text }, location.origin);
    else if (msg.type === 'tap-watch' && Array.isArray(msg.handles)) watch = msg.handles.map(String);
    else if (msg.type === 'tap-stop') stopped = true; // you left the room in Thanatos
    else if (msg.type === 'tap-reset') lastCams = '';
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const tiles = () => Array.from(document.querySelectorAll('video[video-id]')).map((video) => {
    const wrapper = video.closest('[class*="video"],[class*="user"],[class*="cam"]') || video.parentElement;
    const nick = wrapper?.querySelector('span.nickname,.nickname')?.textContent?.trim() || video.getAttribute('title') || '';
    return { handle: video.getAttribute('video-id'), nick: nick.slice(0, 64), video };
  });
  let lastCams = '';
  setInterval(() => {
    if (stopped) return;
    const cams = tiles().map(({ handle, nick }) => ({ handle, nick }));
    const json = JSON.stringify(cams);
    if (json !== lastCams) { lastCams = json; send({ type: 'tap-cams', cams }); }
  }, 2000);
  setInterval(() => {
    if (stopped || !watch.length) return;
    for (const { handle, video } of tiles()) {
      if (!watch.includes(handle) || video.readyState < 2 || !video.videoWidth) continue;
      canvas.width = 320;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320) || 240;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        send({ type: 'tap-image', handle, data: canvas.toDataURL('image/jpeg', 0.6) });
      } catch { /* cross-origin video: can't capture */ }
    }
  }, Math.round(1000 / CAM_FPS));
})();
