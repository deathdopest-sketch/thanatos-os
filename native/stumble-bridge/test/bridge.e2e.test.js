'use strict';
// End-to-end: real Chrome (needs a display, e.g. xvfb-run) against a fake StumbleChat.
// Run with: STUMBLE_E2E=1 xvfb-run -a node --test test/bridge.e2e.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const WS = require('ws');
const { WebSocketServer } = WS;
const { Bridge } = require('../bridge');

const ROOM_PAGE = `<!doctype html><html><body><div id="videos"></div><script>
  const ws = new WS('ws://' + location.host + '/ws');
  const c = document.createElement('canvas'); c.width = 160; c.height = 120;
  const g = c.getContext('2d'); let t = 0;
  setInterval(() => { g.fillStyle = 'hsl(' + (t++ * 20 % 360) + ',80%,50%)'; g.fillRect(0, 0, 160, 120); }, 50);
  const tile = document.createElement('div'); tile.className = 'video-tile';
  const v = document.createElement('video'); v.setAttribute('video-id', '7'); v.muted = true; v.autoplay = true;
  v.srcObject = c.captureStream(10);
  const n = document.createElement('span'); n.className = 'nickname'; n.textContent = 'Ghoul';
  tile.append(v, n); document.getElementById('videos').append(tile);
</script></body></html>`;

function fakeStumble() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(req.url.startsWith('/room/') ? ROOM_PAGE : '<html><body>home</body></html>');
  });
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ stumble: 'joined', self: { handle: 3, nick: 'Death' }, userlist: [{ handle: 7, nick: 'Ghoul' }] }));
    setTimeout(() => ws.send(JSON.stringify({ stumble: 'msg', handle: 7, text: 'brains please' })), 300);
    setTimeout(() => ws.send('0'), 400); // a ping-style frame
  });
  // StumbleChat kicking the room: a 'closed' frame, then the socket drops
  const drop = () => { for (const c of wss.clients) { c.send(JSON.stringify({ stumble: 'closed' })); c.close(); } };
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, drop })));
}

function waitFor(ws, pred, ms = 20000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { ws.off('message', on); reject(new Error('timeout')); }, ms);
    const on = (raw) => { const m = JSON.parse(String(raw)); if (pred(m)) { clearTimeout(t); ws.off('message', on); resolve(m); } };
    ws.on('message', on);
  });
}

test('streams chat and watched cams from a room to the desktop', { skip: !process.env.STUMBLE_E2E, timeout: 90000 }, async () => {
  const fake = await fakeStumble();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stumble-bridge-'));
  const bridge = new Bridge({
    stumbleUrl: `http://127.0.0.1:${fake.port}`, port: 0, origins: ['http://localhost:4173'],
    profile: path.join(tmp, 'profile'), roomsFile: path.join(tmp, 'rooms.json'), camFps: 5, reopenDelayMs: 1000,
  });
  const server = await bridge.listen();
  const port = server.address().port;
  try {
    await bridge.launch();

    // other origins are refused
    const evil = new WS(`ws://127.0.0.1:${port}`, { origin: 'https://evil.example' });
    await new Promise((resolve) => { evil.on('error', resolve); evil.on('unexpected-response', resolve); });

    const ws = new WS(`ws://127.0.0.1:${port}`, { origin: 'http://localhost:4173' });
    await waitFor(ws, (m) => m.type === 'hello');
    ws.send(JSON.stringify({ type: 'join', room: 'zombs' }));

    const chat = await waitFor(ws, (m) => m.type === 'chat' && m.line.kind === 'chat');
    assert.equal(chat.line.nick, 'Ghoul');
    assert.equal(chat.line.text, 'brains please');

    const rooms = await waitFor(ws, (m) => m.type === 'rooms' && m.rooms[0]?.cams.length > 0);
    assert.deepEqual(rooms.rooms[0].cams, [{ handle: '7', nick: 'Ghoul' }]);
    assert.equal(rooms.rooms[0].connected, true);

    ws.send(JSON.stringify({ type: 'watch', room: 'zombs', handles: ['7'] }));
    const frame = await waitFor(ws, (m) => m.type === 'frame');
    assert.equal(frame.handle, '7');
    assert.match(frame.data, /^data:image\/jpeg;base64,/);

    // the room is reopened on its own after StumbleChat closes it
    fake.drop();
    await waitFor(ws, (m) => m.type === 'rooms' && m.rooms[0]?.reopening);
    const rejoined = await waitFor(ws, (m) => m.type === 'chat' && m.line.text === 'You joined zombs');
    assert.equal(rejoined.line.room, 'zombs');
    await waitFor(ws, (m) => m.type === 'rooms' && m.rooms[0]?.connected && !m.rooms[0].reopening);

    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp, 'rooms.json'), 'utf8')), ['zombs']);
    ws.send(JSON.stringify({ type: 'leave', room: 'zombs' }));
    await waitFor(ws, (m) => m.type === 'rooms' && m.rooms.length === 0);
    ws.close();
  } finally {
    await bridge.browser?.close().catch(() => {});
    server.close();
    fake.server.close();
  }
});
