# Shared helpers for language plugins that install from a git repo.
# Sourced by `thanatos lang`; not a plugin itself (leading underscore).

THANATOS_LANGS="${THANATOS_LANGS:-$HOME/.local/share/thanatos/langs}"

# clone_or_update <dir> <url> <preferred-ref>
# Checks out <preferred-ref> if the remote has it, otherwise the default branch.
clone_or_update() {
  local dir=$1 url=$2 ref=$3
  if [ ! -d "$dir/.git" ]; then
    mkdir -p "$(dirname "$dir")"
    git clone "$url" "$dir"
  fi
  git -C "$dir" fetch --quiet origin
  if [ -n "$ref" ] && git -C "$dir" ls-remote --exit-code --heads origin "$ref" >/dev/null 2>&1; then
    git -C "$dir" checkout --quiet -B "$ref" "origin/$ref"
  else
    local default
    default=$(git -C "$dir" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
    git -C "$dir" checkout --quiet -B "${default:-main}" "origin/${default:-main}"
  fi
}

# make_venv <dir>: create <dir>/.venv with the newest python3 available.
make_venv() {
  local dir=$1
  [ -x "$dir/.venv/bin/python" ] || python3 -m venv "$dir/.venv"
  "$dir/.venv/bin/python" -m pip install --quiet --upgrade pip
}

# write_wrapper <name> <body...>: install an executable script into ~/.local/bin
write_wrapper() {
  local name=$1; shift
  mkdir -p "$HOME/.local/bin"
  printf '#!/usr/bin/env bash\n%s\n' "$*" > "$HOME/.local/bin/$name"
  chmod +x "$HOME/.local/bin/$name"
}
