#!/usr/bin/env python3
"""Writes invented raw tables to fixtures/raw/: the same file kinds and exactly the column names RTA provided
(docs/DATA.md, section 1), and not one real row. Every stage of the engine is built and tested on these.

  python3 tools/make_standin_raw.py                     write fixtures/raw/
  python3 tools/make_standin_raw.py --check             rebuild in memory, compare byte for byte with what is on disk
  python3 tools/make_standin_raw.py --out DIR --nol-shape journey     write a variant somewhere else (tests use this)

Everything comes from one fixed seed, so two runs give the same bytes. The gates run --check: that is what proves the
tables in fixtures/raw/ are invented, and it is the only reason the guard lets these column names into git.
A real table must never be put in fixtures/raw/.

Choices made here, because the real answers are not known until the census has run on the real data:
- One nol row is one TAP (the default, --nol-shape tap): a check-in row has CKI=1, CKO=0 and Amount 0.00; a check-out row
  has CKI=0, CKO=1 and the fare. With --nol-shape journey one row is one journey: CKI and CKO hold the two clock times.
- The runtime report keeps the service date in Date and writes clock times as HH:MM:SS that wrap at midnight
  (a bus at 24:12 is written 00:12:00). Nothing runs between 02:00 and 05:00, so a time before 04:00 is the next day.
  The nol table writes the calendar date, so a tap after midnight is dated 2025-12-16.
- GTFS times run above 24:00:00, as the standard says.
- Every identifier is invented and begins STANDIN-.
- Each file stays under the guard's limit for an invented table (3,000,000 bytes), which is why the day is thinner than a real one:
  PEAK_HEADWAY, OFF_HEADWAY and RIDERS below are the three numbers to change if that limit is ever raised.

Mess planted on purpose, for the census to count (the test recounts each from the files, nothing is typed twice):
two vehicles that run but are missing from the fleet table; taps whose route number is written in another format;
taps that carry the stop before the right one; duplicated taps; empty stop names and amounts; journeys with no
check-out; stop visits where the door did not open; three scheduled trips that did not run; two stops outside every
community; two buses with no model year and one with no total.
"""
import csv, io, math, os, random, sys

SEED = 20251215
DATE, NEXT_DATE = "2025-12-15", "2025-12-16"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "fixtures", "raw")
PEAK_HEADWAY, OFF_HEADWAY = 20 * 60, 45 * 60      # seconds between buses in one direction
RIDERS = 1.35                                      # multiplies every boarding rate
N_STOPS = 15
LON0, LAT0, CELL = 55.20, 25.10, 0.06              # nine invented communities in a 3 by 3 grid
TYPES = {"STANDARD": 32, "ARTICULATED": 48, "DOUBLE": 64, "MIDI": 20, "COACH": 44}
# short name (invented: none is meant to be a route that exists), long name, from (lon, lat), to (lon, lat), how busy, the bus types its vehicles take in turn
ROUTES = [
    ("901",  "Stand-in South Cross",  (55.21, 25.13), (55.37, 25.13), 1.6, ["MIDI", "STANDARD", "ARTICULATED"]),
    ("902A", "Stand-in Middle Cross", (55.21, 25.19), (55.37, 25.19), 1.2, ["STANDARD", "ARTICULATED"]),
    ("903",  "Stand-in North Cross",  (55.21, 25.25), (55.37, 25.25), 0.8, ["STANDARD", "MIDI"]),
    ("904",  "Stand-in West Line",    (55.23, 25.11), (55.23, 25.27), 1.0, ["STANDARD", "DOUBLE"]),
    ("Q13",  "Stand-in Centre Line",  (55.29, 25.11), (55.29, 25.27), 0.5, ["DOUBLE", "ARTICULATED"]),
    ("Q28",  "Stand-in East Line",    (55.35, 25.11), (55.35, 25.27), 1.4, ["MIDI", "STANDARD"]),
    ("K10",  "Stand-in Rising Line",  (55.21, 25.11), (55.37, 25.27), 0.9, ["STANDARD", "COACH"]),
    ("K900", "Stand-in Falling Line", (55.21, 25.27), (55.39, 25.09), 0.35, ["COACH", "DOUBLE"]),
]
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


