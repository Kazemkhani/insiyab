# Model card

This file is written by the engine (`python3 -m model.card`) from `metrics.json` and `meta.json`. Nothing in it is typed by hand, and the gates fail if it does not equal a fresh one.

**STAND-IN DATA, NOT A RESULT.** Every number below comes from the real engine run on invented raw tables (`fixtures/raw/`). It shows that the method runs and how its results are reported. It says nothing about Dubai's buses.

## What is forecast

| Target | Unit | Made | For |
|---|---|---|---|
| Boardings at a stop on a route, and added up by route | passengers in a quarter of an hour | every 30 minutes, 06:30 to 22:00 | 15, 30, 60, 120 minutes ahead |
| How late a bus arrives at a stop ahead of it | seconds (early is below zero) | each time a bus leaves a stop | 1, 5, 10 and 20 stops ahead |

## The data, and its one day

One service day, 2025-12-15: 8 routes, 240 stops, 551 trips, 8,265 stop visits and 6,409 boardings. Tested on one day only: Monday 15 December 2025, in the school holidays. Later hours of that day, and routes and communities the model had not seen, are what was tested. Nothing was tested on another day, and a school day may look different.

How the tables were made ready, stage by stage, with the count each stage kept:

- **Runtime report.** One row is one bus at one stop; rows with no scheduled time or no stop sequence are left out; a missing actual time takes the scheduled one; a time that ran backwards is moved up to the time before it. Counted: actual times filled from schedule 0, door not opened 2,057, route numbers rewritten 0, rows in 8,265, rows out 8,265, rows whose clock ran backwards 0, rows without a scheduled time 0, trips 551.
- **Fleet.** A vehicle that is not in the fleet table is given the fleet's middle number of seats and the type UNKNOWN; seats only, standing capacity is not verified. Counted: seats given to those 38, vehicles in the fleet table 50, vehicles in the runtime report 46, vehicles run but not in the fleet table 2.
- **Taps.** One row is one tap: a check-in (CKI is 1) or a check-out (CKO is 1); a row repeated exactly is counted once; a row with no time, or that is neither or both, is left out. Counted: cards counted 4,901, check ins 6,409, check outs 5,450, repeated rows 64, rows in 11,923, rows neither or both or no time 0, rows out 11,859, taps before day start dated the service day 0.
- **Taps to trips.** A tap is given to the stop visit of its vehicle with the latest actual arrival at or before the tap; a tap whose vehicle is not in the runtime report, or that comes before its first arrival, cannot be placed and is left out of loads and counts. Counted: share not placed 0, taps in 11,859, taps not placed 0, taps whose own stop differs from the stop placed 235.
- **Loads.** Check-ins with no check-out are alightings we do not know: they are spread over the trip's stops in proportion to its known alightings, and whoever is left alights at the last stop; nobody alights who is not on board. Counted: alightings not recorded and spread 959, passengers boarding at a last stop 0, share of boardings with no recorded alighting 0.1496, trips 551, trips over their seats 7, trips whose recorded load did not end at zero 355, trips whose recorded load went below zero 0.
- **Stops to places.** Each stop is put in the community whose boundary it lies inside. Counted: communities in 9, communities whose shape could be read 9, stops 240, stops outside every community 2.
- **Timetable.** Scheduled departures on the service day, by route, direction and stop. Counted: routes 8, scheduled departures 8,310, scheduled trips 554, stops served 240.
- **Bins.** Boardings are counted by stop, route, direction and quarter of an hour, at the time of the tap; between a stop's first and last scheduled departure a bin with no boarding is a true zero, and outside that span the stop is absent, not zero. Counted: bins 81, bins present 17,606, bins present with no boarding 14,194, boardings at a stop or time outside the timetable 0, boardings counted 6,409, boardings placed on a trip 6,409, series 240.

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
| Same as the last quarter of an hour seen | 384 | 9.01 | 13.16 | 0.63 | 0.67 over 240 |  |
| The average so far today | 384 | 11.90 | 14.93 | 0.83 | 0.62 over 240 |  |
| In proportion to the timetable (best naive) | 384 | 8.59 | 11.31 | 0.60 | 0.49 over 240 |  |
| A plain count model (Poisson regression with a penalty) | 384 | 10.90 | 14.44 | 0.76 | 0.60 over 240 | -27 in 100 (-45 to -10) against in proportion to the timetable |
| Boosted trees with a loss made for counts, one model for every stop and every horizon (chosen) | 384 | 6.84 | 10.05 | 0.48 | 0.50 over 240 | +20 in 100 (-12 to +47) against in proportion to the timetable |

