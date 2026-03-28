#!/usr/bin/env bash

cd "$(dirname "$0")"

if [ ! -f .lcms.pid ]; then
  echo "No .lcms.pid file found. LCMS may not be running."
  exit 1
fi

kill_pid() {
  local pid=$1
  local name=$2
  if [ -z "$pid" ]; then return; fi
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" && echo "Stopped $name (PID $pid)"
  else
    echo "$name (PID $pid) was not running"
  fi
}

read -r SERVER_PID CLIENT_PID < .lcms.pid

kill_pid "$SERVER_PID" "Server"
kill_pid "$CLIENT_PID" "Client"

rm .lcms.pid
stty sane
echo "Done."
