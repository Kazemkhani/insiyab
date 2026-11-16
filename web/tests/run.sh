#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SITE=$(mktemp -d /tmp/insiyab-web-tests.XXXXXX)
trap 'rm -rf "$SITE"' EXIT
node web/build.mjs --bundle fixtures --out "$SITE"
node web/tests/model.test.mjs
python3 web/tests/browser.py "$SITE" ${INSIYAB_SHOTS:+--shots "$INSIYAB_SHOTS"}
echo 'ALL PASS'
