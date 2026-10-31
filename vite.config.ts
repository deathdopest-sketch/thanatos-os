import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Proves to the local bridges (terminal, StumbleChat) that this server is the real
// Thanatos desktop: they fetch this secret, which only Thanatos's server can read.
// See native/lib/desktop-check.js.
function desktopSecret(): Plugin {
  const file = process.env.THANATOS_DESKTOP_SECRET
    ?? join(process.env.THANATOS_DATA ?? join(homedir(), '.local', 'share', 'thanatos'), 'desktop-secret');
  const handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url !== '/.well-known/thanatos-desktop') return next();
    // only to callers on this machine (the bridges); pages never need it
    const from = req.socket.remoteAddress ?? '';
    let secret = '';
    try { secret = readFileSync(file, 'utf8').trim(); } catch { /* no secret yet */ }
    if (!secret || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(from)) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain');
    res.end(secret);
  };
  return { name: 'thanatos-desktop-secret', configurePreviewServer(server) { server.middlewares.use(handler); } };
}

// Content Security Policy for the built desktop. The important line is script-src:
// only the desktop's own bundled scripts run, so even if some text slipped past
// React's escaping it couldn't run code (and, through the terminal bridge, reach
// your machine). Everything else stays open enough for the apps: backgrounds and
// avatars from any https site, the API client, the RotVice frame. Build only,
// because the dev server needs inline scripts for hot reload.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  'img-src * data: blob:',
  'media-src * data: blob:',
  'connect-src * data: blob: ws://127.0.0.1:4180 ws://127.0.0.1:4181 ws: wss:',
  'frame-src https:',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'thanatos-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }]
  };
}

export default defineConfig({
  plugins: [react(), desktopSecret(), contentSecurityPolicy()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
  },
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@react-three')) {
            return 'react-three';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (id.includes('node_modules/@codemirror')) {
            return 'codemirror';
          }
          if (id.includes('node_modules/livekit') || id.includes('node_modules/@livekit')) {
            return 'livekit';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return undefined;
        }
      }
    },
    chunkSizeWarningLimit: 750
  }
});
