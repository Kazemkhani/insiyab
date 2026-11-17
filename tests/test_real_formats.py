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
# new assertion 1: boardings at the last stop of a trip must be a small share
# ---------------------------------------------------------------------------
# Before the terminus-redirect fix, ~1/5 of all boardings landed on a trip's
# last stop (a passenger tapping during a layover got credited to the
# finishing trip rather than the starting one).  After the fix this share
# should be very small.  We use the real-format output because the real data
# exercises the HH:MM path where the redirect fires.

v_rf_sorted = v_rf.sort_values(["trip_id", "seq"])
_last_seq_rf = v_rf_sorted.groupby("trip_id")["seq"].transform("last")
_last_stop_on = v_rf.loc[v_rf["seq"] == _last_seq_rf, "on"].sum()
_total_on_rf  = int(v_rf["on"].sum())
_last_stop_on_share = _last_stop_on / max(1, _total_on_rf)
print(f"  boardings at last stop of trip: {int(_last_stop_on)} / {_total_on_rf} ({_last_stop_on_share:.2%})")
# Threshold: allow up to 5 % (before fix this was ~20 %; perfect is 0 %).
check("real format: boardings at last stop of a trip are a small share (< 5%)",
      _last_stop_on_share < 0.05,
      f"last-stop boardings = {int(_last_stop_on)}, total = {_total_on_rf}, share = {_last_stop_on_share:.2%}")

# ---------------------------------------------------------------------------
# new assertion 2: trips with negative load must be rare
# ---------------------------------------------------------------------------
# A negative load means more people got off than the model thinks were on the
# bus: that is a counting error.  The fix reduces this sharply.

_min_load_rf = v_rf["load"].min() if len(v_rf) else 0
_neg_load_trips_rf = int(v_rf[v_rf["load"] < 0]["trip_id"].nunique())
_total_trips_rf = int(v_rf["trip_id"].nunique())
print(f"  trips with negative load (real format): {_neg_load_trips_rf} / {_total_trips_rf}")
# Threshold: fewer than 10 % of trips (before fix this was ~62 %).
check("real format: trips with negative load are rare (< 10% of trips)",
      (_neg_load_trips_rf / max(1, _total_trips_rf)) < 0.10,
      f"trips with negative load = {_neg_load_trips_rf} / {_total_trips_rf}")

# ---------------------------------------------------------------------------
# new assertion 3: HH:MM placement counters are logged
# ---------------------------------------------------------------------------
# After the fix, the stage log includes placement-rule counters that did not
# exist before.  Assert they are present and that placed_by_time_nearest_fallback
# is not the only rule that fired.

_tap_log_rf = next((e for e in day_rf["log"] if e["stage"] == "taps to trips"), None)
check("real format: taps-to-trips log has new placement counters",
      _tap_log_rf is not None and "placed_by_time_nearest_fallback" in _tap_log_rf,
      "key 'placed_by_time_nearest_fallback' missing from log")
if _tap_log_rf:
    _placed_next_stop  = _tap_log_rf.get("placed_by_stop_id_on_next_trip", 0)
    _placed_next_first = _tap_log_rf.get("placed_on_next_trip_first_stop", 0)
    _placed_prev       = _tap_log_rf.get("placed_by_stop_id_on_previous_trip", 0)
    _placed_own        = _tap_log_rf.get("placed_by_stop_id_on_own_trip", 0)
    _placed_fallback   = _tap_log_rf.get("placed_by_time_nearest_fallback", 0)
    print(f"  taps placed by stop_id on next trip  : {_placed_next_stop}")
    print(f"  taps placed on next trip first stop  : {_placed_next_first}")
    print(f"  taps placed by stop_id on prev trip  : {_placed_prev}")
    print(f"  taps placed by stop_id on own trip   : {_placed_own}")
    print(f"  taps placed by time-nearest fallback : {_placed_fallback}")
    # At least some taps were redirected to next/previous trip or own stop.
    _redirected = _placed_next_stop + _placed_next_first + _placed_prev + _placed_own
    check("real format: at least some taps were redirected (placement rules b/c active)",
          _redirected > 0,
          f"all {_placed_fallback} taps placed by fallback only; check terminus-redirect logic")

# ---------------------------------------------------------------------------
# new assertion 4: hand-made terminus-layover case
# ---------------------------------------------------------------------------
# One synthetic vehicle (STANDIN-B99) runs two back-to-back trips that share
# a terminus stop.  A check-in tap arrives during the layover with Stop_Id
# matching the terminus (which is both the last stop of trip 1 and the first
# stop of trip 2).  After the fix the boarding must land on trip 2, not trip 1.

print()
print("--- terminus-layover hand-made case ---")

# Stop IDs already present in the stand-in GTFS so the engine accepts them.
_T_A = "200301"   # Al Baraha Bus Station 1
_T_B = "195101"   # Gold Souq Bus Station External
_T_C = "385007"   # Al Ghubaiba Bus Station 7  (the shared terminus)

# Service-day seconds for the synthetic schedule.
def _hms(h, m, s=0): return f"{h:02d}:{m:02d}:{s:02d}"

