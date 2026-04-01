#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

read -rp "Port to bind to [3001]: " INPUT_PORT
PORT=${INPUT_PORT:-3001}

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "Invalid port: $PORT"
  exit 1
fi

echo "Building client..."
cd client
npx vite build
cd ..

SERVE_CLIENT=1 PORT=$PORT node server/index.js
