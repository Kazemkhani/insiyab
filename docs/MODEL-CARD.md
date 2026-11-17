# Model card

This file is written by the engine (`python3 -m model.card`) from `metrics.json` and `meta.json`. Nothing in it is typed by hand, and the gates fail if it does not equal a fresh one.

**STAND-IN DATA, NOT A RESULT.** Every number below comes from the real engine run on invented raw tables (`fixtures/raw/`). It shows that the method runs and how its results are reported. It says nothing about Dubai's buses.

## What is forecast

| Target | Unit | Made | For |
|---|---|---|---|
| Boardings at a stop on a route, and added up by route | passengers in a quarter of an hour | every 30 minutes, 06:30 to 22:00 | 15, 30, 60, 120 minutes ahead |
| How late a bus arrives at a stop ahead of it | seconds (early is below zero) | each time a bus leaves a stop | 1, 5, 10 and 20 stops ahead |

## The data, and its one day

One service day, 2025-12-15: 9 routes, 478 stops, 796 trips, 26,915 stop visits and 11,637 boardings. Tested on one day only: Monday 15 December 2025, in the school holidays. Later hours of that day, and routes and communities the model had not seen, are what was tested. Nothing was tested on another day, and a school day may look different.

How the tables were made ready, stage by stage, with the count each stage kept:

- **Runtime report.** One row is one bus at one stop; rows with no scheduled time or no stop sequence are left out; a missing actual time takes the scheduled one; a time that ran backwards is moved up to the time before it. Counted: actual times filled from schedule 0, door not opened 9,124, latest scheduled hour 29, route numbers rewritten 0, rows in 26,915, rows out 26,915, rows placed after midnight 915, rows whose clock ran backwards 0, rows without a scheduled time 0, trips 796.
- **Fleet.** A vehicle that is not in the fleet table is given the fleet's middle number of seats and the type UNKNOWN; seats only, standing capacity is not verified. Counted: seats given to those 32, vehicles in the fleet table 93, vehicles in the runtime report 89, vehicles run but not in the fleet table 2.
- **Taps.** One row is one tap: a check-in (CKI is 1) or a check-out (CKO is 1); a row repeated exactly is counted once; a row with no time, or that is neither or both, is left out. Counted: cards counted 8,918, check ins 11,637, check outs 9,934, repeated rows 104, rows in 21,675, rows neither or both or no time 0, rows out 21,571, taps before day start dated the service day 0.
- **Taps to trips.** Placement priority: (b) tap's own Stop_Id on candidate trip, (c) time-nearest fallback; check-in at last stop offered to next trip first (stop matching Stop_Id, else first stop); check-out at first stop offered to previous trip; tap times without seconds treated as the full minute [t, t+59]. Counted: placed by stop id on next trip 0, placed by stop id on own trip 0, placed by stop id on previous trip 0, placed by time nearest fallback 21,571, placed on next trip first stop 0, share not placed 0, taps in 21,571, taps not placed 0, taps whose own stop differs from the stop placed 384.
- **Loads.** Check-ins with no check-out are alightings we do not know: they are spread over the trip's stops in proportion to its known alightings, and whoever is left alights at the last stop; nobody alights who is not on board. Counted: alightings not recorded and spread 1,703, passengers boarding at a last stop 0, share of boardings with no recorded alighting 0.1463, trips 796, trips over their seats 20, trips whose recorded load did not end at zero 552, trips whose recorded load went below zero 0.
- **Stops to places.** Each stop is put in the community whose boundary it lies inside. Counted: communities in 9, communities whose shape could be read 9, stops 478, stops outside every community 44.
- **Timetable.** Scheduled departures on the service day, by route, direction and stop. Counted: routes 9, scheduled departures 27,034, scheduled trips 799, stops served 478.
- **Bins.** Boardings are counted by stop, route, direction and quarter of an hour, at the time of the tap; between a stop's first and last scheduled departure a bin with no boarding is a true zero, and outside that span the stop is absent, not zero. Counted: bins 103, bins present 40,699, bins present with no boarding 33,046, boardings at a stop or time outside the timetable 1, boardings counted 11,636, boardings placed on a trip 11,637, series 555.

## How the test is kept honest

- **The rule of the clock.** A forecast made at an origin uses only records from strictly before it. A test changes every record after an origin and requires every forecast made by then to stay the same to the last digit.
- **Rolling origin.** At each origin the models learn from forecasts whose quarter of an hour had already ended, and forecast what comes next. For lateness the models learn only from trips that had finished, so no trip is on both sides.
- **The untouched part.** Forecasts made from 16:00 were set aside at the start and scored once. Which model to show was chosen on forecasts made from 08:00 to 15:30 for quarter-hours that had ended by 16:00. The tables below are the untouched part unless they say otherwise.
- **Other routes and other communities.** Routes, and separately communities, are put in five groups: learn from four, forecast the fifth.
- **The naive forecasts** are built from the same records and scored by the same code on the same rows. Gain is stated against the best of them, never the worst.

