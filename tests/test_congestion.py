#!/usr/bin/env python3
"""Known-answer tests for model.congestion and model.occ.
  python3 tests/test_congestion.py      the last line is ALL PASS

All DataFrames are injected via _df kwargs; no file is read from disk.
"""
import io, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import pandas as pd
from model.congestion import speed_index, network_speed_index, MALFORMED_BAND
from model.occ import (occ_standby, _hour_to_period, _congestion_weight, _lateness_weight,
                        CONTROLLERS_PER_SHIFT, BUSES_ON_NETWORK, BUSES_PER_CONTROLLER,
                        OCC_SOURCE, MAX_DELAY_S)

failed = 0

def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}"))
    failed += 0 if ok else 1

def near(a, b, tol=1e-4):
    return a is not None and abs(a - b) < tol

# ---------------------------------------------------------------------------
# Speed CSV fixture
# Route "X":  periods 06:00-07:00 (10 km/h), 08:00-09:00 (5 km/h), 12:00-13:00 (20 km/h).
#   mean = (10+5+20)/3 = 11.667
#   06:00-07:00 index = 10 / 11.667 = 0.857
#   08:00-09:00 index = 5  / 11.667 = 0.429  <- congested
#   12:00-13:00 index = 20 / 11.667 = 1.714  <- fast
# Route "Y":  one period only (08:00-09:00, 15 km/h). Single-period mean = 15.
#   08:00-09:00 index = 15/15 = 1.0
# MALFORMED_BAND rows should be excluded on load.
# ---------------------------------------------------------------------------
_CSV_LINES = """\
route_name,time_period,avg_speed_kmh,n_readings
X,06:00 - 07:00,10.0,100
X,08:00 - 09:00,5.0,200
X,12:00 - 13:00,20.0,50
Y,08:00 - 09:00,15.0,80
X,:00 - 15:00,99.0,10
"""
# Note: the malformed band row for X is included in the CSV but should be ignored.
TEST_DF = pd.read_csv(io.StringIO(_CSV_LINES),
                      dtype={"route_name": str, "time_period": str,
                             "avg_speed_kmh": float, "n_readings": int})

X_MEAN   = (10.0 + 5.0 + 20.0) / 3    # 11.667
X_IDX_06 = 10.0 / X_MEAN              # 0.857
X_IDX_08 = 5.0  / X_MEAN              # 0.429
X_IDX_12 = 20.0 / X_MEAN              # 1.714

# ---------------------------------------------------------------------------
# MALFORMED_BAND constant
# ---------------------------------------------------------------------------
check("MALFORMED_BAND is ':00 - 15:00'", MALFORMED_BAND == ":00 - 15:00")

# ---------------------------------------------------------------------------
# speed_index -- route present in CSV
# ---------------------------------------------------------------------------
si_x06 = speed_index("X", "06:00 - 07:00", _df=TEST_DF)
check("speed_index X 06:00-07:00 returns a dict with index", "index" in si_x06, si_x06)
check("speed_index X 06:00-07:00 value", near(si_x06["index"], X_IDX_06, tol=1e-3), si_x06)
check("speed_index X 06:00-07:00 fallback is False", si_x06["fallback"] is False, si_x06)
check("speed_index X 06:00-07:00 n_readings is 100", si_x06["n_readings"] == 100, si_x06)

si_x08 = speed_index("X", "08:00 - 09:00", _df=TEST_DF)
check("speed_index X 08:00-09:00 is below 1 (congested)", si_x08["index"] < 1.0, si_x08)
check("speed_index X 08:00-09:00 value", near(si_x08["index"], X_IDX_08, tol=1e-3), si_x08)

si_x12 = speed_index("X", "12:00 - 13:00", _df=TEST_DF)
check("speed_index X 12:00-13:00 is above 1 (fast)", si_x12["index"] > 1.0, si_x12)
check("speed_index X 12:00-13:00 value", near(si_x12["index"], X_IDX_12, tol=1e-3), si_x12)

# ---------------------------------------------------------------------------
# speed_index -- route present, period absent -> falls back to network
# ---------------------------------------------------------------------------
si_x_missing_period = speed_index("X", "22:00 - 23:00", _df=TEST_DF)
check("speed_index X missing period: fallback is True", si_x_missing_period["fallback"] is True,
      si_x_missing_period)
