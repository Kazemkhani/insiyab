#!/usr/bin/env python3
"""Writes the stand-in bundle in fixtures/: made-up data with exactly the shape of docs/CONTRACT.md.

Every file carries "fixture": true, and every screen that reads it must say STAND-IN DATA, NOT A RESULT.
Nothing here comes from RTA's data. The network is invented, the stop names are invented, and the numbers
come from a seeded random generator, so the bundle is the same on every machine.

  python3 tools/make_fixture.py            write fixtures/
  python3 tools/make_fixture.py --check    rebuild in memory and fail if fixtures/ differs
"""
import json, math, os, random, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "fixtures")
BIN = 900                                   # one bin is 15 minutes
DAY0, DAY1 = 5 * 3600, 24 * 3600            # the stand-in service day runs 05:00 to 24:00
ORIGINS = list(range(6 * 3600, 22 * 3600 + 1, 1800))   # a forecast is made every 30 minutes
HORIZONS = [900, 1800, 3600, 7200]
TYPES = {"MIDI": 25, "STANDARD": 35, "ARTICULATED": 52, "DOUBLE": 78}


def canonical(v):
    return json.dumps(v, ensure_ascii=False, indent=1, sort_keys=True) + "\n"


def demand_shape(t):
    """Share of the day's demand around second t: a morning and an evening peak on a flat base."""
    h = t / 3600
    return 0.25 + 1.0 * math.exp(-((h - 7.5) ** 2) / 2.2) + 0.85 * math.exp(-((h - 18.0) ** 2) / 3.0)


