# REAPER: the undead programming language (github.com/deathdopest-sketch/Reaper-Scythe).
REAPER_DIR="$THANATOS_LANGS/reaper"
REAPER_URL="${REAPER_URL:-https://github.com/deathdopest-sketch/Reaper-Scythe.git}"
# Fix branch until Reaper-Scythe PR #1 merges; falls back to the default branch once it's gone.
REAPER_REF="${REAPER_REF:-claude/eager-einstein-lqjohr}"

describe() { echo "REAPER language: reaper <file>.reaper, reaper (REPL), reaper --necronomicon"; }
check() { command -v reaper >/dev/null && reaper --version >/dev/null 2>&1; }
install() {
  clone_or_update "$REAPER_DIR" "$REAPER_URL" "$REAPER_REF"
  make_venv "$REAPER_DIR"
  # nuitka is only for building standalone binaries; skip it.
  grep -vi '^nuitka' "$REAPER_DIR/requirements.txt" > "$REAPER_DIR/.venv/requirements-runtime.txt"
  "$REAPER_DIR/.venv/bin/pip" install --quiet -r "$REAPER_DIR/.venv/requirements-runtime.txt"
  write_wrapper reaper "exec \"$REAPER_DIR/.venv/bin/python\" \"$REAPER_DIR/reaper_main.py\" \"\$@\""
}