**The range of the gain includes zero.** On these rows the model is not shown to beat the best naive forecast, and no screen should say it does.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Gain |
|---|---|---|---|---|---|
| 15 minutes | 96 | Same as the last quarter of an hour seen | 5.41 | 4.21 | +22 in 100 |
| 30 minutes | 96 | Same as the last quarter of an hour seen | 6.57 | 5.26 | +20 in 100 |
| 60 minutes | 96 | In proportion to the timetable | 9.08 | 7.83 | +14 in 100 |
| 120 minutes | 96 | In proportion to the timetable | 8.48 | 10.07 | -19 in 100 |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 384 | 7.39 | 6.84 | +7 in 100 |
| Evening peak, 16:00 to 20:00 | 224 | 8.39 | 8.67 | -3 in 100 |
| After 20:00 | 160 | 5.18 | 4.29 | +17 in 100 |
| Routes run mostly by buses of type COACH | 48 | 3.00 | 3.19 | -6 in 100 |
| Routes run mostly by buses of type DOUBLE | 96 | 5.86 | 5.23 | +11 in 100 |
| Routes run mostly by buses of type MIDI | 96 | 11.18 | 10.00 | +11 in 100 |
| Routes run mostly by buses of type STANDARD | 144 | 7.29 | 7.03 | +4 in 100 |
| Route group 0 | 96 | 6.97 | 5.83 | +16 in 100 |
| Route group 1 | 96 | 6.56 | 6.32 | +4 in 100 |
| Route group 2 | 96 | 8.99 | 8.70 | +3 in 100 |
| Route group 3 | 48 | 7.71 | 7.15 | +7 in 100 |
| Route group 4 | 48 | 6.31 | 5.89 | +7 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 95 in 100. When nobody boarded it held 100 in 100 times (38 quarter-hours); when somebody did, 94 in 100 (346). How it is set: set at each origin from the misses of forecasts that had already come true that day (conformal prediction, rolling), widened to whole passengers.

**Development.** Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 480 | 5.55 | 10.05 |  |
| The average so far today | 480 | 13.44 | 15.56 |  |
| In proportion to the timetable | 480 | 8.18 | 10.16 |  |
| A plain count model (Poisson regression with a penalty) | 480 | 8.80 | 13.98 | -59 in 100 (-101 to -32) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 480 | 4.35 | 7.96 | +22 in 100 (+17 to +28) |

## Boardings by stop

Unit: passengers boarding per stop per 15 minutes. MAPE is taken only over quarters of an hour in which at least 5 passengers boarded, and the table says how many those were. WAPE (the total miss over the total boardings) covers every quarter of an hour, the empty ones included.

**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.

| Forecast | n | MAE | RMSE | WAPE | MAPE | Gain |
|---|---|---|---|---|---|---|
| Same as the last quarter of an hour seen | 11,520 | 0.73 | 1.37 | 1.51 | 0.76 over 154 |  |
| The average so far today | 11,520 | 0.65 | 1.04 | 1.36 | 0.89 over 154 |  |
| In proportion to the timetable (best naive) | 11,520 | 0.55 | 1.01 | 1.14 | 0.82 over 154 |  |
| A plain count model (Poisson regression with a penalty) | 11,520 | 0.62 | 1.02 | 1.29 | 0.89 over 154 | -13 in 100 (-18 to -9) against in proportion to the timetable |
| Boosted trees with a loss made for counts, one model for every stop and every horizon (chosen) | 11,520 | 0.52 | 0.92 | 1.09 | 0.74 over 154 | +5 in 100 (-6 to +18) against in proportion to the timetable |

