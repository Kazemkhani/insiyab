#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../../.."
node live/api/drill/tests/drill.test.js
# last line from drill.test.js is ALL PASS
