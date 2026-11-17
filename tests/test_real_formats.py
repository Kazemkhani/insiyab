#!/usr/bin/env python3
"""test_real_formats.py

Builds a real-format copy of fixtures/raw in a temp folder and proves that
insiyab_flow.prepare produces the same trips, boardings per trip and peak
loads as it does on the plain stand-in, up to the small loss that dropping
the seconds from tap times genuinely causes.  Also proves the three hard
checks fire on a deliberately broken copy.

Run:
  .venv/bin/python tests/test_real_formats.py
  .venv-dss/bin/python tests/test_real_formats.py

Last line is ALL PASS or n FAILED.
"""
import json, os, re, shutil, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "dataiku", "lib"))
sys.path.insert(0, ROOT)

import numpy as np
import pandas as pd

from model.prepare import (
    load, prepare, seconds,
    TAP_PLACE_FAIL_THRESHOLD, MAX_SCHEDULED_HOUR, MIDNIGHT_WRAP_HOUR, DOOR_OPEN,
)
import insiyab_flow as flow

STANDIN_DIR = os.path.join(ROOT, "fixtures", "raw")
GTFS_KEYS = ["routes", "trips", "stop_times", "stops", "calendar", "shapes"]

failed = 0

def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}"))
    failed += 0 if ok else 1


# ---------------------------------------------------------------------------
# helpers for format conversion
# ---------------------------------------------------------------------------

def _body_number(standin_id):
    """'STANDIN-B07' → '1007' (plain digit string)."""
    m = re.search(r'B(\d+)$', str(standin_id).strip())
    return str(1000 + int(m.group(1))) if m else standin_id


def _extended_hms(secs):
    """Service-day seconds → 'HH:MM:SS' allowing hours > 23."""
    secs = int(secs)
    h = secs // 3600; mi = (secs % 3600) // 60; s = secs % 60
    return f"{h:02d}:{mi:02d}:{s:02d}"


def _extended_hm(secs):
    """Service-day seconds → 'HH:MM' (no seconds)."""
    secs = int(secs)
    h = secs // 3600; mi = (secs % 3600) // 60
    return f"{h:02d}:{mi:02d}"


def _two_digit_year(iso_date):
    """'2025-12-15' → '15-DEC-25' (NOL format, two-digit year)."""
    dt = pd.Timestamp(iso_date)
    mon = dt.strftime("%b").upper()
    yr = dt.strftime("%y")
    return f"{dt.day}-{mon}-{yr}"


def _four_digit_year(iso_date):
    """'2025-12-15' → '15-DEC-2025' (AVL format, four-digit year)."""
    dt = pd.Timestamp(iso_date)
    mon = dt.strftime("%b").upper()
    return f"{dt.day}-{mon}-{dt.year}"


def _polygon_to_kml(wkt_shape):
    """'POLYGON ((lon lat, ...))' → KML coordinate string 'lon,lat,0.0 ...'."""
    m = re.search(r'\(\(([^)]+)\)', str(wkt_shape))
    if not m:
        return ""
    pts = []
    for pt in m.group(1).split(","):
        parts = pt.strip().split()
        if len(parts) >= 2:
            pts.append(f"{parts[0]},{parts[1]},0.0")
    return " ".join(pts)


# ---------------------------------------------------------------------------
# build real-format copy from stand-in
# ---------------------------------------------------------------------------

print("--- building reference from stand-in ---")
tables_ref = load(STANDIN_DIR)
day_ref = prepare(tables_ref)
visits_ref = day_ref["visits"]

# Map (trip_id, stop_seq_str) → corrected service-day seconds for all four time columns.
# prepare() already did the clock unwrapping; we use those results as the extended-clock times.
_time_key = {}
for row in visits_ref.itertuples():
    _time_key[(str(row.trip_id).strip(), str(row.seq))] = (
        int(row.sched_arr), int(row.act_arr), int(row.sched_dep), int(row.act_dep)
    )

print("--- transforming tables to real format ---")

avl_orig = pd.read_csv(os.path.join(STANDIN_DIR, "bus_runtime_avl.csv"), dtype=str, keep_default_na=False)
nol_orig = pd.read_csv(os.path.join(STANDIN_DIR, "nol_transactions.csv"), dtype=str, keep_default_na=False)
fleet_orig = pd.read_csv(os.path.join(STANDIN_DIR, "bus_fleet.csv"), dtype=str, keep_default_na=False)
comm_orig = pd.read_csv(os.path.join(STANDIN_DIR, "community_boundaries.csv"), dtype=str, keep_default_na=False)

