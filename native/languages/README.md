# Language plugins

Every file `<name>.sh` in this folder is a toolchain plugin used by `thanatos lang`
(files starting with `_` are shared helpers). A plugin defines three bash functions:

```bash
describe() { echo "one-line description"; }
check()    { command -v mytool >/dev/null; }   # exit 0 when installed
install()  { ...; }                            # idempotent, user-level where possible
```

```bash
thanatos lang list           # show plugins and whether each is installed
thanatos lang install reaper # run one plugin's install()
thanatos lang install all    # install everything
```

## Vita and Reaper

Both are Python interpreters installed from their repos into
`~/.local/share/thanatos/langs/<name>` with their own venv, plus `vita`, `vita-repl`
and `reaper` wrappers in `~/.local/bin`.

- Vita-Bio is private: run `gh auth login` first.
- They track each repo's default branch. Pin one with `VITA_REF=<branch>` / `REAPER_REF=<branch>`.
- Re-running `thanatos lang install vita` updates to the latest commit.
