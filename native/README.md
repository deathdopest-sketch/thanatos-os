# Native Thanatos OS

This folder contains the first native Linux scaffold:

- `install/arch-hyprland.sh`: idempotent package bootstrap for an Arch-based install.
- `config/hypr/hyprland.conf`: Hyprland session config.
- `config/waybar/config.jsonc`: Waybar module layout.
- `config/waybar/style.css`: Thanatos-style bar skin.
- `ingestion/thanatos_ingestor.py`: local allowlisted file/system/network metadata ingestor.
- `ingestion/config.example.json`: safe default ingestion config.
- `systemd/user/thanatos-ingestor.service`: user service for the ingestor.

## Install Sketch

```bash
cd native
./install/arch-hyprland.sh
mkdir -p ~/.config/hypr ~/.config/waybar ~/.config/thanatos
cp config/hypr/hyprland.conf ~/.config/hypr/hyprland.conf
cp config/waybar/config.jsonc ~/.config/waybar/config.jsonc
cp config/waybar/style.css ~/.config/waybar/style.css
cp ingestion/config.example.json ~/.config/thanatos/ingestion.json
mkdir -p ~/.local/share/thanatos
python3 ingestion/thanatos_ingestor.py --config ~/.config/thanatos/ingestion.json --once
```

## Run Ingestor As User Service

```bash
mkdir -p ~/.config/systemd/user
cp systemd/user/thanatos-ingestor.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now thanatos-ingestor.service
```

The ingestor does not read arbitrary home folders unless you add them to the allowlist.
