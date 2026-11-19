"""Congestion proxy from average speed by bus route and hourly band.

Data source: opendata/public/bus-avg-speed-by-route-hour.csv
  Average Speed of Buses for Each Line, RTA via data.dubai (Open Data Licence, fetched 2026-11-18).
  One row per (route_name, time_period) pair; avg_speed_kmh is the mean across all readings.

speed_index(route, period) returns a dict:
  index       float   route's speed in that period / its own mean speed across all periods.
                      A value below 1 means the route is slower than its own average: more congested.
                      A value above 1 means it is faster: less congested.
  fallback    bool    True when the network value was substituted because the route is not in the CSV.
  fallback_reason str or None
  n_readings  int     total readings that went into avg_speed_kmh for this (route, period) cell.
  n_route     int     number of valid time-period rows for this route.

network_speed_index(period) returns the same dict for the whole network (all routes pooled).

The malformed time-period band ':00 - 15:00' that appears in the source as a data artefact is
excluded when the CSV is loaded.

All functions accept an optional _df keyword argument to inject a DataFrame for testing.
"""
import os
import pandas as pd

MALFORMED_BAND = ":00 - 15:00"   # source artefact; excluded on load

_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "opendata", "public",
                    "bus-avg-speed-by-route-hour.csv")
_CACHE = None


def _load(path=None):
    df = pd.read_csv(path or _CSV,
                     dtype={"route_name": str, "time_period": str, "avg_speed_kmh": float, "n_readings": int})
    return df[df["time_period"] != MALFORMED_BAND].copy()


def _data(df=None):
    global _CACHE
    if df is not None:
        # Apply the same malformed-band filter even on injected DataFrames.
        return df[df["time_period"] != MALFORMED_BAND].copy()
    if _CACHE is None:
        _CACHE = _load()
    return _CACHE


def network_speed_index(period, *, _df=None):
    """Speed index for the whole network at this time period.

    Returns:
      {"index": float, "fallback": False, "fallback_reason": None, "n_readings": int, "n_route": int}
    or on no data:
      {"index": 1.0, "fallback": True, "fallback_reason": str, "n_readings": 0, "n_route": 0}
    """
    df = _data(_df)
    if df.empty:
        return {"index": 1.0, "fallback": True,
                "fallback_reason": "speed CSV is empty", "n_readings": 0, "n_route": 0}
    # Overall mean for each route (across all periods)
    route_means = df.groupby("route_name")["avg_speed_kmh"].mean()
    # Speed for each route in this period
    period_rows = df[df["time_period"] == period]
    if period_rows.empty or route_means.empty:
        return {"index": 1.0, "fallback": True,
                "fallback_reason": f"no data for period {period!r}", "n_readings": 0, "n_route": 0}
    # Compute index per route for this period, then average
    indices = []
    for _, row in period_rows.iterrows():
        rt = row["route_name"]
        if rt in route_means.index and route_means[rt] > 0:
            indices.append(row["avg_speed_kmh"] / route_means[rt])
    if not indices:
        return {"index": 1.0, "fallback": True,
                "fallback_reason": f"no valid route means for period {period!r}", "n_readings": 0, "n_route": 0}
    n_readings = int(period_rows["n_readings"].sum())
    return {"index": round(float(sum(indices) / len(indices)), 4), "fallback": False,
            "fallback_reason": None, "n_readings": n_readings, "n_route": len(indices)}


def speed_index(route, period, *, _df=None):
    """Speed index for one route at one time period.

    index = route's avg speed in that period / route's own mean speed across all periods.

    Returns a dict with keys: index, fallback, fallback_reason, n_readings, n_route.
    Falls back to the network index when the route is not in the CSV.
    """
    df = _data(_df)
    route_rows = df[df["route_name"] == route]
    if route_rows.empty:
        net = network_speed_index(period, _df=df)
        return {"index": net["index"], "fallback": True,
                "fallback_reason": f"route {route!r} not in speed CSV; using network index",
                "n_readings": 0, "n_route": 0}
    route_mean = float(route_rows["avg_speed_kmh"].mean())
    if route_mean <= 0:
        net = network_speed_index(period, _df=df)
        return {"index": net["index"], "fallback": True,
                "fallback_reason": f"route {route!r} has zero mean speed; using network index",
                "n_readings": 0, "n_route": int(len(route_rows))}
    period_row = route_rows[route_rows["time_period"] == period]
    if period_row.empty:
        net = network_speed_index(period, _df=df)
        return {"index": net["index"], "fallback": True,
                "fallback_reason": (f"route {route!r} has no data for period {period!r}; "
                                    "using network index"),
                "n_readings": 0, "n_route": int(len(route_rows))}
    spd = float(period_row.iloc[0]["avg_speed_kmh"])
    idx = round(spd / route_mean, 4)
    n = int(period_row.iloc[0]["n_readings"])
    return {"index": idx, "fallback": False, "fallback_reason": None,
            "n_readings": n, "n_route": int(len(route_rows))}
