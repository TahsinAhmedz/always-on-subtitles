#!/usr/bin/env bash
set -euo pipefail

# Ensure Rust/Cargo is on PATH (common after rustup install in a new terminal).
if [[ -f "${HOME}/.cargo/env" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.cargo/env"
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "Error: cargo not found."
  echo "Install Rust from https://www.rust-lang.org/tools/install"
  echo "Then restart your terminal or run: source \"\$HOME/.cargo/env\""
  exit 1
fi

exec npx tauri "$@"
