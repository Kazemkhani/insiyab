"""One command runs every stage and writes the bundle (docs/MODEL-PLAN.md, section 9):

  python3 -m model.run --data fixtures/raw --out <folder>       on the invented tables
  python3 -m model.run --data <folder> --out artifacts --real   on RTA's tables, where they are allowed to be

The bundle says "fixture": true unless --real is given, and --real is refused if the tables carry the stand-in mark.
The same input gives the same bundle, byte for byte, apart from generated_at and commit in meta.json.
Inside Dataiku: bundle = build(prepare(tables), fixture=False), with tables read as DataFrames."""
import argparse, datetime, json, os, subprocess, sys
import numpy as np
import pandas as pd
from . import bundle as B, context as C, delay as D, evaluate as E, forecast as F, naive, triptime as T
from .measures import MAPE_RULE
from .prepare import BIN, load, prepare

PROMISED = 0.9
STOP_FILE_HORIZON = 3600       # the stop file is what a screen draws for one stop: one look-ahead is enough for that, and the table of error keeps them all
STOP_FILE_SERIES = 400         # and the busiest series only. A city's every stop at every origin is a file of hundreds of megabytes, which no page can load


def _labels(day, rows):
    """The subset every row belongs to, for the stability table. Each label comes from the plan or the fleet, not from the target."""
    s = day["series"].iloc[rows["series"].to_numpy()].reset_index(drop=True)
    early = day["visits"][day["visits"]["sched_arr"] < F.UNTOUCHED[0]]                                   # a label must not be set by the untouched hours either
    kind = early.groupby("route_id")["bus_type"].agg(lambda x: x.value_counts().index[0])               # the kind of bus that ran most of the route's visits before 16:00
    route_group = F.groups_of(list(day["series"]["route_id"])); comm_group = F.groups_of(list(day["series"]["community_id"]))
    idx = rows["series"].to_numpy()
    return pd.DataFrame({"route_id": s["route_id"], "direction": s["direction"], "stop_id": s["stop_id"], "bus_type": s["route_id"].map(kind).fillna("UNKNOWN").to_numpy(),
                         "route_group": route_group[idx], "community_group": np.where(comm_group[idx] < 0, np.nan, comm_group[idx]),
                         "time_block": E.time_block((rows["bin"].to_numpy() + day["first_bin"]) * BIN)})


def _target(level, frame, kinds, chosen_from=None, extra=None):
    """One entry of metrics.json: the untouched part as the main table, the development part and the held-out groups beside it."""
    models = list(naive.NAIVE) + list(F.MODELS)
    dev, final = F.development(frame), F.untouched(frame)
    dev_pooled, _ = E.pooled(dev, models)
    chosen = chosen_from or E.choose(dev_pooled)                       # the choice is made on the development part alone
    declared, masks = E.subsets_of(final, kinds)
    final_pooled, best = E.pooled(final, models)
    inside = ((final["y"] >= final["lo"] - 1e-9) & (final["y"] <= final["hi"] + 1e-9)); kept = float(inside.mean()); some = final["y"] > 0
    share = lambda m: None if not m.any() else round(float(inside[m].mean()), 4)
    _, dev_masks = E.subsets_of(dev, {"time_block": kinds["time_block"]})
    more = [{"table": "development", "note": "Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.",
             "split": {"kind": "rolling_origin", "origins": sorted(int(x) for x in dev["origin"].unique())}, "results": E.table(dev, models, dev_masks), "pooled": dev_pooled}]
    for name, note, f2 in extra or []:
        f2 = f2.dropna(subset=list(F.MODELS))
        if len(f2):
            more.append({"table": name, "note": note, "split": {"kind": name, "origins": sorted(int(x) for x in f2["origin"].unique())},
                         "results": E.table(f2, models, {"all": np.ones(len(f2), bool)}), "pooled": E.pooled(f2, models)[0], "by_horizon": E.by_horizon(f2, models, chosen)})
    return {"target": "boardings", "level": level, "unit": f"passengers boarding per {level} per 15 minutes",
            "split": {"kind": "rolling_origin", "part": "untouched", "origins": sorted(int(x) for x in final["origin"].unique()),
                      "train": "at each origin, every forecast whose quarter of an hour had ended by then; nothing later",
                      "test": "the quarter of an hour that ends at origin plus horizon, for origins from 16:00 to 21:30, set aside at the start and scored once"},
            "mape_rule": MAPE_RULE, "models": E.models_declared(chosen), "chosen": chosen, "chosen_on": "development", "best_naive": best,
            "subsets": declared, "results": E.table(final, models, masks), "pooled": final_pooled,
            "range": {"promised": PROMISED, "kept": round(kept, 4), "kept_when_nobody_boarded": share(~some), "kept_when_somebody_boarded": share(some), "n_nobody": int((~some).sum()), "n_somebody": int(some.sum()),
                      "model": chosen, "n": len(final), "method": "set at each origin from the misses of forecasts that had already come true that day (conformal prediction, rolling), widened to whole passengers"},
            "by_horizon": E.by_horizon(final, models, chosen), "more_tables": more}, chosen


