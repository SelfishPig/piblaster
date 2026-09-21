#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step() {
  echo
  echo "==> $1"
}

step "Syncing backend dependencies"
cd "$ROOT_DIR/backend"
uv sync --frozen

step "Formatting check (Ruff)"
uv run ruff format --check .

step "Backend lint (Ruff)"
uv run ruff check .

step "Backend types (Pyright)"
uv run pyright

step "Backend tests (pytest)"
uv run pytest

step "Installing frontend dependencies from lockfile"
cd "$ROOT_DIR/frontend"
npm ci

step "Frontend lint (Oxlint)"
npm run lint

step "Frontend formatting check (Prettier)"
npx prettier --check .

step "Frontend types (TypeScript)"
npm run typecheck

step "Building production frontend"
npm run build

echo
echo "PiBlaster is production-ready. Frontend output: $ROOT_DIR/frontend/dist"
