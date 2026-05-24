#!/usr/bin/env bash
# start-dev.sh — create venv, install deps and run npm dev (Bash)
set -e
cd "$(dirname "$0")/.."

echo "[start-dev] Working dir: $(pwd)"
if [ ! -d .venv ]; then
  echo "[start-dev] Creating .venv..."
  python -m venv .venv
fi

# shellcheck source=/dev/null
. .venv/bin/activate || echo "[start-dev] Could not activate .venv automatically. Activate manually if needed."

echo "[start-dev] Installing Python deps..."
pip install -r backend/requirements.txt

echo "[start-dev] Installing npm deps..."
npm install

echo "[start-dev] Running npm run dev..."
npm run dev
