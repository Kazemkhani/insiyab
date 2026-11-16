"""Getting the data ready (docs/MODEL-PLAN.md, section 2). Every step counts its rows in and out and says what it did
with anything that looked wrong: nothing is dropped without a line in the log.

  day = prepare(load(folder))        folder holds the five tables as files (fixtures/raw is the invented set)
  day = prepare(tables)              tables is a dict of DataFrames, as read inside Dataiku

Identifier columns (card, device, driver) are used only to count and are never carried out of this file.
A vehicle leaves this file as a stand-in (v1, v2 ...), never as its body number.

What the census must confirm on the real tables, each one constant below so it is changed in one place:
  DAY_START   a clock time before this hour belongs to the service day before (the day runs past midnight)
  DOOR_OPEN   the words in Door_Status that mean the door opened
  one nol row is one tap (CKI or CKO is 1). If it turns out to be one journey, the taps stage is the only one to change.
  a tap after midnight carries the next calendar date. If the real table dates it the service day, the taps stage counts
  such rows (taps_before_day_start_dated_the_service_day) and they must be moved past midnight there."""
import os, re
import numpy as np
import pandas as pd

BIN = 900
DAY_START = 4 * 3600
DOOR_OPEN = {"open", "opened", "1", "true", "yes", "y"}
FILES = {"nol": "nol_transactions.csv", "avl": "bus_runtime_avl.csv", "fleet": "bus_fleet.csv", "communities": "community_boundaries.csv"}
GTFS = ["agency", "routes", "trips", "stop_times", "stops", "calendar", "calendar_dates", "frequencies", "shapes", "transfers", "translations", "feed_info"]


def load(folder):
    """Reads every table as text, exactly as given. Types are worked out here, in the open, not guessed by the reader."""
    read = lambda p: pd.read_csv(p, dtype=str, keep_default_na=False, encoding="utf-8")
    tables = {k: read(os.path.join(folder, f)) for k, f in FILES.items()}
    for g in GTFS:
        p = os.path.join(folder, "gtfs", g + ".txt")
        tables["gtfs_" + g] = read(p) if os.path.exists(p) else pd.DataFrame()
    return tables


def _key(name):
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


def cols(df, *names):
    """The table with only the named columns, found whatever their case or spacing, renamed to the names asked for."""
    have = {_key(c): c for c in df.columns}
    missing = [n for n in names if _key(n) not in have]
    if missing:
        raise KeyError(f"columns not found: {missing}. The table has: {list(df.columns)}")
    return df[[have[_key(n)] for n in names]].set_axis(list(names), axis=1).astype(str)


