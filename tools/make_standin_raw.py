#!/usr/bin/env python3
"""Writes the stand-in raw tables to fixtures/raw/: the same file kinds and exactly the column names RTA provided
(docs/DATA.md, section 1). Every stage of the engine is built and tested on these.

  python3 tools/make_standin_raw.py                     write fixtures/raw/
  python3 tools/make_standin_raw.py --check             rebuild in memory, compare byte for byte with what is on disk
  python3 tools/make_standin_raw.py --out DIR --nol-shape journey     write a variant somewhere else (tests use this)

What is real and what is invented. The NETWORK is real and public: nine routes of RTA's public timetable feed as published in
late 2021, with their stops, paths and one Monday's trips (opendata/public/rta-gtfs/, with its PROVENANCE.md). It is not part of
the data RTA gave the hackathon. Everything about the DAY is invented here, from one fixed seed: every passenger, tap, card,
device, vehicle, driver, the lateness of every bus, and the nine square "areas" that stand in for communities.
So a map of this day shows real Dubai stops and routes carrying invented passengers, and every screen says STAND-IN DATA.

The gates run --check: that proves the tables in fixtures/raw/ equal a fresh build, which is the only reason the guard lets
these column names into git. A real table from the hackathon must never be put in fixtures/raw/.

Choices made here, because the real answers are not known until the census has run on the real data:
- One nol row is one TAP (the default, --nol-shape tap): a check-in row has CKI=1, CKO=0 and Amount 0.00; a check-out row
  has CKI=0, CKO=1 and the fare. With --nol-shape journey one row is one journey: CKI and CKO hold the two clock times.
- The runtime report keeps the service date in Date and writes clock times as HH:MM:SS that wrap at midnight
  (a bus at 24:12 is written 00:12:00). The nol table writes the calendar date, so a tap after midnight is dated 2025-12-16.
- GTFS times run above 24:00:00, as the standard says. The feed's calendar dates are moved to December 2025, so the public
  Monday timetable is the plan for the stand-in Monday. Nothing else in the feed's rows is changed.
- Every invented identifier begins STANDIN-.

Mess planted on purpose, for the census to count (the test recounts each from the files, nothing is typed twice):
two vehicles that run but are missing from the fleet table; taps whose route number is written in another format;
taps that carry the stop before the right one; duplicated taps; empty stop names and amounts; journeys with no
check-out; stop visits where the door did not open; three scheduled trips that did not run; stops outside every
area; two buses with no model year and one with no total.
"""
import csv, io, json, math, os, random, sys

SEED = 20251215
DATE, NEXT_DATE = "2025-12-15", "2025-12-16"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "fixtures", "raw")
PEAK_HEADWAY, OFF_HEADWAY = 20 * 60, 45 * 60      # seconds between buses in one direction
RIDERS = 1.8                                       # multiplies every boarding rate
TYPES = {"STANDARD": 32, "ARTICULATED": 48, "DOUBLE": 64, "MIDI": 20, "COACH": 44}
MISSING_FROM_FLEET = (5, 11)          # the vehicles, by the order they first run, that the fleet table leaves out
ODD_ROUTE_VEHICLES = ((3, 1), (4, 0))  # (route, which of its vehicles): taps on these write the route number another way
NOT_RUN = (40, 97, 133)               # scheduled trips, by order, that did not run
NO_CHECK_OUT, WRONG_STOP, DUPLICATED, NO_STOP_NAME, NO_AMOUNT = 0.15, 0.02, 0.005, 0.01, 0.005

NOL_COLS = ["Transaction_date", "Transaction_Time", "Body_EVD_ID", "device_id", "device_id_hex", "NOL_ID", "CKI", "CKO", "Route", "Stop_name", "Amount", "Stop_Id"]
AVL_COLS = ["Date", "Day_type", "Body", "Trip_ID", "Route", "Driver_id", "Direction", "Stop_Seq", "Stop_ID", "Stop_Name", "Sched_Arr", "Act_Arr", "Sched_Dep", "Act_Dep",
            "Difference", "Door_Status", "block_no", "avm_pattern_id", "Trip_end", "Diff_in_seconds", "OP_Hour", "TID"]
