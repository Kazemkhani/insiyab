#!/usr/bin/env python3
"""The v2 features and the two files the console reads (docs/v2/CONTRACT-V2.md), on the invented raw tables.
  python3 tests/test_forecast_v2.py      the last line is ALL PASS"""
import json, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."); sys.path.insert(0, ROOT); os.chdir(ROOT)
import numpy as np
from model import context as C, delay as D, forecast as F, triptime as T
from model.prepare import load, prepare

failed = 0
def check(name, ok, detail=""):
    global failed
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:300]}")); failed += 0 if ok else 1

day = prepare(load("fixtures/raw")); ctx = C.day_context(day["service_date"]); v = C.enrich(day["visits"])

# --- the features -------------------------------------------------------------------------------------------------
hi = C.heat_index_c([20, 35, 45], [50, 60, 40])
check("heat index: a mild hour stays near its temperature, and heat with humidity feels hotter than the thermometer", abs(hi[0] - 20) < 1.5 and hi[1] > 40 and hi[2] > 55, hi)
check("heat index: the reading used is of the last full hour before the forecast, never the hour it is made in", C.heat_at({"heat": {13: 1.0, 14: 2.0}}, [14 * 3600, 14 * 3600 + 3599, 15 * 3600]).tolist() == [1.0, 1.0, 2.0])
check("the public tables were found for the stand-in day, and its calendar says school holiday and no public holiday", ctx["found"] == {"weather": True, "calendar": True} and ctx["school_holiday"] == 1.0 and ctx["public_holiday"] == 0.0, ctx["found"])
check("the copy of the day's public values carried in the engine equals the public tables, so a run inside Dataiku sees the same day", C.day_context(day["service_date"], folder="/nowhere") == ctx, C.day_context(day["service_date"], folder="/nowhere")["found"])
check("enrich keeps every visit in its place", len(v) == len(day["visits"]) and (v["trip_id"].to_numpy() == day["visits"]["trip_id"].to_numpy()).all() and (v["seq"].to_numpy() == day["visits"]["seq"].to_numpy()).all())
ends = v.groupby("trip_id")["act_arr"].max(); starts = v.groupby("trip_id")["act_dep"].min(); veh = v.groupby("trip_id")["vehicle"].first()
order = starts.reset_index().assign(vehicle=veh.to_numpy(), end=ends.to_numpy()).sort_values(["vehicle", "act_dep"]); order["prev_end"] = order.groupby("vehicle")["end"].shift(1)
prev_end = v["trip_id"].map(order.set_index("trip_id")["prev_end"])
used = v["prev_trip_late"] != 0
check("previous trip: its lateness is used only once that trip had ended, and it is alive on the invented day", int(used.sum()) > 1000 and bool((prev_end[used] <= v.loc[used, "act_dep"]).all()), int(used.sum()))
check("headway deviation is alive, and zero for the first bus of the day at a stop", float(v["headway_dev"].abs().sum()) > 0 and bool((v.sort_values("act_dep").groupby(["route_id", "direction", "stop_id"])["headway_dev"].first() == 0).all()))
rows = D.build_rows(day["visits"], ctx)
check("lateness rows carry every new feature, and the features tried are the old ones plus the new", all(c in rows for c in D.NEW) and D.FEATURES == D.BASE + D.NEW and set(D.NEW) == set(C.NEW))
check("a flag with one value all day is reported as not tried, never as a gain", all(x["status"] == "one_value_all_day" for x in json.load(open("fixtures/metrics.json"))["targets"][2]["feature_effect"]["table"] if x["feature"] in ("school_holiday", "public_holiday")))

# --- the bundle's v2 tables (read from fixtures/, which the gates prove equals a fresh run) ---------------------------
metrics = json.load(open("fixtures/metrics.json", encoding="utf-8")); late = next(t for t in metrics["targets"] if t["target"] == "arrival_delay_seconds"); stop = next(t for t in metrics["targets"] if t["level"] == "stop")
for t, name in ((late, "lateness"), (stop, "boardings")):
    e = t["feature_effect"]; kept = {x["feature"] for x in e["table"] if x["status"] == "kept"}
    check(f"{name}: a new feature is kept only if it lowered the miss on the development part, and the kept list says the same", kept == set(e["kept"]) and all((x["dev_mae_with"] < x["dev_mae_without"]) == (x["status"] == "kept") for x in e["table"] if x["dev_mae_with"] is not None), e["table"])
    check(f"{name}: every horizon has its gain with a range around it", bool(t["by_horizon"]) and all(r["skill_lo"] <= r["skill"] + 1e-9 <= r["skill_hi"] + 2e-9 for r in t["by_horizon"]))
