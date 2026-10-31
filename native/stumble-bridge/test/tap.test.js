'use strict';
// A StumbleChat tab in your own browser feeds a room into the bridge (no Chrome needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const WS = require('ws');
const { Bridge, CONFIG } = require('../bridge');

const open = (url, origin) => new Promise((resolve, reject) => {
  const ws = new WS(url, { origin });
  const got = [];
  ws.on('message', (d) => got.push(JSON.parse(String(d))));
  ws.on('open', () => resolve({ ws, got }));
  ws.on('error', reject);
});
const until = async (fn) => { for (let i = 0; i < 50; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 20)); } assert.fail('timed out'); };

test('a tapped room streams chat, takes replies, and is not saved', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tap-'));
  const bridge = new Bridge({ ...CONFIG, port: 0, roomsFile: path.join(dir, 'rooms.json') });
  const server = await bridge.listen();
  const port = server.address().port;
  const sockets = [];
  server.on('connection', (sock) => sockets.push(sock)); // refused handshakes leave sockets open
  try {
    await assert.rejects(open(`ws://127.0.0.1:${port}/tap`, 'https://evil.example'));
    await assert.rejects(open(`ws://127.0.0.1:${port}/`, 'https://stumblechat.com'));

    const desk = await open(`ws://127.0.0.1:${port}/`, CONFIG.origins[0]);
    const tab = await open(`ws://127.0.0.1:${port}/tap`, 'chrome-extension://abcdefghijklmnop');
    tab.ws.send(JSON.stringify({ type: 'tap-hello', room: 'crypt' }));
    tab.ws.send(JSON.stringify({ type: 'tap-ws', id: 0, open: true }));
    tab.ws.send(JSON.stringify({ type: 'tap-frame', payload: JSON.stringify({ stumble: 'joined', self: { handle: 3, nick: 'Death' } }) }));
    tab.ws.send(JSON.stringify({ type: 'tap-frame', payload: JSON.stringify({ stumble: 'msg', handle: 7, nick: 'Ghoul', text: 'brains' }) }));
    await until(() => desk.got.some((m) => m.type === 'chat' && m.line.text === 'brains'));
    const rooms = desk.got.filter((m) => m.type === 'rooms').pop().rooms;
    assert.equal(rooms[0].room, 'crypt');
    assert.equal(rooms[0].connected, true);
    assert.equal(rooms[0].browser, true);

    desk.ws.send(JSON.stringify({ type: 'say', room: 'crypt', text: 'hello' }));
    await until(() => tab.got.some((m) => m.type === 'tap-say' && m.text === 'hello'));
    desk.ws.send(JSON.stringify({ type: 'watch', room: 'crypt', handles: ['7'] }));
    await until(() => tab.got.some((m) => m.type === 'tap-watch' && m.handles[0] === '7'));

    assert.deepEqual(bridge.savedRooms(), []);
    tab.ws.close();
    await until(() => desk.got.filter((m) => m.type === 'rooms').pop().rooms.length === 0);
  } finally {
    for (const sock of sockets) sock.destroy();
    server.close();
  }
});
