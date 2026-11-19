# Contract v2: the files the streams meet through

Additive to `docs/CONTRACT.md`. Nothing here renames or removes a v1 key.

## `artifacts/watchers/alerts.json` (stream D writes; stream A reads)

A stand-in copy lives at `fixtures/watchers/alerts.json` with `"fixture": true`. The console must show "Stand-in alerts" whenever `fixture` is true.

```json
{
  "version": 1,
  "fixture": true,
  "service_day": "2025-12-15",
  "generated": "2026-11-19T01:00:00+04:00",
  "sources": ["RTA records 15 Dec 2025 (aggregates only)", "Open-Meteo hourly", "opendata/public/bus-stops.csv"],
  "alerts": [
    {
      "id": "late-310-1923",
      "watcher": "running_late",
      "severity": "critical",
      "raised_at": "18:53",
      "route": "310",
      "trip_departure": "19:23",
      "stop_id": null,
      "lat": 25.2048, "lon": 55.2708,
      "headline": "Route 310, 19:23: likely 13 min late",
      "why": "Its bus is still out on the previous trip; 85 in 100 such departures left 5+ min late.",
      "evidence": {"kind": "measured_model", "range_low_min": 8, "range_high_min": 17, "promise": "90 in 100"},
      "suggestion": {
        "text": "Send the standby bus at 18:55",
        "options": [
          {"id": "send_spare", "label": "Send the standby bus", "likely_effect": "Next departure close to on time", "estimate": true},
          {"id": "hold", "label": "Hold the next departure 2 minutes", "likely_effect": "Gap evens out", "estimate": true},
          {"id": "monitor", "label": "Monitor and request an update", "likely_effect": "Delay passes to the next trip", "estimate": true}
        ],
        "dss_pick": "send_spare",
        "dss_pick_is_simulated": true
      },
      "call_roles": ["driver", "depot", "station", "planning"]
    }
  ]
}
```

| Field | Rule |
|---|---|
| `watcher` | one of `running_late`, `overflow`, `heat`, `lanes_roads`, `events`, `connections` |
| `severity` | `info`, `attention`, `critical`. Only `critical` starts the escalation countdown |
| `evidence.kind` | `measured_model`, `estimate`, `priority_rule`, `simulated`. The console prints it next to the headline |
| `likely_effect` | always marked `estimate: true`; never phrased as a measured result |
| `dss_pick` | proposal only; when `dss_pick_is_simulated` is true the console says "Simulated pick: RTA's system is not connected" |
| coordinates | stop or terminus coordinates from the public GTFS / `bus-stops.csv`; never a vehicle's private position |

## `artifacts/watchers/heat_stops.json` (stream D)

```json
{"version": 1, "fixture": false, "hour": "14:00", "month": "July",
 "method": "priority = forecast wait (min) x exposure (pole 1.0, ac_shelter 0.3, unknown 0.7) x max(0, feels_like - 32)",
 "stops": [{"stop_id": "...", "name": "...", "lat": 0, "lon": 0, "stop_kind": "pole", "feels_like_c": 44, "wait_min": 18, "priority": 216}]}
```

Stop kind comes only from `opendata/public/bus-stops.csv` (`pole`, `ac_shelter`, empty = unknown, never "no shelter"). The month and hour are a scenario the console labels ("July scenario"); December 2025 was mild and must not be shown as hot.

## `artifacts/forecast/judge_pick.json` (stream C)

For the live "pick any route and hour" moment: for every route and every hour 16:00 to 20:00 on the held-out part, the forecast lateness, the naive forecast and what happened, with `n`. The console shows all three and never hides a miss.

**Exact format (agreed 19 Nov 2026).** Stream C writes `picks[]` with `route` (string), `hour` ("16:00" to "20:00"), `n`, `forecast_s`, `naive_s`, `actual_s` (seconds), plus top-level `fixture`, `service_day`, `unit`, `target`, `label`, `part`, `naive_label`. The console converts it in `live/ops/src/judge.mjs` (`normaliseJudge`) to its `rows[]` in minutes and shows `label` as the source line, so a stand-in label always reaches the screen. A producer that changes these keys must update `normaliseJudge` and its test in the same commit.

## `artifacts/forecast/scatter.json` (stream C)

The held-out evening trips: forecast error and timetable error per trip, plus the share where the forecast was closer, computed, never typed.

## Console escalation states (stream A, from Marsad's `live/adapter.js:340-405`)

`predicted` (alert raised) → `suggested` (fix and options shown) → `unacknowledged` (critical only: countdown, default 10 s on stage, configurable) → `calling_duty` (Insiyab phones the duty controller; demo mode only plays the sound) → `calling_supervisor` (no answer in 60 s: the shift supervisor) → `decided` (a person pressed Decide and confirmed) → `relaying` (parallel calls to driver, depot, station, planning) → `sent` per person → `received` per person only when that person acknowledged. Never `received` without an acknowledgement event; never `decided` without a human click.
