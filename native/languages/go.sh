describe() { echo "Go (distro package) + gopls"; }
check() { command -v go >/dev/null; }
install() {
  if command -v apt-get >/dev/null; then sudo apt-get install -y golang; else sudo pacman -S --needed --noconfirm go; fi
  go install golang.org/x/tools/gopls@latest
}