## Boardings by route

Unit: passengers boarding per route per 15 minutes. MAPE is taken only over quarters of an hour in which at least 5 passengers boarded, and the table says how many those were. WAPE (the total miss over the total boardings) covers every quarter of an hour, the empty ones included.

**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.

| Forecast | n | MAE | RMSE | WAPE | MAPE | Gain |
|---|---|---|---|---|---|---|
| Same as the last quarter of an hour seen (best naive) | 430 | 10.10 | 15.15 | 0.47 | 0.63 over 346 |  |
| The average so far today | 430 | 14.32 | 18.52 | 0.67 | 0.80 over 346 |  |
| In proportion to the timetable | 430 | 14.04 | 18.53 | 0.66 | 0.85 over 346 |  |
| A plain count model (Poisson regression with a penalty) | 430 | 13.95 | 18.77 | 0.65 | 0.76 over 346 | -38 in 100 (-85 to -5) against same as the last quarter of an hour seen |
| Boosted trees with a loss made for counts, one model for every stop and every horizon (chosen) | 430 | 9.30 | 13.95 | 0.44 | 0.58 over 346 | +8 in 100 (-1 to +14) against same as the last quarter of an hour seen |

**The range of the gain includes zero.** On these rows the model is not shown to beat the best naive forecast, and no screen should say it does.

**Caution.** At 120 minutes ahead the model misses by more than the naive forecast (in proportion to the timetable). Use the naive forecast that far ahead.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Gain |
|---|---|---|---|---|---|
| 15 minutes | 108 | Same as the last quarter of an hour seen | 5.20 | 4.95 | +5 in 100 |
| 30 minutes | 108 | Same as the last quarter of an hour seen | 7.58 | 6.89 | +9 in 100 |
| 60 minutes | 108 | Same as the last quarter of an hour seen | 11.43 | 10.07 | +12 in 100 |
| 120 minutes | 106 | In proportion to the timetable | 13.87 | 15.42 | -11 in 100 |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 430 | 9.50 | 9.30 | +2 in 100 |
| Evening peak, 16:00 to 20:00 | 252 | 11.06 | 11.54 | -4 in 100 |
| After 20:00 | 178 | 7.29 | 6.13 | +16 in 100 |
| Routes run mostly by buses of type COACH | 47 | 5.28 | 4.74 | +10 in 100 |
| Routes run mostly by buses of type DOUBLE | 48 | 7.19 | 7.68 | -7 in 100 |
| Routes run mostly by buses of type MIDI | 143 | 10.07 | 10.47 | -4 in 100 |
| Routes run mostly by buses of type STANDARD | 192 | 10.67 | 9.96 | +7 in 100 |
| Route group 0 | 95 | 7.49 | 7.52 | -0 in 100 |
| Route group 1 | 96 | 15.04 | 14.29 | +5 in 100 |
| Route group 2 | 96 | 7.34 | 7.84 | -7 in 100 |
| Route group 3 | 95 | 7.95 | 8.23 | -4 in 100 |
| Route group 4 | 48 | 9.01 | 7.92 | +12 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 97 in 100. When nobody boarded it held 100 in 100 times (15 quarter-hours); when somebody did, 97 in 100 (415). How it is set: set at each origin from the misses of forecasts that had already come true that day (conformal prediction, rolling), widened to whole passengers.

**Development.** Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 540 | 7.01 | 11.94 |  |
| The average so far today | 540 | 16.83 | 19.68 |  |
| In proportion to the timetable | 540 | 15.16 | 18.26 |  |
| A plain count model (Poisson regression with a penalty) | 540 | 13.77 | 19.31 | -96 in 100 (-137 to -71) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 540 | 7.89 | 14.11 | -12 in 100 (-20 to +0) |

## Boardings by stop

Unit: passengers boarding per stop per 15 minutes. MAPE is taken only over quarters of an hour in which at least 5 passengers boarded, and the table says how many those were. WAPE (the total miss over the total boardings) covers every quarter of an hour, the empty ones included.

**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.

| Forecast | n | MAE | RMSE | WAPE | MAPE | Gain |
|---|---|---|---|---|---|---|
| Same as the last quarter of an hour seen | 26,120 | 0.53 | 1.01 | 1.52 | 0.69 over 100 |  |
| The average so far today | 26,120 | 0.48 | 0.76 | 1.37 | 0.87 over 100 |  |
| In proportion to the timetable (best naive) | 26,120 | 0.47 | 0.78 | 1.33 | 0.86 over 100 |  |
| A plain count model (Poisson regression with a penalty) | 26,120 | 0.49 | 0.76 | 1.41 | 0.89 over 100 | -6 in 100 (-8 to -2) against in proportion to the timetable |
| Boosted trees with a loss made for counts, one model for every stop and every horizon (chosen) | 26,120 | 0.45 | 0.70 | 1.27 | 0.73 over 100 | +4 in 100 (-5 to +16) against in proportion to the timetable |