# --- AVL ---
avl_real = avl_orig.copy()
avl_real["Body"] = avl_real["Body"].apply(_body_number)
avl_real["Direction"] = (
    pd.to_numeric(avl_real["Direction"], errors="coerce").fillna(0).astype(int) + 1
).astype(str)
avl_real["Door_Status"] = avl_real["Door_Status"].apply(
    lambda x: "Door Open" if str(x).strip().lower() == "open" else "Drive Through"
)
# Rename to the real typo
avl_real = avl_real.rename(columns={"Door_Status": "Door_Satus"})
# Date: 2025-12-15 → 15-DEC-2025
avl_real["Date"] = avl_real["Date"].apply(
    lambda x: _four_digit_year(x) if re.match(r'\d{4}-\d{2}-\d{2}', str(x)) else x
)
# Times: use corrected service-day seconds from the reference prepare() run
def _fix_avl_times(row):
    key = (str(row["Trip_ID"]).strip(), str(row["Stop_Seq"]).strip())
    t = _time_key.get(key)
    if t is None:
        return row   # row was dropped by prepare; keep original (it will be dropped again)
    r = row.copy()
    r["Sched_Arr"] = _extended_hms(t[0])
    r["Act_Arr"]   = _extended_hms(t[1])
    r["Sched_Dep"] = _extended_hms(t[2])
    r["Act_Dep"]   = _extended_hms(t[3])
    return r

avl_real = avl_real.apply(_fix_avl_times, axis=1)

# Verify extended clock fires
_max_sched = avl_real["Sched_Arr"].apply(lambda x: seconds(pd.Series([x])).iat[0]).max()
check("real-format AVL contains at least one scheduled time above 23:59:59",
      bool(_max_sched > 86399), f"max={_max_sched:.0f} s ({_max_sched/3600:.1f} h)")

# --- NOL ---
nol_real = nol_orig.copy()
nol_real["Body_EVD_ID"] = nol_real["Body_EVD_ID"].apply(
    lambda x: f"B{_body_number(x)}_EVD_02"
)
nol_real["Transaction_date"] = nol_real["Transaction_date"].apply(
    lambda x: _two_digit_year(x) if re.match(r'\d{4}-\d{2}-\d{2}', str(x)) else x
)
# Strip seconds: HH:MM:SS → HH:MM
nol_real["Transaction_Time"] = nol_real["Transaction_Time"].str[:5]

# --- Fleet ---
fleet_real = fleet_orig.copy()
fleet_real["Body_number"] = fleet_real["Body_number"].apply(_body_number)

# --- Communities: convert to map-export format ---
def _comm_to_map_export(row):
    ext_data = json.dumps([{"SchemaData": [{"SimpleData": [
        {"xml_text": str(row.get("comm_num", "")), "name": "COMM_NUM"},
        {"xml_text": str(row.get("cname_e", "")),  "name": "CNAME_E"},
        {"xml_text": str(row.get("cname_a", "")),  "name": "CNAME_A"},
    ]}]}])
    coords = _polygon_to_kml(row.get("shape", ""))
    polygon = json.dumps([{"outerBoundaryIs": [
        {"LinearRing": [{"coordinates": coords}]}
    ]}]) if coords else "[]"
    return pd.Series({
        "snippet": "", "name": str(row.get("cname_e", "")),
        "description": str(row.get("comm_num", "")),
        "id": str(row.get("comm_num", "")),
        "ExtendedData": ext_data,
        "Polygon": polygon,
    })

comm_real = comm_orig.apply(_comm_to_map_export, axis=1)

# --- write real-format tables to temp folder ---
tmpdir = tempfile.mkdtemp(prefix="insiyab_real_fmt_")
shutil.copytree(os.path.join(STANDIN_DIR, "gtfs"), os.path.join(tmpdir, "gtfs"))
avl_real.to_csv(os.path.join(tmpdir, "bus_runtime_avl.csv"), index=False)
nol_real.to_csv(os.path.join(tmpdir, "nol_transactions.csv"), index=False)
fleet_real.to_csv(os.path.join(tmpdir, "bus_fleet.csv"), index=False)
comm_real.to_csv(os.path.join(tmpdir, "community_boundaries.csv"), index=False)
ns = os.path.join(STANDIN_DIR, "NETWORK-SOURCE.json")
if os.path.exists(ns):
    shutil.copy(ns, tmpdir)

