# Shell bridge

Makes the Thanatos desktop's **Terminal** app a real terminal. Each tab is your own login shell running in a pseudo-terminal, so `thanatos`, git, npm, vim and everything else work on the desktop.

```bash
thanatos shell install    # one time: deps + background service (installer and `thanatos update` do this)
thanatos shell status
thanatos shell restart    # closes open terminals
thanatos shell log
```

## How it works

- `server.js` listens on `ws://127.0.0.1:4181`. Every connection starts `pty-host.py`, which runs your login shell in a pseudo-terminal using Python's standard `pty` module. That means no native Node addon to compile.
- Keystrokes go in as `{type:'input'}` messages and output comes back as `{type:'output'}`. Resizing the window sends `{type:'resize', cols, rows}`, which reaches the terminal through a control pipe.
- Closing a tab hangs up its shell. At most 8 terminals can be open at once.

## Who can connect

A shell is powerful, so the server only accepts:

- connections on **127.0.0.1**, so nothing on your network can reach it
- the **Thanatos desktop's Origin** (`THANATOS_ORIGINS`, by default the desktop on `localhost:4173`)
- a **localhost Host header**, which blocks DNS-rebinding tricks
- a **desktop check**: the server at that Origin must answer with the secret in `~/.local/share/thanatos/desktop-secret` (readable by you only). Thanatos's own web server serves it; see `vite.config.ts` and `native/lib/desktop-check.js`. Another project previewed on port 4173 while Thanatos is down can't answer, so it's refused.

Browsers set the Origin and Host headers themselves, so no other website can open a shell here. The built desktop also ships a Content Security Policy that only runs its own scripts, so injected text can't run code either.

## Tests

```bash
npm test
```

The tests cover:

- a real shell runs commands
- resizing reaches the shell (`stty size`)
- the exit code comes back
- other origins and non-localhost Host headers are refused
- closing a tab ends its shell