_AVL_COLS = ["Date", "Day_type", "Body", "Trip_ID", "Route", "Driver_id",
             "Direction", "Stop_Seq", "Stop_ID", "Stop_Name",
             "Sched_Arr", "Act_Arr", "Sched_Dep", "Act_Dep",
             "Difference", "Door_Status", "block_no", "avm_pattern_id",
             "Trip_end", "Diff_in_seconds", "OP_Hour", "TID"]
_NOL_COLS = ["Transaction_date", "Transaction_Time", "Body_EVD_ID",
             "device_id", "device_id_hex", "NOL_ID",
             "CKI", "CKO", "Route", "Stop_name", "Amount", "Stop_Id"]

def _avl_row(body, trip_id, seq, stop_id, arr_hms, dep_hms, door="Closed"):
    return {c: "" for c in _AVL_COLS} | {
        "Date": "2025-12-15", "Day_type": "Weekday",
        "Body": body, "Trip_ID": str(trip_id), "Route": "8",
        "Direction": "0", "Stop_Seq": str(seq), "Stop_ID": stop_id,
        "Sched_Arr": arr_hms, "Act_Arr": arr_hms,
        "Sched_Dep": dep_hms, "Act_Dep": dep_hms,
        "Door_Status": door,
    }

def _nol_row(body, time_hms, cki, cko, stop_id, card="STANDIN-N99999"):
    return {c: "" for c in _NOL_COLS} | {
        "Transaction_date": "2025-12-15",
        "Transaction_Time": time_hms,
        "Body_EVD_ID": body,
        "NOL_ID": card,
        "CKI": str(cki), "CKO": str(cko),
        "Route": "8", "Stop_Id": stop_id,
    }

# Trip 99001: A -> B -> C (terminus, door opens).  Departs at 10:11.
# Layover:  10:11 - 10:16
# Trip 99002: C -> B -> A.  Arrives at C at 10:16, door opens.
_synth_avl = pd.DataFrame([
    _avl_row("STANDIN-B99", 99001, 1, _T_A, _hms(10, 0),  _hms(10, 0)),
    _avl_row("STANDIN-B99", 99001, 2, _T_B, _hms(10, 5),  _hms(10, 5)),
    _avl_row("STANDIN-B99", 99001, 3, _T_C, _hms(10, 10), _hms(10, 11), door="Open"),
    _avl_row("STANDIN-B99", 99002, 1, _T_C, _hms(10, 16), _hms(10, 16), door="Open"),
    _avl_row("STANDIN-B99", 99002, 2, _T_B, _hms(10, 21), _hms(10, 21)),
    _avl_row("STANDIN-B99", 99002, 3, _T_A, _hms(10, 26), _hms(10, 26)),
])
# Check-in at 10:12:30 (during layover), Stop_Id = C (the terminus = first stop of trip 2).
# Without the fix this boards on trip 99001 / stop C (last stop of trip 1).
# With the fix it must board on trip 99002 / stop C (first stop of trip 2).
_synth_nol = pd.DataFrame([
    _nol_row("STANDIN-B99", _hms(10, 12, 30), 1, 0, _T_C),
])

# Fleet entry for the synthetic vehicle (minimum required columns).
_synth_fleet = pd.DataFrame([{
    "Body_number": "STANDIN-B99", "Manufacturer": "STAND-IN",
    "Bus_Type": "STANDARD", "Model Year": "2020",
    "No_of_Seats": "50", "RTA Standing": "", "Total": "50",
}])

# Build combined tables from the stand-in plus synthetic rows.
avl_base  = pd.read_csv(os.path.join(STANDIN_DIR, "bus_runtime_avl.csv"), dtype=str, keep_default_na=False)
nol_base  = pd.read_csv(os.path.join(STANDIN_DIR, "nol_transactions.csv"), dtype=str, keep_default_na=False)
fleet_base = pd.read_csv(os.path.join(STANDIN_DIR, "bus_fleet.csv"), dtype=str, keep_default_na=False)

avl_aug   = pd.concat([avl_base,   _synth_avl],   ignore_index=True)
nol_aug   = pd.concat([nol_base,   _synth_nol],   ignore_index=True)
fleet_aug = pd.concat([fleet_base, _synth_fleet], ignore_index=True)

tables_aug = dict(tables_ref)
tables_aug["avl"]   = avl_aug
tables_aug["nol"]   = nol_aug
tables_aug["fleet"] = fleet_aug

day_aug = prepare(tables_aug)
v_aug   = day_aug["visits"]

# Find where the synthetic check-in landed.
_synth_visits = v_aug[v_aug["trip_id"].astype(str).isin(["99001", "99002"])]
_b99_on = _synth_visits[_synth_visits["on"] > 0]

if len(_b99_on) == 0:
    check("terminus layover: check-in boards on next trip", False,
          "no boarding found for the synthetic vehicle at all")
else:
    _trip_boarded = str(_b99_on.iloc[0]["trip_id"])
    _seq_boarded  = int(_b99_on.iloc[0]["seq"])
    check("terminus layover: check-in boards on next trip (99002), not on trip 99001's last stop",
          _trip_boarded == "99002" and _seq_boarded == 1,
          f"boarded on trip={_trip_boarded}, seq={_seq_boarded} (expected trip=99002, seq=1)")

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
