#!/usr/bin/env python3
"""Known-answer tests for seasonal normalisation and standby placement.
  python3 tests/test_season.py      the last line is ALL PASS

The test CSV is built inline and injected via the _df parameter: no file is read from disk,
and no temporary file is written, so these tests run identically in any environment.
"""
import io, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import pandas as pd
from model.season import network_index, seasonal_index, normalise_gap, standby_placement, BROKEN_THRESHOLD, MIN_MONTHS, MIN_TRIPS

failed = 0

def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}"))
    failed += 0 if ok else 1

def near(a, b, tol=1e-9):
    return a is not None and abs(a - b) < tol

# ---------------------------------------------------------------------------
# Test CSV
# ---------------------------------------------------------------------------
# Year 2024, routes "A" and "B".
# Month 1: network total = 100, which is below 60 per cent of the year's median (threshold ~810) -> broken.
# Route A: present for all 12 months.
#   Months 2-11: 1000 each (10 months). Month 12: 1200.
# Route B: present for months 2-7 only (6 months < MIN_MONTHS) -> fallback to network index.

_CSV_LINES = """\
year,month,route_name,passenger_trips,rows_in_source,source_rows_differ
2024,1,A,50,1,0
2024,1,B,50,1,0
2024,2,A,1000,1,0
2024,2,B,500,1,0
2024,3,A,1000,1,0
2024,3,B,500,1,0
2024,4,A,1000,1,0
2024,4,B,500,1,0
2024,5,A,1000,1,0
2024,5,B,500,1,0
2024,6,A,1000,1,0
2024,6,B,500,1,0
2024,7,A,1000,1,0
2024,7,B,500,1,0
2024,8,A,1000,1,0
2024,9,A,1000,1,0
2024,10,A,1000,1,0
2024,11,A,1000,1,0
2024,12,A,1200,1,0
"""
TEST_DF = pd.read_csv(io.StringIO(_CSV_LINES), dtype={"year": int, "month": int, "passenger_trips": float})

# ---------------------------------------------------------------------------
# network_index
# ---------------------------------------------------------------------------
# Network valid months (month 1 excluded): 2-12 (11 months).
# Network totals for valid months: months 2-7 = 1500 each, months 8-11 = 1000 each, month 12 = 1200.
# Mean = (6*1500 + 4*1000 + 1200) / 11 = 14200 / 11.
# December network index = 1200 / (14200/11) = 1200 * 11 / 14200 = 13200 / 14200.
NET_DEC_EXPECTED = 13200 / 14200

ni = network_index(12, years=(2024,), _df=TEST_DF)
check("network_index returns a dict with an index key", "index" in ni, ni)
check("network_index December 2024: 1200 / (14200/11)", near(ni["index"], NET_DEC_EXPECTED), ni)
check("network_index fallback is False when data is present", ni["fallback"] is False, ni)
check("network_index reports the number of valid months", ni["valid_months"] == 11, ni)

# ---------------------------------------------------------------------------
# Broken month is excluded from the mean
# ---------------------------------------------------------------------------
# If month 1 (broken) were included, the mean would change.
# A quick proxy: if month 1 were counted, the mean for month A would include 50, lowering it.
# Verify: the network mean using valid months only.
net_all = TEST_DF.groupby("month")["passenger_trips"].sum()
mean_with_broken = float(net_all.mean())                                # all 12 months
mean_without_broken = float(net_all[[m for m in net_all.index if m != 1]].mean())
# Our implementation should use mean_without_broken (11 valid months, not 12).
ni_all = network_index(12, years=(2024,), _df=TEST_DF)
expected_broken_excluded = 1200 / mean_without_broken
expected_broken_included = 1200 / mean_with_broken
check("broken month is excluded from mean (index matches 11-month mean, not 12-month)",
      near(ni_all["index"], expected_broken_excluded) and not near(ni_all["index"], expected_broken_included),
      {"got": ni_all["index"], "11_month": expected_broken_excluded, "12_month": expected_broken_included})

# ---------------------------------------------------------------------------
# seasonal_index -- route with enough months
# ---------------------------------------------------------------------------
# Route A valid months: 2-12 (11 months >= MIN_MONTHS).
# A values: months 2-11 = 1000 each, month 12 = 1200.
# Mean = (10*1000 + 1200) / 11 = 11200 / 11.
# December index = 1200 / (11200/11) = 1200 * 11 / 11200 = 13200 / 11200.
A_DEC_EXPECTED = 13200 / 11200

si_a = seasonal_index("A", 12, years=(2024,), _df=TEST_DF)
check("seasonal_index for route A returns a dict", "index" in si_a, si_a)
check("seasonal_index for A December: 1200 / (11200/11)", near(si_a["index"], A_DEC_EXPECTED), si_a)
check("seasonal_index for A: fallback is False (11 valid months >= MIN_MONTHS)", si_a["fallback"] is False, si_a)
check("seasonal_index for A: valid_months is 11", si_a["valid_months"] == 11, si_a)
check("seasonal_index for A: fallback_reason is None", si_a["fallback_reason"] is None, si_a)

# ---------------------------------------------------------------------------
# seasonal_index -- route with too few months (fallback)
# ---------------------------------------------------------------------------
# Route B has 6 valid months (2-7), which is fewer than MIN_MONTHS (8).
# It falls back to the network index for December.

si_b = seasonal_index("B", 12, years=(2024,), _df=TEST_DF)
check("seasonal_index for B: fallback is True (6 valid months < MIN_MONTHS)", si_b["fallback"] is True, si_b)
check("seasonal_index for B: index equals network December index", near(si_b["index"], NET_DEC_EXPECTED), si_b)
check("seasonal_index for B: valid_months is 6", si_b["valid_months"] == 6, si_b)
check("seasonal_index for B: fallback_reason mentions MIN_MONTHS", str(MIN_MONTHS) in str(si_b["fallback_reason"]), si_b)