FLEET_COLS = ["Body_number", "Manufacturer", "Bus_Type", "Model Year", "Operator", "No_of_Seats", "RTA Standing (not verified)", "Total"]
COMM_COLS = ["c_prefix_a", "c_prefix_e", "cname_a", "cname_e", "comm_num", "community_a", "community_e", "dgis_id", "label_a", "label_e", "ndgis_id", "objectid", "shape", "shape.area", "shape.len"]
GTFS_COLS = {
    "agency": ["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone"],
    "routes": ["route_id", "agency_id", "route_short_name", "route_long_name", "route_type", "route_color", "route_text_color"],
    "trips": ["route_id", "service_id", "trip_id", "shape_id", "trip_headsign", "direction_id", "block_id", "trip_short_name"],
    "stop_times": ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "stop_headsign", "pickup_type", "drop_off_type", "shape_dist_traveled"],
    "stops": ["stop_id", "stop_name", "stop_lat", "stop_lon", "zone_id", "location_type", "stop_code", "stop_desc", "platform_code"],
    "calendar": ["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"],
    "calendar_dates": ["service_id", "date", "exception_type"],
    "frequencies": ["trip_id", "start_time", "end_time", "headway_secs", "exact_times"],
    "shapes": ["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence", "shape_dist_traveled"],
    "transfers": ["from_stop_id", "to_stop_id", "transfer_type", "min_transfer_time"],
    "translations": ["table_name", "field_name", "language", "record_id", "record_sub_id", "field_value"],
    "feed_info": ["feed_publisher_name", "feed_publisher_url", "feed_start_date", "feed_end_date"],
}


