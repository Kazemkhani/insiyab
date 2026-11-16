#!/usr/bin/env python3
"""The tests that must pass before any number is shown (docs/MODEL-PLAN.md, section 10), on the invented raw tables.
  python3 tests/test_engine.py      the last line is ALL PASS"""
import copy, json, os, subprocess, sys, tempfile
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."); sys.path.insert(0, ROOT); os.chdir(ROOT)
import numpy as np
import pandas as pd
from model import forecast as F, evaluate as E, run as R, naive
from model.prepare import load, prepare, seconds, BIN

failed = 0
def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}")); failed += 0 if ok else 1

tables = load("fixtures/raw"); day = prepare(tables)
rows = F.build_rows(day["Y"], day["S"], day["series"], day["first_bin"])

# --- the clock ---------------------------------------------------------------------------------------------------
ORIGIN = 12 * 3600; NEAR = [ORIGIN - 3600, ORIGIN - 1800, ORIGIN]
def forecasts_at(tabs):
    d = prepare(tabs); r = F.build_rows(d["Y"], d["S"], d["series"], d["first_bin"], origins=[o for o in F.ORIGINS if o <= ORIGIN])
    p, _ = F.rolling(r, origins=NEAR); keep = r["origin"].isin(NEAR).to_numpy()
    return r.loc[keep, ["series", "origin", "horizon", "bin"] + F.FEATURES + list(naive.NAIVE)].to_numpy(dtype=float), np.column_stack([p[k][keep] for k in F.MODELS])
later = copy.deepcopy(tables)
nol = later["nol"]; after = (seconds(nol["Transaction_Time"]) >= ORIGIN) | (nol["Transaction_date"] > day["service_date"])
later["nol"] = pd.concat([nol[~after], nol[after].iloc[::3], nol[after].iloc[::3]], ignore_index=True)       # after the origin: two taps in three vanish, the rest double
avl = later["avl"].copy(); t = seconds(avl["Act_Arr"]); late = (t >= ORIGIN) | (t < 4 * 3600)
avl.loc[late, "Door_Status"] = "Closed"; avl.loc[late, "Act_Arr"] = avl.loc[late, "Sched_Arr"]; avl.loc[late, "Act_Dep"] = avl.loc[late, "Sched_Dep"]; later["avl"] = avl
check("the test of the clock really changed the day after 12:00", int(after.sum()) > 100 and int(late.sum()) > 100, (int(after.sum()), int(late.sum())))
(f1, p1), (f2, p2) = forecasts_at(tables), forecasts_at(later)
check("the clock: changing every record after 12:00 changes no feature and no naive forecast made at or before 12:00", f1.shape == f2.shape and np.array_equal(f1, f2, equal_nan=True))
check("the clock: and no model's forecast, to the last digit", np.array_equal(p1, p2, equal_nan=True), float(np.nanmax(np.abs(p1 - p2))) if p1.shape == p2.shape else "shapes differ")
check("a forecast is only ever made for a quarter of an hour that had not ended at its origin", bool(((rows["bin"] + day["first_bin"] + 1) * BIN > rows["origin"]).all()))

# --- nothing on both sides ---------------------------------------------------------------------------------------
ended = (rows["origin"] + rows["horizon"]).to_numpy(); origin = rows["origin"].to_numpy(); seen = []
F.rolling(rows, origins=[10 * 3600, 17 * 3600], watch=lambda o, learn, test: seen.append((ended[learn].max() <= o if learn.any() else True, (origin[test] == o).all(), not (learn & test).any())))
check("rolling origin: every row learned from had ended by the origin, and no row is both learned from and forecast", len(seen) == 2 and all(all(x) for x in seen), seen)
route_group = F.groups_of(list(day["series"]["route_id"]))[rows["series"].to_numpy()]; route = day["series"]["route_id"].to_numpy()[rows["series"].to_numpy()]; both = []
F.held_out_groups(rows, route_group, [17 * 3600], watch=lambda o, learn, test: both.append(len(set(route[learn]) & set(route[test]))))
check("other routes: no route is in both learning and testing, in any of the five folds", len(both) == 5 and sum(both) == 0, both)
check("every route is in exactly one group", len(set(zip(route, route_group))) == len(set(route)) and set(route_group) == {0, 1, 2, 3, 4})

