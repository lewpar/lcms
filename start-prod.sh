#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

read -rp "Port to bind to [3000]: " INPUT_PORT
PORT=${INPUT_PORT:-3000}

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
  echo "Invalid port: $PORT"
  exit 1
fi

echo "Building..."
npm run build

echo "Starting on port $PORT..."
PORT=$PORT npm start
