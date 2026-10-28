# StumbleChat bridge

Keeps your StumbleChat rooms open in a real Chrome window and streams their chat and cams to the **Stumble Live** widget on the Thanatos desktop.

## Why a bridge

StumbleChat drops you from a room if your tab stops answering its pings. Browsers slow down hidden tabs, and the Thanatos desktop unmounts minimized windows, so the room can't live inside the desktop.

The bridge runs its own Chrome on the Chromebook with background throttling turned off. Every room gets its own tab, and that tab stays awake, so it never misses a ping.

The desktop only reads from the bridge. Closing Stumble Live doesn't close any rooms. When you reopen it, the bridge replays the last 300 lines of each room.

## Use

The bridge runs as a background service (`thanatos-stumble.service`). It's a small Node process with no Chrome window until you need one:

1. Open **StumbleChat** (or **Stumble Live**) on the Thanatos desktop, or click the radio icon by the clock. The desktop asks the bridge to open its Chrome window on stumblechat.com. **Sign in there yourself.** The login stays in the bridge's own profile at `~/.local/share/thanatos/stumble-chrome`, and Thanatos never sees your password.
2. Join rooms from the StumbleChat app's **Open** buttons or from Stumble Live. Your rooms are reopened every time the Chrome window opens.
3. Tick names under **Cams** to show their cams in the widget. You can watch up to 12 at once. They update a few times a second, captured from the room tab, which keeps the load low on a Chromebook.

Closing the Chrome window leaves the bridge idle, ready to open it again. Your saved rooms are kept.

```bash
thanatos stumble install  # one time: deps + background service (the Chromebook installer runs this)
thanatos stumble start    # open the Chrome window from the terminal
thanatos stumble stop     # close it (rooms remembered)
thanatos stumble status
thanatos stumble log
```

The widget only reads chat. To type, use the room's tab in the bridge's Chrome window.

If StumbleChat closes the room or the connection drops, the bridge reopens the room after 30 seconds. If you close a room's tab yourself, the bridge leaves that room.

## Settings (environment variables)

| Variable | Default | |
|---|---|---|
| `STUMBLE_BRIDGE_PORT` | `4180` | WebSocket port, bound to 127.0.0.1 only |
| `THANATOS_ORIGINS` | the desktop's localhost origins | the only pages allowed to connect |
| `STUMBLE_CAM_FPS` | `5` | cam frame rate, from 1 to 15 |
| `STUMBLE_REOPEN_MS` | `30000` | delay before a dropped room is reopened |
| `BROWSER_PATH` | Puppeteer's Chrome (`/usr/bin/chromium` on ARM) | which browser to use |

On ARM Chromebooks, `thanatos stumble install` uses Debian's `chromium`, because Chrome for Testing has no ARM Linux build.

## Tests

```bash
npm test                                                   # frame parsing
STUMBLE_E2E=1 xvfb-run -a node --test test/bridge.e2e.test.js   # real Chrome against a fake StumbleChat
```

The end-to-end test checks that:

- other origins are refused
- chat lines arrive
- cams are listed and stream JPEG frames
- a room StumbleChat closed gets reopened
- rooms are saved
- the bridge starts idle, opens Chrome on request, and reopens saved rooms after Chrome is closed and opened again
- the control endpoints refuse requests without the Thanatos header
