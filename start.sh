#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

if [ -f .lcms.pid ]; then
  echo "LCMS appears to already be running (found .lcms.pid). Run stop.sh first."
  exit 1
fi

echo "Starting LCMS..."

node server/index.js >> logs/server.log 2>&1 &
SERVER_PID=$!
disown $SERVER_PID

cd client
npx vite >> ../logs/client.log 2>&1 &
CLIENT_PID=$!
disown $CLIENT_PID
cd ..

echo "$SERVER_PID $CLIENT_PID" > .lcms.pid

echo "API server running (PID $SERVER_PID) on http://localhost:3001"
echo "Client running   (PID $CLIENT_PID) on http://localhost:5173"
echo "Run ./stop.sh to stop both."
