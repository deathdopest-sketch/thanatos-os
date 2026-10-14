# Language plugins

Every file `<name>.sh` in this folder is a toolchain plugin used by `thanatos lang`.
A plugin defines three bash functions:

```bash
describe() { echo "one-line description"; }
check()    { command -v mytool >/dev/null; }   # exit 0 when installed
install()  { ...; }                            # idempotent install, user-level where possible
```

```bash
thanatos lang list          # show plugins and whether each is installed
thanatos lang install rust  # run one plugin's install()
thanatos lang install all   # install everything
```

## Vita and Reaper

These two slots are reserved. They need a real definition before they get a plugin:
either the upstream project (repo URL / install method) or, if they're meant to be
Thanatos-native languages, a spec. Once that exists, they are added as `vita.sh` and
`reaper.sh` here, plus a `thanatos new vita|reaper` template.
