#!/usr/bin/env python3
"""Proves the census (model/census.py) counts correctly and prints nothing about one card, device, driver or vehicle.

    python3 tests/test_census.py          last line ALL PASS, or the number that failed

This file uses the standard library only and counts everything a second time in its own way, straight from the files,
so a count is never checked against the code that made it. The census itself needs pandas: it is run in whichever of
these has pandas, in this order: $INSIYAB_PYTHON, .venv/bin/python, the Python running this file, python3, /usr/bin/python3.
"""
import bisect, csv, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "fixtures", "raw")
sys.path.insert(0, ROOT)
from tools import make_standin_raw as gen      # noqa: E402  (its planted constants, and the journey-shaped variant)

ID_COLS = {"nol_transactions.csv": ["NOL_ID", "device_id", "device_id_hex", "Body_EVD_ID"], "bus_runtime_avl.csv": ["Driver_id", "Body"], "bus_fleet.csv": ["Body_number"]}
FAILED = 0


def check(name, ok, detail=""):
    global FAILED
    print(("PASS " if ok else "FAIL ") + name + ("" if ok or not detail else ": " + str(detail)))
    FAILED += 0 if ok else 1


def python_with_pandas():
    for exe in [os.environ.get("INSIYAB_PYTHON"), os.path.join(ROOT, ".venv", "bin", "python"), sys.executable, "python3", "/usr/bin/python3"]:
        if not exe:
            continue
        try:
            if subprocess.run([exe, "-c", "import pandas, numpy"], capture_output=True, timeout=60).returncode == 0:
                return exe
        except (OSError, subprocess.TimeoutExpired):
            continue
    return None


def run_census(py, folder, as_json=False):
    r = subprocess.run([py, "-m", "model.census", "--data", folder] + (["--json"] if as_json else []), cwd=ROOT, capture_output=True, text=True, timeout=300)
    return r.returncode, r.stdout, r.stderr


