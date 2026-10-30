import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export const SHELL_BRIDGE_URL = 'ws://127.0.0.1:4181';

// Colours follow the desktop theme (and your custom colours) via the CSS variables.
function themeFrom(el: HTMLElement) {
  const css = getComputedStyle(el);
  const rgb = (name: string, fallback: string) => {
    const v = css.getPropertyValue(name).trim();
    return v ? `rgb(${v})` : fallback;
  };
  const primary = rgb('--curse-primary', 'rgb(255, 35, 96)');
  return {
    background: '#050206',
    foreground: rgb('--ui-text', '#f7eee9'),
    cursor: primary,
    cursorAccent: '#050206',
    selectionBackground: primary.replace('rgb(', 'rgba(').replace(')', ', 0.35)'),
    red: '#ff4d6d', brightRed: '#ff7a93',
    green: '#5effa4', brightGreen: '#9bffc8',
    yellow: '#e6c98c', brightYellow: '#ffe2a8',
    blue: '#7aa7ff', brightBlue: '#a9c6ff',
    magenta: '#ff75ce', brightMagenta: '#ffa3e0',
    cyan: '#5de4ff', brightCyan: '#9cf0ff',
    white: '#e8dcd6', brightWhite: '#ffffff',
    black: '#1a1016', brightBlack: '#6c6470'
  };
}

/**
 * One real shell session in the Thanatos Terminal app, via the local shell
 * bridge. Calls onOffline if the bridge can't be reached, so the app can fall
 * back to the built-in console.
 */
export default function ShellTerminal({ active, onOffline, onTitle }: { active: boolean; onOffline: () => void; onTitle?: (title: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const offlineRef = useRef(onOffline);
  const titleRef = useRef(onTitle);
  offlineRef.current = onOffline;
  titleRef.current = onTitle;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const term = new Terminal({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      lineHeight: 1.15,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: false,
      theme: themeFrom(host)
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    fitRef.current = fit;
    try { fit.fit(); } catch { /* not laid out yet */ }

    let ws: WebSocket | null = null;
    let disposed = false;
    let everConnected = false;
    let exited = false;
    const send = (msg: object) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };

    const connect = () => {
      ws = new WebSocket(`${SHELL_BRIDGE_URL}/?cols=${term.cols}&rows=${term.rows}`);
      exited = false;
      ws.onopen = () => { everConnected = true; term.focus(); };
      ws.onmessage = (e) => {
        let m: { type?: string; data?: string; code?: number };
        try { m = JSON.parse(String(e.data)); } catch { return; }
        if (m.type === 'output' && typeof m.data === 'string') term.write(m.data);
        else if (m.type === 'exit') {
          exited = true;
          term.write(`\r\n\x1b[2m[shell exited${m.code ? ` with code ${m.code}` : ''}. Press Enter for a new one]\x1b[0m\r\n`);
        }
      };
      ws.onclose = () => {
        if (disposed) return;
        if (!everConnected) offlineRef.current();
        else if (!exited) term.write('\r\n\x1b[2m[lost the terminal service. Press Enter to reconnect]\x1b[0m\r\n');
      };
    };
    connect();

    const input = term.onData((data) => {
      if (ws?.readyState === WebSocket.OPEN) send({ type: 'input', data });
      else if (data === '\r' && everConnected) { term.reset(); connect(); }
    });
    const resized = term.onResize(({ cols, rows }) => send({ type: 'resize', cols, rows }));
    const titled = term.onTitleChange((t) => titleRef.current?.(t));

    const observer = new ResizeObserver(() => {
      if (host.offsetWidth && host.offsetHeight) { try { fit.fit(); } catch { /* hidden */ } }
    });
    observer.observe(host);

    return () => {
      disposed = true;
      observer.disconnect();
      input.dispose(); resized.dispose(); titled.dispose();
      ws?.close();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  // refit and focus when this tab is shown again
  useEffect(() => {
    if (!active) return;
    const id = window.requestAnimationFrame(() => {
      try { fitRef.current?.fit(); } catch { /* hidden */ }
      termRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [active]);

  return <div className="shell-terminal" ref={hostRef} style={{ display: active ? 'block' : 'none' }} onMouseDown={() => termRef.current?.focus()} />;
}
