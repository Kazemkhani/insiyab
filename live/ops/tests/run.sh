#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
OUT="$(mktemp -d /tmp/insiyab-ops-test.XXXXXX)"
trap 'rm -rf "$OUT"' EXIT
node live/ops/build.mjs --out "$OUT"
if [ -x "$HOME/dev/insiyab/.venv/bin/python" ]; then
  "$HOME/dev/insiyab/.venv/bin/python" live/ops/tests/browser.py "$OUT"
else
  uv run --with playwright python live/ops/tests/browser.py "$OUT"
fi
