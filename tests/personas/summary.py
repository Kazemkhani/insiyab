"""Reads one run's JSON files and prints every failure grouped by severity, then one summary line.
Usage: python3 tests/personas/summary.py tests/personas/out/<stamp>
"""
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
rows, deploys, blocked = [], set(), []
for f in sorted(out.glob("*.json")):
    d = json.loads(f.read_text())
    rows += d["results"]
    deploys.add(d["deploy"].get("commit", "?"))
    blocked += d["blocked_requests"]
fails = [r for r in rows if not r["pass"]]
for sev in ("blocker", "fix", "polish"):
    group = [r for r in fails if r["severity"] == sev]
    if group:
        print(f"\n{sev.upper()} ({len(group)})")
    for r in group:
        print(f"  [{r['persona']}] {r['page']}: {r['check']} -> {r['owner']}" + (f"  ({r['screenshot']})" if r["screenshot"] else ""))
count = {s: sum(r["severity"] == s for r in fails) for s in ("blocker", "fix", "polish")}
voice = [b for b in blocked if "/voice/" in b]
print(f"\nPERSONAS: {len(rows) - len(fails)} PASS, {len(fails)} FAIL ({count['blocker']} blocker, {count['fix']} fix, {count['polish']} polish); "
      f"deploy {','.join(sorted(deploys))}; {len(voice)} voice requests attempted, all aborted")
sys.exit(1 if fails else 0)
