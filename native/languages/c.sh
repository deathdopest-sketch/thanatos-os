describe() { echo "C/C++: gcc, clang, gdb, make, cmake"; }
check() { command -v gcc >/dev/null && command -v cmake >/dev/null && command -v gdb >/dev/null; }
install() {
  if command -v apt-get >/dev/null; then sudo apt-get install -y build-essential clang gdb cmake
  else sudo pacman -S --needed --noconfirm base-devel clang gdb cmake; fi
}
