#!/usr/bin/env python3
"""Refuses a commit that would put RTA's raw data, or anything about one card, device or driver, into git.
Run by scripts/gates.sh and as a pre-commit hook (scripts/install-hooks.sh). See docs/DATA.md, section 6.

  python3 tools/guard.py            check the files staged for commit
  python3 tools/guard.py --all      check every tracked file
  python3 tools/guard.py --selftest plant a bad file in a temporary folder and prove the guard catches it
"""
import os, re, subprocess, sys, tempfile

RAW_EXT = (".csv", ".tsv", ".xlsx", ".xls", ".parquet", ".kml", ".kmz", ".feather", ".sqlite", ".db", ".pkl", ".gz", ".ipynb")
# the twelve files of a transit feed: allowed only as invented tables or as public data with its source
FEED = {"agency.txt", "routes.txt", "trips.txt", "stop_times.txt", "stops.txt", "calendar.txt", "calendar_dates.txt", "frequencies.txt", "shapes.txt", "transfers.txt", "translations.txt", "feed_info.txt"}
STANDIN_MAX = 400_000          # an invented table is small. A real one is not.
# the provided tables' identifier columns: these words may appear in docs and code, never as a column of data
ID_HEADER = re.compile(r'(NOL_ID|device_id_hex|device_id|Driver_id|Body_EVD_ID)', re.I)
ALLOWED_DIRS = ("docs/", "tools/", "model/", "handoff/", "scripts/", "tests/", "coordination/", "README", "AGENTS", "CLAUDE")


def looks_like_rows(path, text):
    """A data file is one whose first line is a header naming an identifier column, or a JSON list of records carrying one."""
    first = text.splitlines()[0] if text else ""
    if ID_HEADER.search(first) and (first.count(",") >= 3 or first.count("\t") >= 3 or first.count(";") >= 3):
        return "its first line is a table header with an identifier column"
    if path.endswith(".json") and re.search(r'"(NOL_ID|device_id_hex|device_id|Driver_id|nol_id|driver_id|card_id)"\s*:', text):
        return "it is JSON carrying an identifier key"
    return None


def check(paths, read, size=lambda p: 0):
    bad = []
    for p in paths:
        low = p.lower()
        if os.path.basename(low) in FEED and not low.startswith(("fixtures/raw/", "opendata/public/")):
            bad.append((p, "it is a transit feed file outside fixtures/raw/ and opendata/public/")); continue
        if low.startswith("fixtures/raw/") and size(p) > STANDIN_MAX:
            bad.append((p, "it is too large to be an invented table")); continue
        if low.startswith("data/") or "/data/raw/" in low:
            bad.append((p, "it is under data/")); continue
        if low.endswith(RAW_EXT) and not low.startswith(("fixtures/", "opendata/public/")):
            bad.append((p, "it is a data file type outside fixtures/ and opendata/public/")); continue
        if p.startswith(ALLOWED_DIRS) and not p.endswith(".json"):
            continue
        if p.startswith("fixtures/raw/"):
            continue            # invented tables with the real column names. scripts/gates.sh proves they equal a fresh build of tools/make_standin_raw.py
        try:
            text = read(p)
        except Exception:
            continue
        why = looks_like_rows(p, text[:200000])
        if why:
            bad.append((p, why))
    return bad


def main():
    if "--selftest" in sys.argv:
        with tempfile.TemporaryDirectory() as d:
            files = {"web/leak.json": '[{"NOL_ID": "x", "amount": 3}]', "artifacts/taps.csv": "a,b\n1,2\n", "model/stop_times.txt": "trip_id,stop_id\n1,2\n", "model/census.ipynb": "{}",
                     "artifacts/x.txt": "Transaction_date,Transaction_Time,Body_EVD_ID,device_id,NOL_ID\n1,2,3,4,5\n", "artifacts/ok.json": '{"fixture": false, "n": 3}'}
            for n, t in files.items():
                os.makedirs(os.path.dirname(os.path.join(d, n)), exist_ok=True); open(os.path.join(d, n), "w").write(t)
            bad = {p for p, _ in check(list(files), lambda p: open(os.path.join(d, p)).read())}
        ok = bad == {"web/leak.json", "artifacts/taps.csv", "artifacts/x.txt", "model/stop_times.txt", "model/census.ipynb"}
        print(("PASS" if ok else "FAIL") + " the guard catches five planted leaks and lets a clean file through"); print("ALL PASS" if ok else "1 FAILED")
        return 0 if ok else 1
    cmd = ["git", "ls-files"] if "--all" in sys.argv else ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"]
    paths = [p for p in subprocess.run(cmd, capture_output=True, text=True).stdout.splitlines() if p]
    bad = check(paths, lambda p: open(p, encoding="utf-8", errors="ignore").read(), lambda p: os.path.getsize(p) if os.path.exists(p) else 0)
    for p, why in bad:
        print(f"FAIL {p}: {why}")
    print(f"PASS no raw data and no identifier in {len(paths)} files" if not bad else f"{len(bad)} FAILED: raw data must not enter git (docs/DATA.md, section 6)")
    if not bad:
        print("ALL PASS")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
