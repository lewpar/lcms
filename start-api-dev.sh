#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Run Next.js development server (replaces separate API + Vite servers)
npm run dev
