# Thanatos OS

**StumbleChat kicks you for looking away. Thanatos keeps you in the room.**

StumbleChat, like most webcam chat sites, assumes you have nothing else open. Minimize the window and you're gone. Want two rooms? That's two full-screen tabs and constant switching. Moderating means staring at chat, because the site gives you no API, no multi-room view and no real mod tooling. They aren't going to fix it, so this does.

Thanatos OS is a Chromebook-first desktop that keeps your rooms connected, puts their chat and cams in one place, and gives your other tools (editor, terminal, git, API client) the same screen.

---

## The problem, plainly

StumbleChat holds your seat in a room only while your tab keeps answering its pings. Browsers deliberately slow down tabs you aren't looking at. Put those two together and you get the experience every regular knows:

- **Dropped for alt-tabbing.** You didn't leave. The browser put your tab to sleep and the site treated that as you leaving.
- **One room at a time.** The site is built for a single full-screen tab. Running three rooms means juggling three windows.
- **Cams on the site's terms.** You get their grid, at their size, or nothing.
- **No way to build on it.** No API, no webhooks, and anti-bot checks that punish anything that isn't a person in a real browser. So every mod tool ends up being a fragile browser extension that breaks on the next update.

## The fix

### Stumble Live

Thanatos stops fighting the site and goes along with it. It runs a **real Chrome, signed in as you, by you**, with throttling switched off, so your rooms never fall asleep. The pings get answered, so you stay in the room. If the site closes a room anyway, the bridge rejoins it. Stop the bridge and start it tomorrow, and it reopens the same rooms.

Your rooms then feed into **Stumble Live** on the desktop:

- **Every room's chat**, with a tab and a status light per room.
- **The cams you choose.** Tick up to 12 people and their cams show next to the chat, at a frame rate a Chromebook can handle.
- **History that survives.** Close the window and you're still in the rooms. Open it again and the last 300 lines are waiting.
- **A live widget on the desktop.** A small chat panel, with your watched cams, floats over everything while the bridge runs. Drag it anywhere, shrink it to a pill, or hide it from the taskbar.
- **Mention alerts.** When someone says your name (`Death`, `@death`, any case), you get a toast and a chime, even if every window is closed. Click the toast to jump straight to that room.

No scraping your password, no fake clients, no bot accounts. To StumbleChat you're one person in one browser, which is exactly what you are. The only difference is that your browser stops falling asleep.

```bash
thanatos stumble start   # opens the bridge's Chrome window; sign in once
```

The widget appears on its own. For the full view, open **Stumble Live** from the start menu. Details are in [`native/stumble-bridge/README.md`](native/stumble-bridge/README.md).

### The rest of the chat stack

| App | What it does |
|---|---|
| **StumbleChat** | Your rooms and your role in each (owner, super mod, mod, member), with one-click launch |
| **Stumble Live** | Live chat and chosen cams from every open room, as a desktop widget and a full window, with mention toasts |
| **RotVice** | The RotVice pet and chat device embedded on the desktop, with live stats. Your pets walk the taskbar while it's open |
| **ChatCommon** | ChatCommon in its own window, signed in as you |

Role-based mod tools are next: automod actions and autobans for owners and super mods, and a basic toolkit for mods.

## Everything else on the desktop

Thanatos is a full desktop in your browser, with windows, a start menu and a taskbar. It ships with 60 apps:

- **Developer tools:** Code Studio (CodeMirror 6), terminal, git client, API client, SQL manager, JSON/diff/hex/regex/hash tools, network monitor, Linux man pages.
- **System:** files, settings, tasks, clock, calendar, weather, notes, mail.
- **Media:** music, video, images, PDF, camera, voice recorder, paint, audio visualizer.
- **Private apps:** PIN-gated and local-first (see Security).

On a Chromebook it installs as a fullscreen app on top of a real Linux toolchain: Node, Python, Rust, Go, C, and the Vita and Reaper languages.

## Security

The chat bridge was built to be safe to leave running:

- **It's only reachable from your own machine.** It listens on `127.0.0.1` and accepts connections only from the Thanatos desktop's own page.
- **Thanatos never handles your credentials.** You sign in to each site yourself, in its own browser window. Your login lives in the bridge's own Chrome profile on your machine.
- **Nothing is recorded.** Cam frames are only streamed to your screen, never saved. Chat history is a 300-line buffer in memory.

For remote PC control, raw ports should never be exposed to the internet. The planned design uses:

- WireGuard or Tailscale for private network reachability
- WebRTC data channels for low-latency input and control
- LiveKit for authenticated session brokering across devices
- Short-lived signed access tokens from a local control broker
- Explicit allowlisted host commands on the controlled PC
- No keystroke logging, no hidden capture, and no screenshot storage by default

Adult and private apps stay PIN-gated, local-first, and explicit-consent only. No underage, non-consensual, scraped or covert media workflows belong in this OS.

## Getting started

Here's how to set Thanatos up on a Chromebook from scratch. It takes about 20 minutes, mostly waiting for downloads. Every command goes in the **Terminal** app, which you'll get in step 1.

### Step 1: Turn on Linux (one time)

1. Open ChromeOS **Settings**.
2. Go to **About ChromeOS → Developers → Linux development environment** and click **Turn on**.
3. Give it at least **20 GB** of disk, then click **Install**.
4. When it's done, a **Terminal** window opens. That's where everything below goes.

