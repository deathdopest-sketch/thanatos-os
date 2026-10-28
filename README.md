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

No scraping your password, no fake clients, no bot accounts. To StumbleChat you're one person in one browser, which is exactly what you are. The only difference is that your browser stops falling asleep.

```bash
thanatos stumble start   # opens the bridge's Chrome window; sign in once
```

Then open **Stumble Live** from the start menu. Details are in [`native/stumble-bridge/README.md`](native/stumble-bridge/README.md).

### The rest of the chat stack

| App | What it does |
|---|---|
| **StumbleChat** | Your rooms and your role in each (owner, super mod, mod, member), with one-click launch |
| **Stumble Live** | Live chat and chosen cams from every open room, in one window |
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

### On a Chromebook (recommended)

```bash
git clone https://github.com/deathdopest-sketch/thanatos-os.git ~/thanatos-os
~/thanatos-os/native/install/crostini.sh
thanatos web open          # the desktop, installable as a fullscreen app
thanatos stumble start     # the chat bridge
```

The installer runs inside ChromeOS's Linux environment. See [`native/README.md`](native/README.md) for the full guide, the `thanatos` command, and the native Arch + Hyprland track.

### Development

```bash
npm install
npm run dev
npm run build
```

Built with Vite, React and TypeScript, plus Three.js and GSAP for the boot and visualizer scenes, CodeMirror 6 for the editors, and LiveKit for secure WebRTC sessions. Requires Node.js 20+.
