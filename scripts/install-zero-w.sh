#!/usr/bin/env bash
set -euo pipefail

# Keep installation inside a function so curl | bash reads the complete function
# before starting any installation steps. No checkout is required on the Pi.
main() {
  local repository="${PIBLASTER_REPO:-selfishpig/piblaster}"
  local ref="${PIBLASTER_REF:-main}"
  local install_dir=/opt/piblaster
  local data_dir=/var/lib/piblaster
  local service_user=piblaster
  local download_url="https://raw.githubusercontent.com/${repository}/${ref}/dist/linux-armv6/piblaster"

  if [[ "${1:-}" == "--help" ]]; then
    cat <<'EOF'
Usage: sudo bash install-zero-w.sh
   or: curl -fsSL https://raw.githubusercontent.com/selfishpig/piblaster/main/scripts/install-zero-w.sh | sudo bash

Downloads dist/linux-armv6/piblaster and installs the PiBlaster systemd service.
Requires 32-bit Raspberry Pi OS (armhf) with systemd. Nothing is built on the Pi.

Optional environment variables:
  PIBLASTER_REPO  GitHub owner/repository (default: selfishpig/piblaster)
  PIBLASTER_REF   Branch, tag, or commit containing the binary (default: main)

For example, to install from a specific tag:
  sudo env PIBLASTER_REF=v0.1.0 bash install-zero-w.sh
EOF
    return
  fi

  if [[ $# -ne 0 ]]; then
    echo "Unknown arguments. Use --help for usage." >&2
    return 1
  fi
  if [[ "$EUID" -ne 0 ]]; then
    echo "Run as root: sudo bash install-zero-w.sh (or pipe curl into sudo bash)." >&2
    return 1
  fi
  if [[ "$(uname -s)" != Linux ]] || [[ ! -f /etc/debian_version ]]; then
    echo "This installer requires Raspberry Pi OS or Debian-family Linux." >&2
    return 1
  fi
  if [[ "$(dpkg --print-architecture)" != armhf ]]; then
    echo "This executable requires 32-bit ARM hard-float userspace (armhf)." >&2
    return 1
  fi
  if ! command -v systemctl >/dev/null 2>&1 || [[ ! -d /run/systemd/system ]]; then
    echo "This installer requires a running systemd system." >&2
    return 1
  fi

  echo "==> Installing runtime packages"
  apt-get update </dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    avahi-daemon ca-certificates curl v4l-utils </dev/null

  # Global variables remain available to the EXIT trap after main returns.
  PIBLASTER_INSTALL_TMP="$(mktemp -d)"
  PIBLASTER_STAGED_BINARY=""
  trap 'rm -rf -- "$PIBLASTER_INSTALL_TMP"; if [[ -n "$PIBLASTER_STAGED_BINARY" ]]; then rm -f -- "$PIBLASTER_STAGED_BINARY"; fi' EXIT

  echo "==> Downloading $download_url"
  if ! curl --proto '=https' --proto-redir '=https' --fail --show-error --location \
    --retry 3 --connect-timeout 30 \
    --output "$PIBLASTER_INSTALL_TMP/piblaster" "$download_url"; then
    echo "Download failed. Publish dist/linux-armv6/piblaster to $repository at $ref first." >&2
    return 1
  fi

  # Reject HTML errors, Git LFS pointers, and binaries for the wrong architecture
  # without executing the downloaded program during installation.
  local elf_header
  elf_header="$(od -An -tx1 -N20 "$PIBLASTER_INSTALL_TMP/piblaster" | tr -d '[:space:]')"
  if [[ "${elf_header:0:12}" != 7f454c460101 || "${elf_header:36:4}" != 2800 ]]; then
    echo "The download is not a 32-bit little-endian ARM ELF executable." >&2
    echo "Publish the actual binary at the download path, not a Git LFS pointer." >&2
    return 1
  fi

  echo "==> Creating service account and directories"
  if ! getent group "$service_user" >/dev/null 2>&1; then
    groupadd --system "$service_user"
  fi
  if ! id "$service_user" >/dev/null 2>&1; then
    useradd --system --gid "$service_user" --home-dir "$data_dir" \
      --no-create-home --shell /usr/sbin/nologin "$service_user"
  fi
  install -d -o "$service_user" -g "$service_user" -m 0750 "$data_dir"
  install -d -o root -g root -m 0755 "$install_dir"

  echo "==> Granting IR-device group access"
  if ! getent group video >/dev/null 2>&1; then
    groupadd --system video
  fi
  usermod -a -G video "$service_user"

  echo "==> Installing executable"
  # Rename on the same filesystem so upgrades can replace a running executable.
  # The existing database and any source checkout remain in place.
  PIBLASTER_STAGED_BINARY="$(mktemp "$install_dir/.piblaster.XXXXXX")"
  install -o root -g root -m 0755 "$PIBLASTER_INSTALL_TMP/piblaster" "$PIBLASTER_STAGED_BINARY"
  mv -f -- "$PIBLASTER_STAGED_BINARY" "$install_dir/piblaster"
  PIBLASTER_STAGED_BINARY=""

  echo "==> Installing and enabling systemd service"
  cat > "$PIBLASTER_INSTALL_TMP/piblaster.service" <<'EOF'
[Unit]
Description=PiBlaster infrared remote service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=piblaster
Group=piblaster
SupplementaryGroups=video
WorkingDirectory=/var/lib/piblaster
Environment=PIBLASTER_IR_BACKEND=linux
Environment=PIBLASTER_DATABASE_PATH=/var/lib/piblaster/piblaster.db
Environment=PIBLASTER_HOST=0.0.0.0
Environment=PIBLASTER_PORT=8000
EnvironmentFile=-/etc/default/piblaster
ExecStart=/opt/piblaster/piblaster
Restart=on-failure
RestartSec=3
TimeoutStopSec=15
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/piblaster

[Install]
WantedBy=multi-user.target
EOF
  install -o root -g root -m 0644 "$PIBLASTER_INSTALL_TMP/piblaster.service" \
    /etc/systemd/system/piblaster.service
  systemctl daemon-reload
  systemctl enable --now avahi-daemon.service
  systemctl enable piblaster.service
  systemctl restart piblaster.service

  cat <<'EOF'

PiBlaster is installed at /opt/piblaster/piblaster.
Data is stored in /var/lib/piblaster. Check the service with:
  systemctl status piblaster
  journalctl -u piblaster -f

Open http://<pi-hostname>.local:8000 from another device on your LAN.
Optional configuration overrides go in /etc/default/piblaster; restart the
service after editing that file. Re-run this installer to update the executable.

IR overlays are not changed automatically. After verifying your module voltage
and pinout, add these lines to the applicable boot configuration file (usually
/boot/firmware/config.txt or /boot/config.txt):

  dtoverlay=gpio-ir,gpio_pin=17
  dtoverlay=gpio-ir-tx,gpio_pin=18

Reboot when convenient, then check /dev/lirc* and ir-ctl --features.
To use http://piblaster.local:8000, set the hostname with:
  sudo hostnamectl set-hostname piblaster
  sudo systemctl restart avahi-daemon
EOF
}

main "$@"
