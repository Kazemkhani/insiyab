#!/usr/bin/env bash
# The room relay's tests. No network, no store, no call. The last line is ALL PASS.
set -u
cd "$(dirname "$0")/../.." || exit 1
out="$(node --test live/tests/room.test.js 2>&1)"
pass="$(printf '%s\n' "$out" | sed -n 's/^# pass \([0-9]*\)$/\1/p')"; fail="$(printf '%s\n' "$out" | sed -n 's/^# fail \([0-9]*\)$/\1/p')"
printf '%s\n' "$out" | grep -E '^(not ok|ok) ' | sed -e 's/^ok [0-9]* - /PASS /' -e 's/^not ok [0-9]* - /FAIL /'
if [ "${fail:-1}" = "0" ] && [ "${pass:-0}" -gt 0 ]; then echo "ALL PASS"; else printf '%s\n' "$out" | tail -30; echo "${fail:-?} FAILED"; exit 1; fi