def _cautions(t):
    """Where a planner should not lean on the model, said in words a screen can show. Built from the table: a horizon at which the chosen model loses
    to the best naive forecast there, and a range that was kept less often than promised when somebody boarded."""
    out = []; models = {m["model"]: m for m in t["models"]}; unit = "stops" if t.get("horizon_unit") == "stops" else "minutes"
    for r in sorted((r for r in t["results"] if r["subset"] == "all" and r["model"] == t.get("chosen") and r["skill"] is not None and r["skill"] < 0), key=lambda r: r["horizon"]):
        ahead = r["horizon"] if unit == "stops" else r["horizon"] // 60
        out.append({"kind": "loses_at_horizon", "horizon": r["horizon"], "skill": r["skill"], "against": r["skill_vs"],
                    "say": f"At {ahead} {unit} ahead the model misses by more than the naive forecast ({models[r['skill_vs']]['label'].lower()}). Use the naive forecast that far ahead."})
    g = t.get("range") or {}
    if g.get("kept_when_somebody_boarded") is not None and g["kept_when_somebody_boarded"] < g["promised"]:
        out.append({"kind": "range_short", "kept": g["kept_when_somebody_boarded"], "promised": g["promised"],
                    "say": f"When somebody boarded, the range held {round(100 * g['kept_when_somebody_boarded'])} times in 100, short of the {round(100 * g['promised'])} promised."})
    best = next((r for r in t.get("pooled", []) if r["model"] == t.get("chosen")), None)
    if best and best.get("skill_lo") is not None and best["skill_lo"] <= 0:
        out.append({"kind": "gain_not_established", "skill_lo": best["skill_lo"], "skill_hi": best["skill_hi"], "say": "The range of the gain includes zero: on this day the model is not shown to beat the best naive forecast."})
    return out