check("speed_index X missing period: fallback_reason mentions period",
      "22:00 - 23:00" in str(si_x_missing_period["fallback_reason"]), si_x_missing_period)
check("speed_index X missing period: n_route is 3 (three valid periods for X)",
      si_x_missing_period["n_route"] == 3, si_x_missing_period)

# ---------------------------------------------------------------------------
# speed_index -- route not in CSV -> falls back to network
# ---------------------------------------------------------------------------
si_missing = speed_index("MISSING", "08:00 - 09:00", _df=TEST_DF)
check("speed_index MISSING route: fallback is True", si_missing["fallback"] is True, si_missing)
check("speed_index MISSING route: n_readings is 0", si_missing["n_readings"] == 0, si_missing)
check("speed_index MISSING route: n_route is 0", si_missing["n_route"] == 0, si_missing)

# ---------------------------------------------------------------------------
# MALFORMED_BAND is excluded: mean for X should use 3 periods, not 4
# If the malformed band (99 km/h) were included, mean would be (10+5+20+99)/4 = 33.5
# and the 06:00 index would be 10/33.5 = 0.299, not 0.857.
# ---------------------------------------------------------------------------
check("malformed band excluded: X mean uses 3 valid periods not 4",
      near(si_x06["index"], X_IDX_06, tol=1e-3) and not near(si_x06["index"], 10.0 / 33.5, tol=1e-3),
      {"got": si_x06["index"], "3-period": X_IDX_06, "4-period-incl-malformed": 10.0/33.5})

# ---------------------------------------------------------------------------
# network_speed_index
# ---------------------------------------------------------------------------
ni = network_speed_index("08:00 - 09:00", _df=TEST_DF)
check("network_speed_index returns a dict with index", "index" in ni, ni)
check("network_speed_index fallback is False for a present period", ni["fallback"] is False, ni)
check("network_speed_index period with no data: fallback True",
      network_speed_index("22:00 - 23:00", _df=TEST_DF)["fallback"] is True)

# ---------------------------------------------------------------------------
# _hour_to_period
# ---------------------------------------------------------------------------
check("_hour_to_period 0s = 00:00 - 01:00", _hour_to_period(0) == "00:00 - 01:00")
check("_hour_to_period 28800s = 08:00 - 09:00", _hour_to_period(28800) == "08:00 - 09:00")
check("_hour_to_period 82800s = 23:00 - 00:00", _hour_to_period(82800) == "23:00 - 00:00")
check("_hour_to_period 25200s = 07:00 - 08:00", _hour_to_period(25200) == "07:00 - 08:00")

# ---------------------------------------------------------------------------
# _congestion_weight
# ---------------------------------------------------------------------------
check("congestion_weight(1.0) = 1.0", near(_congestion_weight(1.0), 1.0))
check("congestion_weight(0.5) = 1.5 (more congested)", near(_congestion_weight(0.5), 1.5))
check("congestion_weight(1.5) = 0.5 (less congested)", near(_congestion_weight(1.5), 0.5))
check("congestion_weight clamps at 2.0 when si=0", near(_congestion_weight(0.0), 2.0))
check("congestion_weight clamps at 0.5 when si=2.0", near(_congestion_weight(2.0), 0.5))

# ---------------------------------------------------------------------------
# _lateness_weight
# ---------------------------------------------------------------------------
check("lateness_weight(None) = 1.0", near(_lateness_weight(None), 1.0))
check("lateness_weight(-1) = 1.0 (negative treated as absent)", near(_lateness_weight(-1.0), 1.0))
check("lateness_weight(0) = 1.0", near(_lateness_weight(0), 1.0))
check("lateness_weight(MAX_DELAY_S) = 2.0", near(_lateness_weight(MAX_DELAY_S), 2.0))
check("lateness_weight(MAX_DELAY_S/2) = 1.5", near(_lateness_weight(MAX_DELAY_S / 2), 1.5))
check("lateness_weight(2*MAX_DELAY_S) = 2.0 (capped)", near(_lateness_weight(MAX_DELAY_S * 2), 2.0))

