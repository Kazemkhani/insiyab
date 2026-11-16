# The contract between lanes, version 1

Four workers build this at once. They meet only through the files described here. If two lanes disagree, this file wins; if this file is wrong, the integrator (lane 1) changes it, bumps nothing silently, and posts the change in `COORDINATION.md`.

A set of these files is a **bundle**. There are two:

| Bundle | What it is | Who writes it |
|---|---|---|
| `fixtures/` | Stand-in data: invented network, invented numbers, the same shape as the real thing. Built by `python3 tools/make_fixture.py`. | The integrator. Nobody else edits it. |
| `artifacts/` | The real results, worked out from RTA's data. Totals only, never raw rows. | Lane 1's engine, and only when `docs/REQUIREMENTS.md` section 6 says totals may leave Dataiku. |

`python3 tools/contract_check.py <bundle>` checks a bundle. A screen may rely on anything that program checks, and on nothing else.

## Rules for every file

- JSON, UTF-8. Keys in lower case with underscores.
- Every file has `"fixture": true` or `"fixture": false` at the top, and every file in one bundle says the same. A screen that loads a bundle with `"fixture": true` shows, on every screen, **STAND-IN DATA, NOT A RESULT**. The public build must never mix the two.
- Times are whole seconds after midnight, Dubai time, on the service day. A trip that runs past midnight goes above 86400, as in GTFS.
- Counts are whole numbers. Forecasts are numbers with at most two decimal places. Shares are between 0 and 1 (0.18, not 18).
- Identifiers are text. A vehicle is named by a stand-in (`v1`, `v2`...), never by its body number. No card, device or driver identifier appears anywhere.
- A missing value is `null`, never 0 and never an empty string.
- A screen ignores keys it does not know. A lane may add a key; it may not remove or rename one.

## The files

### `meta.json`
`contract_version` (1), `fixture`, `service_date` ("2025-12-15"), `generated_at`, `commit`, `bin_seconds` (900), `origins` (the times at which a forecast was made), `horizons_seconds` (for example 900, 1800, 3600, 7200), `counts` {routes, stops, trips, stop_visits, boardings}, `notes`.

### `network.json`: the plan
- `communities`: `community_id`, `name_en`, `name_ar`, `centroid` [lon, lat].
- `stops`: `stop_id`, `name`, `lon`, `lat`, `community_id` (or null).
- `routes`: `route_id`, `short_name`, `long_name`, `directions`: each has `direction` (0 or 1), `stops` (stop ids in order) and `shape` (a list of [lon, lat]).
- `fleet_types`: `bus_type`, `seats`.

### `replay/index.json` and `replay/route-<route_id>.json`: the day as it happened
The index lists `route_id`, `file`, `trips`. Each route file has `trips`: `trip_id`, `direction`, `vehicle`, `bus_type`, `seats`, `model_year`, and `visits` in order. A visit has `stop_id`, `seq`, `sched_arr`, `act_arr`, `sched_dep`, `act_dep`, `door_opened` (true or false), `on`, `off`, `load` (people on board when the bus leaves).

The checker requires: a bus leaves after it arrives and reaches the next stop later; `load` equals the load before, less `off`, plus `on`.

### `forecast/boardings-route.json`, `forecast/boardings-stop.json` (and later `boardings-community.json`, `delay-route.json`)
`target`, `level` ("route", "stop", "community"), `bin_seconds`, and `series`: each has `id` and `rows`. A row is one forecast made at one moment for one bin:

| Key | Meaning |
|---|---|
| `origin` | when the forecast was made. The model had seen nothing after this. |
| `horizon` | how far ahead, in seconds |
| `bin_start` | the bin forecast. It ends at `origin + horizon`. |
| `forecast`, `lo`, `hi` | the forecast and its interval |
| `baseline` | what the naive forecast said for the same bin |
| `actual` | what happened (null if not yet known) |

### `metrics.json`: the table the judges read
`targets`: each has `target`, `level`, `unit`, `split` {kind, origins, train, test}, `mape_rule` (a sentence saying over which bins MAPE is taken), `models` (each `model`, `label`, `is_baseline`), `subsets` (each `subset`, `kind`, `label`; kinds are `all`, `time_block`, `route`, `route_group`, `community_group`, `bus_type`, `direction`) and `results`. A result is one model at one horizon on one subset: `model`, `horizon`, `subset`, `n`, `mae`, `rmse`, `mape` (or null), `mape_n`, `wape`, `skill_vs` (the baseline it is compared with), `skill` (1 minus this model's MAE over the baseline's MAE).

The checker requires at least one baseline and one model that is not a baseline, more than one horizon, more than one kind of subset, and that RMSE is never below MAE.

### `decisions.json`: patterns turned into decisions
`decisions`: each has `id`, `lever` (one of `right_bus`, `right_time`, `right_stop`, `rewarded_choice`, `on_demand`), `title`, `where` {route_id, stop_ids, community_id}, `when` {from, to}, `evidence` (each `label`, `value`, `unit`, `source`: the file the number came from), `change` (what RTA would do, in one sentence), `effect` (each `metric`, `before`, `after`, `kind`, and for a simulated one its `assumption`), `riders_affected`, `cost_note`, `confidence` ("high", "medium", "low"), `why` (one plain sentence built from the evidence).

`kind` is `measured` (counted from the day's records) or `simulated` (what we expect if the change were made). A screen always shows which.

### `personas.json`: the same morning from four places
`personas`: each has `id` (`planner`, `office_worker`, `site_worker`, `driver`), `title`, `label` (must say Fictional), `anchor` {route_id, stop_id, time}, and `steps`. A step has `t`, `scene` (`control_room`, `stop`, `bus`, `phone`, `street`), `say` (one sentence, at most 28 words), `kind`, `decision_id` (or null), `before`, `after`.

### `summary.json`
`headline`: each has `key`, `label`, `value`, `unit`, `kind`, `source`. The first screen shows these and nothing it worked out itself.

## Changing the contract

Post the proposed change in `COORDINATION.md` first. The integrator changes this file, the fixture generator and the checker in one commit, and every lane pulls before its next push.
