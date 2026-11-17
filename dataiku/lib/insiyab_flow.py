"""insiyab_flow.py — one function per Dataiku Flow stage.

Each function accepts DataFrames (all-string dtypes, as Dataiku serves them when
infer_with_pandas=False) and returns a dict of named DataFrames.  Internal state
that cannot fit in a dataset (the day dict, the bundle dict) is returned under
keys beginning with an underscore.  Recipes pickle those keys and pass them
through the managed folder called ``state``.

Column mapping:
  The real AVL dataset has a typo: ``Door_Satus`` instead of ``Door_Status``.
  ``prepare`` normalises it before calling the engine.  Every other column in
  every table matches the fixture column names exactly.
"""
import io, pickle
import numpy as np
import pandas as pd

# Columns that differ between the real data and the fixture / engine expectation.
# Key = real column name, value = engine column name.
_REAL_TO_ENGINE = {
    "avl": {"Door_Satus": "Door_Status"},
}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _coerce(df, *cols):
    """Return df with the named columns cast to numeric, in-place-safe copy."""
    df = df.copy()
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def _normalise(tables):
    """Rename real-data columns to what the engine expects."""
    out = dict(tables)
    for key, mapping in _REAL_TO_ENGINE.items():
        if key in out and out[key] is not None and len(out[key]):
            out[key] = out[key].rename(columns=mapping)
    return out


# ---------------------------------------------------------------------------
# stage 1: prepare
# ---------------------------------------------------------------------------

def communities_from_map_export(c):
    """RTA's communities table in Dataiku is a map export: the names sit inside ExtendedData and the outline inside Polygon,
    both as text. This returns the four columns the engine reads (comm_num, cname_e, cname_a, shape), with the outline as
    'POLYGON ((lon lat, ...))'. A table that already has those columns is returned as it is."""
    import json
    if "ExtendedData" not in c.columns or "Polygon" not in c.columns:
        return c
    rows = []
    for ext, poly in zip(c["ExtendedData"], c["Polygon"]):
        try:
            fields = {f.get("name", "").upper(): f.get("xml_text") for f in json.loads(ext)[0]["SchemaData"][0]["SimpleData"]}
            text = json.loads(poly)[0]["outerBoundaryIs"][0]["LinearRing"][0]["coordinates"]
            ring = ", ".join(" ".join(pt.split(",")[:2]) for pt in text.split())
        except (ValueError, KeyError, IndexError, TypeError, AttributeError):
            continue
        if fields.get("COMM_NUM") and ring:
            rows.append({"comm_num": fields["COMM_NUM"], "cname_e": fields.get("CNAME_E"), "cname_a": fields.get("CNAME_A"), "shape": f"POLYGON (({ring}))"})
    return pd.DataFrame(rows, columns=["comm_num", "cname_e", "cname_a", "shape"])


def prepare(tables):
    """Clean raw tables, resolve taps to trips, build binned boardings.

    Takes the raw table dict (keys: nol, avl, fleet, communities, gtfs_*).
    Returns stop_visits, boardings_quarter, prepare_log, vehicle_attributes.
    Also returns _day (the internal day dict) for recipes to pickle.
    """
    from model.prepare import prepare as _prepare, BIN

    t = _normalise(tables)
    t["communities"] = communities_from_map_export(t["communities"])
    day = _prepare(t)

    # --- stop_visits (no PII: vehicle is already v1/v2..., body/card/driver gone) ---
    stop_visits = day["visits"].copy()

    # --- boardings_quarter: flatten Y[series, bin] into a table ---
    series = day["series"]
    Y, S = day["Y"], day["S"]
    first_bin = day["first_bin"]
    n_bins = Y.shape[1]
    bq_rows = []
    for i, (_, row) in enumerate(series.iterrows()):
        for b in range(n_bins):
            if not np.isnan(Y[i, b]):
                bq_rows.append({
                    "route_id": row["route_id"],
                    "direction": int(row["direction"]),
                    "stop_id": row["stop_id"],
                    "community_id": row["community_id"],
                    "bin_start": int((first_bin + b) * BIN),
                    "scheduled_departures": int(S[i, b]),
                    "boardings": int(Y[i, b]),
                })
    boardings_quarter = pd.DataFrame(bq_rows) if bq_rows else pd.DataFrame(
        columns=["route_id", "direction", "stop_id", "community_id", "bin_start",
                 "scheduled_departures", "boardings"])

    # --- prepare_log ---
    prepare_log = pd.DataFrame(day["log"])

    # --- vehicle_attributes: taken directly from the day dict (built in model.prepare) ---
    vehicle_attributes = day.get("vehicle_attributes", pd.DataFrame(
        columns=["vehicle", "bus_type", "model_year", "seats", "manufacturer"]))

    return {
        "stop_visits": stop_visits,
        "boardings_quarter": boardings_quarter,
        "prepare_log": prepare_log,
        "vehicle_attributes": vehicle_attributes,
        "_day": day,
    }


