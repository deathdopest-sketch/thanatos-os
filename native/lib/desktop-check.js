'use strict';

/**
 * Proves a connection really comes from the Thanatos desktop, not just from a
 * page on the same address.
 *
 * Browsers say which page is connecting (the Origin header), but an address is
 * all that identifies it: any other project previewed on localhost:4173 (Vite's
 * default preview port) while Thanatos isn't running would look identical. So
 * the bridges also ask whoever serves that address for a secret that only
 * Thanatos's own web server can read (vite.config.ts serves it from this file).
 * Someone else's server can't answer, and the connection is refused.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomBytes, timingSafeEqual } = require('crypto');

const DATA_DIR = process.env.THANATOS_DATA || path.join(os.homedir(), '.local', 'share', 'thanatos');
const SECRET_FILE = process.env.THANATOS_DESKTOP_SECRET || path.join(DATA_DIR, 'desktop-secret');
const SECRET_PATH = '/.well-known/thanatos-desktop';

/** Read the shared secret, creating it (readable by you only) the first time. */
function ensureSecret(file = SECRET_FILE) {
  try { return fs.readFileSync(file, 'utf8').trim(); } catch { /* create below */ }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const secret = randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(file, secret, { mode: 0o600, flag: 'wx' });
    return secret;
  } catch {
    return fs.readFileSync(file, 'utf8').trim(); // another process made it first
  }
}

/** Ask the server behind `origin` for the secret; true only if it matches. */
async function verifyDesktop(origin, secret, { timeoutMs = 2000 } = {}) {
  let url;
  try { url = new URL(SECRET_PATH, origin); } catch { return false; }
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) return false;
  url.hostname = '127.0.0.1';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    if (!res.ok) return false;
    const got = Buffer.from((await res.text()).trim());
    const want = Buffer.from(secret);
    return got.length === want.length && timingSafeEqual(got, want);
  } catch {
    return false;
  }
}

module.exports = { ensureSecret, verifyDesktop, SECRET_FILE, SECRET_PATH };
