import { useCallback, useRef, useState } from 'react';
import { Plus, Play, Skull, TerminalSquare, X } from 'lucide-react';
import clsx from 'clsx';
import {
  readAccessStore, writeAccessStore, normalizeUser, makeUserHash, randomB64, randomToken,
  derivePassKey, keyVerifier, sha256, generateVaultKey, ensureVaultInitialized,
  wrapVaultKey, unwrapVaultKey, makeAccessInvite, importAccessInvite,
  SECURE_VAULT_KEY
} from '../../lib/access';
import { readStoredValue } from '../../lib/storage';
import { useDesktopBus } from '../../lib/desktop-bus';
import { useStumbleLive } from '../../lib/stumble-live-store';
import ShellTerminal from '../ShellTerminal';
import { appRegistry } from '../../apps';
import type { OpenWindow, AccessSession } from '../../lib/desktop-types';

export type TerminalFlow =
  | { kind: 'idle' }
  | { kind: 'rip-owner-bootstrap'; username: string; step: 'set' | 'confirm'; first: string }
  | { kind: 'rip-owner-auth'; username: string }
  | { kind: 'schadelkoph-username' }
  | { kind: 'schadelkoph-recovery'; username: string }
  | { kind: 'schadelkoph-set-password'; username: string; recoveryId: string; step: 'set' | 'confirm'; first: string }
  | { kind: 'schadelkoph-password'; username: string };

export type ShellTab = { id: number; title: string };

export const PUBLIC_CMDS = ['help', 'open <app>', 'thanatos stumble start|stop|status', 'status', 'apps', 'date', 'skull', 'clear', 'ls', 'whoami', 'uname'];

