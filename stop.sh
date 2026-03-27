#!/usr/bin/env bash

cd "$(dirname "$0")"

if [ ! -f .lcms.pid ]; then
  echo "No .lcms.pid file found. LCMS may not be running."
  exit 1
fi

read SERVER_PID CLIENT_PID < .lcms.pid

kill_pid() {
  local pid=$1
  local name=$2
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" && echo "Stopped $name (PID $pid)"
  else
    echo "$name (PID $pid) was not running"
  fi
}

kill_pid "$SERVER_PID" "API server"
kill_pid "$CLIENT_PID" "Client"

rm .lcms.pid
echo "Done."
