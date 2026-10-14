describe() { echo "Node.js LTS via fnm + TypeScript, pnpm"; }
check() { command -v node >/dev/null && command -v tsc >/dev/null; }
install() {
  if ! command -v fnm >/dev/null; then
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "$HOME/.local/bin" --skip-shell
  fi
  eval "$("$HOME/.local/bin/fnm" env --shell bash 2>/dev/null || fnm env --shell bash)"
  fnm install --lts && fnm default lts-latest
  npm install -g typescript tsx pnpm
}
