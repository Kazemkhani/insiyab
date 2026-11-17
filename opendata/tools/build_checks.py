"""Build the tables of item 7 in opendata/public/: metro stations, and monthly bus passengers by route.

    python3 opendata/tools/build_checks.py <raw folder>

<raw folder> holds, each fetched with opendata/tools/fetch_dataset.py:
  metro_stations.csv.gz                          (dataset 466421)
  bus_passengers_trips_by_route_monthly.csv.gz   (dataset 459793)
The same inputs give the same tables byte for byte.
"""
import csv, gzip, os, re, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public")
MONTHS = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}


def rows(raw, name):
    with gzip.open(os.path.join(raw, name), "rt", encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f)


def write(name, header, data):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(data)
    print(name, len(data), "rows")


def natural(s):
    return [int(p) if p.isdigit() else p for p in re.split(r"(\d+)", s)]


def main(raw):
    os.makedirs(OUT, exist_ok=True)
    st = [[x["location_id"], x["location_name_english"].strip(), x["location_name_arabic"].strip(),
           x["line_name"].replace(" Metro line", "").lower(), x["station_location_latitude"], x["station_location_longitude"],
           x["zone_id"], x["station_opening_date"], x["station_closing_date"]] for x in rows(raw, "metro_stations.csv.gz")]
    st.sort(key=lambda r: (r[3], natural(r[0])))
    write("metro-stations.csv", ["station_id", "station_name", "station_name_arabic", "line", "latitude", "longitude",
                                 "fare_zone", "opened", "closed"], st)

    # the monthly file repeats some months: keep, for each year, month and route, the row loaded last
    seen = defaultdict(list)
    for x in rows(raw, "bus_passengers_trips_by_route_monthly.csv.gz"):
        seen[(int(x["year"]), MONTHS[x["month"]], x["route_name"].strip())].append((x["load_timestamp"], int(float(x["trips"] or 0))))
    out, repeated, differing = [], 0, 0
    for (y, m, r) in sorted(seen, key=lambda k: (k[0], k[1], natural(k[2]))):
        v = sorted(seen[(y, m, r)])
        values = {t for _, t in v}
        repeated += len(v) > 1
        differing += len(values) > 1
        out.append([y, m, r, v[-1][1], len(v), int(len(values) > 1)])
    write("bus-passengers-by-route-monthly.csv", ["year", "month", "route_name", "passenger_trips", "rows_in_source",
                                                  "source_rows_differ"], out)
    dec = [r for r in out if r[0] == 2025 and r[1] == 12]
    print("  repeated", repeated, "differing", differing, "| December 2025:", len(dec), "routes,", sum(r[3] for r in dec), "passenger trips",
          "| months", out[0][:2], "to", out[-1][:2])


if __name__ == "__main__":
    main(sys.argv[1])
