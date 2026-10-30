'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const WS = require('ws');
const { listen } = require('../server');

const ORIGIN = 'http://localhost:4173';

async function start() {
  const server = await listen({ port: 0, origins: [ORIGIN], maxSessions: 2 });
  return { server, port: server.address().port };
}

function connect(port, { origin = ORIGIN, host } = {}) {
  return new WS(`ws://127.0.0.1:${port}/?cols=80&rows=24`, { origin, headers: host ? { Host: host } : {} });
}

function collect(ws) {
  const state = { out: '', exit: null };
  ws.on('message', (raw) => {
    const m = JSON.parse(String(raw));
    if (m.type === 'output') state.out += m.data;
    if (m.type === 'exit') state.exit = m.code;
  });
  return state;
}

const until = async (pred, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (pred()) return; await new Promise((r) => setTimeout(r, 50)); }
  throw new Error('timeout');
};

const refused = (ws) => new Promise((resolve) => {
  ws.on('unexpected-response', (_req, res) => resolve(res.statusCode));
  ws.on('open', () => resolve('opened'));
  ws.on('error', () => resolve('error'));
});

test('runs a real shell: commands, resize, exit', async () => {
  const { server, port } = await start();
  try {
    const ws = connect(port);
    const s = collect(ws);
    await new Promise((r) => ws.on('open', r));
    ws.send(JSON.stringify({ type: 'input', data: 'echo hello-$((40+2))\r' }));
    await until(() => s.out.includes('hello-42'));

    ws.send(JSON.stringify({ type: 'resize', cols: 132, rows: 40 }));
    await new Promise((r) => setTimeout(r, 200));
    ws.send(JSON.stringify({ type: 'input', data: 'stty size\r' }));
    await until(() => s.out.includes('40 132'));

    ws.send(JSON.stringify({ type: 'input', data: 'exit 3\r' }));
    await until(() => s.exit !== null);
    assert.equal(s.exit, 3);
  } finally {
    server.close();
  }
});

test('only the Thanatos desktop on localhost can connect', async () => {
  const { server, port } = await start();
  try {
    assert.equal(await refused(connect(port, { origin: 'https://evil.example' })), 401);
    assert.equal(await refused(connect(port, { host: `evil.example:${port}` })), 401);
    const ok = connect(port);
    assert.equal(await refused(ok), 'opened');
    ok.close();
    const health = await new Promise((resolve) => http.get(`http://127.0.0.1:${port}/health`, (res) => {
      let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => resolve(JSON.parse(b)));
    }));
    assert.equal(health.ok, true);
  } finally {
    server.close();
  }
});

test('closing the terminal hangs up the shell', async () => {
  const { server, port } = await start();
  try {
    const ws = connect(port);
    const s = collect(ws);
    await new Promise((r) => ws.on('open', r));
    ws.send(JSON.stringify({ type: 'input', data: 'echo $$ > /dev/null; echo ready\r' }));
    await until(() => s.out.includes('ready'));
    ws.close();
    // the session count drops back once the shell is gone
    await new Promise((r) => setTimeout(r, 500));
    const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
    assert.equal(health.sessions, 0);
  } finally {
    server.close();
  }
});
