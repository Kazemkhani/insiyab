"""test_dataiku_flow.py — proves the Dataiku Flow stages work on fixture data.

Run:
  .venv/bin/python tests/test_dataiku_flow.py
  (or .venv-dss/bin/python tests/test_dataiku_flow.py for the DSS-compatible env)

Last line is ALL PASS or n FAILED.

The stub dataiku module lives inside this file so it does not pollute the
project library.  It serves fixture CSVs as all-string DataFrames under the
real DATA.* dataset names and mocks Folder with a temporary directory.
"""
import io, json, os, pickle, sys, tempfile
import types

# ---------------------------------------------------------------------------
# locate the repo root and add dataiku/lib to sys.path
# ---------------------------------------------------------------------------

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "dataiku", "lib"))
sys.path.insert(0, ROOT)   # for the model package

# ---------------------------------------------------------------------------
# stub dataiku module (must be in sys.modules before insiyab_flow imports it)
# ---------------------------------------------------------------------------

import pandas as pd
import numpy as np

_FIXTURE_RAW = os.path.join(ROOT, "fixtures", "raw")

# Map DATA.* dataset names to fixture file paths
_DS_MAP = {
    "DATA.nol_card_details_15-Dec-2025":    os.path.join(_FIXTURE_RAW, "nol_transactions.csv"),
    "DATA.Running_time_15-Dec-2025":        os.path.join(_FIXTURE_RAW, "bus_runtime_avl.csv"),
    "DATA.Fleet_List":                       os.path.join(_FIXTURE_RAW, "bus_fleet.csv"),
    "DATA.community_2026-10-20_09-28-00":   os.path.join(_FIXTURE_RAW, "community_boundaries.csv"),
    "DATA.stops":       os.path.join(_FIXTURE_RAW, "gtfs", "stops.txt"),
    "DATA.trips":       os.path.join(_FIXTURE_RAW, "gtfs", "trips.txt"),
    "DATA.routes":      os.path.join(_FIXTURE_RAW, "gtfs", "routes.txt"),
    "DATA.stop_times":  os.path.join(_FIXTURE_RAW, "gtfs", "stop_times.txt"),
    "DATA.shapes":      os.path.join(_FIXTURE_RAW, "gtfs", "shapes.txt"),
    "DATA.calendar":    os.path.join(_FIXTURE_RAW, "gtfs", "calendar.txt"),
}

_STATE_DIR = tempfile.mkdtemp(prefix="insiyab_dss_state_")
_BUNDLE_DIR = tempfile.mkdtemp(prefix="insiyab_dss_bundle_")
_WRITTEN = {}   # dataset name -> last DataFrame written


class _StubDataset:
    def __init__(self, name):
        self.name = name

    def get_dataframe(self, infer_with_pandas=True):
        path = _DS_MAP.get(self.name)
        if path and os.path.exists(path):
            return pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8")
        # Return empty DataFrame for unknown datasets
        return pd.DataFrame()

    def write_with_schema(self, df):
        _WRITTEN[self.name] = df


class _StubFolder:
    def __init__(self, name):
        self.name = name
        self._dir = _STATE_DIR if name in ("state",) else _BUNDLE_DIR

    def upload_stream(self, path, stream):
        full = os.path.join(self._dir, os.path.basename(path))
        with open(full, "wb") as f:
            if hasattr(stream, "read"):
                f.write(stream.read())
            else:
                f.write(stream)

    def get_download_stream(self, path):
        full = os.path.join(self._dir, os.path.basename(path))
        return open(full, "rb")

    def list_paths_in_partition(self):
        try:
            return os.listdir(self._dir)
        except Exception:
            return []


_dataiku_stub = types.ModuleType("dataiku")
_dataiku_stub.Dataset = _StubDataset
_dataiku_stub.Folder = _StubFolder
sys.modules["dataiku"] = _dataiku_stub

# Now safe to import the flow module
import insiyab_flow as flow

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

PASSED = []
FAILED = []


def check(name, ok, detail=""):
    if ok:
        PASSED.append(name)
        print(f"PASS {name}")
    else:
        FAILED.append(name)
        print(f"FAIL {name}" + (f": {detail}" if detail else ""))


# PII column names (must never appear in any output DataFrame)
_PII = {"NOL_ID", "nol_id", "device_id", "device_id_hex", "Driver_id", "driver_id",
        "Body", "body", "Body_number", "body_number"}


def _has_pii(df):
    return _PII & set(df.columns)


# ---------------------------------------------------------------------------
# build the tables dict the same way the recipe does
# ---------------------------------------------------------------------------

GTFS_KEYS = ["routes", "trips", "stop_times", "stops", "calendar", "shapes"]