def seconds(text):
    """HH:MM:SS (or H:MM, or above 24:00:00 as in GTFS) to whole seconds. An empty or unreadable time is NaN."""
    parts = text.astype(str).str.strip().str.extract(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?")
    return pd.to_numeric(parts[0], errors="coerce") * 3600 + pd.to_numeric(parts[1], errors="coerce") * 60 + pd.to_numeric(parts[2], errors="coerce").fillna(0)


def route_name(text):
    """One way of writing a route's public number: no spaces, upper case, no leading zeros. '021' and 'f13' become '21' and 'F13'."""
    return text.astype(str).str.strip().str.upper().str.replace(r"^0+(?=.)", "", regex=True)


def _polygon(text):
    """The outer ring of a WKT POLYGON or MULTIPOLYGON as an array of [lon, lat], or None."""
    m = re.search(r"\(\(+([^()]+)\)", str(text))
    if not m:
        return None
    try:
        pts = np.array([[float(x) for x in p.split()[:2]] for p in m.group(1).split(",")])
    except ValueError:
        return None
    return pts if len(pts) >= 3 else None


def _inside(lon, lat, ring):
    """Which of the points lie inside the ring (the even-odd rule)."""
    x, y = ring[:, 0], ring[:, 1]; inside = np.zeros(len(lon), dtype=bool); j = len(ring) - 1
    for i in range(len(ring)):
        crosses = ((y[i] > lat) != (y[j] > lat)) & (lon < (x[j] - x[i]) * (lat - y[i]) / (y[j] - y[i] + 1e-300) + x[i])
        inside ^= crosses; j = i
    return inside


def prepare(tables, service_date=None):
    log = []
    def note(stage, text, **counts):
        log.append({"stage": stage, "text": text, **{k: (int(v) if float(v).is_integer() else round(float(v), 4)) for k, v in counts.items()}})

    # --- the runtime report: what each bus did at each stop -----------------------------------------------------
    raw = tables["avl"]
    v = cols(raw, "Date", "Body", "Trip_ID", "Route", "Direction", "Stop_Seq", "Stop_ID", "Sched_Arr", "Act_Arr", "Sched_Dep", "Act_Dep", "Door_Status")
    v.columns = ["date", "body", "trip_id", "route_raw", "direction", "seq", "stop_id", "sched_arr", "act_arr", "sched_dep", "act_dep", "door"]
    service_date = service_date or v["date"].mode().iat[0]
    v["route_id"] = route_name(v["route_raw"]); v["stop_id"] = v["stop_id"].str.strip()
    v["direction"] = pd.to_numeric(v["direction"], errors="coerce").fillna(0).astype(int).clip(0, 1)
    v["seq"] = pd.to_numeric(v["seq"], errors="coerce")
    # The day runs past midnight, and on a real network past 04:00 too: a night bus is still out at 04:10, written as 04:10 on the day's date.
    # So a clock time is not placed by a fixed hour. Each vehicle's rows are followed in the order the report gives them: when its clock
    # falls back by more than six hours it has passed midnight. Only a vehicle's first row needs a rule: before DAY_START it is past midnight.
    for c in ("sched_arr", "act_arr", "sched_dep", "act_dep"):
        v[c] = seconds(v[c])
    base = v["sched_arr"].fillna(v["sched_dep"]); prev = base.groupby(v["body"], sort=False).shift(1)
    wrapped = (base < prev - 6 * 3600).astype(int).groupby(v["body"], sort=False).cumsum()
    first = base.groupby(v["body"], sort=False).transform("first")
    day_of_row = (wrapped + (first < DAY_START).astype(int)).clip(upper=1) * 86400
    anchor = base + day_of_row
    for c in ("sched_arr", "act_arr", "sched_dep", "act_dep"):
        t = v[c] + day_of_row
        v[c] = t + np.where(t < anchor - 12 * 3600, 86400, 0) - np.where(t > anchor + 12 * 3600, 86400, 0)      # a row that itself straddles midnight
    no_time = v[["sched_arr", "sched_dep"]].isna().any(axis=1) | v["seq"].isna()
    v = v[~no_time].copy()
    filled = int(v["act_arr"].isna().sum() + v["act_dep"].isna().sum())
    v["act_arr"] = v["act_arr"].fillna(v["sched_arr"]); v["act_dep"] = v["act_dep"].fillna(v["sched_dep"])
    v["door_opened"] = v["door"].str.strip().str.lower().isin(DOOR_OPEN)
    v = v.sort_values(["trip_id", "seq"], kind="stable").drop_duplicates(["trip_id", "seq"]).reset_index(drop=True)
    v["seq"] = v["seq"].astype(int)
    # a clock that runs backwards: a bus cannot leave before it arrives or reach the next stop before leaving the last one
    before = v[["act_arr", "act_dep"]].to_numpy().copy()
    arr = v.groupby("trip_id", sort=False)["act_arr"].cummax()
    dep = np.maximum(v["act_dep"], arr)
    dep_run = dep.groupby(v["trip_id"], sort=False).cummax()
    arr = np.maximum(arr, dep_run.groupby(v["trip_id"], sort=False).shift(1).fillna(-np.inf))
    v["act_arr"] = arr.astype(int); v["act_dep"] = np.maximum(dep_run, arr).astype(int)
    for c in ("sched_arr", "sched_dep"):
        v[c] = v[c].astype(int)
    moved = int((before != v[["act_arr", "act_dep"]].to_numpy()).any(axis=1).sum())
    note("runtime report", "one row is one bus at one stop; rows with no scheduled time or no stop sequence are left out; a missing actual time takes the scheduled one; a time that ran backwards is moved up to the time before it",
         rows_in=len(raw), rows_out=len(v), rows_without_a_scheduled_time=no_time.sum(), actual_times_filled_from_schedule=filled, rows_whose_clock_ran_backwards=moved,
         route_numbers_rewritten=(v["route_raw"].str.strip() != v["route_id"]).sum(), trips=v["trip_id"].nunique(), door_not_opened=(~v["door_opened"]).sum(),
         rows_placed_after_midnight=(v["sched_arr"] >= 86400).sum(), latest_scheduled_hour=int(v["sched_arr"].max() // 3600))

    # --- the fleet: seats for each vehicle ----------------------------------------------------------------------
    f = cols(tables["fleet"], "Body_number", "Bus_Type", "Model Year", "No_of_Seats")
    f.columns = ["body", "bus_type", "model_year", "seats"]
    f["seats"] = pd.to_numeric(f["seats"], errors="coerce"); f["model_year"] = pd.to_numeric(f["model_year"], errors="coerce")
    f["bus_type"] = f["bus_type"].str.strip().str.upper().replace("", "UNKNOWN")
    f = f.drop_duplicates("body")
    v = v.merge(f, on="body", how="left")
    unknown = v["seats"].isna() | (v["seats"] <= 0)
    typical = int(f["seats"].median()) if f["seats"].notna().any() else 0
    note("fleet", "a vehicle that is not in the fleet table is given the fleet's middle number of seats and the type UNKNOWN; seats only, standing capacity is not verified",
         vehicles_in_the_fleet_table=len(f), vehicles_in_the_runtime_report=v["body"].nunique(), vehicles_run_but_not_in_the_fleet_table=v.loc[unknown, "body"].nunique(), seats_given_to_those=typical)
    v.loc[unknown, "seats"] = typical; v["seats"] = v["seats"].astype(int); v["bus_type"] = v["bus_type"].fillna("UNKNOWN")
    names = {b: f"v{i + 1}" for i, b in enumerate(sorted(v["body"].unique()))}       # a stand-in, never the body number

    # --- taps: one row is one check-in or one check-out ---------------------------------------------------------
    raw = tables["nol"]
    t = cols(raw, "Transaction_date", "Transaction_Time", "Body_EVD_ID", "NOL_ID", "CKI", "CKO", "Stop_Id")
    t.columns = ["date", "clock", "body", "card", "cki", "cko", "stop_tapped"]
    dup = t.duplicated(keep="first"); t = t[~dup].copy()
    t["time"] = seconds(t["clock"]) + np.where(t["date"].str.strip() > service_date, 86400, 0)
    t["on"] = pd.to_numeric(t["cki"], errors="coerce").fillna(0).eq(1); t["off"] = pd.to_numeric(t["cko"], errors="coerce").fillna(0).eq(1)
    early = int(((seconds(t["clock"]) < DAY_START) & (t["date"].str.strip() == service_date)).sum())
    odd = t["time"].isna() | ~(t["on"] ^ t["off"])
    t = t[~odd].copy(); t["time"] = t["time"].astype(int)
    cards = t["card"].nunique()
    note("taps", "one row is one tap: a check-in (CKI is 1) or a check-out (CKO is 1); a row repeated exactly is counted once; a row with no time, or that is neither or both, is left out",
         rows_in=len(raw), repeated_rows=dup.sum(), rows_neither_or_both_or_no_time=odd.sum(), rows_out=len(t), check_ins=t["on"].sum(), check_outs=t["off"].sum(), cards_counted=cards, taps_before_day_start_dated_the_service_day=early)

    # --- taps to trips: the tap belongs to the stop its vehicle reached last ------------------------------------
    left = t[["time", "body", "on", "off", "stop_tapped", "card"]].sort_values("time", kind="stable")
    right = v[["act_arr", "body", "trip_id", "seq", "stop_id"]].sort_values("act_arr", kind="stable")
    j = pd.merge_asof(left, right, left_on="time", right_on="act_arr", by="body", direction="backward")
    lost = j["trip_id"].isna()
    wrong = (~lost) & (j["stop_tapped"].str.strip() != j["stop_id"])
    note("taps to trips", "a tap is given to the stop visit of its vehicle with the latest actual arrival at or before the tap; a tap whose vehicle is not in the runtime report, or that comes before its first arrival, cannot be placed and is left out of loads and counts",
         taps_in=len(j), taps_not_placed=lost.sum(), share_not_placed=lost.mean() if len(j) else 0, taps_whose_own_stop_differs_from_the_stop_placed=wrong.sum())
    j = j[~lost].copy(); j["seq"] = j["seq"].astype(int)
    # people who will come back: for each alighting, when that card next tapped. Only the stop and the two times leave this file, never the card.
    jc = j.sort_values(["card", "time"], kind="stable"); nxt = jc.groupby("card", sort=False)["time"].shift(-1)
    came_back = pd.DataFrame({"stop_id": jc["stop_id"], "alighted": jc["time"], "next_tap": nxt.fillna(np.inf)})[jc["off"].to_numpy()].reset_index(drop=True)
    j = j.drop(columns=["card"])
    per = j.groupby(["trip_id", "seq"]).agg(on=("on", "sum"), off_known=("off", "sum")).reset_index()
    v = v.merge(per, on=["trip_id", "seq"], how="left"); v[["on", "off_known"]] = v[["on", "off_known"]].fillna(0).astype(int)

    # --- loads: along each trip, load after a stop is load before, less alightings, plus boardings ---------------
    on = v["on"].to_numpy(); known = v["off_known"].to_numpy(); off = np.zeros(len(v), dtype=int); load = np.zeros(len(v), dtype=int)
    below = not_empty = spread_total = last_boardings = 0
    bounds = np.flatnonzero(np.r_[True, v["trip_id"].to_numpy()[1:] != v["trip_id"].to_numpy()[:-1], True])
    for a, b in zip(bounds[:-1], bounds[1:]):
        o, k = on[a:b], known[a:b]
        running = np.cumsum(o - k)
        below += int((running < 0).any()); not_empty += int(running[-1] != 0)
        unknown_off = max(0, int(o.sum() - k.sum())); spread_total += unknown_off
        extra = np.zeros(b - a, dtype=int)
        if unknown_off and k.sum() > 0:                               # spread unknown alightings in proportion to known ones
            share = k * unknown_off / k.sum(); extra = np.floor(share).astype(int)
            for i in np.argsort(-(share - extra), kind="stable")[: unknown_off - extra.sum()]:
                extra[i] += 1
        now = owed = 0
        for i in range(b - a):
            want = k[i] + extra[i] + owed
            got = now if i == b - a - 1 else min(want, now)           # nobody can alight who is not on board; at the last stop everyone does
            owed = max(0, want - got); now = now - got + o[i]; off[a + i] = got; load[a + i] = now
        last_boardings += int(now)
    v["off"] = off; v["load"] = load
    note("loads", "check-ins with no check-out are alightings we do not know: they are spread over the trip's stops in proportion to its known alightings, and whoever is left alights at the last stop; nobody alights who is not on board",
         trips=len(bounds) - 1, trips_whose_recorded_load_went_below_zero=below, trips_whose_recorded_load_did_not_end_at_zero=not_empty, alightings_not_recorded_and_spread=spread_total,
         share_of_boardings_with_no_recorded_alighting=spread_total / max(1, on.sum()), passengers_boarding_at_a_last_stop=last_boardings,
         trips_over_their_seats=(v.groupby("trip_id")["load"].max() > v.groupby("trip_id")["seats"].first()).sum())

    # --- the plan: stops, routes, the timetable -----------------------------------------------------------------
    s = cols(tables["gtfs_stops"], "stop_id", "stop_name", "stop_lat", "stop_lon"); s.columns = ["stop_id", "name", "lat", "lon"]
    s["lat"] = pd.to_numeric(s["lat"], errors="coerce"); s["lon"] = pd.to_numeric(s["lon"], errors="coerce"); s["stop_id"] = s["stop_id"].str.strip()
    s = s.dropna(subset=["lat", "lon"]).drop_duplicates("stop_id").reset_index(drop=True)
    c = tables["communities"]; comms = []; s["community_id"] = None
    if len(c):
        cc = cols(c, "comm_num", "cname_e", "cname_a", "shape")
        for cid, en, ar, shape in cc.itertuples(index=False):
            ring = _polygon(shape)
            if ring is None:
                continue
            comms.append({"community_id": str(cid), "name_en": en, "name_ar": ar, "centroid": [round(float(ring[:, 0].mean()), 6), round(float(ring[:, 1].mean()), 6)]})
            hit = _inside(s["lon"].to_numpy(), s["lat"].to_numpy(), ring) & s["community_id"].isna().to_numpy()
            s.loc[hit, "community_id"] = str(cid)
        note("stops to places", "each stop is put in the community whose boundary it lies inside", communities_in=len(c), communities_whose_shape_could_be_read=len(comms), stops=len(s), stops_outside_every_community=s["community_id"].isna().sum())

    r = cols(tables["gtfs_routes"], "route_id", "route_short_name", "route_long_name"); r.columns = ["gtfs_route", "route_id", "long_name"]; r["route_id"] = route_name(r["route_id"])
    tr = cols(tables["gtfs_trips"], "route_id", "service_id", "trip_id", "shape_id", "direction_id"); tr.columns = ["gtfs_route", "service_id", "gtfs_trip", "shape_id", "direction"]
    tr["direction"] = pd.to_numeric(tr["direction"], errors="coerce").fillna(0).astype(int).clip(0, 1)
    active = _services_on(tables, service_date)
    if active is not None:
        tr = tr[tr["service_id"].isin(active)]
    st = cols(tables["gtfs_stop_times"], "trip_id", "departure_time", "stop_id", "stop_sequence"); st.columns = ["gtfs_trip", "dep", "stop_id", "seq"]
    st["dep"] = seconds(st["dep"]); st["seq"] = pd.to_numeric(st["seq"], errors="coerce"); st["stop_id"] = st["stop_id"].str.strip()
    plan = st.dropna(subset=["dep", "seq"]).merge(tr, on="gtfs_trip").merge(r, on="gtfs_route")
    plan = plan[plan["stop_id"].isin(set(s["stop_id"]))]
    note("timetable", "scheduled departures on the service day, by route, direction and stop", service_date_as_number=int(service_date.replace("-", "")), scheduled_trips=plan["gtfs_trip"].nunique(), scheduled_departures=len(plan),
         routes=plan["route_id"].nunique(), stops_served=plan["stop_id"].nunique())

    # the order of stops and the path of each route and direction: the pattern most trips follow
    routes = []
    shapes = tables["gtfs_shapes"]
    if len(shapes):
        sh = cols(shapes, "shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"); sh.columns = ["shape_id", "lat", "lon", "n"]
        sh[["lat", "lon", "n"]] = sh[["lat", "lon", "n"]].apply(pd.to_numeric, errors="coerce"); sh = sh.dropna().sort_values(["shape_id", "n"])
        paths = {k: g[["lon", "lat"]].round(6).to_numpy().tolist() for k, g in sh.groupby("shape_id")}
    else:
        paths = {}
    where = s.set_index("stop_id")[["lon", "lat"]]
    for rid, g in plan.groupby("route_id", sort=True):
        dirs = []
        for d, gd in g.groupby("direction", sort=True):
            pattern = gd.sort_values("seq").groupby("gtfs_trip")["stop_id"].agg(tuple)
            best = pattern.value_counts().index[0]; trip = pattern[pattern == best].index[0]
            shape = paths.get(gd.loc[gd["gtfs_trip"] == trip, "shape_id"].iat[0]) or where.loc[list(best)].round(6).to_numpy().tolist()
            dirs.append({"direction": int(d), "stops": list(best), "shape": shape})
        routes.append({"route_id": rid, "short_name": rid, "long_name": g["long_name"].iat[0], "directions": dirs})

    # --- bins: boardings by stop, route, direction and quarter of an hour ---------------------------------------
    plan["bin"] = (plan["dep"] // BIN).astype(int)
    series = plan.groupby(["route_id", "direction", "stop_id"]).agg(first=("bin", "min"), last=("bin", "max"), sched_day=("bin", "size")).reset_index()
    first_bin = int(series["first"].min()); n_bins = int(series["last"].max()) - first_bin + 2      # one bin after the last departure, for a late bus
    order = {(x["route_id"], d["direction"], sid): i / max(1, len(d["stops"]) - 1) for x in routes for d in x["directions"] for i, sid in enumerate(d["stops"])}
    series["position"] = [order.get(k, 0.5) for k in zip(series["route_id"], series["direction"], series["stop_id"])]
    series = series.merge(s[["stop_id", "community_id"]], on="stop_id", how="left")
    series["routes_at_stop"] = series.groupby("stop_id")["route_id"].transform("nunique")
    idx = {k: i for i, k in enumerate(zip(series["route_id"], series["direction"], series["stop_id"]))}
    S = np.zeros((len(series), n_bins)); Y = np.full((len(series), n_bins), np.nan)
    np.add.at(S, ([idx[k] for k in zip(plan["route_id"], plan["direction"], plan["stop_id"])], plan["bin"].to_numpy() - first_bin), 1)
    for i, (a, b) in enumerate(zip(series["first"] - first_bin, series["last"] - first_bin)):
        Y[i, a:b + 2] = 0                                             # in the timetable's span a bin with no boarding is a true zero; outside it the series is absent
    jb = j[j["on"]].merge(v[["trip_id", "seq", "route_id", "direction"]], on=["trip_id", "seq"])
    rows = np.array([idx.get(k, -1) for k in zip(jb["route_id"], jb["direction"], jb["stop_id"])], dtype=int); bins = (jb["time"].to_numpy() // BIN) - first_bin
    ok = (rows >= 0) & (bins >= 0) & (bins < n_bins)
    ok[ok] &= ~np.isnan(Y[rows[ok], bins[ok]])
    np.add.at(Y, (rows[ok], bins[ok]), 1)
    note("bins", "boardings are counted by stop, route, direction and quarter of an hour, at the time of the tap; between a stop's first and last scheduled departure a bin with no boarding is a true zero, and outside that span the stop is absent, not zero",
         boardings_placed_on_a_trip=len(jb), boardings_counted=ok.sum(), boardings_at_a_stop_or_time_outside_the_timetable=(~ok).sum(), series=len(series), bins=n_bins, bins_present=(~np.isnan(Y)).sum(),
         bins_present_with_no_boarding=(Y == 0).sum())

    v["vehicle"] = v["body"].map(names)
    visits = v[["trip_id", "route_id", "direction", "seq", "stop_id", "vehicle", "bus_type", "seats", "model_year", "sched_arr", "act_arr", "sched_dep", "act_dep", "door_opened", "on", "off", "load"]]
    return {"service_date": service_date, "visits": visits, "stops": s, "communities": comms, "routes": routes, "series": series, "Y": Y, "S": S, "first_bin": first_bin,
            "alightings": came_back,
            "fleet_types": f.groupby("bus_type")["seats"].median().dropna().astype(int).reset_index().to_dict("records"), "log": log}


def _services_on(tables, service_date):
    """The service ids that run on the service day, from calendar and calendar_dates. None if the feed has neither."""
    day = service_date.replace("-", ""); cal = tables.get("gtfs_calendar"); out = None
    if cal is not None and len(cal):
        weekday = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][pd.Timestamp(service_date).weekday()]
        c = cols(cal, "service_id", weekday, "start_date", "end_date")
        out = set(c.loc[(c[weekday] == "1") & (c["start_date"] <= day) & (c["end_date"] >= day), "service_id"])
    cd = tables.get("gtfs_calendar_dates")
    if cd is not None and len(cd):
        c = cols(cd, "service_id", "date", "exception_type"); c = c[c["date"] == day]; out = out or set()
        out |= set(c.loc[c["exception_type"] == "1", "service_id"]); out -= set(c.loc[c["exception_type"] == "2", "service_id"])
    return out
