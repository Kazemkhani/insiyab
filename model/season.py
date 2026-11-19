"""Seasonal normalisation from the monthly passengers CSV (opendata/public/bus-passengers-by-route-monthly.csv).

seasonal_index(route, month, years) returns the route's month index: its passenger total in that month divided
by its mean across valid months, averaged over the given years. It falls back to the network index when the
route has fewer than MIN_MONTHS valid months across all given years, and the returned dict always says whether
a fallback was used (fallback: True means the network index was substituted silently would not happen here).

network_index(month, years) returns the same ratio across the whole network.

A year-month is excluded when the network total for it is below BROKEN_THRESHOLD of that year's median total.
This removes partial months such as February, March and August of 2023, which each cover about 40 per cent of a
normal month. 2024 lacks March and November; 2025 lacks September.

normalise_gap(rows, month, years) adds load_factor_raw, seasonal_index, seasonal_index_fallback and
load_factor_normalised to each row. Seats only: standing capacity is not verified.

standby_placement(rows, n, month, years) ranks route-hour groups by normalised load factor (at least MIN_TRIPS
trips) and returns the top n as a placement proposal for a planner; it changes nothing by itself.

All functions accept an optional _df keyword argument to inject a DataFrame for testing without touching the CSV.
"""
import os
import pandas as pd

BROKEN_THRESHOLD = 0.60   # a year-month whose network total is below this share of that year's median is excluded
MIN_MONTHS = 8            # a route needs at least this many valid months to have its own index; fewer falls back to network
MIN_TRIPS = 5             # a route-hour group needs at least this many trips to be ranked for standby placement

_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "opendata", "public", "bus-passengers-by-route-monthly.csv")
_CACHE = None


def _load(path=None):
    return pd.read_csv(path or _CSV, dtype={"year": int, "month": int, "passenger_trips": float})


def _data(df=None):
    global _CACHE
    if df is not None:
        return df
    if _CACHE is None:
        _CACHE = _load()
    return _CACHE


def _valid_pairs(df, years):
    """Return the set of (year, month) pairs that pass the broken-month filter for each year in years."""
    valid = set()
    for year in years:
        sub = df[df["year"] == year]
        if sub.empty:
            continue
        net = sub.groupby("month")["passenger_trips"].sum()
        threshold = float(net.median()) * BROKEN_THRESHOLD
        for month, total in net.items():
            if total >= threshold:
                valid.add((int(year), int(month)))
    return valid


def network_index(month, years=(2024, 2025), *, _df=None):
    """The network's total passengers in `month` as a multiple of its mean across valid months, averaged over `years`.

    Returns:
      {"index": float, "fallback": False, "fallback_reason": None, "valid_months": int}
    or, when no data is available:
      {"index": 1.0, "fallback": True, "fallback_reason": str, "valid_months": 0}
    """
    df = _data(_df)
    valid = _valid_pairs(df, years)
    year_indices = []
    total_valid = 0
    for year in years:
        sub = df[df["year"] == year]
        if sub.empty:
            continue
        net = sub.groupby("month")["passenger_trips"].sum()
        months_ok = [m for m in net.index if (year, int(m)) in valid]
        total_valid += len(months_ok)
        if month not in net.index or not months_ok:
            continue
        mean_ok = float(net[months_ok].mean())
        if mean_ok > 0:
            year_indices.append(float(net[month]) / mean_ok)
    if not year_indices:
        return {"index": 1.0, "fallback": True,
                "fallback_reason": "no network data for any of the given years", "valid_months": 0}
    return {"index": float(sum(year_indices) / len(year_indices)), "fallback": False,
            "fallback_reason": None, "valid_months": total_valid}


