# Thanatos OS

Thanatos OS is a Chromebook-first web desktop environment with a dark punk visual system, a registry-driven application launcher, and a secure path toward remote PC control.

## Runtime

- Node.js 20+
- Vite + React + TypeScript
- Three.js for boot and visualizer scenes
- GSAP for startup sequencing
- CodeMirror 6 for editors and developer tools
- LiveKit client packages reserved for secure WebRTC control sessions

## Commands

```powershell
npm install
npm run dev
npm run build
```

## Security Direction

Remote PC control should not expose raw ports directly to the public internet. The production path should use:

- WireGuard or Tailscale for private network reachability
- WebRTC data channels for low-latency input/control paths
- LiveKit for authenticated room/session brokering when multi-device access is needed
- Short-lived signed access tokens from a local control broker
- Explicit allowlisted host commands on the controlled PC
- No keystroke logging, no hidden capture, no persistent screenshot storage by default

Adult/private applications must stay PIN-gated, local-first, and explicit-consent only. No underage, non-consensual, scraped, or covert media workflows belong in this OS.

## Native Linux Track

The native OS direction lives in `native/` and is documented in `docs/native-thanatos-os.md`. It starts with Arch + Hyprland configs and a local allowlisted ingestion daemon. Build this track before adding deeper Ollama/Qdrant automation so the UI, storage boundaries, and daemon permissions are clear.
