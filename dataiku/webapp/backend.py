# backend.py — Insiyab Dataiku standard webapp backend
#
# In Dataiku DSS the Flask `app` object is provided by the runtime.
# Do not write  app = Flask(__name__)  here.  Just use @app.route.
#
# Every endpoint returns JSON.  If a dataset is absent, empty, or missing
# an expected column the endpoint returns {"error": "<message>"} with
# HTTP 500.  Optional datasets (running_time_bands) return {"error": "..."}
# when absent; the tab shows a per-section "not built yet" note.
#
# Datasets in project INSIYAB that this backend reads:
#   Zone "Service reliability":
#     punctuality_by_hour, punctuality_by_route_hour, punctuality_by_bus_type
#   Zone "Passenger demand":
#     demand_by_hour, demand_by_route_hour, demand_by_stop
#   Zone "Supply and capacity":
#     supply_vs_demand_by_route_hour, supply_status_by_hour
#   Zone "Forecast":
#     running_time_metrics, running_time_forecast (~4700 rows, aggregated here),
#     running_time_drivers, running_time_bands (optional)

import math
from collections import defaultdict
import dataiku
from flask import jsonify, request

# Column lists fixed in code — no unexpected column can leak.
_COLS = {
    "punctuality_by_hour": [
        "hour", "late_s_avg", "late_5min_avg", "late_5min_sum",
        "early_1min_avg", "drive_through_avg", "count",
    ],
    "punctuality_by_route_hour": [
        "route", "hour", "late_s_avg", "late_5min_avg",
        "late_5min_sum", "early_1min_avg", "drive_through_avg", "count",
    ],
    "punctuality_by_bus_type": [
        "bus_type", "late_s_avg", "late_5min_avg",
        "late_5min_sum", "early_1min_avg", "drive_through_avg", "count",
    ],
    "demand_by_hour": [
        "hour", "boardings_sum", "alightings_sum", "count",
    ],
    "demand_by_route_hour": [
        "route", "hour", "boardings_sum", "alightings_sum", "count",
    ],
    "demand_by_stop": [
        "stop_id", "stop_name", "boardings_sum", "alightings_sum", "count",
    ],
    "supply_vs_demand_by_route_hour": [
        "route", "hour", "trips_run", "seats_offered", "seats_per_bus",
        "boardings", "alightings", "places_per_bus",
        "buses_needed_seated", "buses_needed_with_standing",
        "buses_short_seated", "buses_short_with_standing",
        "boardings_per_seat_offered", "status",
    ],
    "supply_status_by_hour": [
        "hour", "status", "trips_run_sum", "boardings_sum",
        "buses_short_seated_sum", "count",
    ],
    # Forecast zone
    "running_time_metrics": [
        "tested_on", "method", "trips", "mae_minutes", "rmse_minutes", "mape",
        "gain_vs_timetable", "gain_low", "gain_high",
        "gain_vs_best_simple", "best_simple_was", "learned_from", "made",
    ],
    "running_time_forecast": [
        "trip_id", "route", "direction", "hour", "band", "bus_type",
        "sched_run_min", "actual_run_min", "timetable",
        "route_history", "route_recent", "model_plan", "model_live",
    ],
    "running_time_drivers": [
        "feature", "share",
    ],
    # Planner's worklist zone (optional — may not exist on the first run)
    "running_time_bands": [
        "route", "direction", "hour", "trips", "sched_run_min",
        "actual_p50_min", "actual_p85_min", "extra_min_at_p85",
        "extra_bus_minutes_at_p85", "spare_bus_minutes_in_plan",
        "share_running_over_plan", "share_ending_5min_late", "layover_sched_min",
    ],
    "running_time_ledger_by_hour": [
        "hour", "trips_sum", "extra_bus_minutes_at_p85_sum",
        "spare_bus_minutes_in_plan_sum", "count",
    ],
}

# Columns that must stay as strings (not coerced to float/int)
_STR_COLS = {
    "route", "bus_type", "stop_id", "stop_name",
    "status", "metric", "kind", "sentence", "note",
    "trip_id", "direction", "band", "tested_on", "method",
    "best_simple_was", "learned_from", "made", "feature",
}


