#!/usr/bin/env bash
# live/voice/tests/run.sh - run all voice relay tests
# Usage: bash live/voice/tests/run.sh
# Last line: ALL PASS or N FAILED

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local file="$2"
  echo ""
  echo "=== $name ==="
  if node "$file"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
}

run_test "Guard combinations (rehearsal mode)" "tests/voice-guards.test.js"
run_test "Full relay end to end"               "tests/voice-relay.test.js"
run_test "No-answer handling"                  "tests/voice-noanswer.test.js"
run_test "State sanitisation and folder scan"  "tests/voice-state.test.js"

run_test "Five-person relay and call ceiling" "tests/voice-five.test.js"

echo ""
echo "Tests run: $((PASS + FAIL))  Passed: $PASS  Failed: $FAIL"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS"
  exit 0
else
  echo "$FAIL FAILED"
  exit 1
fi
