#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Running LCMS API tests..."
node --test --test-reporter=spec tests/api.test.js