**The range of the gain includes zero.** On these rows the model is not shown to beat the best naive forecast, and no screen should say it does.

**Caution.** At 120 minutes ahead the model misses by more than the naive forecast (in proportion to the timetable). Use the naive forecast that far ahead.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Gain |
|---|---|---|---|---|---|
| 15 minutes | 6,654 | In proportion to the timetable | 0.48 | 0.42 | +12 in 100 |
| 30 minutes | 6,645 | In proportion to the timetable | 0.48 | 0.45 | +8 in 100 |
| 60 minutes | 6,583 | In proportion to the timetable | 0.48 | 0.46 | +4 in 100 |
| 120 minutes | 6,238 | In proportion to the timetable | 0.43 | 0.46 | -8 in 100 |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 26,120 | 0.47 | 0.45 | +4 in 100 |
| Evening peak, 16:00 to 20:00 | 15,540 | 0.56 | 0.58 | -4 in 100 |
| After 20:00 | 10,580 | 0.27 | 0.25 | +7 in 100 |
| Direction 0 | 15,254 | 0.41 | 0.40 | +3 in 100 |
| Direction 1 | 10,866 | 0.55 | 0.52 | +6 in 100 |
| Routes run mostly by buses of type COACH | 2,470 | 0.27 | 0.30 | -9 in 100 |
| Routes run mostly by buses of type DOUBLE | 2,832 | 0.39 | 0.39 | -2 in 100 |
| Routes run mostly by buses of type MIDI | 11,177 | 0.45 | 0.43 | +4 in 100 |
| Routes run mostly by buses of type STANDARD | 9,641 | 0.56 | 0.51 | +8 in 100 |
| Route group 0 | 6,486 | 0.35 | 0.36 | -3 in 100 |
| Route group 1 | 4,320 | 0.82 | 0.72 | +11 in 100 |
| Route group 2 | 5,856 | 0.41 | 0.40 | +4 in 100 |
| Route group 3 | 5,858 | 0.44 | 0.43 | +2 in 100 |
| Route group 4 | 3,600 | 0.39 | 0.38 | +2 in 100 |
| Community group 0 | 7,262 | 0.55 | 0.51 | +7 in 100 |
| Community group 1 | 8,293 | 0.47 | 0.45 | +4 in 100 |
| Community group 2 | 1,622 | 0.46 | 0.45 | +2 in 100 |
| Community group 3 | 4,649 | 0.43 | 0.41 | +4 in 100 |
| Community group 4 | 1,824 | 0.43 | 0.43 | -0 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 98 in 100. When nobody boarded it held 100 in 100 times (20,179 quarter-hours); when somebody did, 91 in 100 (5,941). How it is set: set at each origin from the misses of forecasts that had already come true that day (conformal prediction, rolling), widened to whole passengers.

**Development.** Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 33,247 | 0.31 | 0.74 |  |
| The average so far today | 33,247 | 0.44 | 0.61 |  |
| In proportion to the timetable | 33,247 | 0.40 | 0.65 |  |
| A plain count model (Poisson regression with a penalty) | 33,247 | 0.39 | 0.56 | -25 in 100 (-44 to -13) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 33,247 | 0.28 | 0.53 | +10 in 100 (+7 to +12) |

**Other routes.** Routes in five groups: learn from four, forecast the fifth. No route is on both sides. Does it carry over to a route it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 13,149 | 0.54 | 1.02 |  |
| The average so far today | 13,149 | 0.49 | 0.78 |  |
| In proportion to the timetable | 13,149 | 0.48 | 0.79 |  |
| A plain count model (Poisson regression with a penalty) | 13,149 | 0.50 | 0.79 | -6 in 100 (-10 to -1) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 13,149 | 0.47 | 0.74 | +2 in 100 (-9 to +17) |

**Other communities.** Communities in five groups: learn from four, forecast the fifth. Does it carry over to a part of the city it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 11,903 | 0.56 | 1.04 |  |
| The average so far today | 11,903 | 0.50 | 0.79 |  |
| In proportion to the timetable | 11,903 | 0.49 | 0.81 |  |
| A plain count model (Poisson regression with a penalty) | 11,903 | 0.51 | 0.79 | -4 in 100 (-7 to -1) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 11,903 | 0.48 | 0.75 | +3 in 100 (-8 to +17) |