# ---------------------------------------------------------------------------
# OCC constants
# ---------------------------------------------------------------------------
check("CONTROLLERS_PER_SHIFT is 6", CONTROLLERS_PER_SHIFT == 6)
check("BUSES_ON_NETWORK is 1400", BUSES_ON_NETWORK == 1400)
check("BUSES_PER_CONTROLLER is ceiling(1400/6) = 234", BUSES_PER_CONTROLLER == 234)
check("OCC_SOURCE mentions RTA staff and 18 Nov 2026",
      "RTA staff" in OCC_SOURCE and "18 Nov 2026" in OCC_SOURCE)
check("MAX_DELAY_S is 300", MAX_DELAY_S == 300.0)

# ---------------------------------------------------------------------------
# occ_standby -- end-to-end: congested route should rank higher than a fast one
# ---------------------------------------------------------------------------
# Two routes with the same normalised load factor but different congestion:
#   route "X", hour 08:00 (28800s) -> period "08:00 - 09:00" -> speed_index 0.429 -> cw = 1.571
#   route "Y", hour 08:00          -> period "08:00 - 09:00" -> speed_index 1.0   -> cw = 1.0
# Both have load_factor_raw=0.5, seasonal_index=1.0 (we inject a trivial season DF).

import io as _io
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
_SEASON_DF = pd.read_csv(_io.StringIO(_SEASON_CSV),
                          dtype={"year": int, "month": int, "passenger_trips": float})
# Flat season data means seasonal_index = 1.0 for all routes/months.

row_x = {"route_id": "X", "direction": 0, "hour_start": 28800, "trips": 6,
          "seats_offered": 100, "forecast_peak_load": 50, "over": 0, "spare": 50, "index": 0.5}
row_y = {"route_id": "Y", "direction": 0, "hour_start": 28800, "trips": 6,
          "seats_offered": 100, "forecast_peak_load": 50, "over": 0, "spare": 50, "index": 0.5}

result = occ_standby([row_x, row_y], n=2, month=12, years=(2024,),
                     _df_season=_SEASON_DF, _df_speed=TEST_DF)
check("occ_standby returns at most n=2 results", len(result) <= 2, result)
check("occ_standby results have occ_reason field", all("occ_reason" in r for r in result), result)
check("occ_standby results have priority field", all("priority" in r for r in result), result)
check("occ_standby results have speed_index field", all("speed_index" in r for r in result), result)
check("occ_standby results sorted descending by priority",
      all(result[i]["priority"] >= result[i+1]["priority"] for i in range(len(result)-1)), result)
check("occ_standby: X (congested, si=0.429) ranks first over Y (si=1.0, equal load)",
      result[0]["route_id"] == "X", result)
check("occ_standby: X priority > Y priority", result[0]["priority"] > result[1]["priority"], result)

# ---------------------------------------------------------------------------
# occ_standby -- lateness raises priority
# ---------------------------------------------------------------------------
row_late = {**row_y, "route_id": "Y", "avg_delay_seconds": MAX_DELAY_S}   # max lateness
row_on_time = {**row_x, "route_id": "X", "avg_delay_seconds": 0}           # no lateness
# Y has lower speed_index (si=1.0, cw=1.0) but max lateness (lw=2.0) -> priority = 0.5 * 1.0 * 2.0 = 1.0
# X has congestion (si=0.429, cw=1.571) but no lateness (lw=1.0) -> priority = 0.5 * 1.571 * 1.0 = 0.785
# So Y should rank first here.
result_late = occ_standby([row_on_time, row_late], n=2, month=12, years=(2024,),
                           _df_season=_SEASON_DF, _df_speed=TEST_DF)
check("occ_standby: max lateness raises priority above congestion alone",
      result_late[0]["route_id"] == "Y", result_late)
check("occ_standby: lateness_weight in result", all("lateness_weight" in r for r in result_late), result_late)

# ---------------------------------------------------------------------------
# occ_standby -- MIN_TRIPS filter: row with 4 trips excluded
# ---------------------------------------------------------------------------
row_few = {**row_x, "trips": 4}
result_few = occ_standby([row_few, row_y], n=2, month=12, years=(2024,),
                          _df_season=_SEASON_DF, _df_speed=TEST_DF)
check("occ_standby: row with < MIN_TRIPS excluded", all(r["route_id"] != "X" for r in result_few), result_few)

print("ALL PASS" if not failed else f"{failed} FAILED")
sys.exit(1 if failed else 0)