def clock(s, wrap=True):
    """Seconds after midnight as HH:MM:SS. wrap=True writes 24:12 as 00:12, as a wall clock does."""
    s = int(s)
    if wrap:
        s %= 86400
    return "%02d:%02d:%02d" % (s // 3600, s % 3600 // 60, s % 60)


def metres(a, b):
    """Distance between two (lon, lat) points, in metres."""
    k = math.pi / 180
    h = math.sin((b[1] - a[1]) * k / 2) ** 2 + math.cos(a[1] * k) * math.cos(b[1] * k) * math.sin((b[0] - a[0]) * k / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def bump(t, centre_h, width_h):
    return math.exp(-0.5 * ((t / 3600 - centre_h) / width_h) ** 2)


def poisson(rng, lam):
    limit, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limit:
            return k
        k += 1


def table(cols, rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(cols)
    w.writerows(rows)
    return buf.getvalue()


NET = os.path.join(ROOT, "opendata", "public", "rta-gtfs")       # a part of RTA's public network feed: see its PROVENANCE.md
# How busy each route is made, and the kinds of bus its vehicles take in turn. The routes are real; these two things are invented.
INVENTED = {"8": (1.6, ["MIDI", "STANDARD", "ARTICULATED"]), "C01": (1.3, ["STANDARD", "ARTICULATED"]), "27": (1.0, ["STANDARD", "DOUBLE"]), "F47": (1.5, ["MIDI", "STANDARD"]),
            "320": (0.7, ["DOUBLE", "ARTICULATED"]), "84": (0.9, ["STANDARD", "COACH"]), "91A": (0.6, ["COACH", "DOUBLE"]), "17": (1.4, ["MIDI", "STANDARD"]), "J01": (0.5, ["STANDARD", "MIDI"])}


def seconds(text):
    h, m, s = text.split(":"); return int(h) * 3600 + int(m) * 60 + int(s)


def public_network():
    """The plan, read from the part of RTA's public feed kept in opendata/public/rta-gtfs: real routes, stops, paths and a Monday's trips."""
    rd = lambda n: list(csv.DictReader(open(os.path.join(NET, n + ".txt"), encoding="utf-8", newline="")))
    raw = {n: rd(n) for n in ("agency", "routes", "trips", "stop_times", "stops", "calendar", "shapes", "transfers", "translations", "feed_info")}
    stops = {x["stop_id"]: {"name": x["stop_name"], "lon": float(x["stop_lon"]), "lat": float(x["stop_lat"]), "code": x["stop_code"]} for x in raw["stops"]}
    routes = [{"rid": x["route_id"], "short": x["route_short_name"], "long": x["route_long_name"], "weight": INVENTED[x["route_short_name"]][0], "pool": INVENTED[x["route_short_name"]][1]} for x in raw["routes"]]
    index = {r["rid"]: i for i, r in enumerate(routes)}
    calls = {}
    for x in raw["stop_times"]:
        calls.setdefault(x["trip_id"], []).append((int(x["stop_sequence"]), x["stop_id"], seconds(x["arrival_time"]), seconds(x["departure_time"])))
    sched = []
    for x in raw["trips"]:
        c = sorted(calls[x["trip_id"]])
        if len(c) < 3:
            continue
        sched.append({"ri": index[x["route_id"]], "dir": int(x["direction_id"] or 0), "dep": c[0][3], "gtfs_id": x["trip_id"], "shape_id": x["shape_id"], "stops": [k[1] for k in c], "arr": [k[2] for k in c], "sdep": [k[3] for k in c]})
    sched.sort(key=lambda t: (t["dep"], t["ri"], t["dir"], t["gtfs_id"]))
    for n, tr in enumerate(sched):
        tr["n"] = n
    return raw, stops, routes, sched


def build(nol_shape="tap"):
    rng = random.Random(SEED)
    raw, stops, routes, sched = public_network()

    # ---- the day as it ran: vehicles, lateness, passengers ----
    vehicles, per_route = [], {}          # a vehicle: its number in order of first use, type, when it is free
    avl, journeys, used_cards, card_free = [], [], 0, []
    tid = 0
    for tr in sched:
        if tr["n"] in NOT_RUN:
            continue
        r = routes[tr["ri"]]
        mine = per_route.setdefault(tr["ri"], [])
        v = next((x for x in mine if x["free"] <= tr["dep"]), None)
        if v is None:
            v = {"n": len(vehicles), "type": r["pool"][len(mine) % len(r["pool"])], "free": 0, "ri": tr["ri"], "odd": (tr["ri"], len(mine)) in ODD_ROUTE_VEHICLES}
            vehicles.append(v); mine.append(v)
        body = "STANDIN-B%02d" % v["n"]
        driver = "STANDIN-R%02d%s" % (v["n"], "a" if tr["dep"] < 14 * 3600 else "b")
        ids = tr["stops"]; N = len(ids)
        aboard, late, prev_dep = [], rng.randint(-60, 120), None
        for i, sid in enumerate(ids):
            sa, sd = tr["arr"][i], tr["sdep"][i]
            peak = bump(sa, 8.0, 1.0) + bump(sa, 18.0, 1.3)
            if i:
                late = max(-90, late + (rng.gauss(26 * peak - 5, 18) + 90 * peak / 15) * 15 / N)   # lateness grows along the route, most in the peaks, whatever the number of stops
            act_arr = int(round(sa + late))
            if prev_dep is not None:
                act_arr = max(act_arr, prev_dep + 40)
            off = [j for j in aboard if j["to"] == i]
            aboard = [j for j in aboard if j["to"] != i]
            on = 0
            if i < N - 1:
                tide = 1.35 if tr["dir"] == 0 else 0.65                           # direction 0 runs towards work in the morning
                shape = 0.18 + 1.5 * tide * bump(sa, 7.75, 1.0) + 1.35 * (2 - tide) * bump(sa, 17.75, 1.2)
                if sa >= 22 * 3600:
                    shape *= 0.6
                place = (1 - i / (N - 1)) ** 0.7 + 0.15
                on = poisson(rng, RIDERS * 1.15 * r["weight"] * shape * place * 15 / N)        # about the same boardings a trip, however many stops it has
            door = "Open" if (on or off) else ("Closed" if rng.random() < 0.6 else "Open")
            dwell = 0 if door == "Closed" else int(10 + 2.5 * on + 1.5 * len(off))
            act_dep = act_arr + dwell if door == "Closed" else max(act_arr + dwell, min(sd, act_arr + dwell + 45))
            for j in off:
                j["t_out"] = act_arr + 1 + int(rng.random() * max(1, dwell - 2)) if not j["no_out"] else None
            for _ in range(on):
                if card_free and rng.random() < 0.3 and card_free[0][0] + 3600 < act_arr:
                    card = card_free.pop(0)[1]
                else:
                    card = used_cards; used_cards += 1
                j = {"card": card, "v": v["n"], "ri": tr["ri"], "dir": tr["dir"], "from": i, "to": min(N - 1, i + 1 + int(rng.expovariate(1 / (N * 0.45)))), "stops": ids,
                     "t_in": act_arr + 2 + int(rng.random() * max(1, dwell - 4)), "odd": v["odd"], "t_out": None, "no_out": rng.random() < NO_CHECK_OUT, "door": 1 + (rng.random() < 0.4)}
                aboard.append(j); journeys.append(j)
                card_free.append((act_arr + 2400, card))
            tid += 1
            diff = act_arr - sa
            avl.append([DATE, "Weekday", body, 70000 + tr["n"], r["short"], driver, tr["dir"], i + 1, sid, stops[sid]["name"], clock(sa), clock(act_arr), clock(sd), clock(act_dep),
                        "%.1f" % (diff / 60), door, "B%02d" % v["n"], tr["shape_id"], clock(tr["arr"][-1]), diff, (sa % 86400) // 3600, tid])
            prev_dep = act_dep
            if door == "Open":
                late = max(late, act_dep - sd)                       # a long stop makes the bus later
        v["free"] = prev_dep + 300

    # ---- nol rows ----
    def odd_route(short):
        return ("0" + short) if short.isdigit() else short.lower()

    def tap_row(j, t, stop_i, cki, cko, amount):
        r = routes[j["ri"]]
        ids = j["stops"]
        if rng.random() < WRONG_STOP and stop_i > 0:
            stop_i -= 1                                             # the reader had not yet moved on from the stop before
        sid = ids[stop_i]
        route = odd_route(r["short"]) if j["odd"] else r["short"]
        name = "" if rng.random() < NO_STOP_NAME else stops[sid]["name"]
        amount = "" if rng.random() < NO_AMOUNT else amount
        return [t, [NEXT_DATE if t >= 86400 else DATE, clock(t), "STANDIN-B%02d" % j["v"], "STANDIN-D%02d%d" % (j["v"], j["door"]), "STANDIN-H%02X%d" % (j["v"], j["door"]),
                    "STANDIN-N%05d" % j["card"], cki, cko, route, name, amount, sid]]

    taps = []
    for j in journeys:
        fare = "%.2f" % (3 + 0.5 * min(9, j["to"] - j["from"]))
        if nol_shape == "tap":
            taps.append(tap_row(j, j["t_in"], j["from"], 1, 0, "0.00"))
            if j["t_out"] is not None:
                taps.append(tap_row(j, j["t_out"], j["to"], 0, 1, fare))
        else:
            taps.append(tap_row(j, j["t_in"], j["from"], clock(j["t_in"]), "" if j["t_out"] is None else clock(j["t_out"]), fare if j["t_out"] is not None else ""))
    taps.sort(key=lambda x: (x[0], x[1][5], x[1][6] if nol_shape == "tap" else 0))
    nol = []
    for _, row in taps:
        nol.append(row)
        if rng.random() < DUPLICATED:
            nol.append(row)

    # ---- the fleet ----
    fleet = []
    spare = [{"n": len(vehicles) + k, "type": list(TYPES)[k % 5]} for k in range(6)]
    for v in vehicles + spare:
        if v["n"] in MISSING_FROM_FLEET:
            continue
        seats = TYPES[v["type"]]
        standing = seats // 2
        fleet.append(["STANDIN-B%02d" % v["n"], "Stand-in Motors " + "ABC"[v["n"] % 3], v["type"], "" if v["n"] in (9, 14) else 2009 + (v["n"] * 7) % 16,
                      "STAND-IN OPERATOR %d" % (1 + v["n"] % 2), seats, standing, "" if v["n"] == 12 else seats + standing])

    # ---- the communities: nine invented squares over the routes, drawn a little inside their edge so that a few stops fall outside ----
    lons, lats = [x["lon"] for x in stops.values()], [x["lat"] for x in stops.values()]
    lon0, lat0 = min(lons) + 0.012, min(lats) + 0.012; cw, ch = (max(lons) - 0.012 - lon0) / 3, (max(lats) - 0.012 - lat0) / 3
    comm = []
    for k in range(9):
        x, y = lon0 + cw * (k % 3), lat0 + ch * (k // 3)
        ring = [(x, y), (x + cw, y), (x + cw, y + ch), (x, y + ch), (x, y)]
        wkt = "POLYGON ((" + ", ".join("%.4f %.4f" % p for p in ring) + "))"
        en, ar = "STAND-IN AREA %d" % (k + 1), "منطقة تجريبية %d" % (k + 1)
        comm.append(["ت%d" % (k + 1), "SI%d" % (k + 1), ar, en, 900 + k + 1, ar, en, 5000 + k, ar, en, 7000 + k, k + 1, wkt, "%.6f" % (cw * ch), "%.4f" % (2 * cw + 2 * ch)])

    # ---- the twelve network files: RTA's public rows, written under the column names the hackathon's feed uses ----
    # One thing is changed and one only: the calendar's dates are moved to December 2025, so that the public Monday timetable is the plan for the stand-in Monday.
    g = {}
    pick = lambda rows, cols: [[x.get(c, "") for c in cols] for x in rows]
    g["agency"] = pick(raw["agency"], GTFS_COLS["agency"]); g["routes"] = pick(raw["routes"], GTFS_COLS["routes"])
    g["trips"] = pick(raw["trips"], GTFS_COLS["trips"]); g["stop_times"] = pick(raw["stop_times"], GTFS_COLS["stop_times"])
    g["stops"] = pick(raw["stops"], GTFS_COLS["stops"]); g["shapes"] = pick(raw["shapes"], GTFS_COLS["shapes"]); g["transfers"] = pick(raw["transfers"], GTFS_COLS["transfers"])
    g["calendar"] = [[x["service_id"], x["monday"], x["tuesday"], x["wednesday"], x["thursday"], x["friday"], x["saturday"], x["sunday"], "20251201", "20251231"] for x in raw["calendar"]]
    g["calendar_dates"] = []; g["frequencies"] = []
    g["translations"] = [[x["table_name"], x["field_name"], x["language"], x["record_id"], "", x["translation"]] for x in raw["translations"]]
    g["feed_info"] = [[x["feed_publisher_name"], x["feed_publisher_url"], "20251201", "20251231"] for x in raw["feed_info"]]

    files = {"nol_transactions.csv": table(NOL_COLS, nol), "bus_runtime_avl.csv": table(AVL_COLS, avl), "bus_fleet.csv": table(FLEET_COLS, fleet),
             "community_boundaries.csv": table(COMM_COLS, comm),
             "README.txt": "STAND-IN DATA, NOT A RESULT. Written by tools/make_standin_raw.py from a fixed seed.\n"
                           "The network in gtfs/ is real and public: nine routes of RTA's public timetable feed as published in late 2021 (opendata/public/rta-gtfs/PROVENANCE.md), with its calendar's dates moved to December 2025.\n"
                           "Everything else is invented: every passenger, tap, card, device, vehicle, driver, lateness and community here. None of it is RTA's data, and no number made from it is a result.\n"
                           "A real table from the hackathon must never be put in this folder. scripts/gates.sh proves these files equal a fresh build.\n"}
    for name, cols in GTFS_COLS.items():
        files["gtfs/%s.txt" % name] = table(cols, g[name])
    # Where the network came from, for a screen to credit: the engine copies this into network.json as it is.
    files["NETWORK-SOURCE.json"] = json.dumps({
        "what": "Nine routes of RTA's public timetable feed, with their stops, paths and one Monday's trips",
        "publisher": "Roads and Transport Authority (RTA), Dubai", "published_as": "rta_gtfs-open on Dubai Pulse (now data.dubai)",
        "copy": "MobilityData feed mdb-904", "edition": "calendar 9 September 2021 to 31 December 2021", "fetched": "2026-11-17",
        "terms": "Dubai Open Data Licence (draft), with attribution to RTA", "credit": "Network: RTA public timetable feed, 2021 edition",
        "changed": "The calendar's dates are moved to December 2025 so that the public Monday timetable is the plan for the stand-in day. No other row is changed.",
        "invented": "Every passenger, tap, vehicle and lateness on this network is invented. The stops, routes and timetable are RTA's public ones.",
        "provenance": "opendata/public/rta-gtfs/PROVENANCE.md"}, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    return files


def main():
    args = sys.argv[1:]
    shape = args[args.index("--nol-shape") + 1] if "--nol-shape" in args else "tap"
    out = args[args.index("--out") + 1] if "--out" in args else OUT
    if shape not in ("tap", "journey"):
        print("--nol-shape is tap or journey"); return 2
    files = build(shape)
    big = [n for n, t in files.items() if len(t.encode("utf-8")) > 8_000_000]
    if "--check" in args:
        def same(n):
            p = os.path.join(out, n)
            return os.path.exists(p) and open(p, encoding="utf-8", newline="").read() == files[n]
        bad = [n for n in files if not same(n)]
        extra = sorted(os.path.relpath(os.path.join(d, f), out) for d, _, fs in os.walk(out) for f in fs if os.path.relpath(os.path.join(d, f), out) not in files and f != ".DS_Store")
        print("FAIL fixtures/raw differs from a fresh build: " + ", ".join(bad) if bad else "PASS fixtures/raw equals a fresh build (%d files)" % len(files))
        print("FAIL fixtures/raw holds a file this program did not write: " + ", ".join(extra) if extra else "PASS fixtures/raw holds nothing this program did not write")
        print("FAIL too large to be an invented table: " + ", ".join(big) if big else "PASS every file is under 400,000 bytes")
        n = (1 if bad else 0) + (1 if extra else 0) + (1 if big else 0)
        print("ALL PASS" if not n else "%d FAILED" % n)
        return 1 if n else 0
    for name, text in files.items():
        path = os.path.join(out, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    print("wrote %d files to %s (%s shape, %d bytes)" % (len(files), os.path.relpath(out, ROOT) if out.startswith(ROOT) else out, shape, sum(len(t.encode("utf-8")) for t in files.values())))
    for n in big:
        print("WARNING %s is over 400,000 bytes: the guard will refuse it" % n)
    return 0


if __name__ == "__main__":
    sys.exit(main())
