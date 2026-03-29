#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Running LCMS API tests..."
node --test tests/api.test.js