**The range of the gain includes zero.** On these rows the model is not shown to beat the best naive forecast, and no screen should say it does.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Gain |
|---|---|---|---|---|---|
| 15 minutes | 2,880 | In proportion to the timetable | 0.58 | 0.49 | +15 in 100 |
| 30 minutes | 2,880 | In proportion to the timetable | 0.57 | 0.53 | +7 in 100 |
| 60 minutes | 2,880 | In proportion to the timetable | 0.56 | 0.55 | +2 in 100 |
| 120 minutes | 2,880 | In proportion to the timetable | 0.48 | 0.52 | -9 in 100 |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 11,520 | 0.55 | 0.52 | +5 in 100 |
| Evening peak, 16:00 to 20:00 | 6,720 | 0.72 | 0.74 | -2 in 100 |
| After 20:00 | 4,800 | 0.26 | 0.22 | +15 in 100 |
| Direction 0 | 5,760 | 0.45 | 0.43 | +4 in 100 |
| Direction 1 | 5,760 | 0.65 | 0.61 | +5 in 100 |
| Routes run mostly by buses of type COACH | 1,440 | 0.28 | 0.27 | +5 in 100 |
| Routes run mostly by buses of type DOUBLE | 2,880 | 0.45 | 0.43 | +5 in 100 |
| Routes run mostly by buses of type MIDI | 2,880 | 0.76 | 0.72 | +6 in 100 |
| Routes run mostly by buses of type STANDARD | 4,320 | 0.56 | 0.54 | +4 in 100 |
| Route group 0 | 2,880 | 0.54 | 0.49 | +9 in 100 |
| Route group 1 | 2,880 | 0.51 | 0.48 | +5 in 100 |
| Route group 2 | 2,880 | 0.60 | 0.59 | +1 in 100 |
| Route group 3 | 1,440 | 0.56 | 0.54 | +4 in 100 |
| Route group 4 | 1,440 | 0.54 | 0.52 | +4 in 100 |
| Community group 0 | 2,304 | 0.60 | 0.59 | +2 in 100 |
| Community group 1 | 2,304 | 0.53 | 0.46 | +13 in 100 |
| Community group 2 | 2,400 | 0.52 | 0.50 | +4 in 100 |
| Community group 3 | 2,544 | 0.57 | 0.57 | -1 in 100 |
| Community group 4 | 1,872 | 0.53 | 0.49 | +7 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 97 in 100. When nobody boarded it held 100 in 100 times (8,627 quarter-hours); when somebody did, 87 in 100 (2,893). How it is set: set at each origin from the misses of forecasts that had already come true that day (conformal prediction, rolling), widened to whole passengers.

**Development.** Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 14,400 | 0.38 | 0.93 |  |
| The average so far today | 14,400 | 0.60 | 0.81 |  |
| In proportion to the timetable | 14,400 | 0.40 | 0.81 |  |
| A plain count model (Poisson regression with a penalty) | 14,400 | 0.45 | 0.70 | -20 in 100 (-48 to -7) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 14,400 | 0.29 | 0.60 | +24 in 100 (+21 to +25) |

**Other routes.** Routes in five groups: learn from four, forecast the fifth. No route is on both sides. Does it carry over to a route it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 5,760 | 0.76 | 1.39 |  |
| The average so far today | 5,760 | 0.66 | 1.07 |  |
| In proportion to the timetable | 5,760 | 0.56 | 1.03 |  |
| A plain count model (Poisson regression with a penalty) | 5,760 | 0.64 | 1.05 | -14 in 100 (-21 to -10) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 5,760 | 0.57 | 0.99 | -2 in 100 (-14 to +15) |

