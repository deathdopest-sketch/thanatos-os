# Native Thanatos OS

Turns a Chromebook into a Lilly-themed dev workstation. There are two tracks, and both use the same configs and `thanatos` command.

| Track | Keeps ChromeOS? | Script | When to use it |
|---|---|---|---|
| **Crostini** (recommended) | Yes | `install/crostini.sh` | Start here. No firmware changes, so you can't brick the machine. |
| **Arch + Hyprland** | No | `install/arch-hyprland.sh` | Later, on a Chromebook with UEFI firmware (MrChromebox) and Arch already installed. |

## Crostini quick start

1. **Turn on Linux.** In ChromeOS go to Settings → About ChromeOS → Developers → Linux development environment → Turn on. Give it at least 20 GB of disk.
2. **Run the installer** in the Terminal app:
   ```bash
   sudo apt-get update && sudo apt-get install -y git
   git clone https://github.com/deathdopest-sketch/thanatos-os.git ~/thanatos-os
   ~/thanatos-os/native/install/crostini.sh
   ```
3. **Add Vita.** Vita-Bio is a private repo, so log in to GitHub first:
   ```bash
   gh auth login
   thanatos lang install vita
   ```
4. **Install the desktop.** Run `thanatos web open`. In Chrome, click the install icon in the address bar (or ⋮ → Cast, save and share → Install page as app). Thanatos then sits on the shelf and opens fullscreen.
5. **Set up git and SSH.** Run `thanatos doctor` and fix anything marked ✗. For a new machine that's usually `git config --global user.name/user.email` and `ssh-keygen -t ed25519`.

The installer is safe to re-run. It backs up any existing dotfile as `<file>.pre-thanatos` before linking in the Thanatos version. To skip the language toolchains, pass `--no-langs`.

## What you get

- **Toolchains** via `thanatos lang install <name>`:
  - Node LTS (fnm) + TypeScript and pnpm
  - Python + uv, ruff and pytest
  - Rust (rustup) + clippy and rust-analyzer
  - Go
  - C/C++ (gcc, clang, gdb, cmake)
  - **Vita** and **Reaper**
- **Shell:** tmux (`Ctrl-a` prefix, `|` and `-` to split, `hjkl` to move), a starship prompt, fzf (`Ctrl-R` history), zoxide (`z <dir>`), ripgrep, fd, bat, neovim and gh.
- **Desktop:** the Lilly web desktop, served on `localhost:4173` by a systemd user service.
- **Practice tools**, all from the `thanatos` command (below).

## `thanatos` command

```text
thanatos doctor                     check toolchains and setup
thanatos update                     pull, rebuild, restart the desktop (and the bridge if running)
thanatos lang list                  language plugins and install state
thanatos lang install <name|all>    node python rust go c vita reaper
thanatos web start|stop|status|open Lilly desktop on localhost:4173
thanatos shell install|status|restart  real shell for the desktop's Terminal app
thanatos stumble install            StumbleChat bridge as a background service
thanatos stumble start|stop|status  open/close its Chrome window, check on it
thanatos new <kind> <name>          scaffold a project with git + a passing test
thanatos log "what I learned"       append to ~/.local/share/thanatos/journal.md
thanatos review [days]              read back recent entries
thanatos streak                     consecutive days with an entry
thanatos focus [min] [task]         focus timer; logs the session
thanatos learn reaper               Reaper's Necronomicon learning system
```

`thanatos new` and `thanatos focus` also write to the journal. Each new shell reminds you, at most once a day, if the journal is empty.

### Habit loop

1. `thanatos focus 25 "reaper bytecode VM"`: one task, no tab-hopping.
2. `thanatos log "the dead-code pass never remapped jump targets"`: one sentence on what you learned.
3. `thanatos review` on Sundays to see what you actually did.

## Vita and Reaper

- Each language installs to `~/.local/share/thanatos/langs/<name>` with its own Python venv. The `vita`, `vita-repl` and `reaper` commands go in `~/.local/bin`.
- `thanatos lang install vita` (or `reaper`) again pulls the latest commit.
- To pin a branch, set `VITA_REF=<branch>` or `REAPER_REF=<branch>` before installing.
- Starter projects: `thanatos new vita my-organism` and `thanatos new reaper my-ritual`.

## Stumble Live

Shows live chat and cams from your StumbleChat rooms in a desktop window. Open **StumbleChat** on the desktop and the bridge's Chrome window opens for you to sign in. Then use **Stumble Live** from the start menu.

The bridge's Chrome keeps your rooms open even when the widget is closed. See [stumble-bridge/README.md](stumble-bridge/README.md).

## Arch + Hyprland track

Run `install/arch-hyprland.sh` on an installed Arch system, then start `Hyprland` from a TTY. It installs the same toolchain and dotfiles, plus:

- Hyprland with Lilly pink-to-violet borders and the Lilly wallpaper (hyprpaper)
- Waybar and foot themed in the Lilly palette, and mako for notifications
- Shortcuts:
  - `Super+T` — Lilly desktop as a fullscreen window
  - `Super+Shift+Return` — tmux
  - `Super+D` — app launcher

Replacing ChromeOS takes developer mode plus a UEFI firmware flash from [MrChromebox](https://mrchromebox.tech/). Support depends on the model and it can brick the device. Check your board on MrChromebox's supported-devices list first, and keep a ChromeOS recovery USB. On ARM Chromebooks (MediaTek, Snapdragon), stay on Crostini.

## Ingestor (optional)

`ingestion/thanatos_ingestor.py` is a local, allowlisted metadata ingestor:

```bash
cp ingestion/config.example.json ~/.config/thanatos/ingestion.json
python3 ingestion/thanatos_ingestor.py --config ~/.config/thanatos/ingestion.json --once
```

It doesn't read any folder unless you add it to the allowlist.

## Layout

```text
bin/thanatos                 control command
install/crostini.sh          ChromeOS Linux installer
install/arch-hyprland.sh     native Arch installer
languages/*.sh               toolchain plugins (see languages/README.md)
config/                      hypr, waybar, foot, tmux, starship, shell
systemd/user/                thanatos-web (desktop), thanatos-ingestor
ingestion/                   local ingestor
```
