#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: ./scripts/build-executable.sh [docker buildx build options]

Build a single ARMv6 executable for 32-bit Raspberry Pi OS using balenalib/rpi:build.
Output: dist/linux-armv6/piblaster
Requires Docker Buildx on amd64/arm64 with ARM emulation or an ARMv6 builder node.

Extra arguments are passed to Buildx, for example:
  ./scripts/build-executable.sh --builder mybuilder --progress plain
  ./scripts/build-executable.sh --no-cache --build-arg BUILD_JOBS=4
EOF
  exit 0
fi

if ! command -v docker >/dev/null 2>&1 || ! docker buildx version >/dev/null 2>&1; then
  echo "Docker with the Buildx plugin is required." >&2
  exit 1
fi

docker buildx build \
  --platform linux/arm/v6 \
  --file "$ROOT_DIR/deploy/Dockerfile.executable" \
  --target artifact \
  --output "type=local,dest=$ROOT_DIR/dist/linux-armv6" \
  "$@" \
  "$ROOT_DIR"

echo "Executable: $ROOT_DIR/dist/linux-armv6/piblaster"
