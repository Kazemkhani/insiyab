#!/usr/bin/env python3
"""Cuts a small part out of RTA's public network feed, for the stand-in day to run on: real routes, real stops, real paths and a real
Monday timetable. Nothing here comes from the data RTA gave the hackathon; this is the feed RTA published as open data.

  python3 tools/make_public_network.py --feed <folder holding the unzipped public feed>      writes opendata/public/rta-gtfs/

The feed is the copy kept by MobilityData (mdb-904), whose source is Dubai Pulse's rta_gtfs-open. Its calendar runs from
9 September to 31 December 2021, so this is the network as it was published in late 2021, and every screen that draws it says so.
Rows are copied as they are. Only rows are left out: other routes, other days' services, and the stops, paths and transfers they alone use."""
import csv, io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "opendata", "public", "rta-gtfs")
DAY = "20211115"                      # a Monday inside the feed's calendar: its services are the plan for the stand-in Monday
# Nine bus routes chosen to cross the city and to differ in kind: trunk, city loop, feeders to housing and industry, a long cross-town run.
ROUTES = ["8", "C01", "27", "F47", "320", "84", "91A", "17", "J01"]
FILES = ["agency", "routes", "trips", "stop_times", "stops", "calendar", "calendar_dates", "shapes", "transfers", "translations", "feed_info"]


def read(folder, name):
    path = os.path.join(folder, name + ".txt")
    if not os.path.exists(path):
        return [], []
    with open(path, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f); rows = list(r); return r.fieldnames, rows


def text(cols, rows):
    out = io.StringIO(); w = csv.writer(out, lineterminator="\n"); w.writerow(cols)
    for r in rows:
        w.writerow([r[c] for c in cols])
    return out.getvalue()


def build(folder):
    t = {n: read(folder, n) for n in FILES}
    weekday = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][__import__("datetime").date(int(DAY[:4]), int(DAY[4:6]), int(DAY[6:])).weekday()]
    services = {c["service_id"] for c in t["calendar"][1] if c[weekday] == "1" and c["start_date"] <= DAY <= c["end_date"]}
    routes = [r for r in t["routes"][1] if r["route_type"] == "3" and r["route_short_name"] in ROUTES]
    missing = sorted(set(ROUTES) - {r["route_short_name"] for r in routes})
    if missing:
        raise SystemExit(f"the feed has no bus route named {missing}")
    rid = {r["route_id"] for r in routes}
    trips = [x for x in t["trips"][1] if x["route_id"] in rid and x["service_id"] in services]
    tid = {x["trip_id"] for x in trips}
    stop_times = [x for x in t["stop_times"][1] if x["trip_id"] in tid]
    sid = {x["stop_id"] for x in stop_times}; shape = {x["shape_id"] for x in trips}
    keep = {"agency": t["agency"][1], "routes": sorted(routes, key=lambda r: ROUTES.index(r["route_short_name"])), "trips": trips, "stop_times": stop_times,
            "stops": [x for x in t["stops"][1] if x["stop_id"] in sid], "calendar": [c for c in t["calendar"][1] if c["service_id"] in {x["service_id"] for x in trips}],
            "calendar_dates": [c for c in t["calendar_dates"][1] if c["service_id"] in services and c.get("date") == DAY],
            "shapes": [x for x in t["shapes"][1] if x["shape_id"] in shape], "transfers": [x for x in t["transfers"][1] if x["from_stop_id"] in sid and x["to_stop_id"] in sid],
            "translations": [x for x in t["translations"][1] if x.get("table_name") == "stops" and x.get("record_id") in sid], "feed_info": t["feed_info"][1]}
    files = {n + ".txt": text(t[n][0], keep[n]) for n in FILES if t[n][0]}
    counts = {n: len(keep[n]) for n in FILES}
    files["PROVENANCE.md"] = f"""# RTA's public network feed, a part of it

What this is: {counts['routes']} bus routes ({', '.join(ROUTES)}) out of RTA's public timetable feed, with the {counts['trips']:,} trips they ran on Monday {DAY[6:]}.{DAY[4:6]}.{DAY[:4]}, the {counts['stops']:,} stops those trips call at, their paths, and the transfers between those stops. Rows are copied unchanged; rows for other routes and other days are left out.

| | |
|---|---|
| Publisher | Roads and Transport Authority (RTA), Dubai |
| Published as | `rta_gtfs-open` on Dubai Pulse (now data.dubai) |
| Copy used | MobilityData, feed mdb-904: https://storage.googleapis.com/storage/v1/b/mdb-latest/o/ae-dubayy-road-and-transport-authority-rta-gtfs-904.zip?alt=media |
| The feed's own dates | calendar from 9 September 2021 to 31 December 2021: this is the network as published in late 2021 |
| Fetched | 17 November 2026 |
| Terms | Dubai's Open Data Licence (the long form on Dubai Pulse is marked DRAFT): use with attribution to RTA. The MobilityData catalogue marks this copy "deprecated", meaning a newer feed replaced it; it is used here for its shape, not as today's timetable. |
| Made by | `python3 tools/make_public_network.py --feed <folder>` |

What it is not: it is not part of the data RTA gave the hackathon, and it holds no passenger, card, device, driver or vehicle. The stand-in day invents those on top of this network (`tools/make_standin_raw.py`).

Rows kept: {', '.join(f'{n} {c:,}' for n, c in counts.items())}.
"""
    return files


def main():
    a = sys.argv[1:]
    if "--feed" not in a:
        print(__doc__); return 2
    files = build(a[a.index("--feed") + 1]); os.makedirs(OUT, exist_ok=True)
    for name, body in files.items():
        open(os.path.join(OUT, name), "w", encoding="utf-8", newline="").write(body)
    print("wrote", len(files), "files to opendata/public/rta-gtfs:", {n: len(b) // 1024 for n, b in files.items() if len(b) > 100000}, "KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
