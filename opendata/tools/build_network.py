"""Build the stop and route tables of item 3 in opendata/public/ from three files fetched outside git.

    python3 opendata/tools/build_network.py <raw folder>

<raw folder> holds, each fetched with opendata/tools/fetch_dataset.py:
  bus_stop_details.csv.gz                    (dataset 460287)
  public_transportation_routes_stops.csv.gz  (dataset 467874)
  bus_routes.csv.gz                          (dataset 460261)
The same inputs give the same tables byte for byte. See the .source.md files beside the tables.
"""
import csv, gzip, math, os, re, sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public")

KIND = {"Nornal - Pole": "pole", "Pole": "pole", "A/C shelter": "ac_shelter", "AC Shelter": "ac_shelter",
        "AC Bus Shade": "ac_shelter", "Intercity": "intercity_stop", "Marine": "marine_station",
        "Dummy": "not_a_passenger_stop"}
# The numbers in the route-stops dataset carry no key on the portal. These names are read off the routes
# under each number; only 1, 3 and 7 are confirmed by the portal's own bus_routes table (Urban, Feeder, Marine).
ROUTE_KIND = {"1": "urban", "2": "express", "3": "feeder", "4": "night", "5": "intercity", "6": "seasonal",
              "7": "marine", "8": "metro_link", "0": "other"}
ROUTE_KIND_CONFIRMED = {"1", "3", "7"}