# ---------------------------------------------------------------------------
# seasonal_index -- route not in CSV at all (fallback)
# ---------------------------------------------------------------------------
si_missing = seasonal_index("MISSING_ROUTE", 12, years=(2024,), _df=TEST_DF)
check("seasonal_index for a route not in the CSV: fallback is True", si_missing["fallback"] is True, si_missing)
check("seasonal_index for a route not in CSV: index equals network index", near(si_missing["index"], NET_DEC_EXPECTED), si_missing)
check("seasonal_index for a route not in CSV: valid_months is 0", si_missing["valid_months"] == 0, si_missing)

# ---------------------------------------------------------------------------
# normalise_gap -- arithmetic
# ---------------------------------------------------------------------------
# A single row: route "A", seats_offered=100, forecast_peak_load=80.
# Raw load factor = 80/100 = 0.8.
# Seasonal index = 13200/11200.
# Normalised = 0.8 / (13200/11200) = 0.8 * 11200/13200 = 8960/13200.

NORM_EXPECTED = 0.8 * 11200 / 13200
test_row = {"route_id": "A", "direction": 0, "hour_start": 36000, "trips": 5,
            "seats_offered": 100, "forecast_peak_load": 80, "over": 0, "spare": 20, "index": 0.1}
normed = normalise_gap([test_row], month=12, years=(2024,), _df=TEST_DF)
check("normalise_gap returns a list of the same length", len(normed) == 1, normed)
nr = normed[0]
check("normalise_gap: load_factor_raw = forecast_peak_load / seats_offered", near(nr["load_factor_raw"], 0.8), nr)
check("normalise_gap: seasonal_index matches route A December", near(nr["seasonal_index"], A_DEC_EXPECTED, tol=1e-4), nr)
check("normalise_gap: seasonal_index_fallback is False for route A", nr["seasonal_index_fallback"] is False, nr)
check("normalise_gap: load_factor_normalised = raw / seasonal_index", near(nr["load_factor_normalised"], NORM_EXPECTED, tol=1e-4), nr)
check("normalise_gap: original fields are preserved", nr["trips"] == 5 and nr["hour_start"] == 36000, nr)

# ---------------------------------------------------------------------------
# normalise_gap -- zero seats (edge case)
# ---------------------------------------------------------------------------
zero_row = {**test_row, "seats_offered": 0}
normed_zero = normalise_gap([zero_row], month=12, years=(2024,), _df=TEST_DF)
check("normalise_gap: load_factor_raw is None when seats_offered is zero", normed_zero[0]["load_factor_raw"] is None, normed_zero[0])
check("normalise_gap: load_factor_normalised is None when seats_offered is zero", normed_zero[0]["load_factor_normalised"] is None, normed_zero[0])

# ---------------------------------------------------------------------------
# standby_placement -- ranking order and minimum-trips filter
# ---------------------------------------------------------------------------
# Three rows with different load factors; one below MIN_TRIPS.
row_high  = {"route_id": "A", "direction": 0, "hour_start": 25200, "trips": 6, "seats_offered": 50,  "forecast_peak_load": 48, "over": 0, "spare": 2,  "index": 9.0}  # raw 0.96
row_mid   = {"route_id": "A", "direction": 0, "hour_start": 28800, "trips": 5, "seats_offered": 50,  "forecast_peak_load": 25, "over": 0, "spare": 25, "index": 0.1}  # raw 0.50
row_low   = {"route_id": "B", "direction": 1, "hour_start": 32400, "trips": 7, "seats_offered": 100, "forecast_peak_load": 10, "over": 0, "spare": 90, "index": 0.1}  # raw 0.10 (B falls back to network)
row_few   = {"route_id": "A", "direction": 1, "hour_start": 36000, "trips": 4, "seats_offered": 50,  "forecast_peak_load": 49, "over": 0, "spare": 1,  "index": 9.9}  # raw 0.98 but < MIN_TRIPS

placement = standby_placement([row_high, row_mid, row_low, row_few], n=3, month=12, years=(2024,), _df=TEST_DF)

check("standby_placement: returns at most n results", len(placement) <= 3, placement)
check("standby_placement: row with 4 trips is excluded", all(r["trips"] >= MIN_TRIPS for r in placement), placement)
check("standby_placement: results are in descending order of load_factor_normalised",
      all(placement[i]["load_factor_normalised"] >= placement[i+1]["load_factor_normalised"] for i in range(len(placement)-1)), placement)
check("standby_placement: highest normalised load factor is first (row_high)", placement[0]["hour_start"] == row_high["hour_start"], placement)
check("standby_placement: each result has a reason field", all("reason" in r for r in placement), placement)

# ---------------------------------------------------------------------------
# standby_placement -- n parameter
# ---------------------------------------------------------------------------
placement_1 = standby_placement([row_high, row_mid, row_low], n=1, month=12, years=(2024,), _df=TEST_DF)
check("standby_placement: n=1 returns exactly one result", len(placement_1) == 1, placement_1)

# ---------------------------------------------------------------------------
# BROKEN_THRESHOLD and MIN_MONTHS are stated constants (not magic numbers)
# ---------------------------------------------------------------------------
check("BROKEN_THRESHOLD is 0.60", BROKEN_THRESHOLD == 0.60)
check("MIN_MONTHS is 8",          MIN_MONTHS == 8)
check("MIN_TRIPS is 5",           MIN_TRIPS == 5)

print("ALL PASS" if not failed else f"{failed} FAILED")
sys.exit(1 if failed else 0)
