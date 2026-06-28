#!/usr/bin/env bash
set -euo pipefail

if ! command -v pacman >/dev/null 2>&1; then
  printf 'This installer targets Arch-based systems with pacman.\n' >&2
  exit 1
fi

packages=(
  base-devel
  curl
  foot
  git
  grim
  hyprland
  jq
  networkmanager
  noto-fonts
  noto-fonts-emoji
  openssh
  pipewire
  pipewire-alsa
  pipewire-pulse
  python
  python-watchdog
  ripgrep
  slurp
  ttf-jetbrains-mono
  waybar
  wl-clipboard
  wofi
  xdg-desktop-portal-hyprland
)

sudo pacman -Syu --needed "${packages[@]}"

systemctl --user enable --now pipewire pipewire-pulse || true
sudo systemctl enable --now NetworkManager

mkdir -p "$HOME/.config/hypr" "$HOME/.config/waybar" "$HOME/.config/thanatos" "$HOME/.local/share/thanatos"

printf 'Thanatos native package baseline installed.\n'
printf 'Copy native/config files into ~/.config, then launch Hyprland from a TTY.\n'
