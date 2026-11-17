# backend.py — Insiyab Dataiku standard webapp backend
#
# In Dataiku DSS the Flask `app` object is provided by the runtime.
# Do not write  app = Flask(__name__)  here.  Just use @app.route.
#
# Every endpoint returns JSON.  If a dataset is absent, empty, or missing
# an expected column the endpoint returns {"error": "<message>"} with
# HTTP 500.  Optional datasets (forecast) return a bundle where each
# key is either a list of records or {"error": "..."}.
#
# Datasets in project INSIYAB that this backend reads:
#   Zone "Service reliability":
#     punctuality_by_hour, punctuality_by_route_hour, punctuality_by_bus_type
#   Zone "Passenger demand":
#     demand_by_hour, demand_by_route_hour, demand_by_stop
#   Zone "Supply and capacity":
#     supply_vs_demand_by_route_hour, supply_status_by_hour
#   Optional (Forecast zone, may not exist):
#     forecast_boardings, forecast_lateness, model_metrics, insights

import math
import dataiku
from flask import jsonify

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
    # Optional
    "forecast_boardings": ["hour", "boardings_forecast", "boardings_actual"],
    "forecast_lateness": ["hour", "late_5min_forecast", "late_5min_actual"],
    "model_metrics": ["metric", "value"],
    "insights": ["kind", "sentence", "value", "n", "note"],
}

# Columns that must stay as strings (not coerced to float/int)
_STR_COLS = {
    "route", "bus_type", "stop_id", "stop_name",
    "status", "metric", "kind", "sentence", "note",
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


# ── Forecast (optional) ───────────────────────────────────────────────

@app.route("/api/forecast")
def forecast():
    result = {}
    for name in ("forecast_boardings", "forecast_lateness",
                 "model_metrics", "insights"):
        rows, err = _read(name)
        result[name] = {"error": err} if err else rows
    return jsonify(result)
