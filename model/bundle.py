"""From the day's records to the files a screen reads (docs/CONTRACT.md): the plan, the day replayed, the gap, the
decisions and the four points of view. Every number is counted here from the records, and every effect says whether it
was measured (counted from the day) or simulated (what we expect if RTA made the change), with its assumption.

The rules for the levers are the ones in docs/MODEL-PLAN.md, section 8. Their thresholds are the constants below, so a
planner can see them and move them. Nothing here names a driver, a card or a device."""
import numpy as np
import pandas as pd

LABEL = "Fictional. Built from the day's totals, not from any one person."
SPARE_SHARE = 1 / 3            # right bus: a trip whose largest load is under this share of its seats has a bus too big for it
SWAP_WITHIN = 3600             # right bus: the two trips start within this many seconds of each other
EMPTY_SHARE = 0.8              # right stop: at least this share of visits had nobody boarding and nobody alighting
EMPTY_VISITS = 3               # right stop: over at least this many visits
EVENING = 20 * 3600            # right stop: looked for from this time on
WALK_MAX = 400                 # rewarded choice: never offer a walk longer than this, in metres
WALK_FACTOR = 1.3              # a walk is the straight line times this
WALK_SPEED = 75                # metres a minute
TAKE_UP = 0.08                 # rewarded choice: the share of passengers who take an offer
TAKE_UP_NOTE = "8 in 100 passengers who get the offer take it (trials in San Francisco and Singapore found about 7 to 11 in 100: docs/research/research-methods.md, section 6)"


def clock(t):
    t = int(t) % 86400
    return f"{t // 3600:02d}:{t % 3600 // 60:02d}"


def metres(lon1, lat1, lon2, lat2):
    p = np.pi / 180; a = np.sin((lat2 - lat1) * p / 2) ** 2 + np.cos(lat1 * p) * np.cos(lat2 * p) * np.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * 6371000 * np.arcsin(np.sqrt(a))


def network(day):
    stops = [{"stop_id": r.stop_id, "name": r.name, "lon": round(float(r.lon), 6), "lat": round(float(r.lat), 6), "community_id": r.community_id} for r in day["stops"].itertuples()]
    return {"communities": day["communities"], "stops": stops, "routes": day["routes"], "fleet_types": day["fleet_types"]}


def trips_of(day):
    """One row for each trip that ran, with the stretch to the next stop measured for every visit."""
    v = day["visits"].merge(day["stops"][["stop_id", "lon", "lat"]], on="stop_id", how="left")
    same = v["trip_id"].shift(-1) == v["trip_id"]
    v["minutes_to_next"] = np.where(same, (v["act_arr"].shift(-1) - v["act_dep"]) / 60, 0.0)
    v["km_to_next"] = np.where(same, metres(v["lon"], v["lat"], v["lon"].shift(-1), v["lat"].shift(-1)) / 1000, 0.0)
    v["km_to_next"] = v["km_to_next"].fillna(0.0)
    t = v.groupby("trip_id", sort=False).agg(route_id=("route_id", "first"), direction=("direction", "first"), vehicle=("vehicle", "first"), bus_type=("bus_type", "first"),
                                             seats=("seats", "first"), start=("sched_arr", "first"), peak=("load", "max"), boardings=("on", "sum")).reset_index()
    return v, t


def over_and_empty(v, seats):
    """Passenger-minutes above the seats, and seat-kilometres with nobody in them, for visits v with the given seats on each."""
    return float((np.clip(v["load"] - seats, 0, None) * v["minutes_to_next"]).sum()), float((np.clip(seats - v["load"], 0, None) * v["km_to_next"]).sum())


def replay(day):
    known = set(day["stops"]["stop_id"]); files = {}; left_out = 0
    for rid, g in day["visits"].groupby("route_id", sort=True):
        trips = []
        for tid, t in g.groupby("trip_id", sort=False):
            if not set(t["stop_id"]) <= known:
                left_out += 1; continue                                # a trip that calls at a stop the plan does not have cannot be drawn
            first = t.iloc[0]
            trips.append({"trip_id": str(tid), "direction": int(first.direction), "vehicle": first.vehicle, "bus_type": first.bus_type, "seats": int(first.seats),
                          "model_year": None if pd.isna(first.model_year) else int(first.model_year),
                          "visits": [{"stop_id": r.stop_id, "seq": int(r.seq), "sched_arr": int(r.sched_arr), "act_arr": int(r.act_arr), "sched_dep": int(r.sched_dep), "act_dep": int(r.act_dep),
                                      "door_opened": bool(r.door_opened), "on": int(r.on), "off": int(r.off), "load": int(r.load)} for r in t.itertuples()]})
        if trips:
            files[rid] = {"route_id": rid, "trips": sorted(trips, key=lambda x: (x["visits"][0]["sched_arr"], x["trip_id"]))}
    return files, left_out


