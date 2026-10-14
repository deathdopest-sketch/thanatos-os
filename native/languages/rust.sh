describe() { echo "Rust stable via rustup + clippy, rustfmt, rust-analyzer"; }
check() { command -v cargo >/dev/null; }
install() {
  command -v rustup >/dev/null || curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
  "$HOME/.cargo/bin/rustup" component add clippy rustfmt rust-analyzer
}