def _coerce(v):
    """Convert a value to int, float, or leave as-is."""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (int, float)):
        return v
    try:
        f = float(v)
        return int(f) if f == int(f) else round(f, 6)
    except (TypeError, ValueError):
        return v


def _read(name):
    """Return (records_list, error_string).  On success error_string is None."""
    cols = _COLS.get(name, [])
    try:
        df = dataiku.Dataset(name).get_dataframe()
    except Exception as exc:
        return None, f"Dataset '{name}' could not be read: {exc}"
    if df is None or df.empty:
        return None, f"Dataset '{name}' is empty."
    missing = [c for c in cols if c not in df.columns]
    if missing:
        return None, (
            f"Dataset '{name}' is missing expected columns: {missing}. "
            f"Present columns: {list(df.columns)}"
        )
    sub = df[cols].copy()
    for col in cols:
        if col not in _STR_COLS:
            sub[col] = sub[col].apply(_coerce)
    # An empty cell must reach the browser as null. Left as NaN it is not valid JSON and the whole tab fails.
    records = sub.astype(object).where(sub.notna(), None).to_dict(orient="records")
    import math
    return [{k: (None if isinstance(v, float) and not math.isfinite(v) else v) for k, v in r.items()} for r in records], None


def _err(msg):
    return jsonify({"error": str(msg)}), 500


# ── Service reliability ───────────────────────────────────────────────

@app.route("/api/punctuality-by-hour")
def punctuality_by_hour():
    rows, err = _read("punctuality_by_hour")
    if err:
        return _err(err)
    return jsonify(rows)


@app.route("/api/punctuality-by-route-hour")
def punctuality_by_route_hour():
    rows, err = _read("punctuality_by_route_hour")
    if err:
        return _err(err)
    return jsonify(rows)


@app.route("/api/punctuality-by-bus-type")
def punctuality_by_bus_type():
    rows, err = _read("punctuality_by_bus_type")
    if err:
        return _err(err)
    return jsonify(rows)


# ── Passenger demand ──────────────────────────────────────────────────

@app.route("/api/demand-by-hour")
def demand_by_hour():
    rows, err = _read("demand_by_hour")
    if err:
        return _err(err)
    return jsonify(rows)


@app.route("/api/demand-by-route-hour")
def demand_by_route_hour():
    rows, err = _read("demand_by_route_hour")
    if err:
        return _err(err)
    return jsonify(rows)


@app.route("/api/demand-by-stop")
def demand_by_stop():
    rows, err = _read("demand_by_stop")
    if err:
        return _err(err)
    # Top 15 stops by boardings_sum
    rows.sort(key=lambda r: r.get("boardings_sum") or 0, reverse=True)
    return jsonify(rows[:15])


# ── Supply and capacity ───────────────────────────────────────────────

@app.route("/api/supply-vs-demand")
def supply_vs_demand():
    rows, err = _read("supply_vs_demand_by_route_hour")
    if err:
        return _err(err)
    return jsonify(rows)


@app.route("/api/supply-status-by-hour")
def supply_status_by_hour():
    rows, err = _read("supply_status_by_hour")
    if err:
        return _err(err)
    return jsonify(rows)


# ── Forecast zone ─────────────────────────────────────────────────────

@app.route("/api/running-time-metrics")
def running_time_metrics():
    rows, err = _read("running_time_metrics")
    if err:
        return _err(err)
    return jsonify(rows)