# ---------------------------------------------------------------------------
# stage 2: insights
# ---------------------------------------------------------------------------

_BANDS = [
    ("before 06:00",  0,  6 * 3600),
    ("06:00-10:00",   6 * 3600, 10 * 3600),
    ("10:00-16:00",  10 * 3600, 16 * 3600),
    ("16:00-19:00",  16 * 3600, 19 * 3600),
    ("after 19:00",  19 * 3600, 99 * 3600),
]


def _band_label(secs):
    for label, lo, hi in _BANDS:
        if lo <= secs < hi:
            return label
    return "after 19:00"


def _build_trips(v):
    """Trip-level aggregation from stop_visits (already coerced to numeric)."""
    # aggregate per trip
    agg = v.groupby("trip_id", sort=False).agg(
        route_id=("route_id", "first"),
        vehicle=("vehicle", "first"),
        bus_type=("bus_type", "first"),
        model_year=("model_year", "first"),
        seats=("seats", "first"),
        sched_start=("sched_dep", "first"),
        sched_end=("sched_arr", "last"),
        act_start=("act_dep", "first"),
        act_end=("act_arr", "last"),
        peak_load=("load", "max"),
        boardings=("on", "sum"),
    ).reset_index()

    # handle past-midnight wrap: if end time is far before start, add 86400
    for s_col, e_col in [("sched_start", "sched_end"), ("act_start", "act_end")]:
        wrap = agg[e_col] < agg[s_col] - 3 * 3600
        agg.loc[wrap, e_col] = agg.loc[wrap, e_col] + 86400

    agg["sched_run"] = agg["sched_end"] - agg["sched_start"]
    agg["act_run"]   = agg["act_end"]   - agg["act_start"]
    agg["start_late"] = agg["act_start"] - agg["sched_start"]
    agg["end_late"]   = agg["act_end"]   - agg["sched_end"]
    agg["start_hour"] = (agg["sched_start"] // 3600).astype(int)
    agg["band"] = agg["sched_start"].apply(_band_label)
    agg["seat_use"] = agg["peak_load"] / agg["seats"].clip(lower=1)
    return agg


def insights(stop_visits, vehicle_attributes=None):
    """Headline facts with n, plain-English sentence, and how it was computed.

    Returns:
      insights           — headline rows, one per fact
      trip_running_time  — per-trip scheduled vs actual run, lateness, band

    Reports:
      (a) lateness by year band, bus type, manufacturer; association note added
      (b) trip running times by band: share taking 10%+ longer, share finishing
          5+ minutes late
      (c) knock-on: of trips starting 5+ minutes late, how many had a previous
          trip from the same vehicle end 5+ minutes late within the hour before
      (d) seat use by bus type; over-seats by route in 16-19 band; off-peak
          trips under 20% full with their scheduled bus-hours
    """
    try:
        from scipy import stats as _stats
        _have_scipy = True
    except ImportError:
        _have_scipy = False

    v = _coerce(stop_visits.copy(), "sched_arr", "act_arr", "sched_dep", "act_dep",
                "on", "off", "load", "seats", "model_year", "seq")
    v["lateness"] = v["act_arr"] - v["sched_arr"]
    rows = []

    def _add(kind, group, value, unit, n, fact, how):
        rows.append({"kind": kind, "group": str(group), "value": value,
                     "unit": unit, "n": int(n), "fact": fact, "how": how})

    # -- (a) lateness by model year band -------------------------------------------
    v["year_band"] = pd.cut(
        v["model_year"], bins=[0, 2010, 2016, 2025, 9999],
        labels=["up to 2010", "2011-2016", "2017-2025", "2026+"], right=True)
    for band, g in v.groupby("year_band", observed=True):
        ml = float(g["lateness"].mean())
        n_veh = g["vehicle"].nunique()
        _add("lateness_by_year_band", band, round(ml, 1), "seconds", len(g),
             f"Vehicles built {band} averaged {ml:.0f} s late per stop visit "
             f"(n={len(g)} visits, {n_veh} vehicles). Association only: older "
             f"vehicles may run harder routes.",
             "mean of act_arr minus sched_arr, grouped by model year band; "
             "routes are not controlled for")

    # Statistical test: older vs newer buses
    old = v[v["model_year"] < 2017]["lateness"].dropna()
    new_v = v[v["model_year"] >= 2017]["lateness"].dropna()
    if len(old) >= 20 and len(new_v) >= 20 and _have_scipy:
        _, p = _stats.mannwhitneyu(old.to_numpy(), new_v.to_numpy(), alternative="greater")
        diff = float(old.mean()) - float(new_v.mean())
        _add("lateness_old_vs_new", "old_vs_new", round(diff, 1), "seconds difference",
             len(old) + len(new_v),
             f"Buses built before 2017 averaged {float(old.mean()):.0f} s late vs "
             f"{float(new_v.mean()):.0f} s for 2017 and later "
             f"(Mann-Whitney U one-sided p={p:.3f}, n_old={len(old)}, n_new={len(new_v)}). "
             f"This is an association: routes are not controlled for.",
             "Mann-Whitney U one-sided test; p < 0.05 supports the claim; "
             "positive value means older buses are on average later; "
             "routes are not controlled for")

    # Lateness by bus type, overall and in 16-19 band
    for btype, g in v.groupby("bus_type"):
        ml = float(g["lateness"].mean())
        n_veh = g["vehicle"].nunique()
        _add("lateness_by_bus_type", btype, round(ml, 1), "seconds", len(g),
             f"{btype} buses averaged {ml:.0f} s late per stop visit "
             f"(n={len(g)} visits, {n_veh} vehicles)",
             "mean of act_arr minus sched_arr, grouped by Bus_Type from fleet table; "
             "routes are not controlled for")

    v_eve = v[(v["sched_arr"] >= 16 * 3600) & (v["sched_arr"] < 19 * 3600)]
    if len(v_eve):
        for btype, g in v_eve.groupby("bus_type"):
            ml = float(g["lateness"].mean())
            n_veh = g["vehicle"].nunique()
            _add("lateness_by_bus_type_1619", f"{btype}_16-19", round(ml, 1), "seconds", len(g),
                 f"Evening peak (16-19): {btype} buses averaged {ml:.0f} s late "
                 f"(n={len(g)} visits, {n_veh} vehicles)",
                 "mean lateness in the 16:00-19:00 band by bus type; "
                 "routes are not controlled for")

    # Lateness by model year AND bus type in 16-19 band
    if len(v_eve):
        v_eve2 = v_eve.copy()
        v_eve2["year_band"] = pd.cut(
            v_eve2["model_year"], bins=[0, 2010, 2016, 2025, 9999],
            labels=["up to 2010", "2011-2016", "2017-2025", "2026+"], right=True)
        for (yb, bt), g in v_eve2.groupby(["year_band", "bus_type"], observed=True):
            ml = float(g["lateness"].mean())
            n_t = g["trip_id"].nunique()
            n_veh = g["vehicle"].nunique()
            _add("lateness_year_band_bus_type_1619", f"{yb}/{bt}", round(ml, 1), "seconds", len(g),
                 f"Evening peak: built {yb}, type {bt}: {ml:.0f} s late avg "
                 f"(n={len(g)} stops, {n_t} trips, {n_veh} vehicles)",
                 "mean lateness in 16-19 band by year band and bus type; "
                 "routes are not controlled for")

    # Lateness by manufacturer
    if vehicle_attributes is not None and len(vehicle_attributes) and "manufacturer" in vehicle_attributes.columns:
        v2 = v.merge(vehicle_attributes[["vehicle", "manufacturer"]], on="vehicle", how="left")
        for mfr, g in v2.groupby("manufacturer"):
            if str(mfr).strip():
                ml = float(g["lateness"].mean())
                _add("lateness_by_manufacturer", mfr, round(ml, 1), "seconds", len(g),
                     f"{mfr} buses averaged {ml:.0f} s late per stop visit (n={len(g)}). "
                     f"Association only: routes are not controlled for.",
                     "mean of act_arr minus sched_arr, grouped by Manufacturer; "
                     "routes are not controlled for")

    # -- build trip-level table -------------------------------------------------
    t = _build_trips(v)

    # -- (b) running time by band ------------------------------------------------
    for band_label, lo, hi in _BANDS:
        g = t[(t["sched_start"] >= lo) & (t["sched_start"] < hi)]
        if not len(g):
            continue
        # trips whose actual run is 10% or more longer than scheduled
        valid = g[g["sched_run"] > 0]
        share_long = float((valid["act_run"] >= valid["sched_run"] * 1.1).mean()) if len(valid) else 0.0
        # trips finishing 5+ minutes late
        share_late = float((g["end_late"] >= 300).mean())
        _add("running_time_long_share", band_label, round(share_long, 4), "share", len(g),
             f"{band_label}: {share_long:.1%} of {len(g)} trips took 10%+ longer than scheduled",
             "share of trips where actual run >= 1.1 times scheduled run, by time band")
        _add("running_time_late_end_share", band_label, round(share_late, 4), "share", len(g),
             f"{band_label}: {share_late:.1%} of {len(g)} trips finished 5+ minutes late",
             "share of trips where end_late >= 300 seconds, by time band")

    # -- (c) knock-on effects ---------------------------------------------------
    t_sorted = t.sort_values(["vehicle", "act_start"], kind="stable").copy()
    t_sorted["prev_act_end"] = t_sorted.groupby("vehicle", sort=False)["act_end"].shift(1)
    t_sorted["prev_end_late"] = t_sorted.groupby("vehicle", sort=False)["end_late"].shift(1)
    t_sorted["sched_layover"] = t_sorted["sched_start"] - t_sorted.groupby(
        "vehicle", sort=False)["sched_end"].shift(1)

    late_starters = t_sorted[
        (t_sorted["start_late"] >= 300) &
        t_sorted["prev_act_end"].notna() &
        ((t_sorted["act_start"] - t_sorted["prev_act_end"]) < 3600)
    ]
    n_ls = len(late_starters)
    n_knockon = int((late_starters["prev_end_late"] >= 300).sum()) if n_ls else 0
    _add("knockon_late_starts", "all", n_knockon, "trips", n_ls,
         f"{n_knockon} of {n_ls} trips starting 5+ minutes late had a previous trip "
         f"from the same vehicle ending 5+ minutes late within the hour before",
         "trips with start_late >= 300 s and a previous vehicle trip ending within 60 min; "
         "of those, count where that previous trip's end_late >= 300 s")

    # Scheduled layover median by band
    has_prev = t_sorted[t_sorted["sched_layover"].notna() & (t_sorted["sched_layover"] >= 0)]
    if len(has_prev):
        has_prev = has_prev.copy()
        has_prev["band"] = has_prev["sched_start"].apply(_band_label)
        for band_label, g in has_prev.groupby("band", observed=True):
            med = float(g["sched_layover"].median())
            _add("median_scheduled_layover", band_label, round(med / 60, 1), "minutes", len(g),
                 f"{band_label}: median scheduled layover between consecutive trips "
                 f"from the same vehicle is {med / 60:.1f} minutes (n={len(g)} handovers)",
                 "median of sched_start minus previous trip sched_end, by band")

    # -- general trips over / under seats --------------------------------------
    n_over = int((t["peak_load"] > t["seats"]).sum())
    n_under = int((t["peak_load"] < t["seats"] / 3).sum())
    _add("trips_over_seats", "all", n_over, "trips", len(t),
         f"{n_over} of {len(t)} trips carried more passengers than seats",
         "trips where max load across stop visits exceeds the bus seat count")
    _add("trips_under_third_full", "all", n_under, "trips", len(t),
         f"{n_under} of {len(t)} trips never filled a third of their seats",
         "trips where max load is below one-third of the bus seat count")

    for rid, g in t.groupby("route_id"):
        n_ov = int((g["peak_load"] > g["seats"]).sum())
        if n_ov > 0:
            _add("over_seats_by_route", rid, n_ov, "trips", len(g),
                 f"Route {rid}: {n_ov} of {len(g)} trips ran over capacity",
                 "count of trips where peak load exceeds seats, by route")

    for hour, g in t.groupby("start_hour"):
        n_ov = int((g["peak_load"] > g["seats"]).sum())
        if n_ov > 0:
            _add("over_seats_by_hour", hour, n_ov, "trips", len(g),
                 f"Hour {hour:02d}: {n_ov} of {len(g)} trips ran over capacity",
                 "count of trips where peak load exceeds seats, grouped by start hour")

    # -- (d) seat use by bus type, over-seats in 16-19 band --------------------
    for btype, g in t.groupby("bus_type"):
        mean_use = float(g["seat_use"].mean())
        n_t = len(g)
        _add("seat_use_by_bus_type", btype, round(mean_use, 4), "share", n_t,
             f"{btype}: average seat use at trip peak was {mean_use:.1%} (n={n_t} trips)",
             "mean of peak_load / seats, grouped by bus type")

    # Over-seats by route in 16-19 band
    t_eve = t[(t["sched_start"] >= 16 * 3600) & (t["sched_start"] < 19 * 3600)]
    if len(t_eve):
        for rid, g in t_eve.groupby("route_id"):
            n_ov = int((g["peak_load"] > g["seats"]).sum())
            if n_ov > 0:
                _add("over_seats_route_1619", rid, n_ov, "trips", len(g),
                     f"Evening peak, route {rid}: {n_ov} of {len(g)} trips ran over capacity",
                     "trips where peak load exceeds seats, 16:00-19:00 only")

    # Off-peak trips under 20% full (before 06 and after 19) with scheduled hours
    off_peak = t[(t["sched_start"] < 6 * 3600) | (t["sched_start"] >= 19 * 3600)]
    under_20 = off_peak[off_peak["seat_use"] < 0.20]
    sched_hours = float(under_20["sched_run"].sum() / 3600)
    _add("offpeak_under_20pct_full", "all", len(under_20), "trips", len(off_peak),
         f"{len(under_20)} off-peak trips (before 06:00 or after 19:00) ran with less than "
         f"20% of seats filled, totalling {sched_hours:.1f} scheduled bus-hours",
         "off-peak trips where seat_use < 0.2; scheduled_hours = sum of sched_run / 3600")

    # Empty stop visits
    nobody = int(((v["on"] + v["off"]) == 0).sum())
    total = len(v)
    _add("empty_stop_visits", "all", round(nobody / max(total, 1), 4), "share", total,
         f"{nobody} of {total} stop visits had nobody boarding or alighting "
         f"({nobody / max(total, 1):.1%})",
         "stop visits where on equals zero and off equals zero")

    # Busiest stop-quarters
    bq = (v.assign(bin_start=(v["sched_arr"] // 900 * 900).astype(int))
            .groupby(["route_id", "stop_id", "direction", "bin_start"], observed=True)["on"]
            .sum().reset_index().rename(columns={"on": "boardings"}))
    for _, r in bq.nlargest(5, "boardings").iterrows():
        h = int(r["bin_start"]) // 3600; m = (int(r["bin_start"]) % 3600) // 60
        _add("busiest_stop_quarter", f"{r['route_id']}/{r['stop_id']}",
             int(r["boardings"]), "boardings", 1,
             f"Stop {r['stop_id']} on route {r['route_id']} at "
             f"{h:02d}:{m:02d}: {int(r['boardings'])} boardings in 15 minutes",
             "highest 15-minute boarding counts at any stop on any route")

    # -- trip_running_time: per-trip human-readable table ----------------------
    trip_running_time = t[[
        "trip_id", "route_id", "bus_type", "seats",
        "start_hour", "band",
        "sched_run", "act_run", "start_late", "end_late",
        "peak_load", "boardings", "seat_use",
    ]].copy()
    # convert seconds to minutes where useful
    trip_running_time["sched_run_min"] = (trip_running_time["sched_run"] / 60).round(1)
    trip_running_time["act_run_min"]   = (trip_running_time["act_run"] / 60).round(1)
    trip_running_time["start_late_min"] = (trip_running_time["start_late"] / 60).round(1)
    trip_running_time["end_late_min"]   = (trip_running_time["end_late"] / 60).round(1)
    trip_running_time["seat_use_pct"] = (trip_running_time["seat_use"] * 100).round(1)
    # drop raw seconds columns to keep it tidy
    trip_running_time = trip_running_time.drop(
        columns=["sched_run", "act_run", "start_late", "end_late", "seat_use"])

    return {
        "insights": pd.DataFrame(rows),
        "trip_running_time": trip_running_time,
    }


# ---------------------------------------------------------------------------
# stage 3: forecast  (the heavy stage — runs LightGBM)
# ---------------------------------------------------------------------------

def forecast(day, fixture=True):
    """Run the full model and return forecast tables as DataFrames.

    Also returns _bundle (the complete bundle dict) for use by gap, decisions
    and publish without re-running the model.
    """
    from model.run import build, _clean

    bundle = build(day, fixture=fixture)

    # forecast_boardings: flat table from route-level series
    fb_rows = []
    for s in bundle.get("forecast/boardings-route.json", {}).get("series", []):
        for r in s["rows"]:
            fb_rows.append({"route_id": s["id"], **r})
    forecast_boardings = pd.DataFrame(fb_rows)

    # forecast_lateness: flat table from delay-route series (may be absent)
    fl_rows = []
    delay_file = bundle.get("forecast/delay-route.json", {})
    for s in delay_file.get("series", []):
        for r in s["rows"]:
            fl_rows.append({"route_id": s["id"], **r})
    forecast_lateness = pd.DataFrame(fl_rows)

    # model_metrics: flat table of results
    mm_rows = []
    for target in bundle.get("metrics.json", {}).get("targets", []):
        for r in target.get("results", []):
            mm_rows.append({
                "target": target["target"], "level": target["level"],
                "chosen": target.get("chosen"), "best_naive": target.get("best_naive"),
                **r,
            })
    model_metrics = pd.DataFrame(mm_rows)

    # feature_importance: from stop-level target
    fi_rows = []
    for target in bundle.get("metrics.json", {}).get("targets", []):
        if target.get("level") == "stop":
            for f in target.get("features", []):
                fi_rows.append({"target": "boardings_stop", **f})
    feature_importance = pd.DataFrame(fi_rows)

    return {
        "forecast_boardings": forecast_boardings,
        "forecast_lateness": forecast_lateness,
        "model_metrics": model_metrics,
        "feature_importance": feature_importance,
        "_bundle": bundle,
    }


# ---------------------------------------------------------------------------
# stage 4: gap
# ---------------------------------------------------------------------------

def gap(bundle):
    """Extract the seat gap table from the bundle.

    Returns seat_gap: one row per route/direction/hour with over, spare, index.
    """
    gap_data = bundle.get("gap.json", {})
    rows = gap_data.get("rows", [])
    seat_gap = pd.DataFrame(rows) if rows else pd.DataFrame(
        columns=["route_id", "direction", "hour_start", "trips",
                 "seats_offered", "forecast_peak_load", "over", "spare", "index"])
    return {"seat_gap": seat_gap}


# ---------------------------------------------------------------------------
# stage 5: decisions
# ---------------------------------------------------------------------------

def decisions(bundle):
    """Extract decisions, vehicle swaps and passenger offers from the bundle.

    Returns decisions_table, vehicle_swaps, passenger_offers as flat DataFrames.
    """
    dec_list = bundle.get("decisions.json", {}).get("decisions", [])

    # decisions_table: one row per decision
    dt_rows = []
    for d in dec_list:
        dt_rows.append({
            "id": d.get("id"), "lever": d.get("lever"), "title": d.get("title"),
            "confidence": d.get("confidence"), "why": d.get("why"),
            "passengers_affected": d.get("passengers_affected"),
            "cost_note": d.get("cost_note"),
            "route_id": (d.get("where") or {}).get("route_id"),
        })
    decisions_table = pd.DataFrame(dt_rows)

    # vehicle_swaps: one row per swap pair
    swap_rows = []
    for d in dec_list:
        for sw in d.get("swaps", []):
            swap_rows.append({
                "decision_id": d.get("id"),
                "from_route": sw["from"]["route_id"], "from_trip": sw["from"]["trip_id"],
                "from_vehicle": sw["from"]["vehicle"], "from_seats": sw["from"]["seats"],
                "to_route": sw["to"]["route_id"], "to_trip": sw["to"]["trip_id"],
                "to_vehicle": sw["to"]["vehicle"], "to_seats": sw["to"]["seats"],
            })
    vehicle_swaps = pd.DataFrame(swap_rows)

    # passenger_offers: one row per offer
    offer_rows = []
    for d in dec_list:
        for o in d.get("offers", []):
            offer_rows.append({
                "decision_id": d.get("id"),
                "kind": o.get("kind"), "route_id": o.get("route_id"),
                "stop_id": o.get("stop_id"), "depart": o.get("depart"),
                "walk_metres": o.get("walk_metres"), "extra_minutes": o.get("extra_minutes"),
                "points": o.get("points"),
            })
    passenger_offers = pd.DataFrame(offer_rows)

    return {
        "decisions_table": decisions_table,
        "vehicle_swaps": vehicle_swaps,
        "passenger_offers": passenger_offers,
    }


# ---------------------------------------------------------------------------
# stage 6: publish
# ---------------------------------------------------------------------------

def publish(bundle, write_file):
    """Write every bundle file through write_file(name, text).

    write_file is called with the relative path (e.g. "meta.json",
    "forecast/boardings-route.json") and the JSON text as a string.
    The caller supplies this function so the stage works both inside Dataiku
    (where the caller writes to a managed folder) and in tests (where it writes
    to a local directory).
    """
    import json

    def _clean(x):
        if isinstance(x, dict):
            return {str(k): _clean(v) for k, v in x.items()}
        if isinstance(x, (list, tuple)):
            return [_clean(v) for v in x]
        if isinstance(x, (np.integer,)):
            return int(x)
        if isinstance(x, (float, np.floating)):
            return None if x != x else float(x)
        if isinstance(x, np.bool_):
            return bool(x)
        return x

    for name, content in bundle.items():
        small = name.startswith(("forecast/", "replay/route-"))
        sep = (",", ":") if small else None
        text = json.dumps(_clean(content), ensure_ascii=False, sort_keys=True,
                          allow_nan=False, **({} if sep is None else {"separators": sep,
                                                                       "indent": None if sep else 1}))
        write_file(name, text + "\n")


# ---------------------------------------------------------------------------
# pickle helpers (used by recipes and tests)
# ---------------------------------------------------------------------------

def dump(obj):
    """Serialise obj to bytes."""
    return pickle.dumps(obj, protocol=4)


def load_bytes(data):
    """Deserialise bytes back to an object."""
    return pickle.loads(data)
