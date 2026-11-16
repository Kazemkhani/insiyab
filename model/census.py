#!/usr/bin/env python3
"""The census: counts and shares of the five provided tables, and nothing else (docs/DATA.md, sections 2 and 3).

It prints rows, columns, types, empty cells, first and last times, how many distinct things there are, how the tables
join, whether one nol row is a tap or a journey, and the six counts the strategy rests on.
It never prints a row, a card, a device, a driver or a vehicle number. Values are printed only for the columns named
in SHOW (kinds of day, door states, bus types, route numbers), and an error never prints its message, because a
message can quote a value.

On this laptop, on the invented tables:
    python3 -m model.census --data fixtures/raw            (add --json for the numbers alone)

It needs pandas and numpy and nothing else, and runs on Python 3.8 or later.

IN DATAIKU, where the real data is. Paste this whole file into one cell of a Python notebook and run it. Then, in a
second cell, with the names the datasets have in your project:

    import dataiku
    NAMES = {"nol": "nol_transactions", "avl": "bus_runtime", "fleet": "bus_fleet", "communities": "community_boundaries",
             "gtfs_agency": "agency", "gtfs_routes": "routes", "gtfs_trips": "trips", "gtfs_stop_times": "stop_times",
             "gtfs_stops": "stops", "gtfs_calendar": "calendar", "gtfs_calendar_dates": "calendar_dates",
             "gtfs_frequencies": "frequencies", "gtfs_shapes": "shapes", "gtfs_transfers": "transfers",
             "gtfs_translations": "translations", "gtfs_feed_info": "feed_info"}
    tables = {}
    for key, name in NAMES.items():
        try:
            tables[key] = dataiku.Dataset(name).get_dataframe()
        except Exception as e:
            print("could not read", key, type(e).__name__)
    print(census(tables))

A table that is missing is reported as a line and the rest still runs. Keep the printed text in data/CENSUS-LOCAL.md
on your own machine: it is not committed and not put on the site until a mentor has said totals may leave Dataiku.
"""
import json, os, re, sys
import numpy as np
import pandas as pd

# identifier columns: counted, grouped by, never printed by value
ID_COLS = ("NOL_ID", "device_id", "device_id_hex", "Driver_id", "Body_EVD_ID", "Body", "Body_number")
# the only columns whose values may be printed, and only when there are few of them
SHOW = ("Day_type", "Direction", "Door_Status", "Bus_Type", "Manufacturer", "Operator", "CKI", "CKO", "Transaction_date", "Date", "OP_Hour",
        "route_type", "direction_id", "exception_type", "pickup_type", "drop_off_type", "location_type", "transfer_type", "language", "table_name", "field_name", "service_id")
GTFS = ("agency", "routes", "trips", "stop_times", "stops", "calendar", "calendar_dates", "frequencies", "shapes", "transfers", "translations", "feed_info")
TIME = re.compile(r"(\d{1,2}):(\d{2})(?::(\d{2}))?(?!.*\d{1,2}:\d{2})")
DAY_STARTS = 4 * 3600          # a clock time before 04:00 belongs to the service day before


def _norm(name):
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


def _find(df, *names):
    """The table's own name for a column, whatever its case and spacing. None if it is not there."""
    if df is None:
        return None
    have = {_norm(c): c for c in df.columns}
    for n in names:
        if _norm(n) in have:
            return have[_norm(n)]
    return None


def _text(s):
    """A column as trimmed text. An empty cell becomes ''. A whole number read as 12.0 becomes 12."""
    t = s.where(s.notna(), "").astype(str).str.strip()
    return t.str.replace(r"^(-?\d+)\.0$", r"\1", regex=True)


def _key(s):
    """A key exactly as written, apart from spaces at either end."""
    return _text(s)


def _loose(s):
    """A key with case, spaces, punctuation and leading zeros taken away, to see whether a join fails only on format."""
    return _text(s).str.upper().str.replace(r"[^A-Z0-9]", "", regex=True).str.replace(r"^0+(?=.)", "", regex=True)


def _secs(s, service_day=True):
    """Seconds after midnight from a time, or from a date and time. With service_day, before 04:00 counts as the next day."""
    if str(s.dtype).startswith("datetime"):
        out = (s.dt.hour * 3600 + s.dt.minute * 60 + s.dt.second).astype(float)
    else:
        m = _text(s).str.extract(TIME)
        out = pd.to_numeric(m[0], errors="coerce") * 3600 + pd.to_numeric(m[1], errors="coerce") * 60 + pd.to_numeric(m[2], errors="coerce").fillna(0)
    out = out.astype(float)
    if service_day:
        out = out.where(~(out < DAY_STARTS), out + 86400)
    return out


