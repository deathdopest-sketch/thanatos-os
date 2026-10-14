#!/usr/bin/env bash
# Thanatos OS on ChromeOS: sets up the Linux development environment (Crostini,
# Debian) as a Lilly-themed dev workstation.
#
#   git clone https://github.com/deathdopest-sketch/thanatos-os.git ~/thanatos-os
#   ~/thanatos-os/native/install/crostini.sh            # everything
#   ~/thanatos-os/native/install/crostini.sh --no-langs # skip language toolchains
#
# Safe to re-run.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NATIVE="$REPO/native"
WITH_LANGS=1
for arg in "$@"; do
  case "$arg" in
    --no-langs) WITH_LANGS=0 ;;
    -h|--help) sed -n 2,10p "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

step() { printf '\n\e[38;2;255;117;206m☠ %s\e[0m\n' "$*"; }

if ! command -v apt-get >/dev/null; then
  echo "This installer targets ChromeOS Linux (Debian). For Arch use install/arch-hyprland.sh." >&2
  exit 1
fi
[ -e /dev/.cros_milestone ] || [ -d /opt/google/cros-containers ] \
  || echo "note: this doesn't look like Crostini; continuing on plain Debian/Ubuntu."

ARCH=$(dpkg --print-architecture)
step "architecture: $ARCH"

step "apt packages"
sudo apt-get update -qq
sudo apt-get install -y -qq \
  build-essential git curl wget unzip ca-certificates gnupg \
  python3 python3-venv python3-pip \
  tmux neovim ripgrep fd-find fzf bat jq htop tree zoxide \
  shellcheck sqlite3 man-db \
  fonts-jetbrains-mono fonts-noto-color-emoji \
  libnotify-bin xdg-utils

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
  # Unit is generated so it points at wherever this repo was cloned.
  sed "s#%h/thanatos-os#$REPO#" "$NATIVE/systemd/user/thanatos-web.service" \
    > "$HOME/.config/systemd/user/thanatos-web.service"
  if systemctl --user daemon-reload 2>/dev/null; then
    systemctl --user enable --now thanatos-web.service
  else
    echo "  no user systemd session; start the desktop manually with: thanatos web start"
  fi
else
  echo "  node missing; run: thanatos lang install node && re-run this script"
fi

step "done"
cat <<MSG
  Open a new terminal (or: source ~/.bashrc), then:
    thanatos doctor          check everything
    thanatos web open        open the Lilly desktop in Chrome
  In Chrome, use the install icon in the address bar (or ⋮ → Cast, save and share →
  Install page as app) to pin Thanatos to the shelf; it opens fullscreen.
MSG
