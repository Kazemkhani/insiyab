#!/usr/bin/env bash
# Runs the five persona walks against the public address (read-only; every /voice/ and write request is aborted).
# Usage: bash tests/personas/run.sh            INSIYAB_BASE=<url> to test another address.
# Results and failure screenshots: tests/personas/out/<stamp>/ (ignored by git). Last line is the summary.
# This is not a release gate: it reports findings for docs/team/PERSONA-REPORT.md, and exits 1 if any check failed.
set -u
cd "$(dirname "$0")" || exit 1
export PERSONA_STAMP="${PERSONA_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "out/$PERSONA_STAMP"
PY=(python3); python3 -c "import playwright" 2>/dev/null || PY=(uv run -q --with playwright python)
pids=()
for p in p1_controller p2_executive p3_data_scientist p4_planner p5_accessibility; do
  "${PY[@]}" "$p.py" > "out/$PERSONA_STAMP/$p.log" 2>&1 & pids+=($!)
done
for pid in "${pids[@]}"; do wait "$pid"; done
grep -h "^PERSONA " out/"$PERSONA_STAMP"/*.log
python3 summary.py "out/$PERSONA_STAMP"