def rows(folder, name):
    with open(os.path.join(folder, name), encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def secs(clock, date=None):
    h, m, s = (int(x) for x in clock.split(":"))
    t = h * 3600 + m * 60 + s
    if date is not None:
        return t + (86400 if date > gen.DATE else 0)
    return t + 86400 if t < 4 * 3600 else t


def inside(lon, lat, ring):
    hit, j = False, len(ring) - 1
    for i in range(len(ring)):
        (xi, yi), (xj, yj) = ring[i], ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def recount(folder):
    """Every expected number, counted here from the files with no pandas and none of the census's code."""
    nol, avl, fleet = rows(folder, "nol_transactions.csv"), rows(folder, "bus_runtime_avl.csv"), rows(folder, "bus_fleet.csv")
    stops, comm, trips = rows(folder, "gtfs/stops.txt"), rows(folder, "community_boundaries.csv"), rows(folder, "gtfs/trips.txt")
    short = {r["route_short_name"] for r in rows(folder, "gtfs/routes.txt")}
    in_fleet = {r["Body_number"] for r in fleet}
    want = {"nol.rows": len(nol), "avl.rows": len(avl), "fleet.rows": len(fleet), "count1.stop_visits": len(avl),
            "count1.door_did_not_open": sum(r["Door_Status"] == "Closed" for r in avl),
            "join.nol_vehicle->fleet_vehicle.rows_exact": round(sum(r["Body_EVD_ID"] in in_fleet for r in nol) / len(nol), 4),
            "count5.vehicles_that_ran_but_are_not_in_the_fleet_table": len({r["Body"] for r in avl} - in_fleet),
            "nol.route_values_not_in_gtfs": len({r["Route"] for r in nol} - short),
            "join.nol_route->gtfs_route_short_name.rows_exact": round(sum(r["Route"] in short for r in nol) / len(nol), 4),
            "join.nol_route->gtfs_route_short_name.rows_ignoring_format": 1.0,
            "odd.fleet.vehicles_with_no_model_year": sum(r["Model Year"] == "" for r in fleet), "odd.fleet.rows_with_no_total": sum(r["Total"] == "" for r in fleet),
            "odd.trips_in_the_plan": len(trips), "odd.trips_in_the_runtime_report": len({r["Trip_ID"] for r in avl}),
            "nol.empty.Stop_name": round(sum(r["Stop_name"] == "" for r in nol) / len(nol), 4), "nol.empty.Amount": round(sum(r["Amount"] == "" for r in nol) / len(nol), 4),
            "nol.distinct_cards": len({r["NOL_ID"] for r in nol}), "avl.distinct_trips": len({r["Trip_ID"] for r in avl})}
    seen, dup = set(), 0
    for r in nol:
        k = tuple(r.values())
        dup += k in seen
        seen.add(k)
    want["odd.nol.rows_that_repeat_another_row_exactly"] = dup
    rings = [[tuple(float(x) for x in p.split()) for p in re.search(r"\(\((.*)\)\)", c["shape"]).group(1).split(",")] for c in comm]
    want["places.stops_outside_every_community"] = sum(not any(inside(float(s["stop_lon"]), float(s["stop_lat"]), ring) for ring in rings) for s in stops)
    # each tap to the stop its bus had last reached, by a plain search
    # where each row falls on the service day, worked out the plain way: follow each vehicle down the file, and when its clock falls back by
    # more than six hours it has passed midnight (a fixed hour is wrong on a real timetable, where night buses run past 04:00)
    raw = lambda c: sum(int(x) * k for x, k in zip(c.split(":"), (3600, 60, 1)))
    last, days, arrive = {}, {}, []
    for r in avl:
        v, t = r["Body"], raw(r["Sched_Arr"])
        if v not in last:
            days[v] = 1 if t < 4 * 3600 else 0
        elif t < last[v] - 6 * 3600:
            days[v] = 1
        last[v] = t
        a_ = raw(r["Act_Arr"]) + 86400 * days[v]; anchor = t + 86400 * days[v]
        arrive.append(a_ + (86400 if a_ < anchor - 12 * 3600 else 0) - (86400 if a_ > anchor + 12 * 3600 else 0))
    by_veh = {}
    for i, r in enumerate(avl):
        by_veh.setdefault(r["Body"], []).append((arrive[i], i))
    for v in by_veh.values():
        v.sort()
    tapped, wrong, placed, ons = set(), 0, 0, 0
    is_tap = set(r["CKI"] for r in nol) <= {"0", "1"}
    for r in nol:
        visits = by_veh.get(r["Body_EVD_ID"], [])
        k = bisect.bisect_right(visits, (secs(r["Transaction_Time"], r["Transaction_date"]), len(avl))) - 1
        if k < 0:
            continue
        i = visits[k][1]
        placed += 1; tapped.add(i)
        wrong += avl[i]["Stop_ID"] != r["Stop_Id"]
        ons += (r["CKI"] == "1") if is_tap else 1
    want["taps.share_on_a_different_stop_from_the_bus"] = round(wrong / placed, 4)
    want["count2.boardings_given_a_stop_visit"] = ons
    if is_tap:
        want["count2.stop_visits_with_no_tap_on_and_no_tap_off"] = len(avl) - len(tapped)
    return want


def identifier_values(folder):
    out = set()
    for name, cols in ID_COLS.items():
        for r in rows(folder, name):
            out.update(r[c] for c in cols if r[c])
    return out


def main():
    py = python_with_pandas()
    check("a Python with pandas and numpy is on this machine", py is not None, "none of $INSIYAB_PYTHON, .venv/bin/python, this Python, python3, /usr/bin/python3 has pandas: run bash scripts/setup.sh or pip install -r model/requirements.txt")
    if py is None:
        print("1 FAILED"); return 1
    check("the stand-in raw tables are on disk", os.path.isfile(os.path.join(RAW, "nol_transactions.csv")), "run python3 tools/make_standin_raw.py")

    # 1. it runs, and says nothing about one card, device, driver or vehicle
    code, text, err = run_census(py, RAW)
    code_j, as_json, err_j = run_census(py, RAW, as_json=True)
    check("the census runs on fixtures/raw", code == 0 and code_j == 0 and "## 8." in text, (err or err_j)[-300:])
    facts = json.loads(as_json) if code_j == 0 else {}
    check("no section of the census failed on the stand-in tables", "COULD NOT COUNT" not in text and not facts.get("errors"), facts.get("errors"))
    ids = identifier_values(RAW)
    check("the test holds the identifiers to look for (%d values in 7 columns)" % len(ids), len(ids) > 1000)
    both = text + as_json
    leaked = sum(1 for v in ids if v in both)
    check("no card, device, driver or vehicle identifier appears in what the census prints", leaked == 0 and "STANDIN-" not in both, "%d identifier values appear" % leaked)
    check("the census's own last look finds no identifier in its text", facts.get("safety.words_in_this_text_that_equal_an_identifier_value") == 0)
    data_lines = {",".join(r) for name in ID_COLS for r in csv.reader(open(os.path.join(RAW, name), encoding="utf-8", newline=""))}
    check("no line of the census is a row of a table", not any(line.strip() in data_lines for line in text.splitlines() if line.strip()))

    # 2. the planted facts, counted here a second way
    want = recount(RAW)
    for key in sorted(want):
        check("census %s equals the recount (%s)" % (key, want[key]), key in facts and facts[key] == want[key], "census says %s" % facts.get(key, "nothing"))
    check("the generator's planted counts are in the files", want["count5.vehicles_that_ran_but_are_not_in_the_fleet_table"] == len(gen.MISSING_FROM_FLEET)
          and want["odd.trips_in_the_plan"] - want["odd.trips_in_the_runtime_report"] == len(gen.NOT_RUN) and want["nol.route_values_not_in_gtfs"] == len(gen.ODD_ROUTE_VEHICLES)
          and want["places.stops_outside_every_community"] > 0 and want["count1.door_did_not_open"] > 0 and want["odd.nol.rows_that_repeat_another_row_exactly"] > 0
          and 0 < want["taps.share_on_a_different_stop_from_the_bus"] < 0.05, want)
    check("one nol row is found to be a tap", facts.get("nol.one_row_is") == "tap", facts.get("nol.one_row_is"))
    check("some trips are over their seats and some under a quarter", (facts.get("count3.trips_largest_load_over_seats") or 0) > 0 and (facts.get("count3.trips_largest_load_under_a_quarter_of_seats") or 0) > 0)

    with tempfile.TemporaryDirectory() as tmp:
        # 3. the other shape of nol row is recognised, and still nothing leaks
        jdir = os.path.join(tmp, "journey")
        for name, body in gen.build("journey").items():
            os.makedirs(os.path.dirname(os.path.join(jdir, name)), exist_ok=True)
            with open(os.path.join(jdir, name), "w", encoding="utf-8", newline="") as f:
                f.write(body)
        cj, tj, ej = run_census(py, jdir)
        cj2, jj, _ = run_census(py, jdir, as_json=True)
        fj = json.loads(jj) if cj2 == 0 else {}
        check("one nol row is found to be a journey when the table is written that way", cj == 0 and fj.get("nol.one_row_is") == "journey" and "COULD NOT COUNT" not in tj, (fj.get("nol.one_row_is"), ej[-200:]))
        wj = recount(jdir)
        check("the journey-shaped table gives the recounted boardings (%d)" % wj["count2.boardings_given_a_stop_visit"], fj.get("count2.boardings_given_a_stop_visit") == wj["count2.boardings_given_a_stop_visit"], fj.get("count2.boardings_given_a_stop_visit"))
        check("nothing leaks from the journey-shaped table either", not any(v in tj + jj for v in identifier_values(jdir)))

        # 4. a missing table and a missing column are reported, and the rest still runs
        mdir = os.path.join(tmp, "missing")
        shutil.copytree(RAW, mdir)
        os.remove(os.path.join(mdir, "bus_fleet.csv"))
        avl = list(csv.reader(open(os.path.join(mdir, "bus_runtime_avl.csv"), encoding="utf-8", newline="")))
        drop = avl[0].index("Door_Status")
        with open(os.path.join(mdir, "bus_runtime_avl.csv"), "w", encoding="utf-8", newline="") as f:
            csv.writer(f, lineterminator="\n").writerows([r[:drop] + r[drop + 1:] for r in avl])
        cm, tm, em = run_census(py, mdir)
        check("a missing table and a missing column do not stop the census", cm == 0 and "## 8." in tm, em[-300:])
        check("the missing table is named", "MISSING table fleet" in tm)
        check("the missing column is named", "MISSING column Door_Status in avl" in tm)
        check("counts that do not need them are still made", re.search(r"^count4\.trips_timed = %d$" % want["avl.distinct_trips"], tm, flags=re.M) is not None and "count6.taps = %d" % want["nol.rows"] in tm)
        check("nothing leaks when something is missing", not any(v in tm for v in ids))

        # 5. an empty folder is reported, not a crash
        edir = os.path.join(tmp, "empty"); os.makedirs(edir)
        ce, te, _ = run_census(py, edir)
        check("an empty folder gives a report of what is missing", ce == 0 and te.count("MISSING table") >= 16)

    print("ALL PASS" if not FAILED else "%d FAILED" % FAILED)
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