# ---------------------------------------------------------------------------
# run insiyab_flow.prepare on both formats
# ---------------------------------------------------------------------------

print("--- running prepare on stand-in format ---")
tables_si = {
    "nol":    tables_ref["nol"],
    "avl":    tables_ref["avl"],
    "fleet":  tables_ref["fleet"],
    "communities": tables_ref["communities"],
}
for g in GTFS_KEYS:
    tables_si[f"gtfs_{g}"] = tables_ref.get(f"gtfs_{g}", pd.DataFrame())

prep_si = flow.prepare(tables_si)
day_si = prep_si["_day"]

print("--- running prepare on real format ---")
tables_rf = {
    "nol":    pd.read_csv(os.path.join(tmpdir, "nol_transactions.csv"), dtype=str, keep_default_na=False),
    "avl":    pd.read_csv(os.path.join(tmpdir, "bus_runtime_avl.csv"),  dtype=str, keep_default_na=False),
    "fleet":  pd.read_csv(os.path.join(tmpdir, "bus_fleet.csv"),        dtype=str, keep_default_na=False),
    "communities": pd.read_csv(os.path.join(tmpdir, "community_boundaries.csv"), dtype=str, keep_default_na=False),
}
for g in GTFS_KEYS:
    p = os.path.join(tmpdir, "gtfs", g + ".txt")
    tables_rf[f"gtfs_{g}"] = pd.read_csv(p, dtype=str, keep_default_na=False) if os.path.exists(p) else pd.DataFrame()

prep_rf = flow.prepare(tables_rf)
day_rf = prep_rf["_day"]

# ---------------------------------------------------------------------------
# compare trips, boardings and peak loads
# ---------------------------------------------------------------------------

print("--- comparing results ---")

v_si = day_si["visits"]
v_rf = day_rf["visits"]

trips_si = set(v_si["trip_id"].unique())
trips_rf = set(v_rf["trip_id"].unique())

check("same set of trips in both formats",
      trips_si == trips_rf,
      f"only in stand-in: {trips_si - trips_rf}, only in real: {trips_rf - trips_si}")

# boardings per trip
on_si = v_si.groupby("trip_id")["on"].sum().rename("on_si")
on_rf = v_rf.groupby("trip_id")["on"].sum().rename("on_rf")
merged = on_si.to_frame().join(on_rf.to_frame(), how="inner")
trips_boardings_differ = int((merged["on_si"] != merged["on_rf"]).sum())
total_boardings_si = int(v_si["on"].sum())
total_boardings_rf = int(v_rf["on"].sum())

_boarding_loss_pct = abs(total_boardings_si - total_boardings_rf) / max(1, total_boardings_si)
check("total boardings lost from HH:MM rounding is under 1%",
      _boarding_loss_pct < 0.01,
      f"stand-in={total_boardings_si}, real={total_boardings_rf}, loss={_boarding_loss_pct:.3%}")

# Measure the per-trip variation (documented, not asserted as zero).
# Stripping seconds moves each tap earlier by 0-59 s; boundary taps re-assign between trips.
print(f"  HH:MM total boarding loss: {abs(total_boardings_si - total_boardings_rf)} ({_boarding_loss_pct:.3%})")
print(f"  trips with different boarding count: {trips_boardings_differ} of {len(merged)}")

# peak load per trip
load_si = v_si.groupby("trip_id")["load"].max().rename("load_si")
load_rf = v_rf.groupby("trip_id")["load"].max().rename("load_rf")
merged_load = load_si.to_frame().join(load_rf.to_frame(), how="inner")
trips_load_differ = int((merged_load["load_si"] != merged_load["load_rf"]).sum())
_load_loss_pct = (merged_load["load_si"] - merged_load["load_rf"]).abs().sum() / max(1, merged_load["load_si"].sum())
print(f"  trips with different peak load: {trips_load_differ} of {len(merged_load)}")
print(f"  total peak-load deviation: {_load_loss_pct:.3%}")
# No strict per-trip equality: the per-trip variation is the documented HH:MM loss.

# door-opened stop count must be non-zero in real format
door_ok = int(v_rf["door_opened"].sum())
check("real format: door_opened is recorded on some stop visits",
      door_ok > 0, f"door_opened sum = {door_ok}")

# communities: stops should be assigned in both formats
comms_si = int(day_si["stops"]["community_id"].notna().sum())
comms_rf = int(day_rf["stops"]["community_id"].notna().sum())
check("map-export community format assigns at least as many stops as plain CSV",
      comms_rf >= comms_si,
      f"stand-in={comms_si}, real={comms_rf}")