def _clock(x):
    if x is None or not np.isfinite(x):
        return "unknown"
    x = int(x)
    return "%02d:%02d:%02d%s" % (x % 86400 // 3600, x % 3600 // 60, x % 60, " (after midnight)" if x >= 86400 else "")


def _reads_as(t):
    """What the filled cells of a column look like."""
    t = t[t != ""]
    if not len(t):
        return "empty"
    if pd.to_numeric(t, errors="coerce").notna().mean() >= 0.99:
        return "number"
    if t.str.match(r"^\d{1,2}:\d{2}(:\d{2})?$").mean() >= 0.99:
        return "time"
    if t.str.match(r"^\d{4}-\d{2}-\d{2}$|^\d{8}$|^\d{1,2}/\d{1,2}/\d{4}$").mean() >= 0.99:
        return "date"
    if t.str.match(r"^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}").mean() >= 0.99:
        return "date and time"
    return "text"


def _share(a, b):
    return round(float(a) / float(b), 4) if b else None


def _where(e):
    """The line of this program an error came from. Never the message: a message can quote a value from the data."""
    here, line, tb = _where.__code__.co_filename, 0, e.__traceback__
    while tb:
        if tb.tb_frame.f_code.co_filename == here:
            line = tb.tb_lineno
        tb = tb.tb_next
    return "%s at line %d of the census program" % (type(e).__name__, line)


class _Out:
    def __init__(self):
        self.lines, self.facts = [], {}

    def say(self, s=""):
        self.lines.append(s)

    def fact(self, key, value, note=""):
        if isinstance(value, (np.integer,)):
            value = int(value)
        if isinstance(value, (float, np.floating)):
            value = None if not np.isfinite(value) else round(float(value), 4)
        self.facts[key] = value
        self.lines.append("%s = %s%s" % (key, "unknown" if value is None else value, ("   (" + note + ")") if note else ""))

    def part(self, title, fn):
        self.say(); self.say("## " + title)
        try:
            fn()
        except Exception as e:
            self.say("COULD NOT COUNT part of this section: " + _where(e))
            self.facts.setdefault("errors", []).append(title)


def _rings(shape_text):
    """The outer rings of a polygon written as WKT (lon lat, lon lat) or as KML coordinates (lon,lat,0 lon,lat,0)."""
    rings = []
    for body in re.findall(r"\(([^()]+)\)", shape_text) or [shape_text]:
        kml = bool(re.search(r"-?\d+\.?\d*,-?\d+\.?\d*(,-?\d+\.?\d*)?(\s|$)", body.strip())) and "," in body.split()[0]
        nums = [float(x) for x in re.findall(r"-?\d+\.?\d*(?:[eE]-?\d+)?", body)]
        step = (3 if re.match(r"^\s*-?[\d.]+,-?[\d.]+,-?[\d.]+", body) else 2) if kml else 2
        pts = np.array(nums[: len(nums) // step * step]).reshape(-1, step)[:, :2] if len(nums) >= 6 else None
        if pts is not None and len(pts) >= 3:
            rings.append(pts)
    return rings


def _inside(lon, lat, ring):
    x, y = ring[:, 0], ring[:, 1]
    inside = np.zeros(len(lon), dtype=bool)
    j = len(x) - 1
    for i in range(len(x)):
        if y[i] != y[j]:
            cross = ((y[i] > lat) != (y[j] > lat)) & (lon < (x[j] - x[i]) * (lat - y[i]) / (y[j] - y[i]) + x[i])
            inside ^= cross
        j = i
    return inside


def _metres(lon1, lat1, lon2, lat2):
    k = np.pi / 180
    h = np.sin((lat2 - lat1) * k / 2) ** 2 + np.cos(lat1 * k) * np.cos(lat2 * k) * np.sin((lon2 - lon1) * k / 2) ** 2
    return 2 * 6371000 * np.arcsin(np.sqrt(h))


def census_facts(tables):
    """Returns (text, facts). The facts are the same numbers as the text, by name."""
    o = _Out()
    T = {k: v for k, v in tables.items() if v is not None}
    nol, avl, fleet, comm = T.get("nol"), T.get("avl"), T.get("fleet"), T.get("communities")
    g = {n: T.get("gtfs_" + n) for n in GTFS}
    o.say("# Insiyab data census")
    o.say("Counts and shares only. No row, card, device, driver or vehicle number is printed. Keep this text where the data is until a mentor says totals may leave.")

    def need(df, label, *names):
        c = _find(df, *names)
        if df is not None and c is None:
            o.say("MISSING column %s in %s" % (names[0], label))
        return c

    # ------------------------------------------------------------------ 1. each table
    def describe(label, df):
        if df is None:
            o.say("MISSING table %s" % label); o.facts["%s.rows" % label] = None
            return
        o.fact("%s.rows" % label, len(df)); o.fact("%s.columns" % label, len(df.columns))
        for c in df.columns:
            t = _text(df[c])
            filled = t[t != ""]
            line = "  %-28s stored as %-10s reads as %-13s empty %.4f  distinct %d" % (str(c)[:28], str(df[c].dtype)[:10], _reads_as(t), 1 - len(filled) / max(1, len(t)), filled.nunique())
            if _norm(c) in [_norm(x) for x in SHOW] and _norm(c) not in [_norm(x) for x in ID_COLS] and 0 < filled.nunique() <= 12:
                line += "  values " + ", ".join("%s: %d" % (k, v) for k, v in filled.value_counts().sort_index().items())
            o.say(line)
            o.facts["%s.empty.%s" % (label, c)] = round(1 - len(filled) / max(1, len(t)), 4)

    def each_table():
        for label, df in [("nol", nol), ("avl", avl), ("fleet", fleet), ("communities", comm)] + [("gtfs_" + n, g[n]) for n in GTFS]:
            o.say(); o.say("### " + label)
            describe(label, df)
    o.part("1. Each table: rows, columns, types, empty cells", each_table)

    # ------------------------------------------------------------------ shared working columns (never printed)
    W = {}

    def prepare():
        if nol is not None:
            n = pd.DataFrame(index=nol.index)
            for k, names in {"veh": ("Body_EVD_ID",), "card": ("NOL_ID",), "route": ("Route",), "stop": ("Stop_Id", "Stop_ID"), "cki": ("CKI",), "cko": ("CKO",), "amount": ("Amount",), "date": ("Transaction_date",)}.items():
                c = need(nol, "nol", *names)
                n[k] = _key(nol[c]) if c else ""
            n["cki"], n["cko"] = n["cki"].str.upper(), n["cko"].str.upper()
            c = need(nol, "nol", "Transaction_Time")
            n["t"] = _secs(nol[c], service_day=False) if c else np.nan
            if c and n["date"].nunique() > 1:           # the calendar date is written, so the later date is after midnight
                n["t"] = n["t"] + 86400 * (n["date"] > n["date"][n["date"] != ""].min())
            else:
                n["t"] = n["t"].where(~(n["t"] < DAY_STARTS), n["t"] + 86400)
            W["nol"] = n
        if avl is not None:
            a = pd.DataFrame(index=avl.index)
            for k, names in {"veh": ("Body",), "trip": ("Trip_ID",), "route": ("Route",), "stop": ("Stop_ID",), "door": ("Door_Status",), "dir": ("Direction",), "pattern": ("avm_pattern_id",), "block": ("block_no",), "driver": ("Driver_id",)}.items():
                c = need(avl, "avl", *names)
                a[k] = _key(avl[c]) if c else ""
            a["door"] = a["door"].str.upper()
            for k, name in {"sa": "Sched_Arr", "aa": "Act_Arr", "sd": "Sched_Dep", "ad": "Act_Dep"}.items():
                c = need(avl, "avl", name)
                a[k] = _secs(avl[c]) if c else np.nan
            c = need(avl, "avl", "Stop_Seq")
            a["seq"] = pd.to_numeric(_text(avl[c]), errors="coerce") if c else np.nan
            c = need(avl, "avl", "Diff_in_seconds")
            a["diff"] = pd.to_numeric(_text(avl[c]), errors="coerce") if c else np.nan
            W["avl"] = a
        if fleet is not None:
            f = pd.DataFrame(index=fleet.index)
            c = need(fleet, "fleet", "Body_number"); f["veh"] = _key(fleet[c]) if c else ""
            c = need(fleet, "fleet", "Bus_Type"); f["type"] = _key(fleet[c]).str.upper() if c else ""
            for k, name in {"seats": "No_of_Seats", "year": "Model Year", "standing": "RTA Standing (not verified)", "total": "Total"}.items():
                c = need(fleet, "fleet", name)
                f[k] = pd.to_numeric(_text(fleet[c]), errors="coerce") if c else np.nan
            W["fleet"] = f
    o.part("Reading the columns the counts need", prepare)
    n, a, f = W.get("nol"), W.get("avl"), W.get("fleet")

    # ------------------------------------------------------------------ 2. times and distinct things
    def times():
        if n is not None:
            o.fact("nol.first_time", _clock(n["t"].min())); o.fact("nol.last_time", _clock(n["t"].max()))
            o.fact("nol.distinct_dates", int(n["date"][n["date"] != ""].nunique()))
            for k, label in [("route", "routes"), ("stop", "stops"), ("veh", "vehicles"), ("card", "cards")]:
                o.fact("nol.distinct_%s" % label, int(n[k][n[k] != ""].nunique()))
        if a is not None:
            o.fact("avl.first_actual_arrival", _clock(a["aa"].min())); o.fact("avl.last_actual_departure", _clock(a["ad"].max()))
            for k, label in [("route", "routes"), ("stop", "stops"), ("veh", "vehicles"), ("trip", "trips"), ("driver", "drivers")]:
                o.fact("avl.distinct_%s" % label, int(a[k][a[k] != ""].nunique()))
        if f is not None:
            o.fact("fleet.distinct_vehicles", int(f["veh"][f["veh"] != ""].nunique()))
        for name, col in [("routes", "route_id"), ("stops", "stop_id"), ("trips", "trip_id"), ("shapes", "shape_id")]:
            c = _find(g[name], col)
            if c:
                o.fact("gtfs.distinct_%s" % name, int(_key(g[name][c]).nunique()))
        st = g["stop_times"]
        c1, c2 = _find(st, "arrival_time"), _find(st, "departure_time")
        if c1 and c2:
            o.fact("gtfs.first_scheduled_time", _clock(_secs(st[c1], False).min())); o.fact("gtfs.last_scheduled_time", _clock(_secs(st[c2], False).max()))
            o.fact("gtfs.stop_times_at_or_after_24h", int((_secs(st[c1], False) >= 86400).sum()))
    o.part("2. First and last times, and how many distinct things", times)

    # ------------------------------------------------------------------ 3. what one nol row is
    def kind_of(col):
        v = col[col != ""]
        if not len(v):
            return "empty", col != ""
        if v.nunique() <= 4 and set(v.unique()) <= {"0", "1", "Y", "N", "TRUE", "FALSE", "YES", "NO", "T", "F"}:
            return "a flag", col.isin(["1", "Y", "TRUE", "YES", "T"])
        if v.str.contains(r"\d{1,2}:\d{2}").mean() >= 0.9:
            return "a time", col != ""
        return "something else", col != ""

    def row_shape():
        if n is None:
            o.say("MISSING table nol"); return
        ki, set_i = kind_of(n["cki"]); ko, set_o = kind_of(n["cko"])
        o.fact("nol.cki_reads_as", ki); o.fact("nol.cko_reads_as", ko)
        rows = len(n)
        o.fact("nol.share_rows_cki_only", _share((set_i & ~set_o).sum(), rows)); o.fact("nol.share_rows_cko_only", _share((~set_i & set_o).sum(), rows))
        o.fact("nol.share_rows_both", _share((set_i & set_o).sum(), rows)); o.fact("nol.share_rows_neither", _share((~set_i & ~set_o).sum(), rows))
        per = n["card"][n["card"] != ""].value_counts()
        for label, m in [("1", per == 1), ("2", per == 2), ("3_or_4", (per >= 3) & (per <= 4)), ("5_or_more", per >= 5)]:
            o.fact("nol.share_cards_with_%s_rows" % label, _share(m.sum(), len(per)))
        amount = pd.to_numeric(n["amount"], errors="coerce")
        o.fact("nol.share_amount_zero_when_cki_only", _share(((amount == 0) & set_i & ~set_o).sum(), (set_i & ~set_o).sum()))
        o.fact("nol.share_amount_above_zero_when_cko_set", _share(((amount > 0) & set_o).sum(), set_o.sum()))
        one, both = (set_i ^ set_o).mean(), (set_i & set_o).mean()
        if one >= 0.9:
            shape, why = "tap", "%.1f%% of rows have exactly one of CKI and CKO set, so a row is one check-in or one check-out" % (100 * one)
        elif both >= 0.5:
            shape, why = "journey", "%.1f%% of rows have both CKI and CKO set, so a row carries both ends of a journey" % (100 * both)
        else:
            shape, why = "undetermined", "neither pattern holds: read the data guidance and the shares above"
        o.fact("nol.one_row_is", shape, why)
        W["set_i"], W["set_o"], W["shape"], W["cko_is_time"] = set_i, set_o, shape, ko == "a time"
    o.part("3. What one nol row is: a tap or a journey", row_shape)

    # ------------------------------------------------------------------ 4. joins
    def match(left, right_sets, label):
        """Share of rows, and of distinct values, of left found in each candidate set: exactly, then ignoring format."""
        left = left[left != ""]
        for name, right in right_sets:
            if right is None:
                o.say("%s -> %s: the other column is missing" % (label, name)); continue
            right = right[right != ""]
            exact = left.isin(set(right.unique()))
            lo, ro = _loose(left), set(_loose(right).unique())
            loose = lo.isin(ro)
            o.fact("join.%s->%s.rows_exact" % (label, name), _share(exact.sum(), len(left)))
            o.fact("join.%s->%s.rows_ignoring_format" % (label, name), _share(loose.sum(), len(left)))
            o.fact("join.%s->%s.distinct_exact" % (label, name), _share(left[exact].nunique(), left.nunique()), "%d of %d distinct values" % (left[exact].nunique(), left.nunique()))
            o.fact("join.%s->%s.rows_failing_only_on_format" % (label, name), int((loose & ~exact).sum()))

    def gcol(table, col):
        c = _find(g[table], col)
        return _key(g[table][c]) if c else None

    def joins():
        if n is not None:
            match(n["veh"], [("fleet_vehicle", f["veh"] if f is not None else None), ("avl_vehicle", a["veh"] if a is not None else None)], "nol_vehicle")
            match(n["route"], [("avl_route", a["route"] if a is not None else None), ("gtfs_route_short_name", gcol("routes", "route_short_name")), ("gtfs_route_id", gcol("routes", "route_id"))], "nol_route")
            match(n["stop"], [("avl_stop", a["stop"] if a is not None else None), ("gtfs_stop_id", gcol("stops", "stop_id")), ("gtfs_stop_code", gcol("stops", "stop_code"))], "nol_stop")
            short = gcol("routes", "route_short_name")
            if short is not None:                      # route numbers are public, so the formats that fail may be shown
                bad = n["route"][(n["route"] != "") & ~n["route"].isin(set(short.unique()))]
                o.fact("nol.route_values_not_in_gtfs", int(bad.nunique()), "rows: %d" % len(bad))
                kinds = {"differ only by a leading zero": 0, "differ only by case or spacing": 0, "other": 0}
                raw_bad, up = bad, set(short.str.upper().unique())
                for v in raw_bad.unique():
                    kinds["differ only by case or spacing" if re.sub(r"\s", "", v).upper() in up else "differ only by a leading zero" if v.lstrip("0") in up else "other"] += 1
                for k, v in kinds.items():
                    o.fact("nol.route_formats_that_fail.%s" % k.replace(" ", "_"), v)
                o.say("  route numbers written in a way the plan does not have (first 12): " + ", ".join(sorted(raw_bad.unique())[:12]))
        if a is not None:
            match(a["veh"], [("fleet_vehicle", f["veh"] if f is not None else None)], "avl_vehicle")
            match(a["route"], [("gtfs_route_short_name", gcol("routes", "route_short_name"))], "avl_route")
            match(a["stop"], [("gtfs_stop_id", gcol("stops", "stop_id")), ("gtfs_stop_code", gcol("stops", "stop_code"))], "avl_stop")
            match(a["trip"], [("gtfs_trip_id", gcol("trips", "trip_id"))], "avl_trip")
            match(a["pattern"], [("gtfs_shape_id", gcol("trips", "shape_id"))], "avl_pattern")
            match(a["block"], [("gtfs_block_id", gcol("trips", "block_id"))], "avl_block")
    o.part("4. How the tables join", joins)

    # ------------------------------------------------------------------ taps to stop visits (used by several counts)
    def assign(veh, t):
        """For each (vehicle, time): the row number of the stop visit that vehicle was at or had last reached. -1 if none."""
        v = a[["veh", "aa", "until", "stop"]].copy(); v["vid"] = np.arange(len(a))
        v = v.dropna(subset=["aa"]).sort_values("aa")
        left = pd.DataFrame({"veh": veh.values, "t": t.values.astype(float), "i": np.arange(len(veh))}).dropna(subset=["t"]).sort_values("t")
        m = pd.merge_asof(left, v.rename(columns={"aa": "at"}), left_on="t", right_on="at", by="veh", direction="backward")
        ok = m["vid"].notna() & (m["t"] <= m["until"])
        out = np.full(len(veh), -1, dtype=int)
        out[m["i"][ok].values] = m["vid"][ok].values.astype(int)
        return out

    def tap_to_trip():
        if n is None or a is None:
            o.say("needs both the nol table and the runtime report"); return
        order = a.sort_values(["veh", "trip", "seq", "aa"])
        nxt = order.groupby(["veh", "trip"])["aa"].shift(-1)
        a["until"] = nxt.reindex(a.index).fillna(a["ad"] + 120)       # after the last stop of a trip, two minutes' grace
        vid = assign(n["veh"], n["t"])
        W["vid"] = vid
        known = n["veh"].isin(set(a["veh"].unique()))
        o.fact("taps.share_given_a_trip", _share((vid >= 0).sum(), len(n)), "the tap falls between the bus reaching one stop and reaching the next")
        o.fact("taps.share_vehicle_not_in_runtime_report", _share((~known).sum(), len(n)))
        o.fact("taps.share_vehicle_known_but_outside_every_trip", _share((known & (vid < 0)).sum(), len(n)))
        got = vid >= 0
        same = n["stop"].values[got] == a["stop"].values[vid[got]]
        o.fact("taps.share_on_a_different_stop_from_the_bus", _share((~same).sum(), got.sum()), "of taps given a trip: the tap's stop is not the stop the bus had last reached")
        same_route = _loose(n["route"]).values[got] == _loose(a["route"]).values[vid[got]]
        o.fact("taps.share_on_a_different_route_from_the_bus", _share((~same_route).sum(), got.sum()), "ignoring format")
    o.part("5. Taps to trips", tap_to_trip)

    # ------------------------------------------------------------------ 6. the six counts
    def door_closed():
        d = a["door"]
        shut = d.str.contains(r"CLOS|SHUT|NOT|^0$|^N$|^NO$|^FALSE$", regex=True) & (d != "")
        W["shut"] = shut
        o.fact("count1.stop_visits", len(a)); o.fact("count1.door_did_not_open", int(shut.sum()))
        o.fact("count1.share_door_did_not_open", _share(shut.sum(), len(a)), "a door state is taken as not opened when it reads closed, shut, not, no, false or 0: check against the values printed in section 1")

    def one(title, fn):
        o.say(); o.say("### " + title)
        try:
            fn()
        except Exception as e:
            o.say("COULD NOT COUNT: " + _where(e))
            o.facts.setdefault("errors", []).append(title)

    def on_off():
        """Boardings and alightings at each stop visit, from the taps."""
        vid, set_i, set_o = W["vid"], W["set_i"].values, W["set_o"].values
        on, off = np.zeros(len(a), dtype=int), np.zeros(len(a), dtype=int)
        if W["shape"] == "journey":
            np.add.at(on, vid[vid >= 0], 1)
            if W["cko_is_time"]:
                out_vid = assign(n["veh"], _secs(nol[_find(nol, "CKO")]))
                np.add.at(off, out_vid[out_vid >= 0], 1)
                W["unknown_alight"] = int(((vid >= 0) & (out_vid < 0)).sum())
            else:
                W["unknown_alight"] = int((vid >= 0).sum())
        else:
            np.add.at(on, vid[(vid >= 0) & set_i], 1); np.add.at(off, vid[(vid >= 0) & set_o], 1)
            W["unknown_alight"] = int(on.sum() - off.sum())
        a["on"], a["off"] = on, off

    def no_taps():
        on_off()
        none = (a["on"] == 0) & (a["off"] == 0)
        o.fact("count2.stop_visits_with_no_tap_on_and_no_tap_off", int(none.sum())); o.fact("count2.share", _share(none.sum(), len(a)))
        if "shut" in W:
            shut = W["shut"]
            o.fact("count2.no_tap_and_door_did_not_open", int((none & shut).sum())); o.fact("count2.no_tap_and_door_opened", int((none & ~shut).sum()))
            o.fact("count2.taps_but_door_did_not_open", int((~none & shut).sum()))
        o.fact("count2.boardings_given_a_stop_visit", int(a["on"].sum())); o.fact("count2.alightings_given_a_stop_visit", int(a["off"].sum()))
        o.fact("count2.boardings_with_alighting_unknown", W["unknown_alight"])

    def loads():
        s = a.sort_values(["veh", "trip", "seq", "aa"]).copy()
        s["load"] = (s["on"] - s["off"]).groupby([s["veh"], s["trip"]]).cumsum()
        trips = s.groupby(["veh", "trip"]).agg(peak=("load", "max"), low=("load", "min"), last=("load", "last"), on=("on", "sum")).reset_index()
        seats = f.dropna(subset=["seats"]).drop_duplicates("veh").set_index("veh")["seats"] if f is not None else pd.Series(dtype=float)
        trips["seats"] = trips["veh"].map(seats)
        k = trips.dropna(subset=["seats"])
        o.fact("count3.trips", len(trips)); o.fact("count3.trips_with_seats_known", len(k))
        o.fact("count3.trips_largest_load_over_seats", int((k["peak"] > k["seats"]).sum())); o.fact("count3.trips_largest_load_under_a_quarter_of_seats", int((k["peak"] < k["seats"] / 4).sum()))
        o.fact("count3.trips_with_no_boarding", int((trips["on"] == 0).sum()))
        o.fact("count3.trips_where_load_goes_below_zero", int((trips["low"] < 0).sum())); o.fact("count3.trips_that_do_not_end_empty", int((trips["last"] != 0).sum()))
        o.say("  load here is check-ins less check-outs, added along the trip, before any repair for missing check-outs: it overstates the load where check-outs are missing")

    def running_time():
        t = a.sort_values(["veh", "trip", "seq", "aa"]).groupby(["veh", "trip"]).agg(s0=("sd", "first"), s1=("sa", "last"), a0=("ad", "first"), a1=("aa", "last")).dropna()
        t["hour"] = (t["s0"] // 3600).astype(int)
        t["sched"], t["act"] = (t["s1"] - t["s0"]) / 60, (t["a1"] - t["a0"]) / 60
        t = t[(t["sched"] > 0) & (t["act"] > 0)]
        o.say("  hour  trips  scheduled minutes (median)  actual minutes (median)  actual less scheduled (mean)")
        rows = []
        for h, x in t.groupby("hour"):
            o.say("  %02d    %5d  %8.1f                   %8.1f                 %+8.1f" % (h % 24, len(x), x["sched"].median(), x["act"].median(), (x["act"] - x["sched"]).mean()))
            rows.append({"hour": int(h), "trips": int(len(x)), "scheduled_min": round(float(x["sched"].median()), 1), "actual_min": round(float(x["act"].median()), 1)})
        o.facts["count4.by_hour"] = rows
        o.fact("count4.trips_timed", len(t)); o.fact("count4.mean_actual_less_scheduled_minutes", float((t["act"] - t["sched"]).mean()))
        late = a["aa"] - a["sa"]
        o.fact("count4.share_arrivals_over_5_min_late", _share((late > 300).sum(), late.notna().sum())); o.fact("count4.share_arrivals_over_1_min_early", _share((late < -60).sum(), late.notna().sum()))

    def fleet_age():
        if f is None:
            o.say("MISSING table fleet"); return
        ff = f.drop_duplicates("veh").copy()
        age = 2025 - ff["year"]
        ff["band"] = np.where(age.isna(), "year unknown", np.where(age <= 5, "0 to 5 years", np.where(age <= 10, "6 to 10 years", np.where(age <= 15, "11 to 15 years", "16 years or more"))))
        km = pd.Series(dtype=float)
        st = g["stops"]
        if a is not None and st is not None and _find(st, "stop_lat") and _find(st, "stop_lon"):
            best = max([c for c in (_find(st, "stop_id"), _find(st, "stop_code")) if c], key=lambda c: a["stop"].isin(set(_key(st[c]).unique())).mean())
            pos = pd.DataFrame({"stop": _key(st[best]), "lat": pd.to_numeric(_text(st[_find(st, "stop_lat")]), errors="coerce"), "lon": pd.to_numeric(_text(st[_find(st, "stop_lon")]), errors="coerce")}).drop_duplicates("stop").set_index("stop")
            s = a.sort_values(["veh", "trip", "seq", "aa"])[["veh", "trip", "stop"]].copy()
            s["lat"], s["lon"] = s["stop"].map(pos["lat"]), s["stop"].map(pos["lon"])
            grp = s.groupby(["veh", "trip"])
            d = _metres(s["lon"], s["lat"], grp["lon"].shift(-1), grp["lat"].shift(-1))
            km = (d.fillna(0) / 1000).groupby(s["veh"]).sum()
            o.fact("count5.km_run_in_service", float(km.sum()), "straight lines between the stops each bus visited, so less than the road distance")
        ff["km"] = ff["veh"].map(km).fillna(0.0)
        ff["ran"] = ff["veh"].isin(set(a["veh"].unique())) if a is not None else False
        o.say("  age band            vehicles  ran that day  km")
        rows = []
        for band in ["0 to 5 years", "6 to 10 years", "11 to 15 years", "16 years or more", "year unknown"]:
            x = ff[ff["band"] == band]
            o.say("  %-18s  %8d  %12d  %8.1f" % (band, len(x), int(x["ran"].sum()), x["km"].sum()))
            rows.append({"band": band, "vehicles": int(len(x)), "ran": int(x["ran"].sum()), "km": round(float(x["km"].sum()), 1)})
        o.facts["count5.by_age_band"] = rows
        o.say("  bus type            vehicles  ran that day  seats (median)  km")
        for typ, x in ff.groupby("type"):
            o.say("  %-18s  %8d  %12d  %14s  %8.1f" % (typ[:18] or "(empty)", len(x), int(x["ran"].sum()), "unknown" if x["seats"].dropna().empty else "%d" % x["seats"].median(), x["km"].sum()))
        o.facts["count5.by_type"] = {str(k): int(v) for k, v in ff["type"].value_counts().sort_index().items()}
        if a is not None:
            o.fact("count5.vehicles_that_ran_but_are_not_in_the_fleet_table", int((~pd.Series(a["veh"].unique()).isin(set(ff["veh"]))).sum()))

    def by_hour():
        h = (n["t"].dropna() // 3600).astype(int)
        set_i = W.get("set_i")
        o.say("  hour   taps   of which check-ins")
        rows = []
        for hour, cnt in h.value_counts().sort_index().items():
            ins = int(set_i[h.index[h == hour]].sum()) if set_i is not None else 0
            o.say("  %02d%s  %6d  %6d" % (hour % 24, "+" if hour >= 24 else " ", cnt, ins))
            rows.append({"hour": int(hour), "taps": int(cnt), "check_ins": ins})
        o.facts["count6.by_hour"] = rows
        o.fact("count6.taps", len(n)); o.fact("count6.busiest_hour", int(h.value_counts().idxmax() % 24))

    def six():
        if a is None:
            o.say("MISSING table avl: counts 1 to 5 cannot be made")
        else:
            one("Count 1. Stop visits, and the share where the door did not open", door_closed)
            if n is not None and "vid" in W and "set_i" in W:
                one("Count 2. Stop visits with no tap on and no tap off", no_taps)
                one("Count 3. Trips against their seats", loads)
            else:
                o.say("counts 2 and 3 need the taps joined to trips (section 5)")
            one("Count 4. Scheduled against actual running time, by hour", running_time)
        one("Count 5. Vehicles by age and type, and the kilometres each age band ran", fleet_age)
        if n is not None:
            one("Count 6. Taps by hour of the day", by_hour)
    o.part("6. The six counts", six)

    # ------------------------------------------------------------------ 7. stops in communities
    def places():
        st = g["stops"]
        cs = _find(comm, "shape")
        if st is None or comm is None or cs is None or not _find(st, "stop_lat") or not _find(st, "stop_lon"):
            o.say("needs the stops (with stop_lat, stop_lon) and the communities (with shape)"); return
        lon = pd.to_numeric(_text(st[_find(st, "stop_lon")]), errors="coerce").values
        lat = pd.to_numeric(_text(st[_find(st, "stop_lat")]), errors="coerce").values
        hit, unread = np.zeros(len(st), dtype=int), 0
        for s in _text(comm[cs]):
            rings = _rings(s)
            unread += 0 if rings else 1
            inside = np.zeros(len(st), dtype=bool)
            for r in rings:
                inside |= _inside(lon, lat, r)
            hit += inside
        o.fact("places.communities", len(comm)); o.fact("places.communities_whose_shape_could_not_be_read", unread)
        o.fact("places.stops", len(st)); o.fact("places.stops_outside_every_community", int((hit == 0).sum())); o.fact("places.stops_in_more_than_one_community", int((hit > 1).sum()))
        o.say("  every ring of a shape is counted as ground, so a hole in a community is not taken out")
    o.part("7. Stops in communities", places)

    # ------------------------------------------------------------------ 8. things that look wrong
    def odd():
        if n is not None:
            o.say("### nol")
            o.fact("odd.nol.rows_that_repeat_another_row_exactly", int(nol.astype(str).duplicated().sum()))
            o.fact("odd.nol.rows_with_no_time", int(n["t"].isna().sum()))
            if a is not None:
                o.fact("odd.nol.taps_before_the_first_bus_or_after_the_last", int(((n["t"] < a["aa"].min()) | (n["t"] > a["ad"].max() + 120)).sum()))
            st = gcol("stops", "stop_id")
            if st is not None:
                o.fact("odd.nol.taps_at_a_stop_not_in_the_plan", int(((n["stop"] != "") & ~n["stop"].isin(set(st.unique()))).sum()))
            per = n["card"][n["card"] != ""].value_counts()
            o.fact("odd.nol.cards_with_more_than_10_rows", int((per > 10).sum()))
            amount = pd.to_numeric(n["amount"], errors="coerce")
            o.fact("odd.nol.rows_with_amount_below_zero", int((amount < 0).sum()))
        if a is not None:
            o.say("### avl")
            o.fact("odd.avl.visits_where_the_bus_leaves_before_it_arrives", int((a["ad"] < a["aa"]).sum()))
            s = a.sort_values(["veh", "trip", "seq"])
            back = s.groupby(["veh", "trip"])["aa"].diff() < 0
            o.fact("odd.avl.visits_where_the_clock_runs_backwards_within_a_trip", int(back.sum()))
            o.fact("odd.avl.repeated_trip_and_stop_sequence", int(a.duplicated(["veh", "trip", "seq"]).sum()))
            t = a.groupby(["veh", "trip"]).agg(t0=("aa", "min"), t1=("ad", "max")).reset_index().sort_values(["veh", "t0"])
            overlap = t["t0"] < t.groupby("veh")["t1"].shift(1)
            o.fact("odd.avl.trips_that_start_before_the_same_bus_ended_its_last", int(overlap.sum()))
            both = a["diff"].notna() & a["aa"].notna() & a["sa"].notna()
            o.fact("odd.avl.rows_where_diff_in_seconds_is_not_actual_less_scheduled_arrival", int((both & ((a["aa"] - a["sa"] - a["diff"]).abs() > 1)).sum()))
            st = gcol("stops", "stop_id")
            if st is not None:
                o.fact("odd.avl.visits_at_a_stop_not_in_the_plan", int(((a["stop"] != "") & ~a["stop"].isin(set(st.unique()))).sum()))
            gt = g["trips"]
            if gt is not None:
                o.fact("odd.trips_in_the_plan", len(gt), "all service days in the feed"); o.fact("odd.trips_in_the_runtime_report", int(a.drop_duplicates(["veh", "trip"]).shape[0]))
        if f is not None:
            o.say("### fleet")
            o.fact("odd.fleet.repeated_vehicle_numbers", int(f["veh"].duplicated().sum()))
            o.fact("odd.fleet.vehicles_with_no_seats_given", int(f["seats"].isna().sum())); o.fact("odd.fleet.vehicles_with_no_model_year", int(f["year"].isna().sum()))
            o.fact("odd.fleet.rows_where_total_is_not_seats_plus_standing", int((f["total"].notna() & ((f["seats"] + f["standing"] - f["total"]).abs() > 0)).sum()))
            o.fact("odd.fleet.rows_with_no_total", int(f["total"].isna().sum()))
            o.say("  bus types as written: " + ", ".join("%s: %d" % (k or "(empty)", v) for k, v in f["type"].value_counts().sort_index().items()))
        st, tr = g["stop_times"], g["trips"]
        if st is not None and tr is not None and _find(st, "trip_id") and _find(tr, "trip_id"):
            o.say("### gtfs")
            o.fact("odd.gtfs.trips_with_no_stop_times", int((~_key(tr[_find(tr, "trip_id")]).isin(set(_key(st[_find(st, "trip_id")]).unique()))).sum()))
            fr = g["frequencies"]
            o.fact("odd.gtfs.frequencies_rows", 0 if fr is None else len(fr), "if above zero, some trips repeat by headway and stop_times alone undercounts the timetable")
    o.part("8. Things that look wrong", odd)

    # ------------------------------------------------------------------ a last look for anything that should not be here
    tokens = set(re.findall(r"[A-Za-z0-9_\-]{5,}", "\n".join(o.lines).upper()))
    hits = 0
    for label, df in (("nol", nol), ("avl", avl), ("fleet", fleet)):
        for name in ID_COLS:
            c = _find(df, name)
            if c is not None:
                hits += len(tokens & set(_key(df[c]).str.upper().unique()))
    o.say()
    o.fact("safety.words_in_this_text_that_equal_an_identifier_value", hits, "must be 0 before this text is shared. If it is not, a count happens to equal a number used as an identifier, or something leaked: find out which")
    return "\n".join(o.lines) + "\n", o.facts


def census(tables):
    """tables: a dict of pandas DataFrames with the keys nol, avl, fleet, communities, and gtfs_<file> for the twelve network files. Returns the text."""
    return census_facts(tables)[0]


# ---------------------------------------------------------------------- reading a local folder (not used in Dataiku)
def _kml_table(path):
    text = open(path, encoding="utf-8", errors="ignore").read()
    return pd.DataFrame({"shape": ["(" + c.strip() + ")" for c in re.findall(r"<coordinates>(.*?)</coordinates>", text, flags=re.S)]})


def load_folder(folder):
    """Finds the tables in a folder by their file names. Everything is read as text, so nothing is changed on the way in."""
    tables = {}
    for d, _, files in os.walk(folder):
        for name in sorted(files):
            path, low = os.path.join(d, name), name.lower()
            stem, ext = os.path.splitext(low)
            if ext not in (".csv", ".txt", ".tsv", ".xlsx", ".xls", ".kml") or stem == "readme":
                continue
            key = "gtfs_" + stem if stem in GTFS else "nol" if ("nol" in stem or "transaction" in stem) else "avl" if ("avl" in stem or "runtime" in stem) else "fleet" if "fleet" in stem else "communities" if ("communit" in stem or "boundar" in stem) else None
            if key is None or (key in tables and ext == ".kml"):
                continue
            if ext == ".kml":
                tables[key] = _kml_table(path)
            elif ext in (".xlsx", ".xls"):
                tables[key] = pd.read_excel(path, dtype=str).fillna("")
            else:
                tables[key] = pd.read_csv(path, dtype=str, keep_default_na=False, sep="\t" if ext == ".tsv" else ",", encoding="utf-8-sig")
    return tables


def main():
    args = sys.argv[1:]
    if "--data" not in args:
        print("usage: python3 -m model.census --data <folder> [--json]"); return 2
    text, facts = census_facts(load_folder(args[args.index("--data") + 1]))
    print(json.dumps(facts, indent=1, sort_keys=True, ensure_ascii=False) if "--json" in args else text, end="" if "--json" not in args else "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
