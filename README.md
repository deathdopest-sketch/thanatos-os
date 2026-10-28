# Thanatos OS

**A desktop built for people who live in chat rooms.**

Webcam chat sites are built for one tab and your full attention. Background a room for a few minutes and you're dropped. Use two rooms and you're juggling windows. Moderating means staring at the tab, because none of these sites offer an API, a multi-room view, or decent mod tools. Ask for any of that and you won't get an answer.

Thanatos OS works around all of it. It's a Chromebook-first desktop that keeps your rooms connected, puts their chat and cams in one place, and gives your other tools (editor, terminal, git, API client) the same screen.

---

## The problem

Chat sites like StumbleChat keep you in a room only while your tab answers their pings. Browsers deliberately slow down tabs you aren't looking at, and on a Chromebook that's every tab but one. So:

- **You get dropped from rooms you didn't leave.** Minimize the window, switch tabs, let the screen dim, and you're out.
- **You can't watch more than one room.** Every room is a full-screen tab that wants your attention.
- **Cams are all or nothing.** You get the site's grid, at the site's size, or nothing.
- **There's no supported way to build on top.** No API, no webhooks. Bot protection punishes anything that isn't a real browser with a real person signed in.

## The solution

### Stumble Live: rooms that stay connected

A small local bridge runs a real Chrome window on your machine, with background throttling turned off.

- **One tab per room, always awake.** The site's pings are always answered, so you stay in the room whether or not you're looking at it.
- **Rooms come back on their own.** If the site closes a room or the connection drops, the bridge rejoins it. Your open rooms are saved and reopened on the next start.
- **A real browser with your real login.** You sign in to StumbleChat yourself, in that Chrome window. Thanatos never sees your password, and to the site you look like any other person in a browser, because that's what you are.

The **Stumble Live** window on the desktop shows the result:

- **Live chat** for every room you're in, with a tab per room and a status light.
- **Cams you choose.** Tick the people you want to watch, up to 12 at once, and their cams show next to the chat at a low frame rate a Chromebook can handle.
- **History that survives.** Close the window and the bridge stays in your rooms. Reopen it and the last 300 lines of each room are still there.

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

Thanatos is a full desktop in your browser, with windows, a start menu and a taskbar. It ships with 60+ apps:

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