@app.route("/api/running-time-forecast-summary")
def running_time_forecast_summary():
    """Aggregate the ~4700-row forecast table in Python before sending.

    Returns:
      by_hour  – list of {hour, trips, timetable_mae, model_mae} from h>=16
      by_route – list of {route, trips, timetable_mae, model_mae} evening only,
                 sorted descending by trips (for the route-selector default)
    """
    rows, err = _read("running_time_forecast")
    if err:
        return _err(err)

    hour_acc   = defaultdict(lambda: {"trips": 0, "tt_sum": 0.0, "mp_sum": 0.0})
    route_acc  = defaultdict(lambda: {"trips": 0, "tt_sum": 0.0, "mp_sum": 0.0})

    for r in rows:
        actual  = r.get("actual_run_min")
        if actual is None:
            continue
        h       = r.get("hour")
        route   = r.get("route") or ""
        tt      = r.get("timetable")
        mp      = r.get("model_plan")

        # hour bucket (all hours)
        ha = hour_acc[h]
        ha["trips"] += 1
        if tt is not None:
            ha["tt_sum"] += abs(actual - tt)
        if mp is not None:
            ha["mp_sum"] += abs(actual - mp)

        # route bucket (evening only h>=16, matches what the chart shows)
        if (h or 0) >= 16:
            ra = route_acc[route]
            ra["trips"] += 1
            if tt is not None:
                ra["tt_sum"] += abs(actual - tt)
            if mp is not None:
                ra["mp_sum"] += abs(actual - mp)

    by_hour = []
    for h in sorted(hour_acc):
        ha = hour_acc[h]
        t  = ha["trips"]
        by_hour.append({
            "hour":          h,
            "trips":         t,
            "timetable_mae": round(ha["tt_sum"] / t, 3) if t else None,
            "model_mae":     round(ha["mp_sum"] / t, 3) if t else None,
        })

    by_route = sorted(
        [
            {
                "route":         rte,
                "trips":         ra["trips"],
                "timetable_mae": round(ra["tt_sum"] / ra["trips"], 3) if ra["trips"] else None,
                "model_mae":     round(ra["mp_sum"] / ra["trips"], 3) if ra["trips"] else None,
            }
            for rte, ra in route_acc.items()
        ],
        key=lambda x: -(x["trips"] or 0),
    )

    return jsonify({"by_hour": by_hour, "by_route": by_route})


@app.route("/api/running-time-forecast-route")
def running_time_forecast_route():
    """Return evening trips for one validated route."""
    rows, err = _read("running_time_forecast")
    if err:
        return _err(err)

    known = {r.get("route") for r in rows if r.get("route")}
    route = request.args.get("route", "")
    if not route or route not in known:
        return _err(
            f"Unknown route {route!r}. Pass ?route=<route> with one of: "
            + ", ".join(sorted(known)[:10])
        )

    evening = [r for r in rows if r.get("route") == route and (r.get("hour") or 0) >= 16]
    evening.sort(key=lambda r: (r.get("hour") or 0, r.get("trip_id") or ""))
    return jsonify(evening)


@app.route("/api/running-time-drivers")
def running_time_drivers():
    rows, err = _read("running_time_drivers")
    if err:
        return _err(err)
    rows.sort(key=lambda r: -(r.get("share") or 0))
    return jsonify(rows)


@app.route("/api/running-time-bands")
def running_time_bands():
    """Optional dataset — returns {"error": "..."} if not built yet."""
    rows, err = _read("running_time_bands")
    if err:
        return jsonify({"error": err})
    return jsonify(rows)


@app.route("/api/running-time-ledger-by-hour")
def running_time_ledger_by_hour():
    """Optional dataset — returns {"error": "..."} if not built yet."""
    rows, err = _read("running_time_ledger_by_hour")
    if err:
        return jsonify({"error": err})
    rows.sort(key=lambda r: (r.get("hour") or 0))
    return jsonify(rows)


@app.route("/api/flow-steps")
def flow_steps():
    """Counts the Flow's own zones and steps, live, so the app never states a stale number about how it is built."""
    try:
        project = dataiku.api_client().get_default_project()
        recipes = project.list_recipes()
        code = sum(1 for r in recipes if r.get("type") in ("python", "r", "sql_query", "shell", "pyspark"))
        zones = [z.name for z in project.get_flow().list_zones() if z.name != "Default"]
        return jsonify({"steps": len(recipes), "code": code, "visual": len(recipes) - code, "zones": len(zones), "zone_names": zones})
    except Exception as e:  # shown on the page as its own sentence, never as a number
        return jsonify({"error": "The Flow could not be counted: " + str(e)[:200]})

