#!/usr/bin/env bash
set -e

if [ "$EUID" -ne 0 ]; then
  echo "This script must be run as root (use sudo)."
  exit 1
fi

cd "$(dirname "$0")"

if [ -f .lcms.pid ]; then
  echo "LCMS appears to already be running (found .lcms.pid). Run stop.sh first."
  exit 1
fi

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

mkdir -p logs
echo "Starting LCMS (production)..."

SERVE_CLIENT=1 PORT=$PORT node server/index.js >> logs/server.log 2>&1 &
SERVER_PID=$!
disown $SERVER_PID

echo "$SERVER_PID" > .lcms.pid

echo "Server running (PID $SERVER_PID) on http://localhost:$PORT"
echo "Logs: logs/server.log"
echo "Run ./stop.sh to stop."