tables = {
    "nol":         _StubDataset("DATA.nol_card_details_15-Dec-2025").get_dataframe(False),
    "avl":         _StubDataset("DATA.Running_time_15-Dec-2025").get_dataframe(False),
    "fleet":       _StubDataset("DATA.Fleet_List").get_dataframe(False),
    "communities": _StubDataset("DATA.community_2026-10-20_09-28-00").get_dataframe(False),
}
for g in GTFS_KEYS:
    tables[f"gtfs_{g}"] = _StubDataset(f"DATA.{g}").get_dataframe(False)

# ---------------------------------------------------------------------------
# stage 1: prepare
# ---------------------------------------------------------------------------

print("\n--- stage 1: prepare ---")
prep = flow.prepare(tables)

check("prepare returns stop_visits", isinstance(prep.get("stop_visits"), pd.DataFrame) and len(prep["stop_visits"]) > 0)
check("prepare returns boardings_quarter", isinstance(prep.get("boardings_quarter"), pd.DataFrame) and len(prep["boardings_quarter"]) > 0)
check("prepare returns prepare_log", isinstance(prep.get("prepare_log"), pd.DataFrame) and len(prep["prepare_log"]) > 0)
check("prepare returns vehicle_attributes", isinstance(prep.get("vehicle_attributes"), pd.DataFrame))
check("prepare returns _day", isinstance(prep.get("_day"), dict) and "visits" in prep["_day"])

sv = prep["stop_visits"]
check("stop_visits has load column", "load" in sv.columns)
check("stop_visits has vehicle column (stand-in)", "vehicle" in sv.columns)
check("stop_visits no PII columns", not _has_pii(sv), str(_has_pii(sv)))
check("boardings_quarter no PII columns", not _has_pii(prep["boardings_quarter"]),
      str(_has_pii(prep["boardings_quarter"])))
check("vehicle_attributes no PII columns", not _has_pii(prep["vehicle_attributes"]),
      str(_has_pii(prep["vehicle_attributes"])))

# Pickle the day dict (mimics what the recipe does)
_state_folder = _StubFolder("state")
_state_folder.upload_stream("day.pkl", io.BytesIO(flow.dump(prep["_day"])))

# ---------------------------------------------------------------------------
# stage 2: insights
# ---------------------------------------------------------------------------

print("\n--- stage 2: insights ---")
ins = flow.insights(sv, prep.get("vehicle_attributes"))

check("insights returns insights DataFrame", isinstance(ins.get("insights"), pd.DataFrame) and len(ins["insights"]) > 0)
ins_df = ins["insights"]
check("insights has required columns", {"kind", "group", "value", "n", "fact", "how"}.issubset(set(ins_df.columns)))
check("insights no PII columns", not _has_pii(ins_df), str(_has_pii(ins_df)))
check("insights has lateness_by_bus_type rows",
      "lateness_by_bus_type" in ins_df["kind"].values)
check("insights has empty_stop_visits row",
      "empty_stop_visits" in ins_df["kind"].values)
check("insights has busiest_stop_quarter rows",
      "busiest_stop_quarter" in ins_df["kind"].values)
# new trip-level table
trt = ins.get("trip_running_time")
check("insights returns trip_running_time DataFrame",
      isinstance(trt, pd.DataFrame) and len(trt) > 0)
check("trip_running_time has required columns",
      {"trip_id", "route_id", "band", "sched_run_min", "act_run_min",
       "start_late_min", "end_late_min", "seat_use_pct"}.issubset(set(trt.columns)))
check("trip_running_time no PII columns", not _has_pii(trt), str(_has_pii(trt)))
check("insights has running_time_long_share rows",
      "running_time_long_share" in ins_df["kind"].values)
check("insights has knockon_late_starts row",
      "knockon_late_starts" in ins_df["kind"].values)
check("insights has seat_use_by_bus_type rows",
      "seat_use_by_bus_type" in ins_df["kind"].values)

# ---------------------------------------------------------------------------
# stage 3: forecast (the heavy stage)
# ---------------------------------------------------------------------------

print("\n--- stage 3: forecast ---")
day = prep["_day"]
fc = flow.forecast(day, fixture=True)

check("forecast returns forecast_boardings", isinstance(fc.get("forecast_boardings"), pd.DataFrame) and len(fc["forecast_boardings"]) > 0)
check("forecast returns model_metrics", isinstance(fc.get("model_metrics"), pd.DataFrame) and len(fc["model_metrics"]) > 0)
check("forecast returns _bundle", isinstance(fc.get("_bundle"), dict))
check("forecast_boardings no PII", not _has_pii(fc["forecast_boardings"]))
check("model_metrics no PII", not _has_pii(fc["model_metrics"]))

bundle = fc["_bundle"]
_state_folder.upload_stream("bundle.pkl", io.BytesIO(flow.dump(bundle)))

# ---------------------------------------------------------------------------
# stage 4: gap
# ---------------------------------------------------------------------------

print("\n--- stage 4: gap ---")
gp = flow.gap(bundle)

