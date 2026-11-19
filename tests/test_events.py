#!/usr/bin/env python3
"""Known-answer tests for model.events.
  python3 tests/test_events.py      the last line is ALL PASS

All season DataFrames are injected via _df_season; no file is read from disk.
"""
import io, os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import pandas as pd
from model.events import (plan_event, _buses_for_attendance,
                           SEATS_PER_BUS_DEFAULT, TARGET_LOAD_DEFAULT, MIN_FLOOR_DEFAULT)

failed = 0

def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}"))
    failed += 0 if ok else 1

def near(a, b, tol=1e-9):
    return a is not None and abs(a - b) < tol

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
check("SEATS_PER_BUS_DEFAULT is 60", SEATS_PER_BUS_DEFAULT == 60)
check("TARGET_LOAD_DEFAULT is 0.80", near(TARGET_LOAD_DEFAULT, 0.80))
check("MIN_FLOOR_DEFAULT is 1", MIN_FLOOR_DEFAULT == 1)

# ---------------------------------------------------------------------------
# _buses_for_attendance arithmetic
# ---------------------------------------------------------------------------
# ceiling(100 / (60 * 0.8)) = ceiling(100 / 48) = ceiling(2.083) = 3
check("_buses_for_attendance(100, 60, 0.8) = 3", _buses_for_attendance(100, 60, 0.8) == 3)
# ceiling(96 / 48) = 2
check("_buses_for_attendance(96, 60, 0.8) = 2", _buses_for_attendance(96, 60, 0.8) == 2)
# ceiling(97 / 48) = 3
check("_buses_for_attendance(97, 60, 0.8) = 3", _buses_for_attendance(97, 60, 0.8) == 3)
# Large event: ceiling(1000 / 48) = ceiling(20.833) = 21
check("_buses_for_attendance(1000, 60, 0.8) = 21", _buses_for_attendance(1000, 60, 0.8) == 21)

# ---------------------------------------------------------------------------
# Season fixture: flat data so seasonal_index = 1 for all routes
# ---------------------------------------------------------------------------
_SEASON_CSV = """\
year,month,route_name,passenger_trips,rows_in_source,source_rows_differ
2024,1,X,1000,1,0
2024,2,X,1000,1,0
2024,3,X,1000,1,0
2024,4,X,1000,1,0
2024,5,X,1000,1,0
2024,6,X,1000,1,0
2024,7,X,1000,1,0
2024,8,X,1000,1,0
2024,9,X,1000,1,0
2024,10,X,1000,1,0
2024,11,X,1000,1,0
2024,12,X,1000,1,0
2024,1,Y,1000,1,0
2024,2,Y,1000,1,0
2024,3,Y,1000,1,0
2024,4,Y,1000,1,0
2024,5,Y,1000,1,0
2024,6,Y,1000,1,0
2024,7,Y,1000,1,0
2024,8,Y,1000,1,0
2024,9,Y,1000,1,0
2024,10,Y,1000,1,0
2024,11,Y,1000,1,0
2024,12,Y,1000,1,0
"""
_SEASON_DF = pd.read_csv(io.StringIO(_SEASON_CSV),
                          dtype={"year": int, "month": int, "passenger_trips": float})

# ---------------------------------------------------------------------------
# Example event: concert at Expo City, 500 expected
# ---------------------------------------------------------------------------
EVENT = {
    "stop": "Expo City Bus Stop",
    "area": "Expo City Dubai",
    "start": 72000,    # 20:00
    "end":   86400,    # 24:00
    "expected_attendance": 500,
    "attendance_source": "organiser estimate, unverified",
    "attendance_low": 300,
    "attendance_high": 800,
}
# buses_needed_central = ceiling(500 / 48) = ceiling(10.42) = 11
# buses_needed_lo      = ceiling(300 / 48) = ceiling(6.25) = 7
# buses_needed_hi      = ceiling(800 / 48) = ceiling(16.67) = 17

# Two gap rows with different load factors (flat season -> load_factor_normalised = load_factor_raw)
# row_spare:  40 passengers, 100 seats -> raw 0.4 / 1.0 = 0.4; 10 trips; can donate 10-1=9
# row_busy:  80 passengers, 100 seats -> raw 0.8 / 1.0 = 0.8; 10 trips; can donate 10-1=9
ROW_SPARE = {"route_id": "X", "direction": 0, "hour_start": 72000, "trips": 10,
             "seats_offered": 100, "forecast_peak_load": 40, "over": 0, "spare": 60, "index": 0.1}
ROW_BUSY  = {"route_id": "Y", "direction": 0, "hour_start": 72000, "trips": 10,
             "seats_offered": 100, "forecast_peak_load": 80, "over": 0, "spare": 20, "index": 0.1}

result = plan_event(EVENT, [ROW_SPARE, ROW_BUSY], month=12, years=(2024,),
                    _df_season=_SEASON_DF)

