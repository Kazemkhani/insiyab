"""One command runs every stage and writes the bundle (docs/MODEL-PLAN.md, section 9):

  python3 -m model.run --data fixtures/raw --out <folder>       on the invented tables
  python3 -m model.run --data <folder> --out artifacts --real   on RTA's tables, where they are allowed to be

The bundle says "fixture": true unless --real is given, and --real is refused if the tables carry the stand-in mark.
The same input gives the same bundle, byte for byte, apart from generated_at and commit in meta.json.
Inside Dataiku: bundle = build(prepare(tables), fixture=False), with tables read as DataFrames."""
import argparse, datetime, json, os, subprocess, sys
import numpy as np
import pandas as pd
from . import bundle as B, evaluate as E, forecast as F, naive
from .measures import MAPE_RULE
from .prepare import BIN, load, prepare

PROMISED = 0.9


def _labels(day, rows):
    """The subset every row belongs to, for the stability table. Each label comes from the plan or the fleet, not from the target."""
    s = day["series"].iloc[rows["series"].to_numpy()].reset_index(drop=True)
    kind = day["visits"].groupby("route_id")["bus_type"].agg(lambda x: x.value_counts().index[0])       # the kind of bus that ran most of the route's visits
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
    kept = float(((final["y"] >= final["lo"] - 1e-9) & (final["y"] <= final["hi"] + 1e-9)).mean())
    _, dev_masks = E.subsets_of(dev, {"time_block": kinds["time_block"]})
    more = [{"table": "development", "note": "Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.",
             "split": {"kind": "rolling_origin", "origins": sorted(int(x) for x in dev["origin"].unique())}, "results": E.table(dev, models, dev_masks), "pooled": dev_pooled}]
    for name, note, f2 in extra or []:
        f2 = f2.dropna(subset=list(F.MODELS))
        if len(f2):
            more.append({"table": name, "note": note, "split": {"kind": name, "origins": sorted(int(x) for x in f2["origin"].unique())},
                         "results": E.table(f2, models, {"all": np.ones(len(f2), bool)}), "pooled": E.pooled(f2, models)[0]})
    return {"target": "boardings", "level": level, "unit": f"passengers boarding per {level} per 15 minutes",
            "split": {"kind": "rolling_origin", "part": "untouched", "origins": sorted(int(x) for x in final["origin"].unique()),
                      "train": "at each origin, every forecast whose quarter of an hour had ended by then; nothing later",
                      "test": "the quarter of an hour that ends at origin plus horizon, for origins from 16:00 to 21:30, set aside at the start and scored once"},
            "mape_rule": MAPE_RULE, "models": E.models_declared(chosen), "chosen": chosen, "chosen_on": "development", "best_naive": best,
            "subsets": declared, "results": E.table(final, models, masks), "pooled": final_pooled,
            "range": {"promised": PROMISED, "kept": round(kept, 4), "model": chosen, "n": len(final)}, "more_tables": more}, chosen


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
    rows = F.build_rows(Y, S, series, first_bin)
    pred, thin = F.rolling(rows)
    for k in F.MODELS:
        rows[k] = pred[k]
    lab = _labels(day, rows); stop = pd.concat([rows, lab], axis=1)

    # other routes and other communities: learn from four groups, forecast the fifth, at the hourly origins of the untouched part
    hourly = [o for o in F.ORIGINS if o % 3600 == 0 and F.UNTOUCHED[0] <= o <= F.UNTOUCHED[1]]
    extra = []
    for name, col, note in (("other_routes", "route_group", "Routes in five groups: learn from four, forecast the fifth. No route is on both sides. Does it carry over to a route it has never seen?"),
                            ("other_communities", "community_group", "Communities in five groups: learn from four, forecast the fifth. Does it carry over to a part of the city it has never seen?")):
        g = stop[col].fillna(-1).to_numpy().astype(int)
        if len(set(g) - {-1}) >= 2:
            p = F.held_out_groups(rows, g, hourly); f2 = stop[["origin", "horizon", "bin", "y", "route_id"] + list(naive.NAIVE)].copy()
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
        t["tested_on"] = f"later hours of one day, {date}. Not tested on another day."
    base = t_stop["best_naive"]

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
               {"key": "wape_60", "label": "Forecast error one hour ahead, by route (WAPE)", "value": hour and hour["wape"], "unit": "share", "kind": "measured", "source": "metrics.json"},
               {"key": "skill_60", "label": "Better than the best naive forecast, one hour ahead", "value": hour and hour["skill"], "unit": "share of error removed", "kind": "measured", "source": "metrics.json"},
               {"key": "range_kept", "label": "How often the truth fell inside the stated range", "value": t_stop["range"]["kept"], "unit": "share, nine in ten promised", "kind": "measured", "source": "metrics.json"}]
    origins = sorted(int(x) for x in rows["origin"].unique())
    meta = {"contract_version": 1, "service_date": day["service_date"], "generated_at": generated_at, "commit": commit, "bin_seconds": BIN, "origins": origins, "horizons_seconds": F.HORIZONS,
            "counts": {"routes": len(net["routes"]), "stops": len(net["stops"]), "trips": int(sum(len(r["trips"]) for r in replay.values())), "stop_visits": len(v), "boardings": boardings},
            "notes": ("Stand-in data. Invented network, invented numbers. " if fixture else "") + "Seat counts only: standing capacity is marked not verified in the supplied data. One day: nothing here was tested on another day.",
            "engine": {"boosted_trees": F.boosted_trees_library(), "chosen": chosen, "origins_with_too_little_to_learn_from": int(thin), "trips_left_out_of_the_replay": int(left_out)},
            "stages": day["log"]}
    files = {"meta.json": meta, "network.json": net, "metrics.json": {"targets": [t_route, t_stop]}, "decisions.json": {"decisions": decisions}, "personas.json": {"personas": people},
             "summary.json": {"headline": summary}, "gap.json": gap,
             "forecast/boardings-route.json": {"target": "boardings", "level": "route", "bin_seconds": BIN, "model": chosen, "baseline_model": base, "series": [{"id": s.pop("route_id"), **s} for s in _series_json(route, ["route_id"], chosen, base, first_bin)]},
             "forecast/boardings-stop.json": {"target": "boardings", "level": "stop", "bin_seconds": BIN, "model": chosen, "baseline_model": base,
                                              "series": [{"id": s.pop("stop_id"), **s} for s in _series_json(stop, ["stop_id", "route_id", "direction"], chosen, base, first_bin)]},
             "replay/index.json": {"routes": [{"route_id": rid, "file": f"replay/route-{rid}.json", "trips": len(r["trips"])} for rid, r in replay.items()]}}
    for rid, r in replay.items():
        files[f"replay/route-{rid}.json"] = r
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


