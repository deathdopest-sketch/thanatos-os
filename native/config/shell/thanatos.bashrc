# Thanatos shell layer. Sourced from ~/.bashrc by the installers.
export THANATOS_HOME="${THANATOS_HOME:-$HOME/thanatos-os}"
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$HOME/go/bin:/usr/local/go/bin:$PATH"
export EDITOR="${EDITOR:-nvim}"
export HISTSIZE=50000 HISTFILESIZE=100000 HISTCONTROL=ignoredups:erasedups
shopt -s histappend

# Debian ships these under different names.
command -v fdfind >/dev/null && ! command -v fd >/dev/null && alias fd=fdfind
command -v batcat >/dev/null && ! command -v bat >/dev/null && alias bat=batcat

alias ll='ls -alh --color=auto'
alias gs='git status -sb'
alias gl='git log --oneline --graph --decorate -20'
alias gd='git diff'
alias t='tmux new -A -s thanatos'

# fnm (Node version manager)
if command -v fnm >/dev/null; then eval "$(fnm env --use-on-cd --shell bash)"; fi
# fzf key bindings (Ctrl-R history, Ctrl-T files)
[ -f /usr/share/doc/fzf/examples/key-bindings.bash ] && . /usr/share/doc/fzf/examples/key-bindings.bash
[ -f /usr/share/fzf/key-bindings.bash ] && . /usr/share/fzf/key-bindings.bash
# zoxide: `z <dir>` jumps to frequent directories
if command -v zoxide >/dev/null; then eval "$(zoxide init bash)"; fi
if command -v starship >/dev/null; then eval "$(starship init bash)"; fi

# Nudge: one line of the practice journal habit per shell, once a day.
if command -v thanatos >/dev/null && [ -t 1 ]; then thanatos nudge 2>/dev/null; fi