export function TerminalApp({ openWindows, session, onSessionChange }: { openWindows: OpenWindow[]; session: AccessSession | null; onSessionChange: (session: AccessSession | null) => void }) {
  const nextId = useRef(2);
  const [shells, setShells] = useState<ShellTab[]>([{ id: 1, title: 'Shell' }]);
  const [active, setActive] = useState<number | 'console'>(1);
  const [offline, setOffline] = useState(false);

  const newShell = useCallback(() => {
    const id = nextId.current++;
    setOffline(false);
    setShells((list) => [...list, { id, title: 'Shell' }]);
    setActive(id);
  }, []);
  const closeShell = (id: number) => {
    setShells((list) => {
      const rest = list.filter((t) => t.id !== id);
      if (active === id) setActive(rest.length ? rest[rest.length - 1].id : 'console');
      return rest;
    });
  };
  const goOffline = useCallback(() => { setOffline(true); setShells([]); setActive('console'); }, []);

  return (
    <div className="terminal-tabs-app" onKeyDown={(e) => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') { e.preventDefault(); newShell(); } }}>
      <div className="terminal-tabs" role="tablist">
        {shells.map((t, i) => (
          <div key={t.id} className={clsx('terminal-tab', active === t.id && 'active')}>
            <button type="button" role="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)} title={t.title}>
              <TerminalSquare size={13} /> {shells.length > 1 ? `${i + 1}: ` : ''}{t.title}
            </button>
            <button type="button" className="terminal-tab-close" aria-label="Close this shell" onClick={() => closeShell(t.id)}><X size={12} /></button>
          </div>
        ))}
        <div className={clsx('terminal-tab', active === 'console' && 'active')}>
          <button type="button" role="tab" aria-selected={active === 'console'} onClick={() => setActive('console')} title="Built-in Thanatos console (vault commands)">
            <Skull size={13} /> Console
          </button>
        </div>
        <button type="button" className="terminal-new" aria-label="New shell (Ctrl+Shift+T)" title="New shell (Ctrl+Shift+T)" onClick={newShell}><Plus size={14} /></button>
      </div>
      {offline ? (
        <p className="terminal-offline">
          Real shell not set up. Run <code>thanatos shell install</code> once in the Linux terminal, then click <strong>+</strong>.
        </p>
      ) : null}
      <div className="terminal-panes">
        {shells.map((t) => (
          <ShellTerminal key={t.id} active={active === t.id} onOffline={goOffline}
            onTitle={(title) => setShells((list) => list.map((x) => (x.id === t.id ? { ...x, title: title.replace(/^.*?:\s*/, '').slice(0, 28) || 'Shell' } : x)))} />
        ))}
        <div className="terminal-console-pane" style={{ display: active === 'console' ? 'flex' : 'none' }}>
          <ThanatosConsole openWindows={openWindows} session={session} onSessionChange={onSessionChange} />
        </div>
      </div>
    </div>
  );
}

export function ThanatosConsole({ openWindows, session, onSessionChange }: { openWindows: OpenWindow[]; session: AccessSession | null; onSessionChange: (session: AccessSession | null) => void }) {
  const [lines, setLines] = useState<string[]>(['thanatos@crypt:~$ status', 'death kernel awake', 'vfs: indexeddb', 'remote bridge: offline', '', 'type "help" for commands']);
  const [input, setInput] = useState('');
  const [flow, setFlow] = useState<TerminalFlow>({ kind: 'idle' });
  const outRef = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);
  const historyPos = useRef(-1);

  const pushLines = (next: string[]) => {
    setLines((current) => [...current, ...next]);
    window.requestAnimationFrame(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; });
  };

  const finishRip = async (username: string, ownerPass: string) => {
    const store = readAccessStore();
    if (!store.ownerSalt || !store.ownerVerifier) {
      const ownerSalt = randomB64();
      const ownerKey = await derivePassKey(ownerPass, ownerSalt);
      store.ownerSalt = ownerSalt;
      store.ownerVerifier = await keyVerifier(ownerKey);
    } else {
      const ownerKey = await derivePassKey(ownerPass, store.ownerSalt);
      if (await keyVerifier(ownerKey) !== store.ownerVerifier) {
        pushLines(['owner passphrase rejected.', 'use the exact passphrase set on the first successful rip command.']);
        return;
      }
    }
    const normalized = normalizeUser(username);
    const usernameHash = await makeUserHash(normalized);
    if (store.users.some((user) => user.usernameHash === usernameHash)) {
      pushLines([`${normalized} is already marked by the reaper.`]);
      return;
    }
    const recoveryId = `reap_${randomToken(18)}`;
    const recoverySalt = randomB64();
    const recoveryKey = await derivePassKey(recoveryId, recoverySalt);
    if (readStoredValue(SECURE_VAULT_KEY) && !session) {
      pushLines(['vault is already sealed. unlock with schadelkoph before adding another user.']);
      return;
    }
    const vaultKey = session?.vaultKey ?? await generateVaultKey();
    await ensureVaultInitialized(vaultKey);
    const pendingUser = {
      usernameHash,
      displayName: normalized,
      status: 'pending' as const,
      recoveryHash: await sha256(`recovery:${recoveryId}`),
      recoverySalt,
      pendingWrappedVaultKey: await wrapVaultKey(recoveryKey, vaultKey)
    };
    store.users.push(pendingUser);
    writeAccessStore(store);
    pushLines([
      `marked ${normalized}.`,
      `recovery id: ${recoveryId}`,
      `invite code: ${makeAccessInvite(pendingUser)}`,
      'give them username + recovery id + invite code. they import it once, then claim with schadelkoph.'
    ]);
  };

  const claimUser = async (username: string, recoveryId: string, password: string) => {
    const store = readAccessStore();
    const normalized = normalizeUser(username);
    const usernameHash = await makeUserHash(normalized);
    const user = store.users.find((item) => item.usernameHash === usernameHash);
    if (!user || user.status !== 'pending' || !user.recoverySalt || !user.pendingWrappedVaultKey || user.recoveryHash !== await sha256(`recovery:${recoveryId}`)) {
      pushLines(['the reaper does not recognize that mark.']);
      return;
    }
    const salt = randomB64();
    const userKey = await derivePassKey(password, salt);
    const recoveryKey = await derivePassKey(recoveryId, user.recoverySalt);
    const vaultKey = await unwrapVaultKey(recoveryKey, user.pendingWrappedVaultKey);
    user.status = 'active';
    user.salt = salt;
    user.verifier = await keyVerifier(userKey);
    user.wrappedVaultKey = await wrapVaultKey(userKey, vaultKey);
    delete user.recoveryHash;
    delete user.recoverySalt;
    delete user.pendingWrappedVaultKey;
    writeAccessStore(store);
    onSessionChange({ username: normalized, vaultKey, startedAt: Date.now() });
    pushLines([`welcome, ${normalized}.`, 'reaper eyes online. account vault unlocked for this session.']);
  };

  const loginUser = async (username: string, password: string) => {
    const normalized = normalizeUser(username);
    const store = readAccessStore();
    const usernameHash = await makeUserHash(normalized);
    const user = store.users.find((item) => item.usernameHash === usernameHash);
    if (!user || user.status !== 'active' || !user.salt || !user.verifier || !user.wrappedVaultKey) {
      pushLines(['unknown or unclaimed user.']);
      return;
    }
    try {
      const userKey = await derivePassKey(password, user.salt);
      if (await keyVerifier(userKey) !== user.verifier) {
        pushLines(['password rejected.']);
        return;
      }
      const vaultKey = await unwrapVaultKey(userKey, user.wrappedVaultKey);
      await ensureVaultInitialized(vaultKey);
      onSessionChange({ username: normalized, vaultKey, startedAt: Date.now() });
      pushLines([`welcome back, ${normalized}.`, 'account vault unlocked for this session.']);
    } catch {
      pushLines(['vault key could not be opened.']);
    }
  };

  const handleFlow = async (value: string) => {
    if (flow.kind === 'rip-owner-bootstrap') {
      if (flow.step === 'set') {
        setFlow({ ...flow, step: 'confirm', first: value });
        pushLines(['confirm owner passphrase:']);
      } else if (value === flow.first) {
        setFlow({ kind: 'idle' });
        await finishRip(flow.username, value);
      } else {
        setFlow({ kind: 'idle' });
        pushLines(['owner passphrase mismatch. rip aborted.', 'nothing was saved. run rip again when both entries match.']);
      }
      return;
    }
    if (flow.kind === 'rip-owner-auth') {
      setFlow({ kind: 'idle' });
      await finishRip(flow.username, value);
      return;
    }
    if (flow.kind === 'schadelkoph-username') {
      const username = normalizeUser(value);
      const store = readAccessStore();
      const usernameHash = await makeUserHash(username);
      const user = store.users.find((item) => item.usernameHash === usernameHash);
      if (!user) {
        setFlow({ kind: 'idle' });
        pushLines(['you are not on the access list.']);
      } else if (user.status === 'pending') {
        setFlow({ kind: 'schadelkoph-recovery', username });
        pushLines(['recovery id:']);
      } else {
        setFlow({ kind: 'schadelkoph-password', username });
        pushLines(['password:']);
      }
      return;
    }
    if (flow.kind === 'schadelkoph-recovery') {
      setFlow({ kind: 'schadelkoph-set-password', username: flow.username, recoveryId: value, step: 'set', first: '' });
      pushLines(["set your password. if you lose it, you're basically fucked.", "if you've been entrusted with the reapers eyes, make sure to leave the others blind", 'set password:']);
      return;
    }
    if (flow.kind === 'schadelkoph-set-password') {
      if (flow.step === 'set') {
        if (value.length < 10) {
          pushLines(['password needs at least 10 characters. set password:']);
          return;
        }
        setFlow({ ...flow, step: 'confirm', first: value });
        pushLines(['confirm password:']);
      } else if (value === flow.first) {
        setFlow({ kind: 'idle' });
        await claimUser(flow.username, flow.recoveryId, value);
      } else {
        setFlow({ kind: 'idle' });
        pushLines(['password mismatch. claim aborted.']);
      }
      return;
    }
    if (flow.kind === 'schadelkoph-password') {
      setFlow({ kind: 'idle' });
      await loginUser(flow.username, value);
    }
  };

  const run = async () => {
    const cmd = input.trim();
    const commandKey = cmd.toLowerCase();
    if (!cmd) return;
    setInput('');
    if (flow.kind === 'idle') { history.current = [...history.current.filter((h) => h !== cmd), cmd].slice(-100); historyPos.current = -1; }
    if (flow.kind !== 'idle') {
      pushLines([`$ ${'*'.repeat(Math.min(cmd.length, 18))}`]);
      await handleFlow(cmd);
      return;
    }
    if (commandKey === 'clear') { setLines([]); return; }
    if (commandKey.startsWith('schadelkoph import ')) {
      const inviteCode = cmd.slice(cmd.toLowerCase().indexOf(' import ') + ' import '.length).trim();
      try {
        const imported = importAccessInvite(inviteCode);
        pushLines([
          '$ schadelkoph import [invite]',
          imported.status === 'active'
            ? `${imported.username} is already claimed on this browser.`
            : `invite imported for ${imported.username}. run schadelkoph to claim with username and recovery id.`
        ]);
      } catch {
        pushLines(['$ schadelkoph import [invite]', 'invite rejected. paste the full thanatos_invite code.']);
      }
      return;
    }
    if (commandKey === 'schadelkoph logout') {
      onSessionChange(null);
      pushLines([`$ ${cmd}`, 'reaper eyes sealed.']);
      return;
    }
    if (commandKey === 'schadelkoph whoami') {
      pushLines([`$ ${cmd}`, session ? `${session.username} since ${new Date(session.startedAt).toLocaleTimeString()}` : 'no one. the vault is blind.']);
      return;
    }
    if (commandKey === 'schadelkoph') {
      setFlow({ kind: 'schadelkoph-username' });
      pushLines([`$ ${cmd}`, 'And who are you in Death']);
      return;
    }
    if (commandKey.startsWith('rip ')) {
      const username = normalizeUser(cmd.slice(cmd.indexOf(' ') + 1));
      if (!username) {
        pushLines(['$ rip', 'usage: rip <username>']);
        return;
      }
      const store = readAccessStore();
      setFlow(store.ownerVerifier ? { kind: 'rip-owner-auth', username } : { kind: 'rip-owner-bootstrap', username, step: 'set', first: '' });
      pushLines([`$ rip ${username}`, store.ownerVerifier ? 'owner passphrase:' : 'set owner passphrase:']);
      return;
    }
    if (commandKey === 'open' || commandKey.startsWith('open ')) {
      const q = commandKey.slice(4).trim();
      const app = q ? appRegistry.find((x) => x.id === q) ?? appRegistry.find((x) => x.name.toLowerCase() === q) ?? appRegistry.find((x) => x.name.toLowerCase().startsWith(q) || x.id.startsWith(q)) : undefined;
      if (!app) { pushLines([`$ ${cmd}`, q ? `no app called "${q}". try: apps` : 'usage: open <app>   e.g. open stumble live']); return; }
      useDesktopBus.getState().openApp(app.id);
      pushLines([`$ ${cmd}`, `opening ${app.name}`]);
      return;
    }
    if (commandKey === 'thanatos' || commandKey.startsWith('thanatos ')) {
      const args = commandKey.split(/\s+/).slice(1);
      const st = useStumbleLive.getState();
      if (args[0] === 'stumble') {
        const sub = args[1] ?? 'status';
        if (st.link !== 'online') { pushLines([`$ ${cmd}`, 'the StumbleChat bridge is not running. set it up once with: thanatos stumble install (in the Shell tab)']); return; }
        if (sub === 'start' || sub === 'open') { st.openChrome(); pushLines([`$ ${cmd}`, 'opening StumbleChat in the bridge window. sign in there if it asks.']); return; }
        if (sub === 'stop') { st.send({ type: 'stop' }); pushLines([`$ ${cmd}`, 'StumbleChat window closed. rooms are remembered.']); return; }
        if (sub === 'status') {
          pushLines([`$ ${cmd}`, `bridge: running`, `chrome: ${st.chrome ? 'open' : 'closed'}`,
            ...(st.rooms.length ? st.rooms.map((r) => `  ${r.room.padEnd(20)} ${r.connected ? 'connected' : r.reopening ? 'reopening' : 'connecting'}${r.watching.length ? `, watching ${r.watching.length} cam${r.watching.length > 1 ? 's' : ''}` : ''}`) : ['rooms: none open'])]);
          return;
        }
      }
      pushLines([`$ ${cmd}`, `"${cmd}" runs in the real shell. use the Shell tab (open it with the + button).`, 'no Shell tab? set it up once in the Linux terminal: thanatos shell install']);
      return;
    }
    const out: Record<string, string[]> = {
      help: [`commands: ${PUBLIC_CMDS.join(', ')}`],
      status: ['kernel: THANATOS v2.0', `windows: ${openWindows.length}`, 'vfs: indexeddb persistent', 'remote: offline', 'theme: death'],
      apps: appRegistry.slice(0, 20).map((a) => `${a.id.padEnd(18)} ${a.name}`),
      date: [new Date().toString()],
      skull: ['skull pulse armed'],
      ls: ['/home/death  /vault  /tmp  /dev/null'],
      whoami: [session ? `${session.username} (schadelkoph)` : 'root - local shell only'],
      uname: ['Thanatos OS 2.0 Death-Kernel x86_death']
    };
    pushLines([`$ ${cmd}`, ...(out[commandKey] ?? [`not found: ${cmd}`])]);
  };

  return (
    <div className="terminal-app">
      <div className="terminal-output" ref={outRef}>{lines.map((l, i) => <p key={`${l}-${i}`}>{l || ' '}</p>)}</div>
      <div className="terminal-input">
        <span>$</span>
        <input value={input} type={flow.kind === 'idle' || flow.kind === 'schadelkoph-username' ? 'text' : 'password'} onChange={(e) => setInput(e.target.value)} autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') { void run(); return; }
            if (flow.kind !== 'idle' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
            // shell-style command history
            e.preventDefault();
            const h = history.current;
            if (!h.length) return;
            const pos = historyPos.current === -1 ? h.length : historyPos.current;
            const next = e.key === 'ArrowUp' ? Math.max(0, pos - 1) : pos + 1;
            historyPos.current = next >= h.length ? -1 : next;
            setInput(next >= h.length ? '' : h[next]);
          }} />
        <button type="button" onClick={() => void run()}><Play size={15} /></button>
      </div>
    </div>
  );
}