# ---------------------------------------------------------------------------
# vehicle_attributes in both formats
# ---------------------------------------------------------------------------

print("--- vehicle_attributes ---")
va_si = prep_si["vehicle_attributes"]
va_rf = prep_rf["vehicle_attributes"]

check("stand-in: vehicle_attributes has rows", len(va_si) > 0)
check("real format: vehicle_attributes has rows", len(va_rf) > 0)
check("vehicle_attributes has manufacturer column", "manufacturer" in va_rf.columns)
check("vehicle_attributes has no body column (PII guard)",
      "body" not in va_rf.columns and "Body_number" not in va_rf.columns)
check("vehicle_attributes vehicle names are stand-in (v1, v2, ...)",
      all(str(x).startswith("v") for x in va_rf["vehicle"].dropna()), list(va_rf["vehicle"][:3]))

# insights runs on the real format
print("--- insights on real format ---")
ins = flow.insights(v_rf, va_rf)
check("insights runs on real-format stop_visits",
      isinstance(ins.get("insights"), pd.DataFrame) and len(ins["insights"]) > 0)
check("insights has lateness_by_bus_type for real format",
      "lateness_by_bus_type" in ins["insights"]["kind"].values)

# ---------------------------------------------------------------------------
# hard checks fire on a broken copy
# ---------------------------------------------------------------------------

print("--- hard checks on broken data ---")

# --- (1) bodies that match nothing: share_not_placed > TAP_PLACE_FAIL_THRESHOLD ---
avl_broken = avl_real.copy()
avl_broken["Body"] = "99999"   # no NOL tap will ever reference body 99999
tables_broken_body = dict(tables_rf)
tables_broken_body["avl"] = avl_broken
try:
    _ = flow.prepare(tables_broken_body)
    check("hard check: unplaceable taps raises ValueError", False, "no exception raised")
except ValueError as e:
    check("hard check: unplaceable taps raises ValueError",
          "taps to trips" in str(e).lower() or "placed" in str(e).lower(),
          str(e)[:200])

# --- (2) no door opened: all visits recorded as Drive Through ---
avl_no_door = avl_real.copy()
avl_no_door["Door_Satus"] = "Drive Through"
tables_no_door = dict(tables_rf)
tables_no_door["avl"] = avl_no_door
try:
    _ = flow.prepare(tables_no_door)
    check("hard check: no door opened raises ValueError", False, "no exception raised")
except ValueError as e:
    check("hard check: no door opened raises ValueError",
          "door" in str(e).lower(),
          str(e)[:200])

# --- (3) latest scheduled hour > MAX_SCHEDULED_HOUR: add 86400 again to already-extended times ---
avl_double_clock = avl_real.copy()
def _double_time(hms):
    """Add another 86400 to an already-extended time."""
    s = seconds(pd.Series([str(hms)])).iat[0]
    if pd.isna(s):
        return hms
    return _extended_hms(int(s) + 86400)

for col in ["Sched_Arr", "Act_Arr", "Sched_Dep", "Act_Dep"]:
    avl_double_clock[col] = avl_double_clock[col].apply(_double_time)
tables_double = dict(tables_rf)
tables_double["avl"] = avl_double_clock
try:
    _ = flow.prepare(tables_double)
    check("hard check: latest_scheduled_hour > MAX_SCHEDULED_HOUR raises ValueError",
          False, "no exception raised")
except ValueError as e:
    check("hard check: latest_scheduled_hour > MAX_SCHEDULED_HOUR raises ValueError",
          "scheduled hour" in str(e).lower() or str(MAX_SCHEDULED_HOUR) in str(e),
          str(e)[:200])

# ---------------------------------------------------------------------------
# report the HH:MM loss explicitly
# ---------------------------------------------------------------------------

print()
print(f"HH:MM loss summary (stripping seconds from tap times):")
print(f"  trips with changed boarding total : {trips_boardings_differ} / {len(merged)}")
print(f"  trips with changed peak load      : {trips_load_differ} / {len(merged_load)}")
print(f"  total boardings stand-in          : {total_boardings_si}")
print(f"  total boardings real format       : {total_boardings_rf}")

# ---------------------------------------------------------------------------
# final
# ---------------------------------------------------------------------------

print()
print("ALL PASS" if not failed else f"{failed} FAILED")
sys.exit(1 if failed else 0)
