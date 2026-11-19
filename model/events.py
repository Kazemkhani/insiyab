"""Event planning for small events (hundreds to a few thousand people) at short notice.

plan_event(event, gap_rows, ...) estimates how many extra buses a small event needs and
identifies which route-hours to draw them from -- taking first from the route-hours with
the LOWEST normalised load at that time (the spare capacity), subject to a minimum-service
floor.

This is a planning aid for the OCC controller; it changes nothing by itself. A planner decides.

RTA'S current event planning covers large events weeks ahead by pulling buses off routes.
This module targets the other end: small events (hundreds to a few thousand people) at short
notice, which today's process cannot handle. The two descriptions are from the judging session
on 18 Nov 2026 (RTA staff).

-----

Event dict keys (all required except noted):
  stop          str or None   the nearest stop or area name (use area if no single stop)
  area          str or None   the broader area name (optional if stop is given)
  start         int           event start, seconds after midnight, service day
  end           int           event end, seconds after midnight, service day
  expected_attendance int     central estimate
  attendance_source  str      where this number came from (shown verbatim in every output row)
  attendance_low  int         low estimate
  attendance_high int         high estimate

Gap row keys (from docs/CONTRACT.md gap.json schema):
  route_id, direction, hour_start, trips, seats_offered, forecast_peak_load, over, spare, index.
  Optional: load_factor_normalised (from model.season.normalise_gap); computed here if absent.

Parameters:
  event         dict          as above
  gap_rows      list of dicts gap rows for the period around the event (caller filters by time)
  buses_needed_lo/central/hi  computed from attendance_low/expected_attendance/attendance_high
  seats_per_bus int           default 60  (a standard Dubai bus; say so in every output)
  target_load   float         default 0.80 (80% of seats; say so in every output)
  min_floor     int           default 1   minimum trips kept per route-hour after drawing buses
  month, years               for seasonal normalisation (passed to model.season.normalise_gap)

Returns a dict:
  event_summary  dict copy of the event input (so the output is self-contained)
  seats_per_bus  int
  target_load    float
  min_floor      int
  buses_needed   dict with keys lo, central, high, formula (plain-English explanation)
  draws          list of dicts, one per route-hour drawn from, ordered lowest-load-first:
    route_id, direction, hour_start, trips, seats_offered, forecast_peak_load,
    load_factor_normalised, seasonal_index_fallback,
    buses_drawn   int   buses taken from this route-hour
    trips_remaining int trips left after the draw
    at_floor bool   True if the draw was limited by the floor
    draw_reason str plain-English sentence
  total_buses_drawn int
  buses_still_needed int   central estimate minus total drawn (may be positive if supply is short)
  note  str  one sentence restating that the result is only as good as the attendance source

The result never shows raw data, never claims certainty, and always names the attendance source.
"""
import math
from model.season import normalise_gap, MIN_TRIPS

SEATS_PER_BUS_DEFAULT = 60       # standard Dubai bus; seats only (standing not verified)
TARGET_LOAD_DEFAULT   = 0.80     # 80 per cent of seats
MIN_FLOOR_DEFAULT     = 1        # minimum trips kept per route-hour


def _buses_for_attendance(attendance, seats_per_bus, target_load):
    """Return ceiling(attendance / (seats_per_bus * target_load))."""
    return math.ceil(attendance / (seats_per_bus * target_load))


def plan_event(event, gap_rows, *,
               seats_per_bus=SEATS_PER_BUS_DEFAULT,
               target_load=TARGET_LOAD_DEFAULT,
               min_floor=MIN_FLOOR_DEFAULT,
               month=12, years=(2024, 2025),
               _df_season=None):
    """Plan spare-bus allocation for a small event.

    Parameters
    ----------
    event     : dict with keys described above.
    gap_rows  : list of gap dicts for the route-hours that overlap the event window.
                If empty, buses_still_needed will equal buses_needed.central.

    Returns a dict as described in the module docstring.
    """
    att_src = event.get("attendance_source", "(no source given)")
    att_lo  = int(event["attendance_low"])
    att_cen = int(event["expected_attendance"])
    att_hi  = int(event["attendance_high"])

    b_lo  = _buses_for_attendance(att_lo,  seats_per_bus, target_load)
    b_cen = _buses_for_attendance(att_cen, seats_per_bus, target_load)
    b_hi  = _buses_for_attendance(att_hi,  seats_per_bus, target_load)

    formula = (
        f"buses needed = ceiling(attendance / (seats_per_bus x target_load)) "
        f"= ceiling(X / ({seats_per_bus} x {target_load:.0%})) = ceiling(X / {seats_per_bus * target_load:.1f}). "
        f"Seats only; standing capacity is not verified. "
        f"Attendance source: {att_src}. "
        f"This result is only as good as that number."
    )

    # Normalise gap rows to get load_factor_normalised if not already present
    eligible = [r for r in gap_rows if r.get("trips", 0) >= MIN_TRIPS]
    if eligible and "load_factor_normalised" not in eligible[0]:
        eligible = normalise_gap(eligible, month=month, years=years, _df=_df_season)
    else:
        eligible = eligible

    # Sort by ascending normalised load factor (lowest first = most spare capacity)
    # Rows with no load_factor_normalised go last (they cannot donate)
    def sort_key(r):
        lf = r.get("load_factor_normalised")
        return (1, 0) if lf is None else (0, lf)

    sortable = sorted(eligible, key=sort_key)

    # Draw buses from the sparest route-hours first, subject to the floor
    draws = []
    total_drawn = 0
    buses_still_needed = b_cen

    for row in sortable:
        if buses_still_needed <= 0:
            break
        lf = row.get("load_factor_normalised")
        if lf is None:
            continue
        trips = int(row.get("trips", 0))
        available = trips - min_floor    # buses we can remove before hitting the floor
        if available <= 0:
            continue
        take = min(available, buses_still_needed)
        at_floor = (trips - take) == min_floor
        hour = int(row["hour_start"]) // 3600 % 24
        draw_reason = (
            f"Route {row['route_id']}, direction {row['direction']}, {hour:02d}:00: "
            f"normalised load {lf:.2f} (lowest available); "
            f"drawing {take} of {trips} trips (floor: {min_floor} trip{'s' if min_floor != 1 else ''} kept"
            f"{'; floor reached' if at_floor else ''}). "
            f"Attendance source: {att_src}. Result is only as good as that number."
        )
        draws.append({
            "route_id": row["route_id"],
            "direction": row.get("direction"),
            "hour_start": row.get("hour_start"),
            "trips": trips,
            "seats_offered": row.get("seats_offered"),
            "forecast_peak_load": row.get("forecast_peak_load"),
            "load_factor_normalised": lf,
            "seasonal_index_fallback": row.get("seasonal_index_fallback"),
            "buses_drawn": take,
            "trips_remaining": trips - take,
            "at_floor": at_floor,
            "draw_reason": draw_reason,
        })
        total_drawn += take
        buses_still_needed -= take

    note = (
        f"The number of buses needed ({b_cen} central, range {b_lo} to {b_hi}) "
        f"is based on the attendance estimate from: {att_src}. "
        f"This result is only as good as that estimate."
    )

    return {
        "event_summary": dict(event),
        "seats_per_bus": seats_per_bus,
        "target_load": target_load,
        "min_floor": min_floor,
        "buses_needed": {"lo": b_lo, "central": b_cen, "high": b_hi, "formula": formula},
        "draws": draws,
        "total_buses_drawn": total_drawn,
        "buses_still_needed": max(0, buses_still_needed),
        "note": note,
    }