def rows(raw, name):
    with gzip.open(os.path.join(raw, name), "rt", encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


def write(name, header, data):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(data)
    print(name, len(data), "rows")


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def metres(a, b, c, d):
    x = math.radians(d - b) * math.cos(math.radians((a + c) / 2))
    y = math.radians(c - a)
    return 6371000 * math.hypot(x, y)


def natural(s):
    return [int(p) if p.isdigit() else p for p in re.split(r"(\d+)", s)]


def main(raw):
    os.makedirs(OUT, exist_ok=True)

    # ---- the route-stops dataset: stop kinds, route kinds, stops in order (reports of 2020 to 2022)
    rs = [x for x in rows(raw, "public_transportation_routes_stops.csv.gz")]
    kind = {}                                  # stop_id -> (report_date, kind, as published)
    for x in rs:
        k = x["bus_stop_type"].strip()
        if k and x["stop_id"] and (x["stop_id"] not in kind or x["report_date"] > kind[x["stop_id"]][0]):
            kind[x["stop_id"]] = (x["report_date"], KIND[k], k)
    route_code = {}
    for x in sorted(rs, key=lambda x: x["report_date"]):
        if x["route_name"] and x["transport_mode"] in ("Bus", ""):
            route_code[x["route_name"]] = x["route_type"]
    named_kind = {x["route_name"]: x["route_type"] for x in rows(raw, "bus_routes.csv.gz")}

    # ---- the stop details dataset: every stop ever reported, and the newest report as today's network
    first, last, newest_date = {}, {}, ""
    for x in rows(raw, "bus_stop_details.csv.gz"):
        s = x["stop_id"]
        if not s:
            continue
        d = x["report_date"]
        if d > newest_date:
            newest_date = d
        if s not in first or d < first[s]:
            first[s] = d
        if s not in last or d > last[s]["report_date"]:
            last[s] = x
        k = x["bus_stop_type"].strip()
        if k and (s not in kind or d > kind[s][0]):
            kind[s] = (d, KIND[k], k)
    on_routes = defaultdict(set)
    for x in rows(raw, "bus_stop_details.csv.gz"):
        if x["report_date"] == newest_date and x["stop_id"]:
            on_routes[x["stop_id"]].add(x["route_name"])

    # a stop with a newer, shorter number takes its kind from the older record of the same name within 60 m
    old_by_name = defaultdict(list)
    for s, x in last.items():
        if s in kind and x["stop_location_latitude"]:
            old_by_name[norm(x["stop_name"])].append((s, float(x["stop_location_latitude"]), float(x["stop_location_longitude"])))
    for x in rs:
        if x["stop_id"] in kind and x["stop_location_latitude"]:
            old_by_name[norm(x["stop_name"])].append((x["stop_id"], float(x["stop_location_latitude"]), float(x["stop_location_longitude"])))

    stops = []
    for s in sorted(last, key=natural):
        x = last[s]
        lat, lon = x["stop_location_latitude"], x["stop_location_longitude"]
        k, src, twin = "", "", ""
        if s in kind:
            k, src = kind[s][1], "own record " + kind[s][0]
        elif lat:
            best = None
            for (o, a, b) in old_by_name.get(norm(x["stop_name"]), []):
                m = metres(float(lat), float(lon), a, b)
                if m <= 60 and (best is None or m < best[0]):
                    best = (m, o)
            if best:
                k, twin = kind[best[1]][1], best[1]
                src = "same name within 60 m: stop " + best[1] + ", " + kind[best[1]][0]
        stops.append([s, x["stop_name"].strip(), lat, lon, k, src, twin, first[s], x["report_date"],
                      int(x["report_date"] == newest_date), len(on_routes.get(s, ())),
                      " ".join(sorted(on_routes.get(s, ()), key=natural))])
    write("bus-stops.csv", ["stop_id", "stop_name", "latitude", "longitude", "stop_kind", "stop_kind_from",
                            "older_stop_id", "first_report", "last_report", "in_newest_report",
                            "routes_count", "routes"], stops)
    print("  newest report", newest_date, "stops in it", sum(r[9] for r in stops),
          "kinds", dict(Counter(r[4] or "not stated" for r in stops)),
          "kinds among newest", dict(Counter(r[4] or "not stated" for r in stops if r[9])))

    # ---- routes of the newest report
    route_stops = defaultdict(set)
    for s, rr in on_routes.items():
        for r in rr:
            route_stops[r].add(s)
    routes = []
    for r in sorted(route_stops, key=natural):
        code = route_code.get(r, "")
        if r in named_kind:
            k, src = named_kind[r].lower(), "bus_routes table"
        elif code in ROUTE_KIND_CONFIRMED:
            k, src = ROUTE_KIND[code], "route-stops code " + code
        elif code:
            k, src = ROUTE_KIND[code], "route-stops code " + code + ", meaning inferred"
        else:
            k, src = "", ""
        routes.append([r, k, src, len(route_stops[r])])
    write("bus-routes.csv", ["route_name", "route_kind", "route_kind_from", "stops_in_newest_report"], routes)
    print("  kinds", dict(Counter(r[1] or "not stated" for r in routes)))

    # ---- stops in order, from the newest report each route has in the route-stops dataset
    newest_for = {}
    for x in rs:
        if x["route_name"] and x["transport_mode"] in ("Bus", "") and x["stop_order_number"] != "":
            newest_for[x["route_name"]] = max(newest_for.get(x["route_name"], ""), x["report_date"])
    seen, ordered = set(), []
    for x in rs:
        r = x["route_name"]
        if not r or x["transport_mode"] not in ("Bus", "") or x["stop_order_number"] == "" or x["report_date"] != newest_for[r]:
            continue
        key = (r, x["route_direction"], x["first_stop"], x["last_stop"], int(x["stop_order_number"]), x["stop_id"])
        if key in seen:
            continue
        seen.add(key)
        code = x["route_type"]
        ordered.append([r, ROUTE_KIND.get(code, ""), x["route_direction"], x["first_stop"].strip(), x["last_stop"].strip(),
                        int(x["stop_order_number"]), x["stop_id"], x["stop_name"].strip(),
                        x["stop_location_latitude"], x["stop_location_longitude"],
                        KIND.get(x["bus_stop_type"].strip(), ""), x["report_date"]])
    ordered.sort(key=lambda r: (natural(r[0]), r[2], r[3], r[4], r[5], r[6]))
    write("bus-route-stops-ordered.csv", ["route_name", "route_kind", "direction", "first_stop", "last_stop",
                                          "stop_order", "stop_id", "stop_name", "latitude", "longitude",
                                          "stop_kind", "report_date"], ordered)
    print("  routes", len({r[0] for r in ordered}), "report dates", dict(Counter(r[11] for r in ordered)))


if __name__ == "__main__":
    main(sys.argv[1])