**What the model leans on**, as each feature's share of the boosted trees' gain, learned from the hours before 16:00:

| Feature | Share |
|---|---|
| The time of day | 47 in 100 |
| Where the stop is along the route | 11 in 100 |
| The timetable's share | 10 in 100 |
| Buses scheduled here over the day | 7 in 100 |
| This stop's average so far today | 4 in 100 |
| How late those buses are running | 3 in 100 |
| Buses scheduled in that quarter of an hour | 3 in 100 |
| The route's boardings for each bus so far | 2 in 100 |
| How far ahead the forecast looks | 2 in 100 |
| Buses scheduled just after | 2 in 100 |
| Boardings on the whole route in the last hour | 2 in 100 |
| Boardings here so far today | 1 in 100 |
| Buses already on the road that should reach the stop then | 1 in 100 |
| How many have boarded those buses so far | 1 in 100 |
| Passengers who got off near here today and have not travelled since | 1 in 100 |
| Buses scheduled just before | 1 in 100 |
| How long the stop has been in service today | 1 in 100 |

## Lateness at a stop ahead

Unit: seconds late at a stop ahead (early is below zero). MAPE and WAPE are not taken for lateness: a bus can be exactly on time or early, so there is no share of what happened to take. MAE and RMSE are in seconds.

**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 35,003 | 312.93 | 386.47 |  |
| The bus stays as late as it is now (best naive) | 35,003 | 75.58 | 123.77 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front (chosen) | 35,003 | 43.92 | 72.54 | +42 in 100 (+23 to +57) against the bus stays as late as it is now |

The range of the gain lies above zero: on these rows the model beat the best naive forecast.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Gain |
|---|---|---|---|---|---|
| 1 stops | 11,741 | The bus stays as late as it is now | 8.72 | 8.57 | +2 in 100 |
| 5 stops | 10,202 | The bus stays as late as it is now | 54.26 | 29.55 | +46 in 100 |
| 10 stops | 8,326 | The bus stays as late as it is now | 112.14 | 64.00 | +43 in 100 |
| 20 stops | 4,734 | The bus stays as late as it is now | 223.03 | 127.27 | +43 in 100 |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 35,003 | 75.58 | 43.92 | +42 in 100 |
| Evening peak, 16:00 to 20:00 | 18,073 | 114.59 | 51.17 | +55 in 100 |
| After 20:00 | 16,930 | 33.93 | 36.18 | -7 in 100 |
| Direction 0 | 21,124 | 72.03 | 42.06 | +42 in 100 |
| Direction 1 | 13,879 | 80.98 | 46.75 | +42 in 100 |
| Buses of type ARTICULATED | 4,864 | 78.08 | 46.19 | +41 in 100 |
| Buses of type COACH | 3,083 | 79.64 | 45.50 | +43 in 100 |
| Buses of type DOUBLE | 3,465 | 81.90 | 48.87 | +40 in 100 |
| Buses of type MIDI | 8,107 | 78.63 | 43.31 | +45 in 100 |
| Buses of type STANDARD | 14,440 | 71.02 | 42.49 | +40 in 100 |
| Buses of type UNKNOWN | 1,044 | 70.22 | 36.80 | +48 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 91 in 100. 

**Development.** Forecasts made from 08:00 for arrivals up to 16:00. Read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 33,063 | 241.88 | 326.88 |  |
| The bus stays as late as it is now | 33,063 | 51.10 | 85.63 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front | 33,063 | 37.40 | 66.24 | +27 in 100 (+1 to +47) |

## Why these models

One day of data, a table of mixed features, and a planner who must be able to trust the answer. Boosted trees with a loss made for counts took the M5 forecasting competition and lead published work on bus boardings; a plain count model is kept beside them to show how much of the answer is simple; a deep network would have nothing to learn its extra freedom from. The comparison and its sources are in `docs/research/research-methods.md`.

## Limits

- **One day.** Nothing here was tested on another day. Later hours of the same day, and routes and communities the model had not seen, are what was tested.
- **Loads are made from taps.** A check-in with no check-out is an alighting nobody recorded; those are spread along the trip, and the loads stage above says how many. No door counter checks them.
- **Seats, not standing.** The fleet table marks standing capacity not verified.
- **Most stop quarter-hours are empty.** That is why WAPE can sit above 1 at stop level, why MAPE is taken only where at least 5 boarded, and why the route table is the one to read first.
- **Buses, not roads.** There is no road traffic data here.

## Run it again

`python3 -m model.run --data <folder of the five tables> --out <folder>`. The same tables give the same bundle, byte for byte, and a test holds that. Boosted trees: lightgbm 4.7.0. Origins with too little of the day to learn from, whose forecasts are not shown: 06:00.