check("lateness: by horizon at the evening peak, and held-out routes and communities by horizon, are in the table", {r["horizon"] for r in late["peak_by_horizon"]} == set(D.AHEAD) and {"other_routes", "other_communities"} <= {m["table"] for m in late["more_tables"] if m.get("by_horizon")})
check("lateness: the linear model is beside the trees, and the trees stay the declared model", {m["model"] for m in late["models"] if not m["is_baseline"]} == {"gbt", "linear"} and late["chosen"] == "gbt")
check("boardings: the horizon where the model loses is still in the table", any(r["skill"] < 0 for r in stop["by_horizon"]) == any(c["kind"] == "loses_at_horizon" for c in stop["cautions"]))

# --- judge_pick.json and scatter.json ---------------------------------------------------------------------------------
pick = json.load(open("fixtures/forecast/judge_pick.json", encoding="utf-8")); sc = json.load(open("fixtures/forecast/scatter.json", encoding="utf-8"))
check("judge pick: stand-in and labelled, hours 16:00 to 19:00, every cell has forecast, naive, actual and n", pick["fixture"] is True and "Stand-in" in pick["label"] and {p["hour"] for p in pick["picks"]} <= {"16:00", "17:00", "18:00", "19:00"}
      and all(p["n"] >= pick["least_forecasts"] and all(k in p for k in ("forecast_s", "naive_s", "actual_s", "forecast_mae_s", "naive_mae_s")) for p in pick["picks"]))
check("judge pick: the misses are counted, not hidden", pick["route_hours_where_the_forecast_was_closer"] + pick["route_hours_where_the_naive_was_closer_or_equal"] == len(pick["picks"]) == pick["route_hours"]
      and pick["route_hours_where_the_forecast_was_closer"] == sum(p["forecast_mae_s"] < p["naive_mae_s"] for p in pick["picks"]) + sum(p["forecast_closer"] and p["forecast_mae_s"] == p["naive_mae_s"] for p in pick["picks"]))
pts = sc["points"]; share = sum(abs(p["forecast_error_min"]) < abs(p["timetable_error_min"]) for p in pts) / len(pts)
check("scatter: one point for each held-out trip, and the share where the forecast was closer is the share in the points", len(pts) == sc["n"] == sc["split"]["held_out"] and abs(share - sc["share_forecast_closer"]) < 0.01, (share, sc["share_forecast_closer"]))
check("scatter: a point holds an hour and two errors and nothing else, so no trip, vehicle or route is named", all(set(p) == {"hour", "forecast_error_min", "timetable_error_min"} for p in pts) and all(p["hour"] >= 16 for p in pts))
t, _ = T.trips(day["visits"]); cut = F.UNTOUCHED[0]
check("trip time: the strict split learns from no trip that was still running at 16:00, and forecasts none scheduled before it", sc["split"]["learned_from_strict"] == int(((t["sd"] < cut) & (t["aa"] <= cut)).sum()) and sc["split"]["held_out"] == int((t["sd"] >= cut).sum()))
check("trip time: the timetable, a simple rule, a linear model and the trees are all in the table, in both splits", all({r["method"] for r in sc[k]} == set(T.METHODS) for k in ("strict", "as_pitched")))
for name in ("judge_pick.json", "scatter.json"):
    a, b = os.path.join("artifacts/forecast", name), os.path.join("fixtures/forecast", name)
    if os.path.exists(a) and json.load(open(a, encoding="utf-8")).get("fixture"):
        check(f"artifacts/forecast/{name} says it is stand-in, and equals the engine's stand-in file", open(a, encoding="utf-8").read() == open(b, encoding="utf-8").read())

print("ALL PASS" if not failed else f"{failed} FAILED"); sys.exit(1 if failed else 0)
