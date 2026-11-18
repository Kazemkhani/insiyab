# Stream D: the watchers, overflow, heat, lanes and events (Mustafo, Claude session 2)

Paste below into Claude Code opened in a SECOND clone (`git clone ... ~/dev/insiyab-watchers`, then `bash scripts/install-hooks.sh`). Never share a folder with session C.

---

You turn "Insiyab sees it coming" into alerts the console can show. Each watcher reads one kind of signal and raises one kind of alert. None of them decides anything.

## Read first
1. `CLAUDE.md`, `docs/RULES.md`, `docs/DATA.md`
2. `docs/v2/STRATEGY.md` sections 4, 5, 7; **`docs/v2/CONTRACT-V2.md`** (your output format); `docs/v2/FACTS.md`
3. `opendata/README.md`, `opendata/public/bus-stops.csv` and `bus-network.source.md` (the `stop_kind` field: `pole`, `ac_shelter`, empty = unknown, never "no shelter"), `opendata/public/bus-avg-speed-by-route-hour.csv`, the weather and calendar files in `opendata/`

## You own
`watchers/` (new Python package), `opendata/`, `fixtures/watchers/`, `artifacts/watchers/`, `tests/test_watchers*.py`, `coordination/v2-D.md`.

## First hour (stream A is waiting on this)
Write `fixtures/watchers/alerts.json` exactly in the contract's format with `"fixture": true` and six alerts, one per watcher, using route 310 at 19:23 as the critical one. Push it and tell stream A in `coordination/v2-D.md`.

## Then build, in order
1. **Running late** (`watchers/running_late.py`): from stream C's lateness forecast and the bus-still-out signal, flag departures likely 5+ min late, with the model's range. Evaluate on the held-out part: of flagged departures, how many were late (precision), and of late ones, how many were flagged (recall). Report both.
2. **Overflow** (`watchers/overflow.py`): boarding forecast versus seats on the vehicle type (fleet list aggregates). `evidence.kind = "estimate"` always, with the range: the boarding model's gain range includes zero, so never call it proven.
3. **Heat** (`watchers/heat.py` + `artifacts/watchers/heat_stops.json`): priority = forecast wait x exposure (pole 1.0, ac_shelter 0.3, unknown 0.7) x max(0, feels-like minus 32). Feels-like from temperature and humidity (state the formula). December 2025 was mild, so produce a **labelled July scenario** (a typical July hour from Open-Meteo history for Dubai, cited) and never present it as the recorded day. Map-ready: stop id, name, lat, lon, kind, priority.
4. **Lanes and roads** (`watchers/lanes.py`): a hand-made list (with sources) of the dedicated bus lane streets (Khalid Bin Al Waleed St open; Naif, Al Satwa, Omar Bin Al Khattab, Al Nahda, 2nd December, Sheikh Sabah Al Ahmad St in progress: Khaleej Times, 21 Jun 2026) matched to the GTFS routes that use them; output "forecast flagged for review on these routes when a lane opens". Use the open-data speeds by route and hour as context. Label it a rule, not a model.
5. **Events** (`watchers/events.py`): a small cited list of recurring Dubai events that move bus demand (Global Village routes, Dubai Run, Eid services) with venue coordinates and nearest stops; simulated alerts where no data exists, labelled.
6. **Connections and last mile** (`watchers/connections.py`): for a predicted-late bus, find the next metro departure at its terminus or transfer stop (public GTFS / RTA timetable; stand-in where no data) and raise "riders will miss the HH:MM metro: hold the feeder N min, or send a Bus On Demand minibus". Also a planner list: the route-hours whose boardings are lowest (from the boarding forecast, with its range) as candidates for Bus On Demand, citing TCRP that on-demand is cheaper only at low demand. Label both `rule`/`proposal`.
7. **Write `artifacts/watchers/alerts.json`** from all six, real where real, labelled where not.

## Stretch, only after 1 to 7 pass the gates
**Shade-aware walking routes** (the founder's idea): for 3 busy stops, compute sun azimuth and elevation for a July afternoon (`pvlib` or the NOAA formulas) and building shadows from OpenStreetMap footprints (ODbL; credit it), and draw the shaded path from a nearby landmark to the stop. Static, labelled "2030 vision prototype".

## Checks
`uv run pytest tests/test_watchers*.py`, `bash scripts/gates.sh`. Raw RTA rows never leave the machine; only aggregates and alerts.

## Done means
`artifacts/watchers/alerts.json` and `heat_stops.json` exist and pass the gates, running-late precision and recall are reported, every alert carries its `evidence.kind`, and streams A and B know (`coordination/v2-D.md`).
