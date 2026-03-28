#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ -f .lcms.pid ]; then
  echo "LCMS appears to already be running (found .lcms.pid). Run stop.sh first."
  exit 1
fi

echo "Building client..."
cd client
npx vite build
cd ..

echo "Starting LCMS (production)..."

SERVE_CLIENT=1 node server/index.js &
SERVER_PID=$!

echo "$SERVER_PID" > .lcms.pid

echo "Server running (PID $SERVER_PID) on http://localhost:3001"
echo "Run ./stop.sh to stop."