def seasonal_index(route, month, years=(2024, 2025), *, _df=None):
    """The route's passengers in `month` as a multiple of its mean across valid months, averaged over `years`.
    Falls back to the network index when the route has fewer than MIN_MONTHS valid months in total.

    Returns:
      {"index": float, "fallback": bool, "fallback_reason": str or None, "valid_months": int}
    """
    df = _data(_df)
    valid = _valid_pairs(df, years)
    year_indices = []
    total_valid = 0
    for year in years:
        sub = df[(df["year"] == year) & (df["route_name"] == route)]
        if sub.empty:
            continue
        rte = sub.set_index("month")["passenger_trips"]
        months_ok = [m for m in rte.index if (year, int(m)) in valid]
        total_valid += len(months_ok)
        if month not in rte.index or not months_ok:
            continue
        mean_ok = float(rte[months_ok].mean())
        if mean_ok > 0:
            year_indices.append(float(rte[month]) / mean_ok)
    if total_valid < MIN_MONTHS:
        net = network_index(month, years, _df=df)
        return {"index": net["index"], "fallback": True,
                "fallback_reason": (f"route has {total_valid} valid months, "
                                    f"fewer than the {MIN_MONTHS} required; using the network index"),
                "valid_months": total_valid}
    if not year_indices:
        net = network_index(month, years, _df=df)
        return {"index": net["index"], "fallback": True,
                "fallback_reason": f"no data for month {month} in the given years; using the network index",
                "valid_months": total_valid}
    return {"index": float(sum(year_indices) / len(year_indices)), "fallback": False,
            "fallback_reason": None, "valid_months": total_valid}


def normalise_gap(rows, month=12, years=(2024, 2025), *, _df=None):
    """Add seasonal normalisation fields to gap rows.

    Each row gains four new fields:
      load_factor_raw         forecast_peak_load / seats_offered  (None when seats_offered is zero)
      seasonal_index          the route's month index
      seasonal_index_fallback True when the network index was used in place of the route's own
      load_factor_normalised  load_factor_raw / seasonal_index     (None when load_factor_raw is None)

    Seats only; standing capacity is not verified.
    """
    df = _data(_df)
    cache = {}
    result = []
    for row in rows:
        rid = row["route_id"]
        if rid not in cache:
            cache[rid] = seasonal_index(rid, month, years, _df=df)
        idx = cache[rid]
        seats = row.get("seats_offered") or 0
        load = row.get("forecast_peak_load") or 0
        if seats > 0:
            raw = round(load / seats, 4)
            norm = round(raw / idx["index"], 4) if idx["index"] > 0 else None
        else:
            raw = None
            norm = None
        result.append({
            **row,
            "load_factor_raw": raw,
            "seasonal_index": round(idx["index"], 4),
            "seasonal_index_fallback": idx["fallback"],
            "load_factor_normalised": norm,
        })
    return result


def standby_placement(rows, n=3, month=12, years=(2024, 2025), *, _df=None):
    """Rank route-hour groups by normalised load factor and return the top n as a placement proposal.

    Only rows with at least MIN_TRIPS trips are considered. The result is a proposal for a planner, made days
    ahead from historic data; it changes nothing by itself. A planner decides.

    Each returned dict contains:
      route_id, direction, hour_start, trips, seats_offered, forecast_peak_load,
      load_factor_raw, seasonal_index, seasonal_index_fallback, load_factor_normalised,
      reason  (one plain-English sentence)
    """
    df = _data(_df)
    eligible = [r for r in rows if r.get("trips", 0) >= MIN_TRIPS]
    normed = normalise_gap(eligible, month, years, _df=df)
    ranked = sorted(
        (r for r in normed if r["load_factor_normalised"] is not None),
        key=lambda r: r["load_factor_normalised"],
        reverse=True,
    )
    result = []
    for row in ranked[:n]:
        hour = row["hour_start"] // 3600
        fallback_note = (" (network index used: route has too few months of data)"
                         if row["seasonal_index_fallback"] else "")
        reason = (
            f"Route {row['route_id']}, direction {row['direction']}, {hour:02d}:00: "
            f"normalised load factor {row['load_factor_normalised']:.2f} "
            f"(raw {row['load_factor_raw']:.2f} / December index {row['seasonal_index']:.3f}{fallback_note}); "
            f"{row['trips']} trips, {row['seats_offered']} seats offered, "
            f"peak load {row['forecast_peak_load']} passengers."
        )
        result.append({**row, "reason": reason})
    return result
