#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SITE=$(mktemp -d /tmp/insiyab-web-tests.XXXXXX)
trap 'rm -rf "$SITE"' EXIT
node web/build.mjs --bundle "${INSIYAB_BUNDLE:-fixtures}" --out "$SITE"
node web/tests/model.test.mjs
python3 web/tests/guide.py "$SITE"
python3 web/tests/twin.py "$SITE"
python3 web/tests/browser.py "$SITE" ${INSIYAB_SHOTS:+--shots "$INSIYAB_SHOTS"}
python3 web/tests/review.py "$SITE"
python3 web/tests/room.py "$SITE" "${INSIYAB_BUNDLE:-fixtures}"
python3 web/tests/basemap.py "$SITE"
echo 'ALL PASS'