def swaps(t):
    """Right bus: pair each trip that ran over its seats with a trip starting within the hour whose bus is bigger and mostly empty,
    and whose own passengers fit on the smaller bus. Each trip is used once. Returns the new seats for every trip."""
    seats = dict(zip(t["trip_id"], t["seats"])); pairs = []; used = set()
    over = t[t["peak"] > t["seats"]].assign(short=lambda d: d["peak"] - d["seats"]).sort_values(["short", "trip_id"], ascending=[False, True])
    for o in over.itertuples():
        can = t[(t["seats"] > o.seats) & (t["peak"] < t["seats"] * SPARE_SHARE) & (t["peak"] <= o.seats) & ((t["start"] - o.start).abs() <= SWAP_WITHIN) & (t["vehicle"] != o.vehicle) & ~t["trip_id"].isin(used)]
        if not len(can):
            continue
        d = can.sort_values(["seats", "peak", "trip_id"], ascending=[False, True, True]).iloc[0]
        used |= {o.trip_id, d.trip_id}; seats[o.trip_id], seats[d.trip_id] = int(d.seats), int(o.seats); pairs.append((o, d))
    return seats, pairs


def gap_and_decisions(day):
    v, t = trips_of(day); stops = day["stops"].set_index("stop_id"); decisions = []
    t["hour"] = (t["start"] // 3600) * 3600; t["over"] = np.clip(t["peak"] - t["seats"], 0, None); t["spare"] = np.clip(t["seats"] - t["peak"], 0, None)
    rows = []
    for (rid, d, hour), g in t.groupby(["route_id", "direction", "hour"], sort=True):
        over, spare = int(g["over"].sum()), int(g["spare"].sum())
        rows.append({"route_id": rid, "direction": int(d), "hour_start": int(hour), "trips": len(g), "seats_offered": int(g["seats"].sum()), "forecast_peak_load": int(g["peak"].sum()),
                     "over": over, "spare": spare, "index": round(0.1 + 9.9 * over / (over + spare), 1) if over + spare else 0.1})
    before = over_and_empty(v, v["seats"])

    # --- right bus -----------------------------------------------------------------------------------------------
    new_seats, pairs = swaps(t); after = over_and_empty(v, v["trip_id"].map(new_seats))
    if pairs:
        side = lambda x: {"route_id": x.route_id, "trip_id": str(x.trip_id), "vehicle": x.vehicle, "bus_type": x.bus_type, "seats": int(x.seats), "start": int(x.start), "largest_load": int(x.peak)}
        o, d = pairs[0]; ids = [p[0].trip_id for p in pairs] + [p[1].trip_id for p in pairs]; part = v[v["trip_id"].isin(ids)]
        b = over_and_empty(part, part["seats"])[0]; a = over_and_empty(part, part["trip_id"].map(new_seats))[0]
        top = v[v["trip_id"] == o.trip_id].sort_values("load", ascending=False).iloc[0]
        starts = [p[0].start for p in pairs]
        decisions.append({"lever": "right_bus", "title": "Put the bigger bus where the passengers are",
            "where": {"route_id": o.route_id, "stop_ids": [top.stop_id], "community_id": stops.at[top.stop_id, "community_id"] if top.stop_id in stops.index else None},
            "when": {"from": int(min(starts) // 3600 * 3600), "to": int(max(starts) // 3600 * 3600 + 3600)},
            "evidence": [{"label": f"Largest load on the fullest route {o.route_id} trip", "value": int(o.peak), "unit": "passengers", "source": f"replay/route-{o.route_id}.json"},
                         {"label": "Seats on that bus", "value": int(o.seats), "unit": "seats", "source": f"replay/route-{o.route_id}.json"},
                         {"label": f"Largest load on a route {d.route_id} trip starting within the hour", "value": int(d.peak), "unit": "passengers", "source": f"replay/route-{d.route_id}.json"},
                         {"label": "Seats on that bus", "value": int(d.seats), "unit": "seats", "source": f"replay/route-{d.route_id}.json"},
                         {"label": "Trips paired this way across the day", "value": len(pairs), "unit": "pairs of trips", "source": "replay/"}],
            "change": f"Swap the vehicles on {len(pairs)} pairs of trips that start within an hour of each other, beginning with the {o.seats}-seat bus on route {o.route_id} at {clock(o.start)} and the {d.seats}-seat bus on route {d.route_id} at {clock(d.start)}.",
            "effect": [{"metric": "passenger_minutes_over_seats", "before": round(b), "after": round(a), "kind": "simulated",
                        "assumption": "the same passengers board at the same times and only the vehicles change; the time to bring each bus to the other route's first stop is not counted"}],
            "passengers_affected": int(sum(p[0].boardings for p in pairs)), "cost_note": "No extra bus and no extra driver. Moving buses between routes has a cost in empty running that is not counted here.",
            "confidence": "medium",
            "swaps": [{"from": side(a_), "to": side(b_)} for a_, b_ in pairs],
            "why": f"Route {o.route_id} carried {int(o.peak)} passengers on a bus with {int(o.seats)} seats while a {int(d.seats)}-seat bus on route {d.route_id} carried at most {int(d.peak)} in the same hour."})

    # --- right stop ----------------------------------------------------------------------------------------------
    late = v[v["sched_arr"] >= EVENING].assign(nobody=lambda x: (x["on"] + x["off"]) == 0, dwell=lambda x: x["act_dep"] - x["act_arr"])
    quiet = late.groupby(["route_id", "direction", "stop_id"]).agg(visits=("nobody", "size"), nobody=("nobody", "sum"), people=("on", "sum"), off=("off", "sum")).reset_index()
    quiet = quiet[(quiet["visits"] >= EMPTY_VISITS) & (quiet["nobody"] >= EMPTY_SHARE * quiet["visits"])]
    if len(quiet):
        best = quiet.groupby(["route_id", "direction"]).agg(stops=("stop_id", "size"), visits=("visits", "sum"), nobody=("nobody", "sum")).reset_index().sort_values(["stops", "nobody", "route_id"], ascending=[False, False, True]).iloc[0]
        q = quiet[(quiet["route_id"] == best.route_id) & (quiet["direction"] == best.direction)]
        there = late[(late["route_id"] == best.route_id) & (late["direction"] == best.direction) & late["stop_id"].isin(q["stop_id"])]
        dwell = float(there.loc[there["nobody"], "dwell"].median()) if there["nobody"].any() else 0.0
        decisions.append({"lever": "right_stop", "title": "Stop only when someone is there",
            "where": {"route_id": best.route_id, "stop_ids": sorted(q["stop_id"]), "community_id": None}, "when": {"from": EVENING, "to": int(late["sched_arr"].max() // 3600 * 3600 + 3600)},
            "evidence": [{"label": f"Visits to these stops after {clock(EVENING)}", "value": int(q["visits"].sum()), "unit": "visits", "source": f"replay/route-{best.route_id}.json"},
                         {"label": "Of those, visits where nobody boarded and nobody alighted", "value": int(q["nobody"].sum()), "unit": "visits", "source": f"replay/route-{best.route_id}.json"},
                         {"label": "Middle time a bus spent at such a visit", "value": round(dwell), "unit": "seconds", "source": f"replay/route-{best.route_id}.json"}],
            "change": f"After {clock(EVENING)}, make {len(q)} stops on route {best.route_id} request stops: the bus calls there when a passenger asks from the stop or from the bus.",
            "effect": [{"metric": "minutes_saved_per_trip", "before": 0, "after": round(dwell * len(q) / 60, 1), "kind": "simulated",
                        "assumption": "a bus that is not asked to call saves the middle time buses spent at these stops when nobody boarded or alighted; slowing down and pulling away are not counted, so this is an under-count"}],
            "passengers_affected": int(q["people"].sum() + q["off"].sum()), "cost_note": "A way to ask at each stop: a button, or a tap in the app. Nobody loses a stop: the bus calls whenever it is asked.",
            "confidence": "low",
            "why": f"At {len(q)} stops on route {best.route_id}, nobody boarded or alighted on {int(q['nobody'].sum())} of {int(q['visits'].sum())} visits after {clock(EVENING)}."})

    # --- rewarded choice -----------------------------------------------------------------------------------------
    full = v[(v["load"] > v["seats"]) & (v["on"] > 0)].sort_values(["on", "trip_id", "seq"], ascending=[False, True, True])
    if len(full):
        f = full.iloc[0]; offers = []
        line = v[(v["route_id"] == f.route_id) & (v["direction"] == f.direction) & (v["stop_id"] == f.stop_id)].sort_values("sched_dep")
        for kind, cand in (("earlier", line[line["sched_dep"] < f.sched_dep].tail(1)), ("later", line[line["sched_dep"] > f.sched_dep].head(1))):
            if len(cand) and cand.iloc[0].load < cand.iloc[0].seats:
                c = cand.iloc[0]; shift = int(round(abs(f.sched_dep - c.sched_dep) / 60))
                offers.append({"kind": kind, "route_id": f.route_id, "stop_id": f.stop_id, "depart": int(c.sched_dep), "walk_metres": 0, "walk_minutes": 0, "extra_minutes": 0, "points": 10 + 2 * (shift // 5), f"minutes_{kind}": shift})
        if f.stop_id in stops.index:
            near = v[(v["route_id"] != f.route_id) & ((v["sched_dep"] - f.sched_dep).abs() <= 1200) & (v["load"] < v["seats"])].copy()
            near["walk"] = metres(stops.at[f.stop_id, "lon"], stops.at[f.stop_id, "lat"], near["lon"], near["lat"]) * WALK_FACTOR
            near = near[near["walk"] <= WALK_MAX].assign(room=lambda x: x["seats"] - x["load"]).sort_values(["walk", "room", "trip_id"], ascending=[True, False, True])
            if len(near):
                c = near.iloc[0]; walk = int(round(c.walk)); mins = int(np.ceil(walk / WALK_SPEED))
                offers.append({"kind": "other_route", "route_id": c.route_id, "stop_id": c.stop_id, "depart": int(c.sched_dep), "walk_metres": walk, "walk_minutes": mins,
                               "extra_minutes": mins + max(0, int(round((c.sched_dep - f.sched_dep) / 60))), "points": 10 + 2 * mins})
        if offers:
            hour = v[(v["stop_id"] == f.stop_id) & (v["route_id"] == f.route_id) & ((v["sched_dep"] - f.sched_dep).abs() <= 1800)]
            asked = int(hour["on"].sum())
            decisions.append({"lever": "rewarded_choice", "title": "Reward the passenger who takes the emptier bus",
                "where": {"route_id": f.route_id, "stop_ids": [f.stop_id], "community_id": stops.at[f.stop_id, "community_id"] if f.stop_id in stops.index else None},
                "when": {"from": int(f.sched_dep - 1800), "to": int(f.sched_dep + 1800)},
                "evidence": [{"label": f"Passengers on board when the {clock(f.sched_dep)} bus left this stop", "value": int(f.load), "unit": "passengers", "source": f"replay/route-{f.route_id}.json"},
                             {"label": "Seats on that bus", "value": int(f.seats), "unit": "seats", "source": f"replay/route-{f.route_id}.json"},
                             {"label": "Passengers boarding at this stop within half an hour either side", "value": asked, "unit": "passengers", "source": f"replay/route-{f.route_id}.json"}],
                "change": "Offer Khutwa points to passengers at this stop who take a bus with room: one a little earlier or later, or one on another route a short walk away.",
                "effect": [{"metric": "passengers_shifted", "before": 0, "after": round(asked * TAKE_UP, 1), "kind": "simulated", "assumption": TAKE_UP_NOTE}],
                "passengers_affected": asked, "cost_note": "Points for each passenger who shifts. Nobody is charged more, and an offer to walk is never made to someone who has said they cannot.",
                "confidence": "low", "offers": offers,
                "why": f"The {clock(f.sched_dep)} bus on route {f.route_id} left this stop with {int(f.load)} passengers and {int(f.seats)} seats, and a bus with room was close in time or place."})
    for i, d in enumerate(decisions):
        decisions[i] = {"id": f"d{i + 1:03d}", **d}

    gap = {"bin_seconds": 3600, "load_kind": "measured",
           "index_note": "The Insiyab index runs from 0.1 (every seat empty) to 10 (every passenger without a seat): the share of the gap that is people without seats. Loads here are the day's own, counted from taps; seats only.",
           "rows": rows, "totals": {"kind": "simulated", "assumption": "the vehicle swaps in the right-bus decision are made; the same passengers travel at the same times. A stretch between stops is measured as a straight line, so empty seat-kilometres are an under-count.",
                                    "before": {"passenger_minutes_over_seats": round(before[0]), "empty_seat_km": round(before[1])},
                                    "after": {"passenger_minutes_over_seats": round(min(after[0], before[0])), "empty_seat_km": round(after[1])}}}
    return gap, decisions, v, t


def personas(day, decisions, v, t):
    """The same day from four places. Each sentence is built from a count; a step tied to a decision appears only if the decision exists."""
    by = {d["lever"]: d for d in decisions}; out = []
    def step(time, scene, say, kind, decision=None, before=None, after=None):
        assert len(say.split()) <= 28, say
        return {"t": int(time), "scene": scene, "say": say, "kind": kind, "decision_id": decision, "before": before, "after": after}
    busiest = t.sort_values(["peak", "trip_id"], ascending=[False, True]).iloc[0]
    over_trips = int((t["peak"] > t["seats"]).sum()); spare_trips = int((t["peak"] < t["seats"] * SPARE_SHARE).sum())
    rb, rs, rc = by.get("right_bus"), by.get("right_stop"), by.get("rewarded_choice")

    steps = [step(6 * 3600, "control_room", f"On the day, {over_trips} trips ran with more passengers than seats, and {spare_trips} ran less than a third full.", "measured", before={"trips_over_seats": over_trips, "trips_under_a_third_full": spare_trips})]
    if rb:
        e = rb["effect"][0]; steps.append(step(6 * 3600 + 600, "control_room", "Swapping vehicles between those trips closes much of the gap without a single extra bus.", "simulated", rb["id"], {e["metric"]: e["before"]}, {e["metric"]: e["after"]}))
    out.append({"id": "planner", "title": "The planner", "label": LABEL, "anchor": {"route_id": busiest.route_id, "stop_id": None, "time": 6 * 3600}, "steps": steps})

    top = v[v["trip_id"] == busiest.trip_id].sort_values(["load", "seq"], ascending=[False, True]).iloc[0]
    steps = [step(top.act_dep, "stop", f"On the day, the {clock(top.sched_dep)} bus left this stop with {int(top.load)} people on board and {int(top.seats)} seats.", "measured", before={"load": int(top.load), "seats": int(top.seats)})]
    if rb:
        steps.append(step(top.act_dep, "bus", "With the bigger bus on this trip, he sits down.", "simulated", rb["id"], after={"seats": int(max(x["value"] for x in rb["evidence"] if x["unit"] == "seats"))}))
    out.append({"id": "site_worker", "title": "The site worker", "label": LABEL, "anchor": {"route_id": busiest.route_id, "stop_id": top.stop_id, "time": int(top.act_dep)}, "steps": steps})

    if rc:
        sid = rc["where"]["stop_ids"][0]; e = rc["evidence"]; when = (rc["when"]["from"] + rc["when"]["to"]) // 2
        steps = [step(when, "stop", f"On the day, her usual bus left this stop with {int(e[0]['value'])} people on board and {int(e[1]['value'])} seats.", "measured", before={"load": int(e[0]["value"]), "seats": int(e[1]["value"])}),
                 step(when - 900, "phone", "Her phone shows a bus with room close by, and taking it earns Khutwa points.", "simulated", rc["id"], after={"points": max(o["points"] for o in rc["offers"])})]
        anchor = {"route_id": rc["where"]["route_id"], "stop_id": sid, "time": int(when)}
    else:
        steps = [step(top.act_dep, "stop", f"On the day, the fullest bus she could have taken carried {int(top.load)} people and had {int(top.seats)} seats.", "measured", before={"load": int(top.load), "seats": int(top.seats)})]
        anchor = {"route_id": busiest.route_id, "stop_id": top.stop_id, "time": int(top.act_dep)}
    out.append({"id": "office_worker", "title": "The office worker", "label": LABEL, "anchor": anchor, "steps": steps})

    closed = int((~v["door_opened"]).sum())
    steps = [step(EVENING + 900, "bus", f"On the day, buses called at stops {closed} times without the door opening.", "measured", before={"doors_not_opened": closed, "stop_visits": len(v)})]
    if rs:
        steps.append(step(EVENING + 900, "bus", "With request stops late in the evening, the timetable matches the road and he keeps time.", "simulated", rs["id"], after={rs["effect"][0]["metric"]: rs["effect"][0]["after"]}))
    out.append({"id": "driver", "title": "The driver", "label": LABEL, "anchor": {"route_id": (rs or {"where": {"route_id": busiest.route_id}})["where"]["route_id"], "stop_id": None, "time": EVENING + 900}, "steps": steps})
    return out
