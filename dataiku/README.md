# The Insiyab Dataiku Flow

The Flow answers a single question: on 15 December 2025, where did Dubai bus
seats and bus passengers fail to match — and what should change?  It does this
in six stages, top-down from the raw data to the decisions the site shows.

## Stages

**1. Raw data** (read from project DATA)

Five datasets arrive as text: nol smart-card taps, AVL stop visits, the fleet
list, community boundaries, and the GTFS network files.  Nothing is changed
here; they are shared from the DATA project and are read-only.

**2. Prepare** (`recipes/prepare.py`)

Cleans the five tables, resolves taps to trips, reconstructs loads along each
trip, and counts boardings by stop, route, direction and quarter of an hour.
Outputs: `stop_visits`, `boardings_quarter`, `prepare_log`, `vehicle_attributes`.
No card, device or driver identifier leaves this stage.  Vehicles are renamed
v1, v2, … from the first use.

**3. Insights** (`recipes/insights.py`)

Computes headline facts from `stop_visits`.  Outputs:
- `insights` — one row per fact with n, value, plain-English sentence and
  method note; covers lateness by vehicle model-year band, bus type,
  manufacturer (reported whichever way the data comes out, with Mann-Whitney U
  p-value), and an explicit "routes are not controlled for" note on every
  association; trips over and under capacity by route and hour; running-time
  band shares (trips 10%+ longer than scheduled; trips finishing 5+ minutes
  late); knock-on delay counts and median scheduled layover by time band; seat
  use by bus type; over-seats by route in the evening peak; off-peak trips
  under 20% full with their scheduled bus-hours; share of empty stop visits;
  the five busiest stop-quarters.
- `trip_running_time` — one row per trip: route, bus type, time band, scheduled
  and actual run in minutes, start and end lateness in minutes, peak load,
  boardings and seat-use percentage.  Never vehicle, driver or card identifiers.

**4. Forecast** (`recipes/forecast.py`)

The heavy stage.  Loads the prepared day dict (from the state managed folder),
runs a plain count model (GLM) and a LightGBM boosted-trees model using
rolling-origin cross-validation, scores both against naive forecasts, and
builds the full bundle.  Outputs: `forecast_boardings`, `forecast_lateness`,
`model_metrics`, `feature_importance`.  Also pickles the complete bundle to
`state/bundle.pkl` so later stages do not retrain.

**5. Decisions** (`recipes/decisions.py` and `recipes/gap.py`)

Reads the bundle and extracts the gap table and the decision set.  Every effect
is marked measured or simulated, with its assumption.  Outputs: `seat_gap`,
`decisions_table`, `vehicle_swaps`, `passenger_offers`.

**6. Publish** (`recipes/publish.py`)

Writes every contract file (see `docs/CONTRACT.md`) as JSON to the managed
folder `bundle`.  Run `python3 tools/contract_check.py <local copy>` on the
downloaded files to verify.

## How to rebuild

1. Run `python3 dataiku/pack.py` on a machine with the repository.  It writes
   `dist/insiyab_dataiku.zip` and prints the bootstrap cell text.
2. Upload the zip to the Dataiku managed folder called `uploads`.
3. Open a notebook in project INSIYAB, paste the bootstrap cell text, and run it.
4. The Flow and all recipes appear.  Trigger a build of `publish` to run everything.

The whole pipeline takes about 3 minutes on the 1.26 M-row fixture and an
estimated 15 to 25 minutes on the full 1.06 M-row real data with 40 routes,
based on a 157 s / 1.8 GB measurement at 40 routes with LightGBM (see the
report for the basis of this estimate).
