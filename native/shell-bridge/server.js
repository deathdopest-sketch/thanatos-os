#!/usr/bin/env node
'use strict';

/**
 * Thanatos shell bridge: real terminal sessions for the Thanatos Terminal app.
 *
 * Each WebSocket connection gets its own login shell in a pty (pty-host.py), so
 * `thanatos`, git, npm and everything else work from the desktop.
 *
 * Only the Thanatos desktop can connect: the server binds to 127.0.0.1, requires
 * the page's Origin to be the desktop's and a localhost Host header (which blocks
 * DNS-rebinding tricks), and checks that the server at that Origin really is
 * Thanatos (native/lib/desktop-check.js), so another project previewed on the
 * same port can't open a shell either.
 *
 * Messages in:  {type:'input', data}  {type:'resize', cols, rows}
 * Messages out: {type:'output', data}  {type:'exit', code}
 *
 * Env: THANATOS_SHELL_PORT (4181), THANATOS_ORIGINS (desktop origins).
 */

const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { StringDecoder } = require('string_decoder');
const { WebSocketServer } = require('ws');
const { ensureSecret, verifyDesktop } = require('../lib/desktop-check');

const CONFIG = {
  port: Number(process.env.THANATOS_SHELL_PORT || 4181),
  origins: (process.env.THANATOS_ORIGINS || 'http://localhost:4173,http://127.0.0.1:4173')
    .split(',').map((s) => s.trim()).filter(Boolean),
  maxSessions: 8,
  secret: undefined, // defaults to ~/.local/share/thanatos/desktop-secret
};

const log = (...a) => console.log(new Date().toISOString(), '[shell-bridge]', ...a);
const clamp = (n, lo, hi, d) => (Number.isFinite(Number(n)) ? Math.max(lo, Math.min(hi, Math.round(Number(n)))) : d);

function allowed(origins, port, { origin, req }) {
  const host = String(req.headers.host || '');
  const okHost = host === `127.0.0.1:${port}` || host === `localhost:${port}`;
  return okHost && origins.includes(origin);
}

function listen(config = CONFIG) {
  let sessions = 0;
  const secret = config.secret ?? ensureSecret();
  const server = http.createServer((req, res) => {
    res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(req.url === '/health' ? JSON.stringify({ ok: true, sessions }) : '{}');
  });
  const wss = new WebSocketServer({
    server,
    maxPayload: 256 * 1024,
    verifyClient: (info, done) => {
      if (!allowed(config.origins, server.address().port, info)) return done(false, 401);
      verifyDesktop(info.origin, secret).then((ok) => {
        if (!ok) log(`refused ${info.origin}: the server there isn't the Thanatos desktop`);
        done(ok, 401);
      });
    },
  });

  wss.on('connection', (ws, req) => {
    if (sessions >= config.maxSessions) { ws.close(1013, 'too many terminals open'); return; }
    sessions++;
    const url = new URL(req.url, 'http://localhost');
    const cols = clamp(url.searchParams.get('cols'), 10, 500, 100);
    const rows = clamp(url.searchParams.get('rows'), 4, 200, 30);
    const child = spawn('python3', [path.join(__dirname, 'pty-host.py'), String(cols), String(rows)], {
      cwd: os.homedir(),
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', THANATOS_TERMINAL: '1' },
      stdio: ['pipe', 'pipe', 'inherit', 'pipe'],
    });
    child.on('error', (e) => {
      log('could not start a shell:', e.message);
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'output', data: `\r\ncould not start a shell: ${e.message}\r\n` }));
    });
    const decoder = new StringDecoder('utf8'); // keeps multi-byte characters intact across chunks
    child.stdout.on('data', (chunk) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'output', data: decoder.write(chunk) }));
    });
    child.on('exit', (code) => {
      sessions--;
      if (ws.readyState === 1) { ws.send(JSON.stringify({ type: 'exit', code })); ws.close(); }
    });
    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }
      if (msg.type === 'input' && typeof msg.data === 'string') child.stdin.write(msg.data);
      else if (msg.type === 'resize') child.stdio[3].write(`${JSON.stringify({ cols: clamp(msg.cols, 10, 500, cols), rows: clamp(msg.rows, 4, 200, rows) })}\n`);
    });
    ws.on('close', () => { child.stdin.end(); });
  });

  return new Promise((resolve) => server.listen(config.port, '127.0.0.1', () => {
    log(`listening on ws://127.0.0.1:${server.address().port} (origins: ${config.origins.join(', ')})`);
    resolve(server);
  }));
}

if (require.main === module) {
  listen().catch((e) => { console.error('[shell-bridge]', e); process.exit(1); });
}

module.exports = { listen, allowed, CONFIG };
