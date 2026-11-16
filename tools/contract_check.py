#!/usr/bin/env python3
"""Checks a bundle (fixtures/ or artifacts/) against docs/CONTRACT.md. Every lane runs this before it pushes.

  python3 tools/contract_check.py fixtures
  python3 tools/contract_check.py artifacts

It prints one PASS or FAIL line per rule and ends with ALL PASS, or the number that failed.
A screen may rely on anything this file checks, and on nothing else.
"""
import json, math, os, sys

LEVERS = {"right_bus", "right_time", "right_stop", "rewarded_choice", "on_demand"}
KINDS = {"measured", "simulated"}
SCENES = {"control_room", "stop", "bus", "phone", "street"}
failed = 0


def check(name, ok, detail=""):
    global failed
    if ok:
        print("PASS " + name)
    else:
        failed += 1
        print("FAIL " + name + (": " + str(detail)[:300] if detail else ""))


def num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def main():
    if len(sys.argv) < 2:
        print("usage: contract_check.py <bundle folder>"); return 2
    root = sys.argv[1]

    def load(name):
        path = os.path.join(root, name)
        if not os.path.exists(path):
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    need = ["meta.json", "network.json", "metrics.json", "decisions.json", "personas.json", "summary.json", "replay/index.json", "forecast/boardings-route.json", "forecast/boardings-stop.json", "gap.json"]
    got = {n: load(n) for n in need}
    missing = [n for n, v in got.items() if v is None]
    check("every required file is present", not missing, missing)
    if missing:
        print(f"{failed} FAILED"); return 1
    meta, net, metrics, dec, per, summ, index = (got[n] for n in need[:7])

    # one flag for the whole bundle: stand-in data must never be mixed with real results
    flags = {n: v.get("fixture") for n, v in got.items()}
    check("every file carries the fixture flag, and they all agree", len(set(flags.values())) == 1 and isinstance(meta.get("fixture"), bool), flags)
    check("meta: contract_version is 1", meta.get("contract_version") == 1, meta.get("contract_version"))
    check("meta: service_date, bin_seconds, origins and horizons_seconds are set",
          isinstance(meta.get("service_date"), str) and meta.get("bin_seconds") in (900, 1800, 3600) and meta.get("origins") and meta.get("horizons_seconds"))

    stops = {s["stop_id"]: s for s in net.get("stops", [])}
    comms = {c["community_id"] for c in net.get("communities", [])}
    routes = {r["route_id"]: r for r in net.get("routes", [])}
    check("network: stops have an id, a name and a position inside the emirate's box",
          bool(stops) and all(isinstance(s.get("name"), str) and num(s.get("lon")) and num(s.get("lat")) and 54.8 < s["lon"] < 56.3 and 24.6 < s["lat"] < 25.6 for s in stops.values()))
    check("network: every stop's community exists (or is null)", all(s.get("community_id") is None or s["community_id"] in comms for s in stops.values()))
    check("network: every route lists stops that exist, with a shape of at least two points",
          bool(routes) and all(d.get("stops") and all(x in stops for x in d["stops"]) and len(d.get("shape", [])) >= 2 for r in routes.values() for d in r.get("directions", [])))

    # the replay: the day as it happened
    visits = trips = bad_ref = bad_time = bad_load = neg = 0
    listed = index.get("routes", [])
    check("replay: the index lists routes that exist", bool(listed) and all(x.get("route_id") in routes for x in listed))
    for item in listed:
        r = load(item["file"])
        if r is None:
            check(f"replay: {item['file']} is present", False); continue
        if r.get("fixture") != meta.get("fixture"):
            check(f"replay: {item['file']} carries the same fixture flag", False)
        for t in r.get("trips", []):
            trips += 1
            if not (num(t.get("seats")) and t["seats"] > 0 and isinstance(t.get("bus_type"), str)):
                neg += 1
            load_now, last = 0, None
            for v in t.get("visits", []):
                visits += 1
                if v.get("stop_id") not in stops:
                    bad_ref += 1
                if not all(num(v.get(k)) for k in ("sched_arr", "act_arr", "sched_dep", "act_dep", "on", "off", "load")) or v["on"] < 0 or v["off"] < 0 or v["load"] < 0:
                    neg += 1; continue
                if v["act_dep"] < v["act_arr"] or (last is not None and v["act_arr"] < last):
                    bad_time += 1
                last = v["act_dep"]
                load_now = load_now - v["off"] + v["on"]
                if load_now != v["load"]:
                    bad_load += 1
                if not isinstance(v.get("door_opened"), bool):
                    neg += 1
    check(f"replay: {trips} trips and {visits} stop visits, each at a stop that exists", visits > 0 and bad_ref == 0, bad_ref)
    check("replay: counts are whole numbers that are not negative, seats are known", neg == 0, neg)
    check("replay: a bus leaves a stop after it arrives, and reaches the next stop later", bad_time == 0, bad_time)
    check("replay: the load after each stop equals the load before, less those who got off, plus those who got on", bad_load == 0, bad_load)

    # forecasts
    for name in ("forecast/boardings-route.json", "forecast/boardings-stop.json"):
        f = load(name)
        if f is None:
            continue
        rows = [r for s in f.get("series", []) for r in s.get("rows", [])]
        ok = bool(rows) and all(num(r.get("forecast")) and num(r.get("lo")) and num(r.get("hi")) and r["lo"] <= r["forecast"] <= r["hi"] and r["forecast"] >= 0
                                and r.get("origin") is not None and r.get("horizon") in meta["horizons_seconds"] and r["bin_start"] + f.get("bin_seconds", 0) == r["origin"] + r["horizon"]
                                and num(r.get("baseline")) and r["baseline"] >= 0 and (r.get("actual") is None or num(r["actual"])) for r in rows)
        check(f"{name}: every row has a forecast inside its interval and the naive forecast for the same bin, for a bin that ends at origin plus horizon", ok)
        if f.get("level") == "stop":
            check(f"{name}: every stop series names a stop and a route that exist, and a direction of 0 or 1 if it gives one", all(s.get("id") in stops and s.get("route_id") in routes and s.get("direction", 0) in (0, 1) for s in f.get("series", [])))
        check(f"{name}: no forecast is made for a bin that had already ended at its origin", all(r["bin_start"] + f.get("bin_seconds", 0) > r["origin"] for r in rows))

    late = load("forecast/delay-route.json")
    if late is not None:
        rows = [r for s in late.get("series", []) for r in s.get("rows", [])]
        check("forecast/delay-route.json: carries the fixture flag, names routes that exist, and every row has its stops ahead, a forecast inside its range, the naive forecast and what happened",
              late.get("fixture") == meta.get("fixture") and late.get("horizon_unit") == "stops" and bool(rows) and all(s.get("id") in routes for s in late["series"])
              and all(num(r.get("origin")) and r.get("stops_ahead") in (1, 5, 10, 20) and num(r.get("forecast")) and num(r.get("lo")) and num(r.get("hi")) and r["lo"] <= r["forecast"] <= r["hi"] and num(r.get("baseline")) and (r.get("actual") is None or num(r["actual"])) for r in rows))

    # metrics: the table the judges read
    targets = metrics.get("targets", [])
    check("metrics: at least one target", bool(targets))
    for t in targets:
        tag = "metrics " + str(t.get("target"))
        models = {m["model"]: m for m in t.get("models", [])}
        res = t.get("results", [])
        check(f"{tag}: names its split, its unit and its MAPE rule", isinstance(t.get("split"), dict) and t["split"].get("kind") and t.get("unit") and t.get("mape_rule"))
        check(f"{tag}: has at least one baseline and one model that is not a baseline", any(m.get("is_baseline") for m in models.values()) and any(not m.get("is_baseline") for m in models.values()))
        ok = bool(res) and all(r.get("model") in models and num(r.get("n")) and r["n"] > 0 and num(r.get("mae")) and num(r.get("rmse")) and r["rmse"] >= r["mae"] - 1e-9
                               and (r.get("mape") is None or (num(r["mape"]) and num(r.get("mape_n")) and r["mape_n"] > 0)) for r in res)
        check(f"{tag}: every result has n, MAE and RMSE, RMSE is not below MAE, and MAPE says over how many bins it was taken", ok)
        subsets = {s["subset"] for s in t.get("subsets", [])}
        check(f"{tag}: every result's subset is declared, and 'all' is among them", "all" in subsets and all(r.get("subset") in subsets for r in res))
        kinds = {s.get("kind") for s in t.get("subsets", [])}
        check(f"{tag}: error is reported on more than one kind of subset (the stability criterion)", len(kinds - {"all"}) >= 2, kinds)
        horizons = {r.get("horizon") for r in res}
        check(f"{tag}: error is reported at more than one horizon", len(horizons) >= 2, horizons)
        share = lambda x: num(x) and 0 <= x <= 1
        if "pooled" in t:
            check(f"{tag}: the table of every horizon together names models that exist, and a gain with a range has the range around the gain",
                  bool(t["pooled"]) and all(r.get("model") in models and num(r.get("n")) and num(r.get("mae")) and (r.get("skill") is None or (r.get("skill_vs") in models and num(r.get("skill_lo")) and num(r.get("skill_hi")) and r["skill_lo"] <= r["skill"] + 1e-9 and r["skill"] <= r["skill_hi"] + 1e-9)) for r in t["pooled"]))
        if "chosen" in t or "best_naive" in t:
            check(f"{tag}: the model chosen is a model, the best naive forecast is a naive forecast, and it says what it was tested on",
                  not models.get(t.get("chosen"), {"is_baseline": True}).get("is_baseline") and models.get(t.get("best_naive"), {}).get("is_baseline") is True and isinstance(t.get("tested_on", ""), str))
        if "range" in t:
            g = t["range"]
            check(f"{tag}: the range says what was promised and how often it was kept", share(g.get("promised")) and share(g.get("kept")) and all(g.get(k) is None or share(g[k]) for k in ("kept_when_nobody_boarded", "kept_when_somebody_boarded")), g)
        if t.get("features"):
            check(f"{tag}: what the model leans on is given in plain words with shares that add up to one", all(f.get("feature") and f.get("label") and share(f.get("share")) for f in t["features"]) and abs(sum(f["share"] for f in t["features"]) - 1) < 0.02)
        for m in t.get("more_tables") or []:
            check(f"{tag}: the table '{m.get('table')}' has a note, results and models that exist", bool(m.get("table") and m.get("note") and m.get("results")) and all(r.get("model") in models and num(r.get("mae")) for r in m["results"]))
        need_skill = [r for r in res if not models.get(r.get("model"), {}).get("is_baseline")]
        check(f"{tag}: every model that is not a baseline states its gain over a named baseline", all(r.get("skill_vs") in models and (r.get("skill") is None or num(r["skill"])) for r in need_skill))

    # decisions and points of view
    ds = dec.get("decisions", [])
    ids = {d.get("id") for d in ds}
    check("decisions: each has an id, a known lever, a title, a change and a plain reason", bool(ds) and len(ids) == len(ds) and all(d.get("lever") in LEVERS and d.get("title") and d.get("change") and d.get("why") for d in ds))
    check("decisions: each shows its evidence with a value, a unit and where it came from", all(d.get("evidence") and all(num(e.get("value")) and e.get("unit") and e.get("source") and e.get("label") for e in d["evidence"]) for d in ds))
    check("decisions: every effect says whether it was measured or simulated, and a simulated one states its assumption",
          all(d.get("effect") and all(e.get("kind") in KINDS and num(e.get("before")) and num(e.get("after")) and (e["kind"] == "measured" or e.get("assumption")) for e in d["effect"]) for d in ds))
    check("decisions: each says how many passengers it affects", all(num(d.get("passengers_affected")) and d["passengers_affected"] >= 0 for d in ds))
    rc = [d for d in ds if d.get("lever") == "rewarded_choice"]
    check("decisions: a rewarded choice carries its offers, each with its walk in metres and minutes, the extra minutes, the points, and a stop and route that exist",
          all(d.get("offers") and all(o.get("kind") in ("other_route", "earlier", "later") and o.get("route_id") in routes and o.get("stop_id") in stops and num(o.get("depart"))
                                      and all(num(o.get(k)) and o[k] >= 0 for k in ("walk_metres", "walk_minutes", "extra_minutes", "points")) for o in d["offers"]) for d in rc))
    side = lambda x: isinstance(x, dict) and x.get("route_id") in routes and isinstance(x.get("trip_id"), str) and isinstance(x.get("vehicle"), str) and isinstance(x.get("bus_type"), str) and all(num(x.get(k)) and x[k] >= 0 for k in ("seats", "start", "largest_load"))
    check("decisions: where a right-bus decision lists its swaps, each names two trips with their route, stand-in vehicle, seats, start and largest load",
          all(side(w.get("from")) and side(w.get("to")) for d in ds if d.get("lever") == "right_bus" for w in d.get("swaps") or []))
    gap = got["gap.json"]
    grows = gap.get("rows", [])
    check("gap: every row is a route and direction that exist, in one hour, with seats, the largest loads, people over seats, seats spare and an index from 0.1 to 10",
          bool(grows) and all(g.get("route_id") in routes and g.get("direction") in (0, 1) and num(g.get("hour_start")) and all(num(g.get(k)) and g[k] >= 0 for k in ("seats_offered", "forecast_peak_load", "over", "spare"))
                              and num(g.get("index")) and 0.1 <= g["index"] <= 10 for g in grows))
    tot = gap.get("totals") or {}
    check("gap: the totals before and after are given, marked simulated with the assumption, and after is not worse than before",
          tot.get("kind") in KINDS and (tot.get("kind") == "measured" or tot.get("assumption")) and all(num((tot.get(w) or {}).get(k)) for w in ("before", "after") for k in ("passenger_minutes_over_seats", "empty_seat_km"))
          and tot["after"]["passenger_minutes_over_seats"] <= tot["before"]["passenger_minutes_over_seats"])
    check("decisions: places named exist", all((d["where"].get("route_id") is None or d["where"]["route_id"] in routes) and all(s in stops for s in d["where"].get("stop_ids") or []) for d in ds))
    ps = per.get("personas", [])
    check("points of view: each is labelled fictional and has steps", bool(ps) and all("ictional" in (p.get("label") or "") and p.get("steps") for p in ps))
    check("points of view: every step has one sentence, a known scene, a kind, and a decision that exists (or none)",
          all(isinstance(s.get("say"), str) and 0 < len(s["say"].split()) <= 28 and s.get("scene") in SCENES and s.get("kind") in KINDS and (s.get("decision_id") is None or s["decision_id"] in ids) for p in ps for s in p["steps"]))
    hs = summ.get("headline", [])
    check("summary: every headline number has a label, a unit, a kind and a source", bool(hs) and all(h.get("label") and (h.get("value") is None or num(h["value"])) and h.get("unit") and h.get("kind") in KINDS and h.get("source") for h in hs))

    print("ALL PASS" if not failed else f"{failed} FAILED")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
