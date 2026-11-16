#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
bundle_dir=$(mktemp -d /tmp/insiyab-engine-web.XXXXXX)
trap 'rm -rf "$bundle_dir"' EXIT
.venv/bin/python -m model.run --data fixtures/raw --out "$bundle_dir"
INSIYAB_BUNDLE="$bundle_dir" bash web/tests/run.sh
echo 'ENGINE TO BROWSER PASS'
