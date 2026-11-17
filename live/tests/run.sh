#!/usr/bin/env bash
# The room relay's tests (no network, no store, no call), then the Khutwa page in a browser. The last line is ALL PASS.
set -u
cd "$(dirname "$0")/../.." || exit 1
out="$(node --test --test-reporter=tap live/tests/room.test.js 2>&1)"
pass="$(printf '%s\n' "$out" | sed -n 's/^# pass \([0-9]*\)$/\1/p')"; fail="$(printf '%s\n' "$out" | sed -n 's/^# fail \([0-9]*\)$/\1/p')"
printf '%s\n' "$out" | grep -E '^(not ok|ok) ' | sed -e 's/^ok [0-9]* - /PASS /' -e 's/^not ok [0-9]* - /FAIL /'
if [ "${fail:-1}" != "0" ] || [ "${pass:-0}" -le 0 ]; then printf '%s\n' "$out" | tail -30; echo "${fail:-?} FAILED"; exit 1; fi
# The Khutwa page, in a real browser at phone size, with no room to reach.
k="$(python3 live/tests/khutwa_check.py 2>&1)"; printf '%s\n' "$k" | grep -E '^(PASS|FAIL) '
if printf '%s\n' "$k" | tail -1 | grep -q '^ALL PASS$'; then echo "ALL PASS"; else printf '%s\n' "$k" | tail -12; echo "1 FAILED"; exit 1; fi
