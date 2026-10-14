#!/usr/bin/env bash
# Thanatos OS native track: Arch + Hyprland with the Lilly theme and dev tooling.
# Run from a TTY on an installed Arch system, then start Hyprland. Safe to re-run.
set -euo pipefail

if ! command -v pacman >/dev/null 2>&1; then
  printf 'This installer targets Arch-based systems with pacman.\n' >&2
  exit 1
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NATIVE="$REPO/native"

packages=(
  # session
  hyprland hyprpaper xdg-desktop-portal-hyprland waybar wofi foot mako
  grim slurp wl-clipboard brightnessctl pipewire pipewire-alsa pipewire-pulse wireplumber
  networkmanager openssh chromium
  noto-fonts noto-fonts-emoji ttf-jetbrains-mono
  # dev
  base-devel git github-cli curl jq ripgrep fd fzf bat zoxide tmux neovim starship
  shellcheck sqlite python python-pip python-watchdog nodejs npm go rustup clang gdb cmake
  libnotify xdg-utils
)

sudo pacman -Syu --needed --noconfirm "${packages[@]}"
rustup default stable >/dev/null 2>&1 || true

systemctl --user enable --now pipewire pipewire-pulse wireplumber || true
sudo systemctl enable --now NetworkManager

link() { mkdir -p "$(dirname "$2")"; [ -e "$2" ] && [ ! -L "$2" ] && mv "$2" "$2.pre-thanatos"; ln -sfn "$1" "$2"; }
link "$NATIVE/config/hypr/hyprland.conf" "$HOME/.config/hypr/hyprland.conf"
link "$NATIVE/config/hypr/hyprpaper.conf" "$HOME/.config/hypr/hyprpaper.conf"
link "$NATIVE/config/waybar/config.jsonc" "$HOME/.config/waybar/config.jsonc"
link "$NATIVE/config/waybar/style.css" "$HOME/.config/waybar/style.css"
link "$NATIVE/config/foot/foot.ini" "$HOME/.config/foot/foot.ini"
link "$NATIVE/config/starship/starship.toml" "$HOME/.config/starship.toml"
link "$NATIVE/config/tmux/tmux.conf" "$HOME/.tmux.conf"
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/thanatos" "$HOME/.config/thanatos"
link "$NATIVE/bin/thanatos" "$HOME/.local/bin/thanatos"
cp "$REPO/public/assets/thanatos-background.png" "$HOME/.local/share/thanatos/wallpaper.png"

MARK="# thanatos-os"
grep -qF "$MARK" "$HOME/.bashrc" 2>/dev/null \
  || printf '\n%s\nexport THANATOS_HOME="%s"\n. "%s/config/shell/thanatos.bashrc"\n' "$MARK" "$REPO" "$NATIVE" >> "$HOME/.bashrc"
export PATH="$HOME/.local/bin:$PATH" THANATOS_HOME="$REPO"

# Lilly desktop served locally (Super+T opens it).
(cd "$REPO" && npm ci --silent && npm run build --silent)
mkdir -p "$HOME/.config/systemd/user"
sed "s#%h/thanatos-os#$REPO#" "$NATIVE/systemd/user/thanatos-web.service" \
  > "$HOME/.config/systemd/user/thanatos-web.service"
if systemctl --user daemon-reload 2>/dev/null; then
  systemctl --user enable thanatos-web.service
else
  echo "no user systemd session; start the desktop with: thanatos web start"
fi

thanatos lang install reaper || echo "reaper failed; retry: thanatos lang install reaper"
echo "Vita-Bio is private: run 'gh auth login' then 'thanatos lang install vita'."

printf '\nThanatos native baseline installed. Start Hyprland from a TTY: Hyprland\n'
printf 'Super+T Lilly desktop · Super+Return terminal · Super+Shift+Return tmux · Super+D launcher\n'