def write(files, out):
    for name, content in files.items():
        path = os.path.join(out, name); os.makedirs(os.path.dirname(path), exist_ok=True)
        small = name.startswith(("forecast/", "replay/route-"))         # the large files are written without spaces
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(_clean(content), ensure_ascii=False, sort_keys=True, allow_nan=False, **({"separators": (",", ":")} if small else {"indent": 1})) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--data", required=True); ap.add_argument("--out", required=True); ap.add_argument("--real", action="store_true", help="the tables are RTA's: write fixture false")
    a = ap.parse_args()
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
    files = build(day, fixture=not a.real, generated_at=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), commit=commit)
    write(files, a.out)
    m = files["metrics.json"]["targets"]
    for t in m:
        print(f"TABLE boardings by {t['level']}, untouched part, every horizon together (best naive forecast: {t['best_naive']}; chosen on development: {t['chosen']})")
        for r in t["pooled"]:
            gain = "" if r["skill"] is None else f"  gain over {r['skill_vs']} {r['skill']:+.3f} ({r['skill_lo']:+.3f} to {r['skill_hi']:+.3f})"
            print(f"  {r['model']:<16} n {r['n']:>6}  MAE {r['mae']:.3f}  RMSE {r['rmse']:.3f}  WAPE {r['wape']}  MAPE {r['mape']} over {r['mape_n']}{gain}")
        print(f"  range promised {t['range']['promised']}, kept {t['range']['kept']}")
    print(f"WROTE {len(files)} files to {a.out} (fixture {not a.real})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