### Step 2: Install Thanatos (one time)

Copy these into the Terminal one line at a time, pressing Enter after each:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/deathdopest-sketch/thanatos-os.git ~/thanatos-os
~/thanatos-os/native/install/crostini.sh
```

The installer sets up Node, Python, Rust, Go, C, Reaper, the terminal theme and the `thanatos` command, then builds the desktop and starts it. It's safe to run again if anything fails partway.

**When it finishes, close the Terminal and open a new one.** The new window is what makes the `thanatos` command work.

Check it worked:

```bash
thanatos doctor
```

Fix anything marked ✗. Vita is optional and needs `gh auth login` first, because its repo is private. If you see `thanatos: command not found`, see [Troubleshooting](#troubleshooting).

### Step 3: Open the desktop

```bash
thanatos web open
```

The desktop opens in Chrome at `http://localhost:4173`. To make it feel like a real OS, install it as an app: in Chrome's menu (⋮), choose **Cast, save and share → Install page as app**. Thanatos then gets its own icon on the shelf and opens fullscreen.

### Step 4: Start the StumbleChat bridge

```bash
thanatos stumble start
```

The first run installs the bridge, which takes a minute. Then:

1. **A separate Chrome window opens on StumbleChat.** Log in there yourself. You only do this once, because the bridge remembers your login.
2. **Leave that window open.** It's what keeps your rooms connected. You can minimize it.
3. **Back on the Thanatos desktop, the Stumble Live widget appears** in the top-right corner. Click **Join one**, pick a room, and chat starts flowing in.
4. To watch cams, open the full **Stumble Live** window (the ⤢ button on the widget), then tick the names under **Cams**.

Optional: open the **StumbleChat** app, then **Settings**, and add your username and rooms. Your saved rooms show up as one-click joins, and your username is also used to spot mentions.

### Step 5: Every day after that

After a Chromebook restart, the desktop starts by itself. The bridge doesn't, so open the Terminal and run:

```bash
thanatos stumble start
```

The bridge reopens the rooms you had open last time.

### Updating

```bash
thanatos update
```

This pulls the latest version, rebuilds the desktop and restarts it, and restarts the bridge if it's running. Then reload the Thanatos tab (Ctrl+Shift+R).

### Command cheat sheet

| Command | What it does |
|---|---|
| `thanatos doctor` | Checks that everything is installed |
| `thanatos update` | Gets the latest Thanatos, rebuilds, restarts |
| `thanatos web open` | Opens the desktop |
| `thanatos web start` / `stop` / `status` | Controls the desktop server |
| `thanatos stumble start` | Starts the bridge (and its Chrome window) |
| `thanatos stumble stop` | Stops the bridge. Your rooms are remembered |
| `thanatos stumble status` | Shows whether it's running and how many rooms are open |
| `thanatos stumble log` | Shows what the bridge is doing (Ctrl+C to exit) |

The full list, including the learning journal, focus timer and project templates, is in [`native/README.md`](native/README.md).

### Using the widget

| You want to… | Do this |
|---|---|
| Move it | Drag its top bar |
| Switch rooms | Use the room dropdown in its top bar (when you're in more than one) |
| Shrink it | Click **–**. It becomes a pill showing the room and unread mentions. Click the pill to expand it |
| Hide it | Click **×**. Bring it back with the radio icon by the taskbar clock |
| Mute the mention chime | Click the speaker icon |
| See everything | Click **⤢** to open the full Stumble Live window |

The radio icon by the clock turns green while the bridge is running and shows a red count of unread mentions.

### Troubleshooting

**`thanatos: command not found`**
The installer didn't finish, or this Terminal was opened before it did. Close the Terminal, open a new one, and try again. If it still fails, re-run the installer with `~/thanatos-os/native/install/crostini.sh`. Until then, you can run any command by its full path, for example `~/thanatos-os/native/bin/thanatos stumble start`.

**`npm: command not found`**
Node isn't installed. Run `thanatos lang install node`, then close the Terminal and open a new one.

**Stumble Live isn't in the start menu, or the desktop looks out of date**
The desktop is still running an old build. Run `thanatos update`, then reload the tab with Ctrl+Shift+R.

**The widget doesn't appear**
- Check whether the radio icon by the clock is grey. If it is, the bridge isn't running, so run `thanatos stumble start`.
- If the icon is green, you hid the widget. Click the icon to bring it back.

**The widget vanished and the radio icon went grey**
The bridge's Chrome window was closed, and closing it stops the bridge. Run `thanatos stumble start` again. Your rooms come back with it.

**No chime on mentions**
- Browsers only play sound after you've clicked somewhere on the page, so click anywhere on the desktop once.
- Check that the widget's speaker icon isn't muted.
- Mentions are spotted by your room nick, or by the username you saved in the StumbleChat app's Settings.

**Chat shows up but the Cams list is empty**
Run `thanatos stumble log` and send the output along with an issue. StumbleChat may have changed its page.

**Anything else**
Run `thanatos doctor` and fix anything marked ✗.

## Development

```bash
npm install
npm run dev
npm run build
```

Built with Vite, React and TypeScript, plus Three.js and GSAP for the boot and visualizer scenes, CodeMirror 6 for the editors, and LiveKit for secure WebRTC sessions. Requires Node.js 20+.
