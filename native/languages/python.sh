describe() { echo "Python 3 + uv (fast venvs/packages), ruff, pytest"; }
check() { command -v python3 >/dev/null && command -v uv >/dev/null; }
install() {
  command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$HOME/.local/bin" sh
  "$HOME/.local/bin/uv" tool install ruff || true
  "$HOME/.local/bin/uv" tool install pytest || true
}