**Other communities.** Communities in five groups: learn from four, forecast the fifth. Does it carry over to a part of the city it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 5,712 | 0.76 | 1.40 |  |
| The average so far today | 5,712 | 0.67 | 1.07 |  |
| In proportion to the timetable | 5,712 | 0.56 | 1.03 |  |
| A plain count model (Poisson regression with a penalty) | 5,712 | 0.64 | 1.05 | -14 in 100 (-21 to -9) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 5,712 | 0.57 | 0.98 | -1 in 100 (-11 to +15) |

**What the model leans on**, as each feature's share of the boosted trees' gain, learned from the hours before 16:00:

| Feature | Share |
|---|---|
| The time of day | 53 in 100 |
| The timetable's share | 22 in 100 |
| Where the stop is along the route | 9 in 100 |
| The route's boardings for each bus so far | 3 in 100 |
| Buses scheduled just after | 2 in 100 |
| How late those buses are running | 1 in 100 |
| Buses scheduled in that quarter of an hour | 1 in 100 |
| Buses scheduled here over the day | 1 in 100 |
| Passengers who have got off near here today | 1 in 100 |
| Buses scheduled just before | 1 in 100 |
| How many have boarded those buses so far | 1 in 100 |
| How long the stop has been in service today | 1 in 100 |
| How far ahead the forecast looks | 1 in 100 |
| Boardings for each bus here so far | 1 in 100 |
| Passengers who got off near here today and have not travelled since | 1 in 100 |

## Lateness at a stop ahead

Unit: seconds late at a stop ahead (early is below zero). MAPE and WAPE are not taken for lateness: a bus can be exactly on time or early, so there is no share of what happened to take. MAE and RMSE are in seconds.

**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 7,670 | 208.58 | 267.75 |  |
| The bus stays as late as it is now (best naive) | 7,670 | 77.25 | 123.10 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front (chosen) | 7,670 | 41.37 | 62.51 | +46 in 100 (+27 to +56) against the bus stays as late as it is now |

The range of the gain lies above zero: on these rows the model beat the best naive forecast.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Gain |
|---|---|---|---|---|---|
| 1 stops | 3,728 | The bus stays as late as it is now | 20.85 | 18.07 | +13 in 100 |
| 5 stops | 2,639 | The bus stays as late as it is now | 99.31 | 46.27 | +53 in 100 |
| 10 stops | 1,303 | The bus stays as late as it is now | 193.92 | 98.11 | +49 in 100 |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 7,670 | 77.25 | 41.37 | +46 in 100 |
| Evening peak, 16:00 to 20:00 | 4,585 | 110.10 | 48.53 | +56 in 100 |
| After 20:00 | 3,085 | 28.41 | 30.74 | -8 in 100 |
| Direction 0 | 3,851 | 74.05 | 39.85 | +46 in 100 |
| Direction 1 | 3,819 | 80.47 | 42.91 | +47 in 100 |
| Buses of type ARTICULATED | 1,040 | 85.10 | 44.85 | +47 in 100 |
| Buses of type COACH | 998 | 69.99 | 44.78 | +36 in 100 |
| Buses of type DOUBLE | 1,319 | 75.90 | 39.63 | +48 in 100 |
| Buses of type MIDI | 1,186 | 82.04 | 42.76 | +48 in 100 |
| Buses of type STANDARD | 2,550 | 79.07 | 39.93 | +49 in 100 |
| Buses of type UNKNOWN | 577 | 60.84 | 36.71 | +40 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 93 in 100. 

**Development.** Forecasts made from 08:00 for arrivals up to 16:00. Read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 6,235 | 148.91 | 213.73 |  |
| The bus stays as late as it is now | 6,235 | 50.93 | 88.38 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front | 6,235 | 36.83 | 55.97 | +28 in 100 (-25 to +54) |

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
