"""OCC (Operations Control Centre) standby placement: priority queue for spare bus dispatch.

Wraps model.season.standby_placement and adds congestion (from model.congestion.speed_index)
and lateness (where the caller provides it in the gap rows).

OCC WORKLOAD CONSTANTS
  Source: RTA staff, 18 Nov 2026, said in the judging session.
  CONTROLLERS_PER_SHIFT = 6
  BUSES_ON_NETWORK      = 1400   (approximate; "about 1,400 buses")
  BUSES_PER_CONTROLLER  = 1400 / 6  = 233 (rounded up: each controller watches about 233 buses)

occ_standby(rows, n, month, years, *, _df_season, _df_speed) returns the top n route-hours
  as a placement proposal for a planner. Priority is:

    priority = load_factor_normalised
                 * congestion_weight(speed_index)
                 * lateness_weight(avg_delay_seconds)

  where:
    congestion_weight(si) = clamp(2.0 - si, 0.5, 2.0)
      A route running at half its normal speed (si=0.5) gets weight 1.5.
      A route running 50% faster than normal (si=1.5) gets weight 0.5.
      A missing speed index falls back to weight 1.0 (via the network index).
    lateness_weight(d) = 1.0 + clamp(d / MAX_DELAY_S, 0, 1)
      A route-hour with avg_delay_seconds >= MAX_DELAY_S gets weight 2.0.
      Zero delay gives weight 1.0. Missing or negative gives weight 1.0.
    MAX_DELAY_S = 300  (5 minutes average lateness caps the weight at 2.0)

  Every returned row contains:
    All season.standby_placement fields, plus:
    speed_index, speed_index_fallback, speed_index_reason, congestion_weight,
    avg_delay_seconds (from input or None), lateness_weight, priority, occ_reason.

  It is a proposal for a planner; it changes nothing by itself. A planner decides.

  gap rows are expected to have at least: route_id, direction, hour_start, trips,
  seats_offered, forecast_peak_load, over, spare, index.
  Optional: avg_delay_seconds (average arrival lateness in seconds for this route-hour group).

  The speed CSV period for an hour_start is derived as "HH:00 - HH+1:00" (e.g. hour_start=28800
  -> "08:00 - 09:00"; hour_start=82800 -> "23:00 - 00:00").
"""
import math

from model.season import normalise_gap, MIN_TRIPS
from model.congestion import speed_index as _speed_index

# ---------------------------------------------------------------------------
# OCC workload constants
# Source: RTA staff, 18 Nov 2026, said in the judging session.
# ---------------------------------------------------------------------------
CONTROLLERS_PER_SHIFT = 6
BUSES_ON_NETWORK = 1400          # "about 1,400 buses"
BUSES_PER_CONTROLLER = math.ceil(BUSES_ON_NETWORK / CONTROLLERS_PER_SHIFT)   # 234
OCC_SOURCE = "RTA staff, 18 Nov 2026, said in the judging session"

MAX_DELAY_S = 300.0   # 5 minutes average lateness caps the lateness weight at 2.0


def _hour_to_period(hour_start_seconds):
    """Convert hour_start (seconds after midnight) to the speed CSV's time_period string."""
    h = int(hour_start_seconds) // 3600 % 24
    h_next = (h + 1) % 24
    return f"{h:02d}:00 - {h_next:02d}:00"


def _congestion_weight(si):
    """Translate a speed index into a congestion weight for the priority score."""
    raw = 2.0 - si
    return max(0.5, min(2.0, raw))


def _lateness_weight(avg_delay_seconds):
    """Translate average delay (seconds) into a lateness weight.  Missing or negative -> 1.0."""
    if avg_delay_seconds is None or avg_delay_seconds < 0:
        return 1.0
    fraction = min(1.0, avg_delay_seconds / MAX_DELAY_S)
    return 1.0 + fraction


def occ_standby(rows, n=3, month=12, years=(2024, 2025), *,
                _df_season=None, _df_speed=None):
    """Rank route-hour groups by combined priority and return the top n as a placement proposal.

    Parameters
    ----------
    rows   : list of dicts with at least route_id, direction, hour_start, trips,
             seats_offered, forecast_peak_load, over, spare, index.
             Optional key: avg_delay_seconds (float, seconds).
    n      : number of route-hours to return.
    month  : month number for seasonal normalisation (1-12).
    years  : years to use for seasonal normalisation.

    Returns a list of at most n dicts, sorted by descending priority.
    Each dict contains all season.normalise_gap fields plus the OCC fields above.
    """
    eligible = [r for r in rows if r.get("trips", 0) >= MIN_TRIPS]
    normed = normalise_gap(eligible, month, years, _df=_df_season)

    scored = []
    for row in normed:
        lf_norm = row.get("load_factor_normalised")
        if lf_norm is None:
            continue
        period = _hour_to_period(row["hour_start"])
        si_result = _speed_index(row["route_id"], period, _df=_df_speed)
        cw = _congestion_weight(si_result["index"])
        delay = row.get("avg_delay_seconds", None)
        lw = _lateness_weight(delay)
        priority = round(lf_norm * cw * lw, 6)
        hour = int(row["hour_start"]) // 3600 % 24
        fallback_note = ""
        if si_result["fallback"]:
            fallback_note = f" (speed fallback: {si_result['fallback_reason']})"
        delay_note = ""
        if delay is not None:
            delay_note = f"; average lateness {delay:.0f}s"
        occ_reason = (
            f"Route {row['route_id']}, direction {row['direction']}, {hour:02d}:00: "
            f"normalised load {lf_norm:.2f} x congestion weight {cw:.2f} "
            f"(speed index {si_result['index']:.3f}{fallback_note}) "
            f"x lateness weight {lw:.2f}{delay_note} = priority {priority:.4f}; "
            f"{row['trips']} trips, {row['seats_offered']} seats offered, "
            f"peak load {row['forecast_peak_load']} passengers."
        )
        scored.append({
            **row,
            "speed_index": round(si_result["index"], 4),
            "speed_index_fallback": si_result["fallback"],
            "speed_index_reason": si_result["fallback_reason"],
            "congestion_weight": round(cw, 4),
            "avg_delay_seconds": delay,
            "lateness_weight": round(lw, 4),
            "priority": priority,
            "occ_reason": occ_reason,
        })

    ranked = sorted(scored, key=lambda r: r["priority"], reverse=True)
    return ranked[:n]
