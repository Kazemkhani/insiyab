# The contract between lanes, version 1

Four workers build this at once. They meet only through the files described here. If two lanes disagree, this file wins; if this file is wrong, the integrator (lane 1) changes it and posts the change in `coordination/lane-1.md`. Adding a key or a file does not change the contract's version. Removing or renaming one is not done.

A set of these files is a **bundle**. There are two:

| Bundle | What it is | Who writes it |
|---|---|---|
| `fixtures/` | Stand-in data: invented network, invented numbers, the same shape as the real thing. It is the engine's own output on the invented raw tables in `fixtures/raw/`, so its model table is a real model's, on invented data. Built by `python3 -m model.run --data fixtures/raw --out fixtures --plain`. | The integrator. Nobody else edits it. |
| `artifacts/` | The real results, worked out from RTA's data. Totals only, never raw rows. | Lane 1's engine, and only when `docs/REQUIREMENTS.md` section 6 says totals may leave Dataiku. |

Which bundle the public site shows is decided in `docs/LANES.md` (Deploying): stand-in data unless a mentor has said yes.

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
`target`, `level` ("route", "stop", "community"), `bin_seconds`, and `series`: each has `id` (a route, stop or community that exists) and `rows`. A stop series also has `route_id`. A row is one forecast made at one moment for one bin:

| Key | Meaning |
|---|---|
| `origin` | when the forecast was made. The model had seen nothing after this. |
| `horizon` | how far ahead, in seconds |
| `bin_start` | the bin forecast. It ends at `origin + horizon`. |
| `forecast`, `lo`, `hi` | the forecast and its interval |
| `baseline` | what the naive forecast said for the same bin. Always present: the error counter on screen needs it. |
| `actual` | what happened (null if not yet known) |

Each forecast file also names `model` (the model whose forecast it holds) and `baseline_model` (the naive forecast in `baseline`: the best one on the same rows). A stop series also has `direction` (0 or 1): one stop can be served in both directions of a route, as two series.

The delay forecast, when it exists, is `forecast/delay-route.json` with `target` "arrival_delay_seconds" and `horizon_unit` "stops": its rows carry `stops_ahead` (1, 5, 10, 20) in place of `horizon` and `bin_start`, `origin` is the second the bus left a stop, `trip_id` and `stop_id` name the trip and the stop ahead, and the rest is the same. Its entry in `metrics.json` has `target` "arrival_delay_seconds", `horizon_unit` "stops", and no MAPE or WAPE: a bus can be exactly on time or early.

### `gap.json`: where buses and passengers do not match
`bin_seconds` (3600), `index_note`, and `rows`: one for each route, direction and hour, with `route_id`, `direction`, `hour_start`, `trips`, `seats_offered`, `forecast_peak_load` (the largest load on each trip, added up), `over` (passengers above the seats, added over the trips), `spare` (seats above the largest load, added over the trips) and `index`: the Insiyab index, from 0.1 (every seat empty) to 10 (every passenger without a seat). The map is red where `over` is above zero and blue where `spare` is large.

`index_note` is one line a screen may show; `index_method` is how the score is made, for a fold. `load_kind` says whether the loads are measured or forecast, and `peak_load` holds the same number as `forecast_peak_load` while they are measured.

`totals` has `before` and `after`, each with `passenger_minutes_over_seats` and `empty_seat_km`, a `kind`, and for a simulated one its `assumption`. "Close the gaps" moves the two totals from before to after.

### `metrics.json`: the table the judges read
`targets`: each has `target`, `level`, `unit`, `split` {kind, origins, train, test}, `mape_rule` (a sentence saying over which bins MAPE is taken), `models` (each `model`, `label`, `is_baseline`), `subsets` (each `subset`, `kind`, `label`; kinds are `all`, `time_block`, `route`, `route_group`, `community_group`, `bus_type`, `direction`) and `results`. A result is one model at one horizon on one subset: `model`, `horizon`, `subset`, `n`, `mae`, `rmse`, `mape` (or null), `mape_n`, `wape`, `skill_vs` (the baseline it is compared with), `skill` (1 minus this model's MAE over the baseline's MAE).

The main table of a target is its **untouched part**: forecasts set aside at the start and scored once. Beside it a target may carry, and the engine's bundles do:

| Key | Meaning |
|---|---|
| `chosen` | the model shown first. It was chosen on the development part alone (`chosen_on`). In `models`, that model has `chosen: true`. |
| `best_naive` | the naive forecast with the lowest error on the untouched part, every horizon together |
| `tested_on` | one short sentence saying what the numbers were tested on. Show it once on any screen with a forecast number. `tested_on_more` holds the longer account, for a "sources and limits" fold. |
| `pooled` | one row a model, every horizon together: the same measures as a result, plus `skill` against `skill_vs`, `skill_measure` ("wape" or "mae") and `skill_lo`, `skill_hi`: the range the gain fell in 95 times in 100 when whole origins were drawn again and again. If the range holds zero, say so. |
| `range` | `promised` (0.9), `kept` (how often the truth fell inside the range), `kept_when_nobody_boarded`, `kept_when_somebody_boarded`, `n_nobody`, `n_somebody`, `method`. Show the two apart: a range that is only right about empty quarter-hours has not kept its promise. |
| `features` | (stop level) what the model leans on: `feature`, `label` in plain words, `share` of the model's gain. Shares add up to 1. |
| `cautions` | where a planner should not lean on the model, each with `kind` ("loses_at_horizon", "range_short", "gain_not_established") and `say`: one sentence to show beside the number it qualifies. An empty list means none. |
| `more_tables` | other tables with the same shape of `results` and `pooled`: `development` (where every choice was made: these numbers flatter the model), `other_routes` and `other_communities` (learn from four groups, forecast the fifth). Each has `table`, `note`, `split`. |

