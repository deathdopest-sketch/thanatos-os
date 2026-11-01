import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, RefreshCcw } from 'lucide-react';
import { useRotvicePets, parseRotvicePets } from '../../lib/rotvice-pets';
import type { MumbleChatStats, MumbleChatPayload } from '../../lib/desktop-types';

export const ROTVICE_ORIGIN = 'https://mumblechat.online';
export const ROTVICE_URL = `${ROTVICE_ORIGIN}/rotvice`;
export const STUMBLECHAT_URL = 'https://stumblechat.com';

// Third-party chat sites run in their own browser window: you sign in there as
// yourself, and their anti-bot checks see a normal browser session.
export function openChatWindow(url: string) {
  window.open(url, '_blank', 'popup,width=1240,height=820,noopener,noreferrer');
}

export function RotViceApp() {
  const setPets      = useRotvicePets((s) => s.setPets);
  const setLoggedIn  = useRotvicePets((s) => s.setLoggedIn);
  const pushAlert    = useRotvicePets((s) => s.pushAlert);
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [stats, setStats] = useState<MumbleChatStats>({
    loggedIn: null, userId: null, username: null, displayName: null, avatarUrl: null,
    unreadPms: null, onlineFriends: [], offlineFriends: [], totalFriends: null, lastUpdated: null,
    status: 'idle', message: 'Sign in inside the frame. Polls every 30s.'
  });

  // Track previous online-friends list so we can diff it each poll
  const prevOnline = useRef<string[]>([]);

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin !== ROTVICE_ORIGIN) return;
      const p = e.data as MumbleChatPayload & { kind?: unknown; text?: unknown };

      // Real-time event from RotVice (raid, friend, challenge)
      if (p.type === 'mumblechat:event') {
        const kind = String(p.kind || '');
        const text = String(p.text || '');
        if (!text) return;
        const anim = kind === 'raid' || kind === 'challenge' ? 'react' : kind === 'friend' ? 'happy' : undefined;
        pushAlert(text, anim);
        return;
      }

      if (p.type !== 'mumblechat:stats') return;

      const loggedIn = typeof p.loggedIn === 'boolean' ? p.loggedIn : null;
      setLoggedIn(loggedIn);

      if (loggedIn === false) {
        setPets([]);
      } else if ('pets' in p) {
        setPets(parseRotvicePets(p.pets, ROTVICE_ORIGIN));
      }

      // Diff online friends: anyone newly online gets a companion alert
      const nowOnline = Array.isArray(p.onlineFriends) ? p.onlineFriends.map(String) : [];
      const prev = prevOnline.current;
      for (const name of nowOnline) {
        if (!prev.includes(name)) pushAlert(`${name} came online`, 'happy');
      }
      prevOnline.current = nowOnline;

      setStats({
        loggedIn,
        userId: typeof p.userId === 'number' ? p.userId : null,
        username: typeof p.username === 'string' ? p.username : null,
        displayName: typeof p.displayName === 'string' ? p.displayName : null,
        avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl : null,
        unreadPms: typeof p.unreadPms === 'number' ? p.unreadPms : null,
        onlineFriends: nowOnline,
        offlineFriends: Array.isArray(p.offlineFriends) ? p.offlineFriends.map(String) : [],
        totalFriends: typeof p.totalFriends === 'number' ? p.totalFriends : null,
        lastUpdated: new Date().toLocaleTimeString(),
        status: loggedIn === false ? 'unavailable' : 'online',
        message: loggedIn === false ? 'Not logged in.' : 'Live stats received.'
      });
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [setPets, setLoggedIn, pushAlert]);

  const requestStats = useCallback(() => {
    setStats((s) => ({ ...s, status: 'checking', message: frameLoaded ? 'Requesting stats...' : 'Waiting for frame...' }));
    const frame = document.querySelector<HTMLIFrameElement>('#rotvice-frame');
    frame?.contentWindow?.postMessage({ type: 'thanatos:request-stats' }, ROTVICE_ORIGIN);
    window.setTimeout(() => setStats((s) => s.status !== 'checking' ? s : { ...s, status: 'blocked', lastUpdated: new Date().toLocaleTimeString(), message: 'No response from RotVice.' }), 1800);
  }, [frameLoaded]);

  useEffect(() => { const p = window.setInterval(requestStats, 30_000); return () => window.clearInterval(p); }, [frameKey, requestStats]);

  return (
    <div className="chat-app">
      <div className="chat-toolbar">
        <button type="button" onClick={requestStats}><RefreshCcw size={15} /> Stats</button>
        <button type="button" onClick={() => { setFrameLoaded(false); setFrameKey((k) => k + 1); }}><RefreshCcw size={15} /> Reload</button>
        <a href={ROTVICE_URL} target="_blank" rel="noreferrer"><Globe size={15} /> Open</a>
      </div>
      <div className="chat-layout stats-open">
        <iframe key={frameKey} id="rotvice-frame" title="RotVice" src={ROTVICE_URL} referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" onLoad={() => { setFrameLoaded(true); window.setTimeout(requestStats, 900); }} />
        <aside className="chat-stats">
          <h3>Live Stats</h3>
          <div className={`status-orb ${stats.status}`} />
          <div className="chat-profile">
            {stats.avatarUrl ? <img src={stats.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <div>{(stats.displayName ?? stats.username ?? '?').slice(0, 1)}</div>}
            <span>{stats.displayName ?? stats.username ?? 'Unknown'}</span>
          </div>
          <dl>
            <dt>Login</dt><dd>{stats.loggedIn === null ? 'unknown' : stats.loggedIn ? 'logged in' : 'logged out'}</dd>
            <dt>Username</dt><dd>{stats.username ?? 'unknown'}</dd>
            <dt>Unread DMs</dt><dd>{stats.unreadPms ?? 'unknown'}</dd>
            <dt>Online Friends</dt><dd>{stats.onlineFriends.length ? stats.onlineFriends.join(', ') : 'none'}</dd>
            <dt>Updated</dt><dd>{stats.lastUpdated ?? 'never'}</dd>
          </dl>
          <p>{stats.message}</p>
        </aside>
      </div>
    </div>
  );
}