# ---------------------------------------------------------------------------
# Output structure
# ---------------------------------------------------------------------------
check("plan_event returns a dict", isinstance(result, dict), result)
check("plan_event has event_summary", "event_summary" in result, result)
check("plan_event event_summary contains attendance_source",
      result["event_summary"].get("attendance_source") == EVENT["attendance_source"], result)
check("plan_event has buses_needed dict", isinstance(result.get("buses_needed"), dict), result)
check("plan_event has draws list", isinstance(result.get("draws"), list), result)
check("plan_event has total_buses_drawn", "total_buses_drawn" in result, result)
check("plan_event has buses_still_needed", "buses_still_needed" in result, result)
check("plan_event has note", "note" in result, result)
check("plan_event has seats_per_bus and target_load",
      result.get("seats_per_bus") == 60 and near(result.get("target_load"), 0.80), result)

# ---------------------------------------------------------------------------
# Bus count arithmetic
# ---------------------------------------------------------------------------
bn = result["buses_needed"]
check("buses_needed.central = 11", bn["central"] == 11, bn)
check("buses_needed.lo = 7", bn["lo"] == 7, bn)
check("buses_needed.high = 17", bn["high"] == 17, bn)
check("buses_needed.formula mentions attendance_source",
      EVENT["attendance_source"] in bn.get("formula", ""), bn)

# ---------------------------------------------------------------------------
# Draw order: spare-first
# ---------------------------------------------------------------------------
draws = result["draws"]
check("draws list is non-empty", len(draws) > 0, draws)
# The sparest row (X, lf=0.4) must be drawn first
check("draws are ordered spare-first: X (lf=0.4) before Y (lf=0.8)",
      draws[0]["route_id"] == "X", draws)
check("each draw has buses_drawn", all("buses_drawn" in d for d in draws), draws)
check("each draw has draw_reason mentioning attendance_source",
      all(EVENT["attendance_source"] in d.get("draw_reason", "") for d in draws), draws)
check("each draw has trips_remaining >= min_floor",
      all(d["trips_remaining"] >= MIN_FLOOR_DEFAULT for d in draws), draws)

# ---------------------------------------------------------------------------
# Floor: total drawn never exceeds supply limited by floor
# ---------------------------------------------------------------------------
# X: 10 trips - 1 floor = 9 available; Y: 10 trips - 1 floor = 9 available; total = 18.
# buses_needed_central = 11 so both rows must be drawn from.
total_draw = sum(d["buses_drawn"] for d in draws)
check("total_buses_drawn matches sum of draws", result["total_buses_drawn"] == total_draw, result)
check("buses_still_needed >= 0", result["buses_still_needed"] >= 0, result)
check("total_drawn + buses_still_needed = buses_needed_central",
      total_draw + result["buses_still_needed"] == bn["central"], result)

# ---------------------------------------------------------------------------
# Note repeats attendance source
# ---------------------------------------------------------------------------
check("note mentions attendance_source", EVENT["attendance_source"] in result.get("note", ""), result)

# ---------------------------------------------------------------------------
# Empty gap_rows: all buses still needed
# ---------------------------------------------------------------------------
result_empty = plan_event(EVENT, [], month=12, years=(2024,), _df_season=_SEASON_DF)
check("empty gap_rows: draws is empty", result_empty["draws"] == [], result_empty)
check("empty gap_rows: total_buses_drawn is 0", result_empty["total_buses_drawn"] == 0, result_empty)
check("empty gap_rows: buses_still_needed = central",
      result_empty["buses_still_needed"] == result_empty["buses_needed"]["central"], result_empty)

# ---------------------------------------------------------------------------
# Min floor: row with exactly min_floor trips cannot donate
# ---------------------------------------------------------------------------
row_at_floor = {"route_id": "X", "direction": 0, "hour_start": 72000, "trips": 1,
                "seats_offered": 100, "forecast_peak_load": 10, "over": 0, "spare": 90, "index": 0.1}
result_floor = plan_event(EVENT, [row_at_floor], month=12, years=(2024,), _df_season=_SEASON_DF)
check("row at exactly min_floor trips cannot donate: total_buses_drawn = 0",
      result_floor["total_buses_drawn"] == 0, result_floor)

# ---------------------------------------------------------------------------
# Custom seats_per_bus and target_load
# ---------------------------------------------------------------------------
result_custom = plan_event(EVENT, [], seats_per_bus=90, target_load=0.70,
                            month=12, years=(2024,), _df_season=_SEASON_DF)
# central: ceiling(500 / (90 * 0.70)) = ceiling(500/63) = ceiling(7.937) = 8
check("custom seats_per_bus=90 target_load=0.70 central = 8",
      result_custom["buses_needed"]["central"] == 8, result_custom)
check("custom seats_per_bus stored in output", result_custom.get("seats_per_bus") == 90, result_custom)

print("ALL PASS" if not failed else f"{failed} FAILED")
sys.exit(1 if failed else 0)