check("gap returns seat_gap", isinstance(gp.get("seat_gap"), pd.DataFrame) and len(gp["seat_gap"]) > 0)
sg = gp["seat_gap"]
check("seat_gap has over and spare columns", {"over", "spare", "index"}.issubset(set(sg.columns)))
check("seat_gap no PII", not _has_pii(sg))

# ---------------------------------------------------------------------------
# stage 5: decisions
# ---------------------------------------------------------------------------

print("\n--- stage 5: decisions ---")
dec = flow.decisions(bundle)

check("decisions returns decisions_table", isinstance(dec.get("decisions_table"), pd.DataFrame))
check("decisions returns vehicle_swaps", isinstance(dec.get("vehicle_swaps"), pd.DataFrame))
check("decisions returns passenger_offers", isinstance(dec.get("passenger_offers"), pd.DataFrame))
check("decisions_table no PII", not _has_pii(dec["decisions_table"]))
check("vehicle_swaps no PII", not _has_pii(dec["vehicle_swaps"]))
check("passenger_offers no PII", not _has_pii(dec["passenger_offers"]))

# vehicle_swaps must not contain body numbers (stand-in names only)
if len(dec["vehicle_swaps"]):
    for col in ["from_vehicle", "to_vehicle"]:
        if col in dec["vehicle_swaps"].columns:
            bad = dec["vehicle_swaps"][col].str.startswith("STANDIN").any()
            check(f"vehicle_swaps {col} uses stand-in names, not body numbers", not bad,
                  f"found STANDIN prefix in {col}")

# ---------------------------------------------------------------------------
# stage 6: publish
# ---------------------------------------------------------------------------

print("\n--- stage 6: publish ---")
pub_dir = tempfile.mkdtemp(prefix="insiyab_dss_pub_")


def _write_file(name, text):
    path = os.path.join(pub_dir, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


flow.publish(bundle, _write_file)

check("publish wrote meta.json", os.path.exists(os.path.join(pub_dir, "meta.json")))
check("publish wrote forecast/boardings-route.json",
      os.path.exists(os.path.join(pub_dir, "forecast", "boardings-route.json")))
check("publish wrote decisions.json",
      os.path.exists(os.path.join(pub_dir, "decisions.json")))

# ---------------------------------------------------------------------------
# contract check
# ---------------------------------------------------------------------------

print("\n--- contract check ---")
import subprocess
result = subprocess.run(
    [sys.executable, os.path.join(ROOT, "tools", "contract_check.py"), pub_dir],
    capture_output=True, text=True,
)
check("contract check passes", result.returncode == 0,
      result.stdout.strip().split("\n")[-1] if result.stdout else result.stderr[:200])

# ---------------------------------------------------------------------------
# compare with direct engine output
# ---------------------------------------------------------------------------

print("\n--- bundle equality vs direct engine ---")
from model.run import build as _engine_build, _text as _engine_text

engine_bundle = _engine_build(day, fixture=True)

DIFFER_ALLOWED = {"generated_at", "commit", "boosted_trees"}

mismatches = []
for fname in engine_bundle:
    if fname not in bundle:
        mismatches.append(f"missing in flow bundle: {fname}")
        continue
    eng_text = _engine_text(fname, engine_bundle[fname])
    flow_text = _engine_text(fname, bundle[fname])
    if eng_text != flow_text:
        # Check if only allowed fields differ
        try:
            eng_j = json.loads(eng_text)
            flow_j = json.loads(flow_text)
            if eng_j == flow_j:
                continue
            # Find differing keys at top level
            diff_keys = {k for k in set(list(eng_j.keys()) + list(flow_j.keys()))
                         if eng_j.get(k) != flow_j.get(k)}
            if diff_keys - DIFFER_ALLOWED:
                mismatches.append(f"{fname}: differs on {diff_keys - DIFFER_ALLOWED}")
        except Exception:
            mismatches.append(f"{fname}: text differs (not JSON-comparable)")

check("flow bundle equals direct engine bundle (except allowed fields)",
      not mismatches, "; ".join(mismatches[:3]))

# ---------------------------------------------------------------------------
# recipe file line counts
# ---------------------------------------------------------------------------

print("\n--- recipe line counts ---")
recipes_dir = os.path.join(ROOT, "dataiku", "recipes")
for fname in sorted(os.listdir(recipes_dir)):
    if fname.endswith(".py"):
        lines = open(os.path.join(recipes_dir, fname)).read().splitlines()
        # Count non-empty lines
        n = sum(1 for l in lines if l.strip())
        check(f"recipe {fname} is under 40 lines (has {n})", n <= 40,
              f"{n} non-empty lines")

# ---------------------------------------------------------------------------
# final summary
# ---------------------------------------------------------------------------

print()
n_fail = len(FAILED)
if n_fail == 0:
    print("ALL PASS")
else:
    print(f"{n_fail} FAILED")
    for f in FAILED:
        print(f"  FAIL {f}")
sys.exit(0 if n_fail == 0 else 1)