def _lateness(day, ctx):
    """Target B: the table for lateness and the forecasts a screen can show. Returns (metrics entry, forecast file, judge-pick file) or three Nones when there is too little."""
    rows = D.build_rows(day["visits"], ctx)
    if len(rows) < 2 * D.MIN_ROWS:
        return None, None, None
    effect, kept = D.select(rows); feats = D.BASE + kept                 # which new features stay is settled on the development part
    pred, thin = D.rolling(rows, features=feats); rows["gbt"] = pred; rows["lo"], rows["hi"] = D.ranges(rows, pred, PROMISED)
    rows["linear"] = D.rolling(rows, features=feats, kind="linear")[0]
    rows["gbt_before"] = D.rolling(rows, features=D.BASE)[0] if kept else rows["gbt"]
    rows["horizon"] = rows["stops_ahead"]; rows["time_block"] = E.time_block(rows["made_at"]); models = list(D.NAIVE) + list(D.MODELS); names = list(D.NAIVE)
    dev, final = D.development(rows), D.untouched(rows)
    if not len(dev) or not len(final):
        return None, None, None
    kinds = {"time_block": ("time_block", lambda x: E.BLOCK_LABEL[x]), "direction": ("direction", lambda x: f"Direction {x}"), "bus_type": ("bus_type", lambda x: f"Buses of type {x}")}
    declared, masks = E.subsets_of(final, kinds); pooled, best = E.pooled(final, models, naive_names=names, counts=False)
    kept_share = float(((final["y"] >= final["lo"]) & (final["y"] <= final["hi"])).mean())
    mae = lambda f, c: round(float((f["y"] - f[c]).abs().mean()), 4)
    more = [{"table": "development", "note": "Forecasts made from 08:00 for arrivals up to 16:00. Read the main table first.",
             "split": {"kind": "rolling_origin", "origins": sorted(int(x) for x in dev["origin"].unique())},
             "results": E.table(dev, models, {"all": np.ones(len(dev), bool)}, naive_names=names, counts=False), "pooled": E.pooled(dev, models, naive_names=names, counts=False)[0]}]
    # other routes and other communities: learn from four groups, forecast the fifth, at the hourly origins of the untouched part
    halves = sorted(int(x) for x in final["origin"].unique()); hourly = [o for o in halves if o % 3600 == 0]
    comm = dict(zip(day["series"]["stop_id"], day["series"]["community_id"]))
    groups = (("other_routes", F.groups_of(list(rows["route_id"])), "Routes in five groups: learn from four, forecast the fifth. No route is on both sides. Does it carry over to a route it has never seen?"),
              ("other_communities", F.groups_of([comm.get(x) for x in rows["target_stop"]]), "Communities in five groups, by the stop the forecast is for: learn from four, forecast the fifth. Does it carry over to a part of the city it has never seen?"))
    for name, g, note in groups:
        if len(set(g) - {-1}) < 2:
            continue
        f2 = rows[["origin", "horizon", "y"] + names].copy(); f2["gbt"] = D.held_out_groups(rows, g, feats, hourly); f2 = f2.dropna(subset=["gbt"])
        if len(f2):
            cv = names + ["gbt"]
            more.append({"table": name, "note": note, "split": {"kind": name, "origins": hourly}, "results": E.table(f2, cv, {"all": np.ones(len(f2), bool)}, naive_names=names, counts=False),
                         "pooled": E.pooled(f2, cv, naive_names=names, counts=False)[0], "by_horizon": E.by_horizon(f2, cv, "gbt", naive_names=names, counts=False)})
    peak = final[final["time_block"] == "evening_peak"]
    target = {"target": "arrival_delay_seconds", "level": "route", "unit": "seconds late at a stop ahead (early is below zero)", "horizon_unit": "stops",
              "split": {"kind": "rolling_origin", "part": "untouched", "origins": halves,
                        "train": "at the start of each half hour, every trip that had finished by then; a trip is never split between learning and testing",
                        "test": "buses leaving a stop in that half hour, from 16:00 on, set aside at the start and scored once"},
              "mape_rule": "MAPE and WAPE are not taken for lateness: a bus can be exactly on time or early, so there is no share of what happened to take. MAE and RMSE are in seconds.",
              "models": [{"model": m, "label": label, "is_baseline": True} for m, label in D.NAIVE.items()] + [{"model": m, "label": label, "is_baseline": False, "chosen": m == "gbt"} for m, label in D.MODELS.items()],
              "chosen": "gbt", "best_naive": best, "subsets": declared, "results": E.table(final, models, masks, naive_names=names, counts=False), "pooled": pooled,
              "by_horizon": E.by_horizon(final, models, "gbt", naive_names=names, counts=False),
              "peak_by_horizon": E.by_horizon(peak, models, "gbt", naive_names=names, counts=False) if len(peak) else [],
              "range": {"promised": PROMISED, "kept": round(kept_share, 4), "model": "gbt", "n": len(final)}, "half_hours_with_too_little_to_learn_from": int(thin),
              "feature_effect": {"table": effect, "kept": kept, "development": {"mae_before": mae(dev, "gbt_before"), "mae_after": mae(dev, "gbt")}, "untouched": {"mae_before": mae(final, "gbt_before"), "mae_after": mae(final, "gbt")},
                                 "untouched_by_horizon": [{"horizon": int(h), "n": len(d), "mae_before": mae(d, "gbt_before"), "mae_after": mae(d, "gbt")} for h, d in final.groupby("horizon", sort=True)]},
              "features": D.importance(rows, feats, F.UNTOUCHED[0]), "cautions": [], "more_tables": more}
    target["cautions"] = _cautions(target)
    series = []
    for rid, g in final.groupby("route_id", sort=True):
        g = g.iloc[:: max(1, len(g) // 600)]                           # at most about 600 rows a route, taken evenly through the evening
        series.append({"id": rid, "rows": [{"origin": int(r.made_at), "stops_ahead": int(r.stops_ahead), "trip_id": str(r.trip_id), "stop_id": r.target_stop, "forecast": round(float(r.gbt), 2),
                                            "lo": round(min(float(r.lo), float(r.gbt)), 2), "hi": round(max(float(r.hi), float(r.gbt)), 2), "baseline": round(float(getattr(r, best)), 2), "actual": int(r.y)} for r in g.itertuples()]})
    return target, {"target": "arrival_delay_seconds", "level": "route", "horizon_unit": "stops", "model": "gbt", "baseline_model": best, "series": series}, _judge_pick(final, best)


JUDGE_HOURS = (16, 20)       # forecasts made from 16:00 up to 20:00
JUDGE_LEAST = 5              # a route and hour with fewer forecasts than this is left out, and counted


def _judge_pick(final, best):
    """For the 'pick any route and hour' moment: every route and every hour from 16:00 to 20:00 of the untouched part, with the average
    lateness forecast, the naive forecast and what happened, and each one's average miss. Averages over forecasts only: no trip or vehicle is named."""
    f = final.assign(hour=(final["made_at"] // 3600).astype(int)); f = f[(f["hour"] >= JUDGE_HOURS[0]) & (f["hour"] < JUDGE_HOURS[1])]
    def cell(d):
        fm, nm = float((d["y"] - d["gbt"]).abs().mean()), float((d["y"] - d[best]).abs().mean())
        return {"n": int(len(d)), "forecast_s": round(float(d["gbt"].mean()), 1), "naive_s": round(float(d[best].mean()), 1), "actual_s": round(float(d["y"].mean()), 1),
                "forecast_mae_s": round(fm, 1), "naive_mae_s": round(nm, 1), "forecast_closer": bool(fm < nm)}
    picks = []; left_out = 0
    for (rid, hour), d in f.groupby(["route_id", "hour"], sort=True):
        if len(d) < JUDGE_LEAST:
            left_out += 1; continue
        ahead = [dict(stops_ahead=int(h), **cell(x)) for h, x in d.groupby("horizon", sort=True) if len(x) >= JUDGE_LEAST]
        picks.append(dict(route=str(rid), hour=f"{int(hour):02d}:00", **cell(d), by_stops_ahead=ahead))
    won = sum(p["forecast_closer"] for p in picks)
    return {"version": 1, "target": "arrival_delay_seconds", "unit": "seconds late at a stop ahead (early is below zero); each value is an average over the forecasts made on that route in that hour",
            "model": "gbt", "naive": best, "naive_label": D.NAIVE[best], "part": "untouched: forecasts made from 16:00, scored once", "hours": [f"{h:02d}:00" for h in range(*JUDGE_HOURS)],
            "least_forecasts": JUDGE_LEAST, "route_hours_left_out_as_too_few": int(left_out), "route_hours": len(picks), "route_hours_where_the_forecast_was_closer": int(won),
            "route_hours_where_the_naive_was_closer_or_equal": int(len(picks) - won), "picks": picks}


def _series_json(frame, keys, chosen, base, first_bin):
    out = []
    for key, g in frame.groupby(keys, sort=True):
        key = key if isinstance(key, tuple) else (key,)
        rows = [{"origin": int(r.origin), "horizon": int(r.horizon), "bin_start": int((r.bin + first_bin) * BIN), "forecast": round(float(getattr(r, chosen)), 2),
                 "lo": round(min(float(r.lo), float(getattr(r, chosen))), 2), "hi": round(max(float(r.hi), float(getattr(r, chosen))), 2),
                 "baseline": round(float(getattr(r, base)), 2), "actual": int(r.y)} for r in g.sort_values(["origin", "horizon"]).itertuples()]
        out.append({**dict(zip(keys, key)), "rows": rows})
    return out


def build(day, fixture=True, generated_at=None, commit=None):
    """Every stage after the tables are ready. Returns {file name: content}."""
    Y, S, series, first_bin = day["Y"], day["S"], day["series"], day["first_bin"]
    ctx = C.day_context(day["service_date"])
    rows = F.build_rows(Y, S, series, first_bin, day=day, ctx=ctx)
    effect, kept_new = F.select(rows); feats = F.BASE + kept_new         # which new features stay is settled on the development part
    pred, thin = F.rolling(rows, features=feats)
    for k in F.MODELS:
        rows[k] = pred[k]
    before = F.rolling(rows, features=F.BASE, kinds=["gbt"])[0]["gbt"] if kept_new else rows["gbt"].to_numpy()
    lab = _labels(day, rows); stop = pd.concat([rows, lab], axis=1)

    # other routes and other communities: learn from four groups, forecast the fifth, at the hourly origins of the untouched part
    hourly = [o for o in F.ORIGINS if o % 3600 == 0 and F.UNTOUCHED[0] <= o <= F.UNTOUCHED[1]]
    extra = []
    for name, col, note in (("other_routes", "route_group", "Routes in five groups: learn from four, forecast the fifth. No route is on both sides. Does it carry over to a route it has never seen?"),
                            ("other_communities", "community_group", "Communities in five groups: learn from four, forecast the fifth. Does it carry over to a part of the city it has never seen?")):
        g = stop[col].fillna(-1).to_numpy().astype(int)
        if len(set(g) - {-1}) >= 2:
            p = F.held_out_groups(rows, g, hourly, features=feats); f2 = stop[["origin", "horizon", "bin", "y", "route_id"] + list(naive.NAIVE)].copy()
            for k in F.MODELS:
                f2[k] = p[k]
            extra.append((name, note, f2))

    # choose on the development part of the stop table, then set the ranges for the chosen model
    models = list(naive.NAIVE) + list(F.MODELS)
    chosen = E.choose(E.pooled(F.development(stop), models)[0])
    stop["lo"], stop["hi"], _ = F.ranges(stop, stop[chosen].to_numpy(), PROMISED)
    route = F.to_routes(stop, series, models).merge(stop.groupby("route_id")[["bus_type", "route_group"]].first().reset_index(), on="route_id")
    route["time_block"] = E.time_block((route["bin"] + first_bin) * BIN)
    route["lo"], route["hi"], _ = F.ranges(route, route[chosen].to_numpy(), PROMISED)

    label = lambda prefix: (lambda x: f"{prefix} {x}")
    blocks = ("time_block", lambda x: E.BLOCK_LABEL[x])
    stop_kinds = {"time_block": blocks, "direction": ("direction", label("Direction")), "bus_type": ("bus_type", label("Routes run mostly by buses of type")),
                  "route_group": ("route_group", label("Route group")), "community_group": ("community_group", lambda x: f"Community group {int(x)}")}
    route_kinds = {"time_block": blocks, "bus_type": ("bus_type", label("Routes run mostly by buses of type")), "route_group": ("route_group", label("Route group"))}
    if route["route_id"].nunique() <= 40:
        route_kinds["route"] = ("route_id", label("Route"))
    t_route, _ = _target("route", route, route_kinds, chosen_from=chosen)
    t_stop, _ = _target("stop", stop, stop_kinds, chosen_from=chosen, extra=extra)
    date = pd.Timestamp(day["service_date"]).strftime("%A %-d %B %Y") if os.name != "nt" else day["service_date"]
    for t in (t_route, t_stop):
        t["cautions"] = _cautions(t)
    t_stop["features"] = F.importance(rows, F.UNTOUCHED[0], feats)    # learned from the hours before 16:00 only
    mae_of = lambda part, p: round(float(np.mean(np.abs(part["y"].to_numpy() - p[part.index.to_numpy()]))), 4); gbt_now = rows["gbt"].to_numpy(); d_, u_ = F.development(rows), F.untouched(rows)
    t_stop["feature_effect"] = {"table": effect, "kept": kept_new, "scored_with": "gbt", "development": {"mae_before": mae_of(d_, before), "mae_after": mae_of(d_, gbt_now)}, "untouched": {"mae_before": mae_of(u_, before), "mae_after": mae_of(u_, gbt_now)},
                                "untouched_by_horizon": [{"horizon": int(h), "n": len(x), "mae_before": mae_of(x, before), "mae_after": mae_of(x, gbt_now)} for h, x in u_.groupby("horizon", sort=True)]}
    for t in (t_route, t_stop):
        t["tested_on"] = f"Tested on one day only: {date}, in the school holidays."
        t["tested_on_more"] = "Later hours of that day, and routes and communities the model had not seen, are what was tested. Nothing was tested on another day, and a school day may look different."
    base = t_stop["best_naive"]

    # At an origin with too little of the day behind it, a model can only repeat the timetable. Those forecasts are learned from but not shown as the model's.
    shown_stop, shown_route = stop[~stop["origin"].isin(thin)], route[~route["origin"].isin(thin)]
    # What a screen is given for stops: the one-hour look-ahead, for the busiest series. The file says how many it kept of how many.
    busy = stop.groupby("series")["y"].sum().sort_values(ascending=False, kind="stable"); kept = set(busy.index[:STOP_FILE_SERIES])
    stop_file = shown_stop[(shown_stop["horizon"] == STOP_FILE_HORIZON) & shown_stop["series"].isin(kept)]
    gap, decisions, v, trips = B.gap_and_decisions(day)
    replay, left_out = B.replay(day)
    net = B.network(day)
    net["routes"] = [r for r in net["routes"] if r["route_id"] in replay] or net["routes"]
    people = B.personas(day, decisions, v, trips)
    boardings = int(v["on"].sum()); closed = int((~v["door_opened"]).sum()); nobody = int(((v["on"] + v["off"]) == 0).sum())
    hour = next((r for r in t_route["results"] if r["model"] == chosen and r["horizon"] == 3600 and r["subset"] == "all"), None)
    summary = [{"key": "boardings", "label": "Boardings on the day", "value": boardings, "unit": "boardings", "kind": "measured", "source": "replay/"},
               {"key": "doors_not_opened", "label": "Stop visits where the door did not open", "value": closed, "unit": f"of {len(v)}", "kind": "measured", "source": "replay/"},
               {"key": "visits_with_nobody", "label": "Stop visits where nobody boarded and nobody alighted", "value": nobody, "unit": f"of {len(v)}", "kind": "measured", "source": "replay/"},
               {"key": "trips_over_seats", "label": "Trips with more passengers than seats", "value": int((trips["peak"] > trips["seats"]).sum()), "unit": f"of {len(trips)}", "kind": "measured", "source": "replay/"},
               {"key": "trips_under_a_third_full", "label": "Trips that never filled a third of their seats", "value": int((trips["peak"] < trips["seats"] * B.SPARE_SHARE).sum()), "unit": f"of {len(trips)}", "kind": "measured", "source": "replay/"},
               {"key": "trips", "label": "Bus trips on the day", "value": len(trips), "unit": "trips", "kind": "measured", "source": "replay/"},
               {"key": "routes", "label": "Routes", "value": len(net["routes"]), "unit": "routes", "kind": "measured", "source": "network.json"},
               {"key": "stops", "label": "Stops", "value": len(net["stops"]), "unit": "stops", "kind": "measured", "source": "network.json"},
               {"key": "wape_60", "label": "Forecast error one hour ahead, by route (WAPE)", "value": hour and hour["wape"], "unit": "share", "kind": "measured", "source": "metrics.json"},
               {"key": "skill_60", "label": "Better than the best naive forecast, one hour ahead", "value": hour and hour["skill"], "unit": "share of error removed", "kind": "measured", "source": "metrics.json"},
               {"key": "range_kept", "label": "How often the truth fell inside the stated range", "value": t_stop["range"]["kept"], "unit": "share, nine in ten promised", "kind": "measured", "source": "metrics.json"}]
    origins = sorted(int(x) for x in shown_stop["origin"].unique())
    meta = {"contract_version": 1, "service_date": day["service_date"], "generated_at": generated_at, "commit": commit, "bin_seconds": BIN, "origins": origins, "horizons_seconds": F.HORIZONS,
            "counts": {"routes": len(net["routes"]), "stops": len(net["stops"]), "trips": int(sum(len(r["trips"]) for r in replay.values())), "stop_visits": len(v), "boardings": boardings},
            "notes": (("Stand-in data. The network is real and public (" + day["network_source"]["credit"] + "); every passenger, vehicle and lateness on it is invented. " if day.get("network_source") else "Stand-in data. Invented network, invented numbers. ") if fixture else "") + "Seat counts only: standing capacity is marked not verified in the supplied data. One day: nothing here was tested on another day.",
            "context": {"weather_found": ctx["found"]["weather"], "calendar_found": ctx["found"]["calendar"], "school_holiday": bool(ctx["school_holiday"]), "public_holiday": bool(ctx["public_holiday"]),
                        "heat_index_c_lowest": min(ctx["heat"].values()) if ctx["heat"] else None, "heat_index_c_highest": max(ctx["heat"].values()) if ctx["heat"] else None,
                        "sources": ["opendata/public/weather-hourly.csv (Open-Meteo)", "opendata/public/calendar.csv"]},
            "engine": {"boosted_trees": F.boosted_trees_library(), "chosen": chosen, "origins_with_too_little_to_learn_from": [int(x) for x in thin], "trips_left_out_of_the_replay": int(left_out)},
            "stages": day["log"]}
    files = {"meta.json": meta, "network.json": net, "metrics.json": {"targets": [t_route, t_stop]}, "decisions.json": {"decisions": decisions}, "personas.json": {"personas": people},
             "summary.json": {"headline": summary}, "gap.json": gap,
             "forecast/boardings-route.json": {"target": "boardings", "level": "route", "bin_seconds": BIN, "model": chosen, "baseline_model": base, "series": [{"id": s.pop("route_id"), **s} for s in _series_json(shown_route, ["route_id"], chosen, base, first_bin)]},
             "forecast/boardings-stop.json": {"target": "boardings", "level": "stop", "bin_seconds": BIN, "model": chosen, "baseline_model": base,
                                              "horizons_kept": [STOP_FILE_HORIZON], "series_kept": int(min(len(busy), STOP_FILE_SERIES)), "series_in_all": int(len(busy)),
                                              "kept_note": "This file holds the one-hour look-ahead for the busiest stops on each route. Every stop and every look-ahead is in the table of error in metrics.json.",
                                              "series": [{"id": s.pop("stop_id"), **s} for s in _series_json(stop_file, ["stop_id", "route_id", "direction"], chosen, base, first_bin)]},
             "replay/index.json": {"routes": [{"route_id": rid, "file": f"replay/route-{rid}.json", "trips": len(r["trips"])} for rid, r in replay.items()]}}
    for rid, r in replay.items():
        files[f"replay/route-{rid}.json"] = r
    late, late_file, pick = _lateness(day, ctx)
    if late:
        files["metrics.json"]["targets"].append(late); files["forecast/delay-route.json"] = late_file; files["forecast/judge_pick.json"] = dict(pick, service_day=day["service_date"])
        row = next((r for r in late["results"] if r["model"] == "gbt" and r["horizon"] == 5 and r["subset"] == "all"), None)
        if row:
            summary.append({"key": "late_mae_5", "label": "Average miss on lateness five stops ahead", "value": row["mae"], "unit": "seconds", "kind": "measured", "source": "metrics.json"})
    trip = T.run(day["visits"])
    if trip:
        files["forecast/scatter.json"] = dict(trip, version=1, service_day=day["service_date"])
    if fixture:                                                         # the two files a screen reads say what they are in words too
        for name in ("forecast/judge_pick.json", "forecast/scatter.json"):
            if name in files:
                files[name]["label"] = "Stand-in data: invented tables, not a result"
    return {name: {"fixture": bool(fixture), **content} for name, content in files.items()}


def _clean(x):
    """Plain JSON values: numpy numbers become Python numbers, and a missing value becomes null."""
    if isinstance(x, dict):
        return {str(k): _clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_clean(v) for v in x]
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (float, np.floating)):
        return None if x != x else float(x)
    if isinstance(x, np.bool_):
        return bool(x)
    return x


def _text(name, content):
    small = name.startswith(("forecast/", "replay/route-"))             # the large files are written without spaces
    return json.dumps(_clean(content), ensure_ascii=False, sort_keys=True, allow_nan=False, **({"separators": (",", ":")} if small else {"indent": 1})) + "\n"


def write(files, out):
    for name, content in files.items():
        path = os.path.join(out, name); os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(_text(name, content))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--data", required=True); ap.add_argument("--out"); ap.add_argument("--real", action="store_true", help="the tables are RTA's: write fixture false")
    ap.add_argument("--plain", action="store_true", help="leave the time and the commit out of meta.json, so the bundle can be compared byte for byte (fixtures/ is written this way)")
    ap.add_argument("--check", metavar="FOLDER", help="write nothing: run on the tables and say whether FOLDER equals the result, file for file")
    a = ap.parse_args()
    if a.check:
        fresh = {name: _text(name, content) for name, content in build(prepare(load(a.data)), fixture=not a.real).items()}
        on_disk = {os.path.relpath(os.path.join(d, f), a.check) for d, _, fs in os.walk(a.check) for f in fs if f.endswith(".json") and os.sep + "raw" not in d and os.sep + "watchers" not in d}      # fixtures/watchers/ is stream D's, not the engine's
        bad = sorted(n for n, text in fresh.items() if not os.path.exists(os.path.join(a.check, n)) or open(os.path.join(a.check, n), encoding="utf-8").read() != text) + sorted(on_disk - set(fresh))
        print(f"FAIL {a.check} differs from a fresh run of the engine on {a.data}: " + ", ".join(bad[:8]) if bad else f"PASS {a.check} equals a fresh run of the engine on {a.data} ({len(fresh)} files)")
        print("ALL PASS" if not bad else "1 FAILED"); return 1 if bad else 0
    if not a.out:
        ap.error("--out is needed unless --check is given")
    marked = os.path.exists(os.path.join(a.data, "README.txt")) and open(os.path.join(a.data, "README.txt")).read().startswith("STAND-IN DATA")
    if a.real and marked:
        print("REFUSED: --real was given but these tables carry the stand-in mark"); return 1
    if os.path.abspath(a.out) == os.path.abspath("artifacts") and not a.real:
        print("REFUSED: artifacts/ holds real results only; write a stand-in run somewhere else"); return 1
    day = prepare(load(a.data))
    for line in day["log"]:
        print(f"STAGE {line['stage']}: " + ", ".join(f"{k} {v}" for k, v in line.items() if k not in ("stage", "text")))
    try:
        commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip() or None
    except OSError:
        commit = None
    files = build(day, fixture=not a.real, generated_at=None if a.plain else datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), commit=None if a.plain else commit)
    write(files, a.out)
    m = files["metrics.json"]["targets"]
    for t in m:
        print(f"TABLE {t['target']} by {t['level']}, untouched part, every horizon together (best naive forecast: {t['best_naive']}; chosen on development: {t['chosen']})")
        for r in t["pooled"]:
            gain = "" if r["skill"] is None else f"  gain over {r['skill_vs']} {r['skill']:+.3f} ({r['skill_lo']:+.3f} to {r['skill_hi']:+.3f})"
            shares = "" if r["wape"] is None else f"  WAPE {r['wape']}  MAPE {r['mape']} over {r['mape_n']}"
            print(f"  {r['model']:<16} n {r['n']:>6}  MAE {r['mae']:.3f}  RMSE {r['rmse']:.3f}{shares}{gain}")
        print(f"  range promised {t['range']['promised']}, kept {t['range']['kept']}")
    print(f"WROTE {len(files)} files to {a.out} (fixture {not a.real})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