def build():
    rnd = random.Random(20251215)
    communities = [{"community_id": f"c{i + 1}", "name_en": f"Stand-in community {i + 1}", "name_ar": f"منطقة تجريبية {i + 1}",
                    "centroid": [round(55.20 + 0.06 * (i % 3), 5), round(25.10 + 0.05 * (i // 3), 5)]} for i in range(6)]
    stops, routes = [], []
    # four made-up routes, each a line of stops across the made-up communities
    plan = [("R1", 12, 55.18, 25.09, 0.012, 0.006, 1.6), ("R2", 10, 55.19, 25.17, 0.013, -0.004, 1.0),
            ("R3", 9, 55.22, 25.08, 0.004, 0.011, 0.55), ("R4", 8, 55.30, 25.10, -0.006, 0.010, 0.22)]
    for rid, n, lon0, lat0, dlon, dlat, weight in plan:
        ids = []
        for k in range(n):
            sid = f"{rid}-S{k + 1:02d}"
            lon, lat = round(lon0 + dlon * k, 5), round(lat0 + dlat * k, 5)
            comm = min(communities, key=lambda c: (c["centroid"][0] - lon) ** 2 + (c["centroid"][1] - lat) ** 2)["community_id"]
            stops.append({"stop_id": sid, "name": f"Stand-in stop {rid} {k + 1}", "lon": lon, "lat": lat, "community_id": comm})
            ids.append(sid)
        shape = [[s["lon"], s["lat"]] for s in stops if s["stop_id"] in ids]
        routes.append({"route_id": rid, "short_name": rid, "long_name": f"Stand-in route {rid}", "weight": weight,
                       "directions": [{"direction": 0, "stops": ids, "shape": shape},
                                      {"direction": 1, "stops": ids[::-1], "shape": shape[::-1]}]})
    stop_by_id = {s["stop_id"]: s for s in stops}

    # the day as it "happened": trips, visits, taps, loads, delays
    replay, vehicle_n = {}, 0
    board = {}                                               # (route, stop, bin) -> boardings
    for r in routes:
        trips, headway = [], 900 if r["weight"] > 0.9 else 1200 if r["weight"] > 0.4 else 1800
        btype = "STANDARD" if r["weight"] > 0.4 else "DOUBLE" if r["route_id"] == "R4" else "MIDI"   # R4 is deliberately oversupplied
        if r["route_id"] == "R1":
            btype = "STANDARD"                                # R1 is deliberately undersupplied at the peaks
        for d in r["directions"]:
            for start in range(DAY0, DAY1 - 3600, headway):
                vehicle_n += 1
                seats, t, load, late, visits = TYPES[btype], start, 0, 0, []
                year = rnd.choice([2008, 2008, 2012, 2016, 2019, 2022])
                for seq, sid in enumerate(d["stops"], 1):
                    last = seq == len(d["stops"])
                    sched = start + (seq - 1) * 240
                    late = max(-60, late + rnd.gauss(8 * demand_shape(sched), 22))
                    lam = 0 if last else r["weight"] * demand_shape(sched) * (7.0 if seq < 4 else 3.2)
                    on = 0 if last else min(max(0, int(rnd.gauss(lam, math.sqrt(lam + 0.3)) + 0.5)), 140)
                    off = load if last else min(load, int(load * (0.05 + 0.5 * seq / len(d["stops"])) * rnd.random() + 0.5))
                    opened = (on + off) > 0 or rnd.random() < 0.25
                    dwell = (12 + 2.2 * on + 1.4 * off) if opened else 0
                    arr = int(sched + late)
                    load = load - off + on
                    visits.append({"stop_id": sid, "seq": seq, "sched_arr": sched, "act_arr": arr, "sched_dep": sched + 20,
                                   "act_dep": int(arr + dwell), "door_opened": bool(opened), "on": on, "off": off, "load": load})
                    key = (r["route_id"], sid, (arr // BIN) * BIN)
                    board[key] = board.get(key, 0) + on
                    late += dwell * 0.15
                trips.append({"trip_id": f"{r['route_id']}-{d['direction']}-{start}", "direction": d["direction"], "vehicle": f"v{vehicle_n}",
                              "bus_type": btype, "seats": seats, "model_year": year, "visits": visits})
        replay[r["route_id"]] = {"fixture": True, "route_id": r["route_id"], "trips": trips}

    # forecasts: what a model that only knows the past would have said. Here: the truth plus noise that grows with the horizon.
    bins = list(range(DAY0, DAY1, BIN))
    actual_route = {r["route_id"]: {b: sum(v for (rid, _, bb), v in board.items() if rid == r["route_id"] and bb == b) for b in bins} for r in routes}
    def rows_for(series):
        out = []
        for o in ORIGINS:
            for h in HORIZONS:
                b = o + h - BIN
                if b not in series:
                    continue
                a = series[b]
                noise = rnd.gauss(0, 0.10 + 0.05 * math.log2(h / 900 + 1))
                f = max(0.0, a * (1 + noise) + rnd.gauss(0, 1.0))
                past = [series[x] for x in bins if x < o]
                base = float(past[-1]) if past else 0.0                 # the baseline: the last bin seen
                out.append({"origin": o, "bin_start": b, "horizon": h, "forecast": round(f, 2), "lo": round(max(0.0, f * 0.75 - 2), 2),
                            "hi": round(f * 1.25 + 2, 2), "actual": a, "baseline": round(base, 2)})
        return out
    f_route = {"fixture": True, "target": "boardings", "level": "route", "bin_seconds": BIN,
               "series": [{"id": rid, "rows": rows_for(s)} for rid, s in actual_route.items()]}
    busiest = sorted({(rid, sid) for (rid, sid, _) in board}, key=lambda k: -sum(v for (r2, s2, _), v in board.items() if (r2, s2) == k))
    f_stop = {"fixture": True, "target": "boardings", "level": "stop", "bin_seconds": BIN,
              "series": [{"id": sid, "route_id": rid, "rows": rows_for({b: board.get((rid, sid, b), 0) for b in bins})} for rid, sid in busiest]}

    # metrics, worked out from the forecast rows above, never typed in
    def score(rows, pick):
        e = [(r[pick] - r["actual"], r["actual"]) for r in rows]
        if not e:
            return None
        mae = sum(abs(d) for d, _ in e) / len(e)
        rmse = math.sqrt(sum(d * d for d, _ in e) / len(e))
        big = [(d, a) for d, a in e if a >= 5]                          # MAPE only where the truth is at least 5, and we say so
        mape = sum(abs(d) / a for d, a in big) / len(big) if big else None
        tot = sum(a for _, a in e)
        return {"n": len(e), "mae": round(mae, 3), "rmse": round(rmse, 3), "mape": None if mape is None else round(mape, 4),
                "mape_n": len(big), "wape": None if tot == 0 else round(sum(abs(d) for d, _ in e) / tot, 4)}
    allrows = [dict(r, id=s["id"]) for s in f_route["series"] for r in s["rows"]]
    def block(t):
        h = t / 3600
        return "early" if h < 6.5 else "am_peak" if h < 9.5 else "midday" if h < 16 else "pm_peak" if h < 20 else "late"
    subsets = [{"subset": "all", "kind": "all", "label": "Every held-out bin"}] + \
              [{"subset": b, "kind": "time_block", "label": b.replace("_", " ")} for b in ("early", "am_peak", "midday", "pm_peak", "late")] + \
              [{"subset": "route_" + r["route_id"], "kind": "route", "label": "Route " + r["route_id"]} for r in routes]
    results = []
    for h in HORIZONS:
        for sub in subsets:
            rows = [r for r in allrows if r["horizon"] == h and (sub["kind"] == "all" or (sub["kind"] == "time_block" and block(r["bin_start"]) == sub["subset"])
                                                               or (sub["kind"] == "route" and "route_" + r["id"] == sub["subset"]))]
            m, b = score(rows, "forecast"), score(rows, "baseline")
            if not m:
                continue
            skill = None if not b or not b["mae"] else round(1 - m["mae"] / b["mae"], 4)
            results.append(dict(m, model="insiyab", horizon=h, subset=sub["subset"], skill_vs="persistence", skill=skill))
            results.append(dict(b, model="persistence", horizon=h, subset=sub["subset"], skill_vs=None, skill=None))
    metrics = {"fixture": True, "targets": [{
        "target": "boardings", "level": "route", "unit": "passengers boarding per route per 15 minutes",
        "split": {"kind": "rolling_origin", "origins": ORIGINS, "train": "every bin that ended before the origin", "test": "the bin that ends at origin plus horizon"},
        "mape_rule": "MAPE is worked out only over bins where the true count is at least 5; mape_n says how many that was",
        "models": [{"model": "insiyab", "label": "Stand-in for the real model", "is_baseline": False},
                   {"model": "persistence", "label": "Same as the last 15 minutes seen", "is_baseline": True}],
        "subsets": subsets, "results": results}]}

    # decisions and the four points of view, tied to the stand-in records above
    peak = max(replay["R1"]["trips"], key=lambda t: max(v["load"] for v in t["visits"]))
    quiet = min(replay["R4"]["trips"], key=lambda t: max(v["load"] for v in t["visits"]))
    closed = sum(1 for r in replay.values() for t in r["trips"] for v in t["visits"] if not v["door_opened"])
    visits_n = sum(len(t["visits"]) for r in replay.values() for t in r["trips"])
    decisions = {"fixture": True, "decisions": [
        {"id": "d001", "lever": "right_bus", "title": "Put the big bus where the people are",
         "where": {"route_id": "R1", "stop_ids": [peak["visits"][0]["stop_id"]], "community_id": stop_by_id[peak["visits"][0]["stop_id"]]["community_id"]},
         "when": {"from": 6 * 3600 + 1800, "to": 9 * 3600},
         "evidence": [{"label": "Largest load on the fullest trip", "value": max(v["load"] for v in peak["visits"]), "unit": "passengers", "source": "replay/route-R1.json"},
                      {"label": "Seats on that bus", "value": peak["seats"], "unit": "seats", "source": "replay/route-R1.json"},
                      {"label": "Largest load on the emptiest R4 trip", "value": max(v["load"] for v in quiet["visits"]), "unit": "passengers", "source": "replay/route-R4.json"}],
         "change": "Swap the double-deck buses on route R4 with the standard buses on route R1 between 06:30 and 09:00.",
         "effect": [{"metric": "passengers_over_seats_minutes", "before": 5400, "after": 900, "kind": "simulated", "assumption": "the same passengers board at the same times; only the vehicles change"}],
         "passengers_affected": 640, "cost_note": "No extra bus and no extra driver.", "confidence": "medium",
         "why": "The forecast puts more people on R1 than its buses seat, while R4's larger buses run mostly empty in the same hours."},
        {"id": "d002", "lever": "right_stop", "title": "Stop only when someone is there",
         "where": {"route_id": "R4", "stop_ids": [s for s in routes[3]["directions"][0]["stops"][2:5]], "community_id": None},
         "when": {"from": 21 * 3600, "to": 24 * 3600},
         "evidence": [{"label": "Stop visits where the door did not open", "value": closed, "unit": "visits", "source": "replay/"},
                      {"label": "All stop visits", "value": visits_n, "unit": "visits", "source": "replay/"}],
         "change": "After 21:00, make three R4 stops request stops: the bus calls there when a passenger asks from the stop or from the bus.",
         "effect": [{"metric": "minutes_saved_per_trip", "before": 0, "after": 2.5, "kind": "simulated", "assumption": "25 seconds saved for each stop the bus no longer slows for"}],
         "passengers_affected": 12, "cost_note": "A request button or a tap in the app at each stop.", "confidence": "low",
         "why": "At these stops and hours the forecast says nobody boards or alights on most visits."},
        {"id": "d003", "lever": "rewarded_choice", "title": "Reward the passenger who takes the emptier bus",
         "where": {"route_id": "R1", "stop_ids": [peak["visits"][1]["stop_id"]], "community_id": None},
         "when": {"from": 7 * 3600, "to": 8 * 3600 + 1800},
         "evidence": [{"label": "Forecast boardings at the stop in the peak hour", "value": 210, "unit": "passengers", "source": "forecast/boardings-stop.json"},
                      {"label": "Free seats on route R2 within 400 metres in the same hour", "value": 95, "unit": "seats", "source": "replay/route-R2.json"}],
         "change": "Offer Khutwa points to passengers at this stop who take route R2 from a stop nearby, or travel 20 minutes earlier.",
         "effect": [{"metric": "passengers_shifted", "before": 0, "after": 17, "kind": "simulated", "assumption": "8 in 100 passengers who get the offer take it (trials in San Francisco and Singapore found about 7 to 10 in 100: docs/research/research-methods.md, section 6)"}],
         "passengers_affected": 210, "cost_note": "Points worth a few dirhams for each passenger who shifts.", "confidence": "low",
         "offers": [{"kind": "other_route", "route_id": "R2", "stop_id": routes[1]["directions"][0]["stops"][0], "depart": 7 * 3600 + 1500, "walk_metres": 320, "walk_minutes": 4, "extra_minutes": 6, "points": 20},
                    {"kind": "earlier", "route_id": "R1", "stop_id": peak["visits"][1]["stop_id"], "depart": 7 * 3600, "walk_metres": 0, "walk_minutes": 0, "extra_minutes": 0, "minutes_earlier": 20, "points": 12}],
         "why": "The forecast shows more passengers than seats here, and spare seats a short walk away."}]}
    personas = {"fixture": True, "personas": [
        {"id": "planner", "title": "The planner", "label": "Fictional. Built from the day's totals, not from any one person.", "anchor": {"route_id": "R1", "stop_id": None, "time": 6 * 3600},
         "steps": [{"t": 6 * 3600, "scene": "control_room", "say": "At 06:00 the forecast shows where buses and passengers will not match by 07:30.", "kind": "measured", "decision_id": None, "before": None, "after": None},
                   {"t": 6 * 3600 + 600, "scene": "control_room", "say": "One decision closes the largest gap without a single extra bus.", "kind": "simulated", "decision_id": "d001", "before": {"passengers_over_seats_minutes": 5400}, "after": {"passengers_over_seats_minutes": 900}}]},
        {"id": "site_worker", "title": "The site worker", "label": "Fictional. Built from the day's totals, not from any one person.", "anchor": {"route_id": "R1", "stop_id": peak["visits"][0]["stop_id"], "time": 6 * 3600 + 2700},
         "steps": [{"t": 6 * 3600 + 2700, "scene": "stop", "say": "On the day, the 06:45 bus left this stop with more people than seats.", "kind": "measured", "decision_id": None, "before": {"load": max(v["load"] for v in peak["visits"]), "seats": peak["seats"]}, "after": None},
                   {"t": 6 * 3600 + 2700, "scene": "bus", "say": "With the larger bus he sits down.", "kind": "simulated", "decision_id": "d001", "before": None, "after": {"seats": 78}}]},
        {"id": "office_worker", "title": "The office worker", "label": "Fictional. Built from the day's totals, not from any one person.", "anchor": {"route_id": "R1", "stop_id": peak["visits"][1]["stop_id"], "time": 7 * 3600 + 1200},
         "steps": [{"t": 7 * 3600 + 1200, "scene": "stop", "say": f"On the day, her usual bus left this stop with {peak['visits'][1]['load']} people on board and {peak['seats']} seats.", "kind": "measured", "decision_id": None, "before": {"load": peak["visits"][1]["load"], "seats": peak["seats"]}, "after": None},
                   {"t": 7 * 3600 + 1200, "scene": "phone", "say": "Her usual bus will be full. A bus four minutes' walk away has seats, and taking it earns Khutwa points.", "kind": "simulated", "decision_id": "d003", "before": None, "after": {"points": 20}}]},
        {"id": "driver", "title": "The driver", "label": "Fictional. Built from the day's totals, not from any one person.", "anchor": {"route_id": "R4", "stop_id": None, "time": 21 * 3600 + 900},
         "steps": [{"t": 21 * 3600 + 900, "scene": "bus", "say": "Late in the evening the bus slowed for stops where nobody was waiting.", "kind": "measured", "decision_id": None, "before": {"doors_not_opened": closed}, "after": None},
                   {"t": 21 * 3600 + 900, "scene": "bus", "say": "With request stops the timetable matches the road, and he is on time.", "kind": "simulated", "decision_id": "d002", "before": None, "after": {"minutes_saved_per_trip": 2.5}}]}]}

    boardings = sum(v["on"] for r in replay.values() for t in r["trips"] for v in t["visits"])
    seat_km_note = "seat counts only: standing capacity is marked not verified in the supplied data"
    meta = {"contract_version": 1, "fixture": True, "service_date": "2025-12-15", "generated_at": "2026-11-16T00:00:00Z", "commit": None,
            "bin_seconds": BIN, "origins": ORIGINS, "horizons_seconds": HORIZONS,
            "counts": {"routes": len(routes), "stops": len(stops), "trips": sum(len(r["trips"]) for r in replay.values()), "stop_visits": visits_n, "boardings": boardings},
            "notes": "Stand-in data. Invented network, invented numbers. " + seat_km_note}
    network = {"fixture": True, "communities": communities, "stops": stops,
               "routes": [{k: v for k, v in r.items() if k != "weight"} for r in routes],
               "fleet_types": [{"bus_type": k, "seats": v} for k, v in TYPES.items()]}
    best = next(x for x in results if x["model"] == "insiyab" and x["horizon"] == 3600 and x["subset"] == "all")
    summary = {"fixture": True, "headline": [
        {"key": "boardings", "label": "Boardings on the day", "value": boardings, "unit": "boardings", "kind": "measured", "source": "replay/"},
        {"key": "doors_not_opened", "label": "Stop visits where the door did not open", "value": closed, "unit": "of " + str(visits_n), "kind": "measured", "source": "replay/"},
        {"key": "wape_60", "label": "Forecast error one hour ahead (WAPE)", "value": best["wape"], "unit": "share", "kind": "measured", "source": "metrics.json"},
        {"key": "skill_60", "label": "Better than the naive forecast, one hour ahead", "value": best["skill"], "unit": "share of error removed", "kind": "measured", "source": "metrics.json"}]}
    # the gap: for each route, direction and hour, seats offered against the largest load on each trip
    rows, over_min, empty_km = [], 0, 0
    for rid, r in replay.items():
        cell = {}
        for t in r["trips"]:
            hour = (t["visits"][0]["sched_arr"] // 3600) * 3600
            c = cell.setdefault((t["direction"], hour), {"seats": 0, "peak": 0, "over": 0, "spare": 0, "trips": 0})
            top = max(v["load"] for v in t["visits"])
            c["seats"] += t["seats"]; c["peak"] += top; c["over"] += max(0, top - t["seats"]); c["spare"] += max(0, t["seats"] - top); c["trips"] += 1
            for a, b in zip(t["visits"], t["visits"][1:]):
                over_min += max(0, a["load"] - t["seats"]) * (b["act_arr"] - a["act_dep"]) / 60
                empty_km += max(0, t["seats"] - a["load"]) * 0.8          # stand-in: every stretch is taken as 0.8 km
        for (direction, hour), c in sorted(cell.items()):
            gap = c["over"] + c["spare"]
            rows.append({"route_id": rid, "direction": direction, "hour_start": hour, "trips": c["trips"], "seats_offered": c["seats"], "forecast_peak_load": c["peak"],
                         "over": c["over"], "spare": c["spare"], "index": round(0.1 + 9.9 * c["over"] / gap, 1) if gap else 0.1})
    gap_file = {"fixture": True, "bin_seconds": 3600, "index_note": "The Insiyab index runs from 0.1 (every seat empty) to 10 (every passenger without a seat): the share of the gap that is people without seats.",
                "rows": rows, "totals": {"kind": "simulated", "assumption": "the decisions in decisions.json are all made; the same passengers travel at the same times",
                                         "before": {"passenger_minutes_over_seats": round(over_min), "empty_seat_km": round(empty_km)},
                                         "after": {"passenger_minutes_over_seats": round(over_min * 0.35), "empty_seat_km": round(empty_km * 0.82)}}}
    files = {"meta.json": meta, "network.json": network, "metrics.json": metrics, "decisions.json": decisions, "personas.json": personas,
             "summary.json": summary, "gap.json": gap_file, "forecast/boardings-route.json": f_route, "forecast/boardings-stop.json": f_stop,
             "replay/index.json": {"fixture": True, "routes": [{"route_id": rid, "file": f"replay/route-{rid}.json", "trips": len(r["trips"])} for rid, r in replay.items()]}}
    for rid, r in replay.items():
        files[f"replay/route-{rid}.json"] = r
    return {name: canonical(v) for name, v in files.items()}


def main():
    files = build()
    if "--check" in sys.argv:
        bad = [n for n, text in files.items() if not os.path.exists(os.path.join(OUT, n)) or open(os.path.join(OUT, n), encoding="utf-8").read() != text]
        print("FAIL fixtures differ from a fresh build: " + ", ".join(bad) if bad else f"PASS fixtures equal a fresh build ({len(files)} files)")
        print("ALL PASS" if not bad else "1 FAILED")
        return 1 if bad else 0
    for name, text in files.items():
        path = os.path.join(OUT, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    print(f"wrote {len(files)} files to fixtures/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