# --- loads -------------------------------------------------------------------------------------------------------
v = day["visits"]; g = v.groupby("trip_id", sort=False)
check("loads: no load is below zero and nobody alights who is not on board", bool((v["load"] >= 0).all() and (v["off"] >= 0).all()))
check("loads: on every trip, everyone who boarded alighted, and the bus ends empty", bool((g["on"].sum() == g["off"].sum()).all() and (g["load"].last() == 0).all()), int((g["load"].last() != 0).sum()))
check("loads: the load after each stop is the load before, less alightings, plus boardings", bool(((v["on"] - v["off"]).groupby(v["trip_id"], sort=False).cumsum() == v["load"]).all()))
check("every stage wrote its counts to the log", {x["stage"] for x in day["log"]} >= {"runtime report", "fleet", "taps", "taps to trips", "loads", "timetable", "bins"})
check("no card, device or driver column leaves the preparation", not any(k in " ".join(map(str, v.columns)).lower() for k in ("nol", "card", "driver", "device", "body")), list(v.columns))

# --- the same twice, the contract, the untouched part ------------------------------------------------------------
one = R.build(day); two = R.build(prepare(load("fixtures/raw")))
dump = lambda files: {k: json.dumps(R._clean(x), sort_keys=True) for k, x in files.items()}
d1, d2 = dump(one), dump(two)
check("the same twice: two runs give the same bundle, byte for byte", d1 == d2, [k for k in d1 if d1[k] != d2.get(k)])
with tempfile.TemporaryDirectory() as out:
    R.write(one, out); res = subprocess.run([sys.executable, "tools/contract_check.py", out], capture_output=True, text=True).stdout.strip().splitlines()
    text = "".join(open(os.path.join(p, f), encoding="utf-8").read() for p, _, fs in os.walk(out) for f in fs)
check("the bundle from the invented tables meets the contract", res[-1] == "ALL PASS", [x for x in res if not x.startswith("PASS")])
check("the bundle says it is stand-in data in every file", all(x["fixture"] is True for x in one.values()))
ids = set(tables["nol"]["NOL_ID"]) | set(tables["nol"]["device_id"]) | set(tables["nol"]["device_id_hex"]) | set(tables["avl"]["Driver_id"]) | set(tables["avl"]["Body"]) | set(tables["fleet"]["Body_number"])
check(f"none of the {len(ids)} card, device, driver and vehicle numbers in the tables appears anywhere in the bundle", not [i for i in ids if i and i in text])
stop = next(t for t in one["metrics.json"]["targets"] if t["level"] == "stop")
check("every naive forecast and every model is in the table, at every horizon", {r["model"] for r in stop["results"]} == set(naive.NAIVE) | set(F.MODELS) and {r["horizon"] for r in stop["results"]} == set(F.HORIZONS))
check("gain is stated against the best naive forecast on the same rows, never the worst", all(r["skill_vs"] == min((x for x in stop["results"] if x["model"] in naive.NAIVE and x["horizon"] == r["horizon"] and x["subset"] == r["subset"]), key=lambda x: (x["mae"], x["model"]))["model"]
                                                                                           for r in stop["results"] if r["model"] in F.MODELS))
scrambled = dict(day); Y = day["Y"].copy(); cut = F.UNTOUCHED[0] // BIN - day["first_bin"]; Y[:, cut:] = np.where(np.isnan(Y[:, cut:]), np.nan, 7.0); scrambled["Y"] = Y
three = R.build(scrambled); dev = lambda files: json.dumps(R._clean([m for t in files["metrics.json"]["targets"] for m in t["more_tables"] if m["table"] == "development"]), sort_keys=True)
check("the untouched part: rewriting everything that happened from 16:00 changes neither the development table nor the model chosen", dev(one) == dev(three) and one["meta.json"]["engine"]["chosen"] == three["meta.json"]["engine"]["chosen"])
check("and that rewrite did change the untouched table, so the test could have failed", json.dumps(R._clean(stop["pooled"])) != json.dumps(R._clean(next(t for t in three["metrics.json"]["targets"] if t["level"] == "stop")["pooled"])))
check("the development table uses no quarter of an hour that ended after 16:00", all(o + max(F.HORIZONS) >= 0 for o in [0]) and bool((F.development(rows)["origin"] + F.development(rows)["horizon"] <= F.UNTOUCHED[0]).all()) and len(F.development(rows)) > 0)

print("ALL PASS" if not failed else f"{failed} FAILED"); sys.exit(1 if failed else 0)
