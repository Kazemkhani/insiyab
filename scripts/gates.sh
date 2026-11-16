#!/usr/bin/env bash
# One command for every gate. Nothing is deployed and nothing is shown unless the last line says ALL GATES PASS.
# The shape comes from the Marsad and Bayyina projects. Usage: bash scripts/gates.sh     (BROWSER=1 adds the browser walks)
set -u
cd "$(dirname "$0")/.." || exit 1
FAIL=0
BEFORE="$(git status --porcelain --untracked-files=no)"
echo "gates on $(git rev-parse --short HEAD 2>/dev/null || echo 'no commit yet') ($(git rev-parse --abbrev-ref HEAD 2>/dev/null))"

run() {   # run "name" command...   The command must print ALL PASS as its last line.
  local name="$1"; shift
  local out; out="$("$@" 2>&1)"
  if printf '%s\n' "$out" | tail -1 | grep -q "^ALL PASS$"; then echo "PASS $name ($(printf '%s\n' "$out" | grep -c '^PASS ') checks)"
  else echo "FAIL $name"; printf '%s\n' "$out" | grep -v '^PASS ' | tail -15; FAIL=1; fi
}

run "the guard catches planted raw data"            python3 tools/guard.py --selftest
run "no raw data and no identifier in the repository" python3 tools/guard.py --all
run "the stand-in bundle equals a fresh build"      python3 tools/make_fixture.py --check
run "the stand-in bundle meets the contract"        python3 tools/contract_check.py fixtures
run "the hand-off zips carry the current prompts"    bash tools/make_handoff.sh --check
# Invented raw tables carry the real column names, so the guard lets them through only here, and only if they are provably invented.
if [ -d fixtures/raw ]; then
  if [ -f tools/make_standin_raw.py ]; then run "the stand-in raw tables equal a fresh build (so they are invented, not real)" python3 tools/make_standin_raw.py --check
  else echo "FAIL fixtures/raw/ exists but tools/make_standin_raw.py does not: nothing proves these tables are invented"; FAIL=1; fi
fi
if [ -f artifacts/meta.json ]; then run "the real bundle meets the contract" python3 tools/contract_check.py artifacts; else echo "NOTE artifacts/ is empty: no real result exists yet"; fi

# Each lane adds its own suite here as one line, when the suite exists. A missing file is a failure, not a skip.
SUITES=(
)
for s in ${SUITES[@]+"${SUITES[@]}"}; do
  if [ ! -f "$s" ]; then echo "FAIL $s (missing)"; FAIL=1; continue; fi
  case "$s" in *.py) run "$s" python3 "$s" ;; *.sh) run "$s" bash "$s" ;; *) run "$s" node "$s" ;; esac
done

AFTER="$(git status --porcelain --untracked-files=no)"
[ "$BEFORE" = "$AFTER" ] && echo "PASS the gates changed no tracked file" || { echo "FAIL the gates changed tracked files"; FAIL=1; }
[ "$FAIL" = "0" ] && echo "ALL GATES PASS" || { echo "GATES FAILED"; exit 1; }