def build(nol_shape="tap"):
    rng = random.Random(SEED)
    # ---- the network: eight routes, two directions, a stop on each side of the road ----
    stops, shapes, routes = {}, [], []
    for ri, (short, long_name, a, b, weight, pool) in enumerate(ROUTES):
        rid = "R%02d" % (ri + 1)
        seg = 110 + 12 * (ri % 5)                                    # scheduled seconds between stops
        line = [(a[0] + (b[0] - a[0]) * i / (N_STOPS - 1), a[1] + (b[1] - a[1]) * i / (N_STOPS - 1)) for i in range(N_STOPS)]
        dirs = []
        for d in (0, 1):
            pts = line if d == 0 else line[::-1]
            off = 0.0003 if d == 0 else -0.0003                     # the other side of the road
            ids = []
            for i, (lon, lat) in enumerate(pts):
                n = i if d == 0 else N_STOPS - 1 - i
                sid = str(100000 + (ri + 1) * 1000 + (n + 1) * 10 + d + 1)
                stops[sid] = {"name": "Stand-in %s Stop %d %s" % (short, n + 1, "A" if d == 0 else "B"), "lon": round(lon + off, 6), "lat": round(lat + off, 6), "code": "SC%d%02d%d" % (ri + 1, n + 1, d + 1)}
                ids.append(sid)
            shape_id = "P%d%d" % (ri + 1, d)
            dist, acc = [0.0], 0.0
            for p, q in zip(ids, ids[1:]):
                acc += metres((stops[p]["lon"], stops[p]["lat"]), (stops[q]["lon"], stops[q]["lat"]))
                dist.append(round(acc, 1))
            for i, sid in enumerate(ids):
                shapes.append([shape_id, "%.6f" % stops[sid]["lat"], "%.6f" % stops[sid]["lon"], i + 1, dist[i]])
            dirs.append({"stops": ids, "shape_id": shape_id, "dist": dist})
        routes.append({"rid": rid, "short": short, "long": long_name, "weight": weight, "pool": pool, "seg": seg, "dirs": dirs})

    # ---- the timetable ----
    sched = []
    for ri, r in enumerate(routes):
        for d in (0, 1):
            t = 5 * 3600 + ((ri * 41 + d * 71) % 150) * 60        # staggered, so the routes do not all leave together
            while t <= 24 * 3600 + 20 * 60:
                sched.append({"ri": ri, "dir": d, "dep": t})
                t += int((OFF_HEADWAY - (OFF_HEADWAY - PEAK_HEADWAY) * min(1.0, bump(t, 7.75, 1.4) + bump(t, 17.75, 1.6))) / 60) * 60   # buses come closer together towards each peak
    sched.sort(key=lambda x: (x["dep"], x["ri"], x["dir"]))
    for n, tr in enumerate(sched):
        r = routes[tr["ri"]]
        tr["n"] = n
        tr["gtfs_id"] = "%s-%d-%s" % (r["rid"], tr["dir"], clock(tr["dep"], wrap=False).replace(":", "")[:4])
        tr["arr"] = [tr["dep"] + i * r["seg"] for i in range(N_STOPS)]
        tr["sdep"] = [a + (30 if i in (4, 9) else 0) for i, a in enumerate(tr["arr"])]      # two timing points where the bus waits

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
        ids = r["dirs"][tr["dir"]]["stops"]
        aboard, late, prev_dep = [], rng.randint(-60, 120), None
        for i, sid in enumerate(ids):
            sa, sd = tr["arr"][i], tr["sdep"][i]
            peak = bump(sa, 8.0, 1.0) + bump(sa, 18.0, 1.3)
            if i:
                late += rng.gauss(26 * peak - 5, 18) + 90 * peak / N_STOPS       # lateness grows along the route, most in the peaks
            act_arr = int(round(sa + late))
            if prev_dep is not None:
                act_arr = max(act_arr, prev_dep + 40)
            off = [j for j in aboard if j["to"] == i]
            aboard = [j for j in aboard if j["to"] != i]
            on = 0
            if i < N_STOPS - 1:
                tide = 1.35 if tr["dir"] == 0 else 0.65                           # direction 0 runs towards work in the morning
                shape = 0.18 + 1.5 * tide * bump(sa, 7.75, 1.0) + 1.35 * (2 - tide) * bump(sa, 17.75, 1.2)
                if sa >= 22 * 3600:
                    shape *= 0.6
                place = (1 - i / (N_STOPS - 1)) ** 0.7 + 0.15
                on = poisson(rng, RIDERS * 1.15 * r["weight"] * shape * place)
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
                j = {"card": card, "v": v["n"], "ri": tr["ri"], "dir": tr["dir"], "from": i, "to": min(N_STOPS - 1, i + 1 + int(rng.expovariate(1 / 7.0))),
                     "t_in": act_arr + 2 + int(rng.random() * max(1, dwell - 4)), "odd": v["odd"], "t_out": None, "no_out": rng.random() < NO_CHECK_OUT, "door": 1 + (rng.random() < 0.4)}
                aboard.append(j); journeys.append(j)
                card_free.append((act_arr + 2400, card))
            tid += 1
            diff = act_arr - sa
            avl.append([DATE, "Weekday", body, 70000 + tr["n"], r["short"], driver, tr["dir"], i + 1, sid, stops[sid]["name"], clock(sa), clock(act_arr), clock(sd), clock(act_dep),
                        "%.1f" % (diff / 60), door, "B%02d" % v["n"], r["dirs"][tr["dir"]]["shape_id"], clock(tr["arr"][-1]), diff, (sa % 86400) // 3600, tid])
            prev_dep = act_dep
            if door == "Open":
                late = max(late, act_dep - sd)                       # a long stop makes the bus later
        v["free"] = prev_dep + 300

    # ---- nol rows ----
    def odd_route(short):
        return ("0" + short) if short.isdigit() else short.lower()

    def tap_row(j, t, stop_i, cki, cko, amount):
        r = routes[j["ri"]]
        ids = r["dirs"][j["dir"]]["stops"]
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

    # ---- the communities ----
    comm = []
    for k in range(9):
        x, y = LON0 + CELL * (k % 3), LAT0 + CELL * (k // 3)
        ring = [(x, y), (x + CELL, y), (x + CELL, y + CELL), (x, y + CELL), (x, y)]
        wkt = "POLYGON ((" + ", ".join("%.4f %.4f" % p for p in ring) + "))"
        en, ar = "STAND-IN COMMUNITY %d" % (k + 1), "منطقة تجريبية %d" % (k + 1)
        comm.append(["ت%d" % (k + 1), "SI%d" % (k + 1), ar, en, 900 + k + 1, ar, en, 5000 + k, ar, en, 7000 + k, k + 1, wkt, "%.6f" % (CELL * CELL), "%.4f" % (4 * CELL)])

    # ---- the twelve network files ----
    g = {}
    g["agency"] = [["SI", "Stand-in Transit (invented)", "https://example.invalid", "Asia/Dubai", "en", ""]]
    g["routes"] = [[r["rid"], "SI", r["short"], r["long"], 3, "0E5A5A", "FFFFFF"] for r in routes]
    g["trips"] = [[routes[t["ri"]]["rid"], "WK", t["gtfs_id"], routes[t["ri"]]["dirs"][t["dir"]]["shape_id"], "Stand-in %s end" % ("east" if t["dir"] == 0 else "west"), t["dir"], "", ""] for t in sched]
    g["stop_times"] = [[t["gtfs_id"], clock(t["arr"][i], wrap=False), clock(t["sdep"][i], wrap=False), sid, i + 1, "", 0, 0, routes[t["ri"]]["dirs"][t["dir"]]["dist"][i]]
                       for t in sched for i, sid in enumerate(routes[t["ri"]]["dirs"][t["dir"]]["stops"])]
    g["stops"] = [[sid, s["name"], "%.6f" % s["lat"], "%.6f" % s["lon"], "", 0, s["code"], "", ""] for sid, s in sorted(stops.items())]
    g["calendar"] = [["WK", 1, 1, 1, 1, 1, 0, 0, "20251201", "20251231"], ["WE", 0, 0, 0, 0, 0, 1, 1, "20251201", "20251231"]]
    g["calendar_dates"] = [["WK", "20251202", 2], ["WE", "20251202", 1]]
    g["frequencies"] = []
    g["shapes"] = shapes
    near = []
    ordered = sorted(stops.items())
    for a_id, a in ordered:
        for b_id, b in ordered:
            if a_id[:3] != b_id[:3] and metres((a["lon"], a["lat"]), (b["lon"], b["lat"])) < 450:
                near.append([a_id, b_id, 2, 300])
    g["transfers"] = near
    g["translations"] = [["stops", "stop_name", "ar", sid, "", "موقف تجريبي %s" % sid[-4:]] for sid, _ in ordered]
    g["feed_info"] = [["STAND-IN, invented by tools/make_standin_raw.py", "https://example.invalid", "20251201", "20251231"]]

    files = {"nol_transactions.csv": table(NOL_COLS, nol), "bus_runtime_avl.csv": table(AVL_COLS, avl), "bus_fleet.csv": table(FLEET_COLS, fleet),
             "community_boundaries.csv": table(COMM_COLS, comm),
             "README.txt": "STAND-IN DATA, NOT A RESULT. Every row here is invented by tools/make_standin_raw.py from a fixed seed.\nA real table must never be put in this folder. scripts/gates.sh proves these files equal a fresh build.\n"}
    for name, cols in GTFS_COLS.items():
        files["gtfs/%s.txt" % name] = table(cols, g[name])
    return files


def main():
    args = sys.argv[1:]
    shape = args[args.index("--nol-shape") + 1] if "--nol-shape" in args else "tap"
    out = args[args.index("--out") + 1] if "--out" in args else OUT
    if shape not in ("tap", "journey"):
        print("--nol-shape is tap or journey"); return 2
    files = build(shape)
    big = [n for n, t in files.items() if len(t.encode("utf-8")) > 3_000_000]
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
