#!/usr/bin/env bash
# Thanatos OS on WSL2 (Ubuntu): sets up the Linux environment on Windows
# Subsystem for Linux as a Lilly-themed dev workstation.
#
#   git clone https://github.com/deathdopest-sketch/thanatos-os.git ~/thanatos-os
#   ~/thanatos-os/native/install/wsl.sh            # everything
#   ~/thanatos-os/native/install/wsl.sh --no-langs # skip language toolchains
#
# Requires WSL2 with Ubuntu 22.04+. Safe to re-run.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NATIVE="$REPO/native"
WITH_LANGS=1
for arg in "$@"; do
  case "$arg" in
    --no-langs) WITH_LANGS=0 ;;
    -h|--help) sed -n 2,11p "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

step() { printf '\n\e[38;2;255;117;206m☠ %s\e[0m\n' "$*"; }

if ! grep -qi 'microsoft\|wsl' /proc/version 2>/dev/null; then
  echo "This installer targets WSL2 (Ubuntu). For Crostini use install/crostini.sh." >&2
  exit 1
fi
if ! command -v apt-get >/dev/null; then
  echo "Only Ubuntu/Debian WSL is supported. For Arch use install/arch-hyprland.sh." >&2
  exit 1
fi

ARCH=$(dpkg --print-architecture)
step "architecture: $ARCH"

# WSL2 supports systemd when enabled in /etc/wsl.conf (Windows 11 21H2+).
# If it isn't active yet, enable it and ask the user to restart WSL, then re-run.
HAS_SYSTEMD=0
if systemctl --user status >/dev/null 2>&1; then
  HAS_SYSTEMD=1
else
  step "enabling systemd"
  WSL_CONF=/etc/wsl.conf
  if grep -q 'systemd=true' "$WSL_CONF" 2>/dev/null; then
    echo "  systemd=true is already in $WSL_CONF but systemd isn't running."
    echo "  Run 'wsl --shutdown' from PowerShell, reopen WSL, then re-run this installer."
  else
    printf '\n[boot]\nsystemd=true\n' | sudo tee -a "$WSL_CONF" >/dev/null
    echo "  Added systemd=true to $WSL_CONF."
    echo "  Run 'wsl --shutdown' from PowerShell, reopen WSL, then re-run this installer."
  fi
fi

step "apt packages"
sudo apt-get update -qq
sudo apt-get install -y -qq \
  build-essential git curl wget unzip ca-certificates gnupg \
  python3 python3-venv python3-pip \
  tmux neovim ripgrep fd-find fzf bat jq htop tree zoxide \
  shellcheck sqlite3 man-db \
  fonts-jetbrains-mono fonts-noto-color-emoji \
  libnotify-bin xdg-utils wslu

step "GitHub CLI"
if ! command -v gh >/dev/null; then
  sudo mkdir -p -m 755 /etc/apt/keyrings
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
  sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
  sudo apt-get update -qq && sudo apt-get install -y -qq gh
fi

step "starship prompt"
mkdir -p "$HOME/.local/bin"
command -v starship >/dev/null || { curl -fsSL https://starship.rs/install.sh | sh -s -- -y -b "$HOME/.local/bin" >/dev/null; } \
  || echo "  ! starship install failed (prompt falls back to default); retry later"

step "dotfiles"
link() { mkdir -p "$(dirname "$2")"; [ -e "$2" ] && [ ! -L "$2" ] && mv "$2" "$2.pre-thanatos"; ln -sfn "$1" "$2"; }
link "$NATIVE/config/starship/starship.toml" "$HOME/.config/starship.toml"
link "$NATIVE/config/tmux/tmux.conf" "$HOME/.tmux.conf"
link "$NATIVE/bin/thanatos" "$HOME/.local/bin/thanatos"
MARK="# thanatos-os"
grep -qF "$MARK" "$HOME/.bashrc" 2>/dev/null \
  || printf '\n%s\nexport THANATOS_HOME="%s"\n. "%s/config/shell/thanatos.bashrc"\n' "$MARK" "$REPO" "$NATIVE" >> "$HOME/.bashrc"
export PATH="$HOME/.local/bin:$PATH" THANATOS_HOME="$REPO"

if [ "$WITH_LANGS" = 1 ]; then
  step "language toolchains"
  for lang in node python rust go c reaper; do
    thanatos lang install "$lang" || echo "  ! $lang failed; retry later with: thanatos lang install $lang"
  done
  if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
    thanatos lang install vita || echo "  ! vita failed; retry: thanatos lang install vita"
  else
    echo "  vita skipped: Vita-Bio is private. Run 'gh auth login' then 'thanatos lang install vita'."
  fi
fi

step "Lilly desktop"
if command -v npm >/dev/null || [ -x "$HOME/.local/bin/fnm" ]; then
  # shellcheck disable=SC1090
  command -v fnm >/dev/null && eval "$(fnm env --shell bash)"
  (cd "$REPO" && npm ci --silent && npm run build --silent)
  mkdir -p "$HOME/.config/systemd/user"
  sed "s#%h/thanatos-os#$REPO#" "$NATIVE/systemd/user/thanatos-web.service" \
    > "$HOME/.config/systemd/user/thanatos-web.service"
  if [ "$HAS_SYSTEMD" = 1 ] && systemctl --user daemon-reload 2>/dev/null; then
    systemctl --user enable --now thanatos-web.service
  else
    echo "  services can't start until systemd is active (see above); after restarting WSL run: thanatos web start"
  fi
else
  echo "  node missing; run: thanatos lang install node && re-run this script"
fi

step "Terminal service"
if command -v npm >/dev/null; then
  if [ "$HAS_SYSTEMD" = 1 ]; then
    thanatos shell install || echo "  ! terminal service setup failed; retry later with: thanatos shell install"
  else
    echo "  skipped (needs systemd); after restarting WSL run: thanatos shell install"
  fi
fi

step "StumbleChat bridge"
if command -v npm >/dev/null; then
  if [ "$HAS_SYSTEMD" = 1 ]; then
    thanatos stumble install || echo "  ! bridge setup failed; retry later with: thanatos stumble install"
  else
    echo "  skipped (needs systemd); after restarting WSL run: thanatos stumble install"
  fi
fi

step "done"
if [ "$HAS_SYSTEMD" = 0 ]; then
  cat <<MSG

  systemd wasn't active when this ran. To finish setup:
    1. From PowerShell:  wsl --shutdown
    2. Reopen your WSL terminal
    3. Re-run:           ~/thanatos-os/native/install/wsl.sh

  Until then you can start the desktop manually:
    source ~/.bashrc
    thanatos web start
    thanatos web open
MSG
else
  cat <<MSG

  Open a new terminal (or: source ~/.bashrc), then:
    thanatos doctor          check everything
    thanatos web open        open the Lilly desktop in Chrome
  In Chrome, use the install icon in the address bar (or ⋮ → Cast, save and share →
  Install page as app) to pin Thanatos; it opens fullscreen.
MSG
fi
