#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="/opt/piblaster"
DATA_DIR="/var/lib/piblaster"
SERVICE_USER="piblaster"

if [[ "$(uname -s)" != "Linux" ]] || [[ ! -f /etc/debian_version ]]; then
  echo "PiBlaster's installer supports Raspberry Pi OS and Debian-family Linux only." >&2
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer as root: sudo ./scripts/install.sh" >&2
  exit 1
fi

echo "==> Installing operating-system packages"
apt-get update
# Native Python dependencies may need source builds on 32-bit Raspberry Pi OS.
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  avahi-daemon build-essential curl lirc nodejs npm python3-dev rsync v4l-utils

UV_BIN="$(command -v uv || true)"
if [[ -z "$UV_BIN" ]]; then
  echo "==> Installing uv"
  # The install directory must be passed to the shell running the installer.
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh
  UV_BIN=/usr/local/bin/uv
fi

echo "==> Checking Rust build toolchain"
# Keep this aligned with the source-build requirements in backend/uv.lock.
RUST_MIN_VERSION=1.88.0
rust_is_usable() {
  local version
  version="$(rustc --version 2>/dev/null | awk '{print $2}')" || return 1
  [[ -n "$version" ]] && dpkg --compare-versions "$version" ge "$RUST_MIN_VERSION" &&
    cargo --version >/dev/null 2>&1
}

if ! rust_is_usable; then
  # Keep build tools outside INSTALL_DIR, which rsync updates with --delete.
  export CARGO_HOME=/opt/piblaster-build/cargo
  export RUSTUP_HOME=/opt/piblaster-build/rustup
  export PATH="$CARGO_HOME/bin:$PATH"
  export RUSTUP_TOOLCHAIN="$RUST_MIN_VERSION"
  if ! rust_is_usable; then
    echo "==> Installing Rust $RUST_MIN_VERSION for native Python dependencies"
    if [[ ! -x "$CARGO_HOME/bin/rustup" ]]; then
      curl --proto '=https' --tlsv1.2 -fsS https://sh.rustup.rs | \
        sh -s -- -y --profile minimal --default-toolchain none --no-modify-path
    fi
    "$CARGO_HOME/bin/rustup" toolchain install "$RUST_MIN_VERSION" --profile minimal
  fi
fi
if ! rust_is_usable; then
  echo "Rust $RUST_MIN_VERSION or newer and Cargo are required to build backend dependencies." >&2
  exit 1
fi

NODE_MAJOR="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
if (( NODE_MAJOR < 20 )); then
  echo "==> Installing a current Node.js LTS release"
  NODE_SETUP="$(mktemp)"
  trap 'rm -f "$NODE_SETUP"' EXIT
  curl -fsSL https://deb.nodesource.com/setup_22.x -o "$NODE_SETUP"
  bash "$NODE_SETUP"
  apt-get install -y nodejs
fi

echo "==> Creating service account and directories"
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
install -d -o "$SERVICE_USER" -g "$SERVICE_USER" -m 0750 "$DATA_DIR"
install -d -o root -g root -m 0755 "$INSTALL_DIR"

echo "==> Copying PiBlaster to $INSTALL_DIR"
rsync -a --delete \
  --exclude='.git/' \
  --exclude='backend/.venv/' \
  --exclude='frontend/node_modules/' \
  --exclude='frontend/dist/' \
  "$SOURCE_DIR/" "$INSTALL_DIR/"

echo "==> Installing backend dependencies"
cd "$INSTALL_DIR/backend"
"$UV_BIN" sync --frozen --no-dev

echo "==> Building frontend"
cd "$INSTALL_DIR/frontend"
npm ci
npm run build

echo "==> Granting IR-device group access"
if getent group video >/dev/null 2>&1; then
  usermod -a -G video "$SERVICE_USER"
fi

echo "==> Installing and enabling systemd service"
install -o root -g root -m 0644 "$INSTALL_DIR/deploy/piblaster.service" /etc/systemd/system/piblaster.service
systemctl daemon-reload
systemctl enable piblaster.service
systemctl enable --now avahi-daemon.service
systemctl restart piblaster.service

cat <<'EOF'

PiBlaster is installed. Check it with:
  systemctl status piblaster
  journalctl -u piblaster -f

IR overlays are intentionally not changed automatically. After verifying your
module voltage and pinout, add these lines to the applicable Raspberry Pi boot
configuration (commonly /boot/firmware/config.txt):

  dtoverlay=gpio-ir,gpio_pin=17
  dtoverlay=gpio-ir-tx,gpio_pin=18

Then reboot at a time of your choosing. For http://piblaster.local, set the host
name explicitly with `sudo hostnamectl set-hostname piblaster` and restart Avahi,
or use the machine's existing <hostname>.local address.
EOF