In a result, `skill_vs` is the best naive forecast **on that horizon and subset**, so it can differ from row to row. Compare a model with the naive forecast its own row names, never with the first naive forecast in the list.

The checker requires at least one baseline and one model that is not a baseline, more than one horizon, more than one kind of subset, and that RMSE is never below MAE.

### `decisions.json`: patterns turned into decisions
`decisions`: each has `id`, `lever` (one of `right_bus`, `right_time`, `right_stop`, `rewarded_choice`, `on_demand`), `title`, `where` {route_id, stop_ids, community_id}, `when` {from, to}, `evidence` (each `label`, `value`, `unit`, `source`: the file the number came from), `change` (what RTA would do, in one sentence), `effect` (each `metric`, `before`, `after`, `kind`, and for a simulated one its `assumption`), `passengers_affected`, `cost_note`, `confidence` ("high", "medium", "low"), `why` (one plain sentence built from the evidence).

An effect may carry `source`: where its assumption comes from. An assumption is a plain sentence a passenger could read, with no file path in it.

`kind` is `measured` (counted from the day's records) or `simulated` (what we expect if the change were made). A screen always shows which.

A decision whose lever is `right_bus` may also have `swaps`: the pairs of trips whose vehicles would change places. Each has `from` and `to`, and each of those has `route_id`, `trip_id`, `vehicle` (the stand-in name), `bus_type`, `seats`, `start` (the trip's first scheduled time) and `largest_load`. A printed order is built from these and from nothing else; it is still a proposal for a planner, who knows the blocks and the depots.

A decision whose lever is `rewarded_choice` also has `offers`: the choices put to the passenger. Each has `kind` ("other_route", "earlier" or "later"), `route_id`, `stop_id`, `depart`, `walk_metres`, `walk_minutes`, `extra_minutes` (how much longer the journey takes), `points`, and for an earlier or later bus `minutes_earlier` or `minutes_later`. An offer may also carry `load` and `seats`: the passengers on board and the seats when that bus left that stop on the day. The decision may carry `usual`: the full bus the offers are an alternative to, with `route_id`, `stop_id`, `depart`, `load` and `seats`. The Khutwa page is built from these. An offer with `walk_metres` above zero is never shown to a passenger who has said they cannot walk further.

### `personas.json`: the same morning from four places
`personas`: each has `id` (`planner`, `office_worker`, `site_worker`, `driver`), `title`, `label` (must say Fictional), `anchor` {route_id, stop_id, time}, and `steps`. A step has `t`, `scene` (`control_room`, `stop`, `bus`, `phone`, `street`), `say` (one sentence, at most 28 words), `kind`, `decision_id` (or null), `before`, `after`.

### `summary.json`
`headline`: each has `key`, `label`, `value`, `unit`, `kind`, `source`. The first screen shows these and nothing it worked out itself.

## The live room (for the moments in `docs/WOW.md`)

A small relay, owned by lane 1, served from the public address. It holds one room's state in memory or a small store. It never holds a name, a number or anything about a visitor: a phone is a seat number. Every page works without it.

| Call | Who | Does |
|---|---|---|
| `POST /api/room/join` | any phone | returns `{"seat": 7}` |
| `GET /api/room/state` | any page, about once a second | returns `{"phase": "waiting" or "offer" or "closed", "decision_id": "d003", "joined": 9, "accepted": 6, "declined": 1, "depot": "none" or "ringing" or "confirmed" or "declined", "at": <seconds>}` |
| `POST /api/room/answer` | a phone | `{"seat": 7, "accept": true}` |
| `POST /api/room/phase` | the presenter only (needs the presenter's code) | `{"phase": "offer"}` |
| `POST /api/room/call` | the presenter only | rings the team member's phone for the decision named; the state's `depot` follows the call |
| `POST /api/room/reset` | the presenter only | back to waiting, counts to zero |

**The presenter's code.** The three presenter calls carry the header `x-presenter-code: <code>`. The presenter types the code once on the big screen (the page keeps it in memory for that tab only, never in the address, never in storage that outlives the tab, and never in the build). A call with no code or a wrong one gets status 401 and `{"error": "presenter code needed"}` and changes nothing. Every call sends and returns JSON. `POST /api/room/join` takes an empty body. `POST /api/room/answer` returns `{"ok": true}`, and a seat's later answer replaces its earlier one. `POST /api/room/phase` takes `{"phase": "waiting" or "offer" or "closed", "decision_id": "d003"}` (the decision is optional and kept from the last call if left out) and returns the state. `POST /api/room/call` takes `{"decision_id": "d001"}` and returns the state with `depot` "ringing". `POST /api/room/reset` takes an empty body and returns the state. Any call may answer 503 when the store is unreachable: treat that as the room being absent.

A page that gets no answer within two seconds treats the room as absent: the phone offers "Show me the offer", and the big screen offers "Play it back", labelled "Played back, nobody is connected".

## Changing the contract

Ask in your own coordination file, addressed `TO LANE 1:`. The integrator changes this file, the stand-in generator and the checker in one commit, and every lane pulls before its next push.
