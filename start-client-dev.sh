#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Alias for start-api-dev.sh — Next.js serves both the UI and API
npm run dev
