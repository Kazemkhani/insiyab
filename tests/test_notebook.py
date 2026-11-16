#!/usr/bin/env python3
"""The one-file engine for a Dataiku notebook is the same engine: run on the invented tables it writes the same bundle, byte for byte,
and what it prints holds none of the identifiers in the tables.   python3 tests/test_notebook.py     the last line is ALL PASS"""
import os, subprocess, sys, tempfile
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."); sys.path.insert(0, ROOT); os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, "tools")); import make_notebook
failed = 0
def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:400]}")); failed += 0 if ok else 1

with tempfile.TemporaryDirectory() as tmp:
    one = os.path.join(tmp, "insiyab_dataiku.py"); open(one, "w", encoding="utf-8").write(make_notebook.build()); out = os.path.join(tmp, "bundle")
    # run from an empty folder, so the file cannot quietly import the package beside it
    r = subprocess.run([sys.executable, one], cwd=tmp, capture_output=True, text=True, env={**os.environ, "INSIYAB_LOCAL_DATA": os.path.join(ROOT, "fixtures", "raw"), "INSIYAB_OUT": out, "PYTHONPATH": ""})
    check("the one file runs by itself, from a folder with no package beside it", r.returncode == 0, r.stderr[-600:])
    names = sorted(os.path.relpath(os.path.join(d, f), out) for d, _, fs in os.walk(out) for f in fs) if os.path.isdir(out) else []
    want = sorted(os.path.relpath(os.path.join(d, f), "fixtures") for d, _, fs in os.walk("fixtures") for f in fs if f.endswith(".json") and os.sep + "raw" not in d and not d.endswith("raw"))
    check("it writes the same files as the engine", names == want, (len(names), len(want)))
    # the stand-in bundle was written with no time and no commit; so is this one, which makes the two comparable byte for byte
    differ = [n for n in names if open(os.path.join(out, n), encoding="utf-8").read() != open(os.path.join("fixtures", n), encoding="utf-8").read()]
    check("every file equals the stand-in bundle, byte for byte: it is the same engine, not a copy of it", bool(names) and not differ, differ[:5])
    check("it prints each stage's counts, the tables and the model card", all(x in r.stdout for x in ("STAGE taps:", "# Model card", "## What is forecast", "Lateness at a stop ahead")), r.stdout[:300])
    import pandas as pd
    nol = pd.read_csv("fixtures/raw/nol_transactions.csv", dtype=str, keep_default_na=False); avl = pd.read_csv("fixtures/raw/bus_runtime_avl.csv", dtype=str, keep_default_na=False)
    ids = set(nol["NOL_ID"]) | set(nol["device_id"]) | set(nol["device_id_hex"]) | set(nol["Body_EVD_ID"]) | set(avl["Driver_id"]) | set(avl["Body"])
    check(f"what it prints holds none of the {len(ids)} card, device, driver and vehicle numbers in the tables", not [i for i in ids if i and i in r.stdout])
    text = open(one, encoding="utf-8").read()
    check("it asks Dataiku for every column as text, and says to keep what it prints inside Dataiku", "infer_with_pandas=False" in text and "inside Dataiku" in text)
print("ALL PASS" if not failed else f"{failed} FAILED"); sys.exit(1 if failed else 0)
