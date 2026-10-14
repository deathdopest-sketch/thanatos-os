# VITA: the biological programming language (github.com/deathdopest-sketch/Vita-Bio, private).
# Private repo: run `gh auth login` (or set up an SSH key) before installing.
VITA_DIR="$THANATOS_LANGS/vita"
VITA_URL="${VITA_URL:-https://github.com/deathdopest-sketch/Vita-Bio.git}"
# Fix branch until Vita-Bio PR #1 merges; falls back to the default branch once it's gone.
VITA_REF="${VITA_REF:-claude/eager-einstein-lqjohr}"

describe() { echo "VITA language: vita run <file>.vita, vita repl"; }
check() { command -v vita >/dev/null && vita --version >/dev/null 2>&1; }
install() {
  command -v gh >/dev/null && gh auth status >/dev/null 2>&1 && gh auth setup-git
  clone_or_update "$VITA_DIR" "$VITA_URL" "$VITA_REF"
  make_venv "$VITA_DIR"
  "$VITA_DIR/.venv/bin/pip" install --quiet -e "$VITA_DIR"
  write_wrapper vita "exec \"$VITA_DIR/.venv/bin/vita\" \"\$@\""
  write_wrapper vita-repl "exec \"$VITA_DIR/.venv/bin/vita-repl\" \"\$@\""
}
