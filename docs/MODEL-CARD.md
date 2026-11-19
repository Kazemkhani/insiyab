# Model card

This file is written by the engine (`python3 -m model.card`) from `metrics.json` and `meta.json`. Nothing in it is typed by hand, and the gates fail if it does not equal a fresh one.

**STAND-IN DATA, NOT A RESULT.** Every number below comes from the real engine run on invented raw tables (`fixtures/raw/`). It shows that the method runs and how its results are reported. It says nothing about Dubai's buses.

## What is forecast

| Target | Unit | Made | For |
|---|---|---|---|
| Boardings at a stop on a route, and added up by route | passengers in a quarter of an hour | every 30 minutes, 06:30 to 22:00 | 15, 30, 60, 120 minutes ahead |
| How late a bus arrives at a stop ahead of it | seconds (early is below zero) | each time a bus leaves a stop | 1, 5, 10 and 20 stops ahead |
| How long a trip takes, against the timetable | minutes | before the trip leaves, from what the timetable and the fleet list say | trips scheduled from 16:00 |

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

## What the day adds: public data and two signals from the buses

- **Heat index**, from the hourly temperature and humidity of the last full hour before a forecast is made (Steadman's formula as the US weather service states it, with the Rothfusz regression from 80 F). On this day the heat index ran from 17.6 to 29.2 degrees: a mild day, so little gain from heat is expected here, and the tables below say what it was. 
- **School-holiday and public-holiday flags**, from the calendar. The calendar says: school holiday yes, public holiday no. One day has one calendar, so the two flags have one value all day and no model can learn from them yet; they are built so that more days need no new code. 
- **The same vehicle's lateness at the end of its previous trip**, in seconds: the 'bus still out' signal as a number. It is used only once that trip had ended.
- **Headway deviation**: at a stop, the gap to the bus in front less the gap the timetable gives. Only buses that had already left count.

Sources: opendata/public/weather-hourly.csv (Open-Meteo); opendata/public/calendar.csv; each has its source note beside it in `opendata/public/`. A test changes every record after noon and requires each of these features, for forecasts made before noon, to stay the same.

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
| A plain count model (Poisson regression with a penalty) | 430 | 13.94 | 18.76 | 0.65 | 0.76 over 346 | -38 in 100 (-85 to -5) against same as the last quarter of an hour seen |
| Boosted trees with a loss made for counts, one model for every stop and every horizon (chosen) | 430 | 9.18 | 13.78 | 0.43 | 0.56 over 346 | +9 in 100 (+0 to +15) against same as the last quarter of an hour seen |

The range of the gain lies above zero: on these rows the model beat the best naive forecast.

**Caution.** At 120 minutes ahead the model misses by more than the naive forecast (in proportion to the timetable). Use the naive forecast that far ahead.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it. The range of each gain is where it fell 95 times in 100 when whole origins were drawn again, on that horizon's rows alone.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 15 minutes | 108 | Same as the last quarter of an hour seen | 5.20 | 4.96 | 7.17 | +5 in 100 (-16 to +20), range includes zero |
| 30 minutes | 108 | Same as the last quarter of an hour seen | 7.58 | 6.86 | 9.66 | +10 in 100 (-1 to +20), range includes zero |
| 60 minutes | 108 | Same as the last quarter of an hour seen | 11.43 | 9.99 | 14.02 | +13 in 100 (+1 to +20) |
| 120 minutes | 106 | In proportion to the timetable | 13.87 | 15.01 | 20.56 | -8 in 100 (-61 to +31), range includes zero |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 430 | 9.50 | 9.18 | +3 in 100 |
| Evening peak, 16:00 to 20:00 | 252 | 11.06 | 11.40 | -3 in 100 |
| After 20:00 | 178 | 7.29 | 6.04 | +17 in 100 |
| Routes run mostly by buses of type COACH | 47 | 5.28 | 4.56 | +14 in 100 |
| Routes run mostly by buses of type DOUBLE | 48 | 7.19 | 7.66 | -7 in 100 |
| Routes run mostly by buses of type MIDI | 143 | 10.07 | 10.29 | -2 in 100 |
| Routes run mostly by buses of type STANDARD | 192 | 10.67 | 9.87 | +8 in 100 |
| Route group 0 | 95 | 7.49 | 7.40 | +1 in 100 |
| Route group 1 | 96 | 15.04 | 14.31 | +5 in 100 |
| Route group 2 | 96 | 7.34 | 7.77 | -6 in 100 |
| Route group 3 | 95 | 7.95 | 8.00 | -1 in 100 |
| Route group 4 | 48 | 9.01 | 7.60 | +16 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 97 in 100. When nobody boarded it held 100 in 100 times (15 quarter-hours); when somebody did, 97 in 100 (415). How it is set: set at each origin from the misses of forecasts that had already come true that day (conformal prediction, rolling), widened to whole passengers.

**Development.** Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 540 | 7.01 | 11.94 |  |
| The average so far today | 540 | 16.83 | 19.68 |  |
| In proportion to the timetable | 540 | 15.16 | 18.26 |  |
| A plain count model (Poisson regression with a penalty) | 540 | 13.77 | 19.24 | -96 in 100 (-138 to -71) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 540 | 7.84 | 14.09 | -12 in 100 (-20 to +3) |

## Boardings by stop

Unit: passengers boarding per stop per 15 minutes. MAPE is taken only over quarters of an hour in which at least 5 passengers boarded, and the table says how many those were. WAPE (the total miss over the total boardings) covers every quarter of an hour, the empty ones included.

**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.

| Forecast | n | MAE | RMSE | WAPE | MAPE | Gain |
|---|---|---|---|---|---|---|
| Same as the last quarter of an hour seen | 26,120 | 0.53 | 1.01 | 1.52 | 0.69 over 100 |  |
| The average so far today | 26,120 | 0.48 | 0.76 | 1.37 | 0.87 over 100 |  |
| In proportion to the timetable (best naive) | 26,120 | 0.47 | 0.78 | 1.33 | 0.86 over 100 |  |
| A plain count model (Poisson regression with a penalty) | 26,120 | 0.49 | 0.76 | 1.41 | 0.89 over 100 | -6 in 100 (-8 to -2) against in proportion to the timetable |
| Boosted trees with a loss made for counts, one model for every stop and every horizon (chosen) | 26,120 | 0.45 | 0.70 | 1.27 | 0.73 over 100 | +5 in 100 (-5 to +16) against in proportion to the timetable |

**The range of the gain includes zero.** On these rows the model is not shown to beat the best naive forecast, and no screen should say it does.

**Caution.** At 120 minutes ahead the model misses by more than the naive forecast (in proportion to the timetable). Use the naive forecast that far ahead.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it. The range of each gain is where it fell 95 times in 100 when whole origins were drawn again, on that horizon's rows alone.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 15 minutes | 6,654 | In proportion to the timetable | 0.48 | 0.42 | 0.68 | +12 in 100 (+6 to +21) |
| 30 minutes | 6,645 | In proportion to the timetable | 0.48 | 0.45 | 0.70 | +8 in 100 (-0 to +18), range includes zero |
| 60 minutes | 6,583 | In proportion to the timetable | 0.48 | 0.46 | 0.72 | +4 in 100 (-6 to +15), range includes zero |
| 120 minutes | 6,238 | In proportion to the timetable | 0.43 | 0.46 | 0.71 | -7 in 100 (-23 to +8), range includes zero |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 26,120 | 0.47 | 0.45 | +5 in 100 |
| Evening peak, 16:00 to 20:00 | 15,540 | 0.56 | 0.58 | -4 in 100 |
| After 20:00 | 10,580 | 0.27 | 0.25 | +7 in 100 |
| Direction 0 | 15,254 | 0.41 | 0.40 | +3 in 100 |
| Direction 1 | 10,866 | 0.55 | 0.51 | +6 in 100 |
| Routes run mostly by buses of type COACH | 2,470 | 0.27 | 0.29 | -8 in 100 |
| Routes run mostly by buses of type DOUBLE | 2,832 | 0.39 | 0.39 | -2 in 100 |
| Routes run mostly by buses of type MIDI | 11,177 | 0.45 | 0.43 | +4 in 100 |
| Routes run mostly by buses of type STANDARD | 9,641 | 0.56 | 0.51 | +8 in 100 |
| Route group 0 | 6,486 | 0.35 | 0.35 | -2 in 100 |
| Route group 1 | 4,320 | 0.82 | 0.72 | +11 in 100 |
| Route group 2 | 5,856 | 0.41 | 0.40 | +4 in 100 |
| Route group 3 | 5,858 | 0.44 | 0.43 | +3 in 100 |
| Route group 4 | 3,600 | 0.39 | 0.38 | +3 in 100 |
| Community group 0 | 7,262 | 0.55 | 0.51 | +8 in 100 |
| Community group 1 | 8,293 | 0.47 | 0.45 | +5 in 100 |
| Community group 2 | 1,622 | 0.46 | 0.45 | +3 in 100 |
| Community group 3 | 4,649 | 0.43 | 0.41 | +5 in 100 |
| Community group 4 | 1,824 | 0.43 | 0.43 | -0 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 98 in 100. When nobody boarded it held 100 in 100 times (20,179 quarter-hours); when somebody did, 91 in 100 (5,941). How it is set: set at each origin from the misses of forecasts that had already come true that day (conformal prediction, rolling), widened to whole passengers.

**Development.** Forecasts made from 08:00 to 15:30 for quarters of an hour that had ended by 16:00. Every choice was made here, so these numbers flatter the model: read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 33,247 | 0.31 | 0.74 |  |
| The average so far today | 33,247 | 0.44 | 0.61 |  |
| In proportion to the timetable | 33,247 | 0.40 | 0.65 |  |
| A plain count model (Poisson regression with a penalty) | 33,247 | 0.39 | 0.55 | -25 in 100 (-44 to -13) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 33,247 | 0.28 | 0.53 | +10 in 100 (+7 to +12) |

**Other routes.** Routes in five groups: learn from four, forecast the fifth. No route is on both sides. Does it carry over to a route it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 13,149 | 0.54 | 1.02 |  |
| The average so far today | 13,149 | 0.49 | 0.78 |  |
| In proportion to the timetable | 13,149 | 0.48 | 0.79 |  |
| A plain count model (Poisson regression with a penalty) | 13,149 | 0.50 | 0.79 | -6 in 100 (-10 to -1) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 13,149 | 0.47 | 0.74 | +2 in 100 (-9 to +17) |

Other routes, by horizon:

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 15 minutes | 3,330 | In proportion to the timetable | 0.49 | 0.45 | 0.73 | +8 in 100 (+1 to +19) |
| 30 minutes | 3,330 | In proportion to the timetable | 0.48 | 0.47 | 0.75 | +3 in 100 (-8 to +19), range includes zero |
| 60 minutes | 3,315 | In proportion to the timetable | 0.49 | 0.48 | 0.76 | +1 in 100 (-11 to +17), range includes zero |
| 120 minutes | 3,174 | In proportion to the timetable | 0.45 | 0.47 | 0.73 | -5 in 100 (-25 to +14), range includes zero |

**Other communities.** Communities in five groups: learn from four, forecast the fifth. Does it carry over to a part of the city it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| Same as the last quarter of an hour seen | 11,903 | 0.56 | 1.04 |  |
| The average so far today | 11,903 | 0.50 | 0.79 |  |
| In proportion to the timetable | 11,903 | 0.49 | 0.81 |  |
| A plain count model (Poisson regression with a penalty) | 11,903 | 0.51 | 0.79 | -4 in 100 (-7 to -1) |
| Boosted trees with a loss made for counts, one model for every stop and every horizon | 11,903 | 0.48 | 0.75 | +3 in 100 (-8 to +17) |

Other communities, by horizon:

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 15 minutes | 3,012 | In proportion to the timetable | 0.50 | 0.45 | 0.72 | +9 in 100 (+3 to +19) |
| 30 minutes | 3,012 | In proportion to the timetable | 0.50 | 0.48 | 0.73 | +4 in 100 (-6 to +20), range includes zero |
| 60 minutes | 2,997 | In proportion to the timetable | 0.51 | 0.49 | 0.76 | +3 in 100 (-9 to +18), range includes zero |
| 120 minutes | 2,882 | In proportion to the timetable | 0.47 | 0.50 | 0.77 | -7 in 100 (-30 to +12), range includes zero |

**The new features, and what each did.** Each was added alone to the features the model had before and scored on the development part only (forecasts made before 16:00). One that did not lower the miss there is left out of the model, and stays in this table.

| Feature | Development MAE without it | With it | Outcome |
|---|---|---|---|
| How hot it feels (heat index, from the last full hour's temperature and humidity) | 0.2808 | 0.2811 | left out: the miss did not fall |
| Whether schools are on holiday | 0.2808 |  | not tried: it has one value all day, so one day cannot teach it |
| Whether it is a public holiday | 0.2808 |  | not tried: it has one value all day, so one day cannot teach it |
| How late the buses on the way ended their previous trips | 0.2808 | 0.2802 | kept: the miss fell |
| The last gap between buses seen here, against the gap the timetable gives | 0.2808 | 0.2810 | left out: the miss did not fall |

With the features kept, the boosted trees' MAE on the untouched part went from 0.4465 to 0.4451 passengers: lower by 0.3 in 100. The choice was made before the untouched part was scored, so this number is reported as it fell.

| Ahead | n | MAE before | MAE after |
|---|---|---|---|
| 900 | 6,654 | 0.4201 | 0.4197 |
| 1800 | 6,645 | 0.4465 | 0.4463 |
| 3600 | 6,583 | 0.4571 | 0.4558 |
| 7200 | 6,238 | 0.4636 | 0.4597 |

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
| Buses scheduled just before | 1 in 100 |
| Passengers who got off near here today and have not travelled since | 1 in 100 |
| How long the stop has been in service today | 1 in 100 |

## Lateness at a stop ahead

Unit: seconds late at a stop ahead (early is below zero). MAPE and WAPE are not taken for lateness: a bus can be exactly on time or early, so there is no share of what happened to take. MAE and RMSE are in seconds.

**Every horizon together, untouched part.** The range of the gain is where it fell 95 times in 100 when whole origins were drawn again and again.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 35,003 | 312.93 | 386.47 |  |
| The bus stays as late as it is now (best naive) | 35,003 | 75.58 | 123.77 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front (chosen) | 35,003 | 44.07 | 72.86 | +42 in 100 (+22 to +57) against the bus stays as late as it is now |
| A plain linear model (ridge regression) on the same features | 35,003 | 58.77 | 78.09 | +22 in 100 (-3 to +40) against the bus stays as late as it is now |

The range of the gain lies above zero: on these rows the model beat the best naive forecast.

**By horizon, untouched part, every row.** A row where the model loses stays in: it tells a planner where not to rely on it. The range of each gain is where it fell 95 times in 100 when whole origins were drawn again, on that horizon's rows alone.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 1 stops | 11,741 | The bus stays as late as it is now | 8.72 | 8.68 | 11.47 | +0 in 100 (-7 to +8), range includes zero |
| 5 stops | 10,202 | The bus stays as late as it is now | 54.26 | 29.95 | 37.67 | +45 in 100 (+31 to +57) |
| 10 stops | 8,326 | The bus stays as late as it is now | 112.14 | 63.26 | 78.90 | +44 in 100 (+24 to +59) |
| 20 stops | 4,734 | The bus stays as late as it is now | 223.03 | 128.51 | 157.84 | +42 in 100 (+19 to +59) |

**At the evening peak, 16:00 to 20:00, by horizon.** The same table for forecasts made in the peak alone.

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 1 stops | 5,860 | The bus stays as late as it is now | 9.73 | 9.12 | 11.94 | +6 in 100 (-6 to +16), range includes zero |
| 5 stops | 5,199 | The bus stays as late as it is now | 80.97 | 33.98 | 42.20 | +58 in 100 (+47 to +67) |
| 10 stops | 4,359 | The bus stays as late as it is now | 169.17 | 72.51 | 87.47 | +57 in 100 (+43 to +69) |
| 20 stops | 2,655 | The bus stays as late as it is now | 322.27 | 145.81 | 172.73 | +55 in 100 (+39 to +69) |

**By subset, untouched part, every horizon's rows averaged by their count.**

| Subset | n | Best naive MAE | Model MAE | Gain |
|---|---|---|---|---|
| Every held-out bin | 35,003 | 75.58 | 44.07 | +42 in 100 |
| Evening peak, 16:00 to 20:00 | 18,073 | 114.59 | 51.64 | +55 in 100 |
| After 20:00 | 16,930 | 33.93 | 35.99 | -6 in 100 |
| Direction 0 | 21,124 | 72.03 | 42.32 | +41 in 100 |
| Direction 1 | 13,879 | 80.98 | 46.73 | +42 in 100 |
| Buses of type ARTICULATED | 4,864 | 78.08 | 46.18 | +41 in 100 |
| Buses of type COACH | 3,083 | 79.64 | 45.13 | +43 in 100 |
| Buses of type DOUBLE | 3,465 | 81.90 | 48.42 | +41 in 100 |
| Buses of type MIDI | 8,107 | 78.63 | 43.96 | +44 in 100 |
| Buses of type STANDARD | 14,440 | 71.02 | 42.65 | +40 in 100 |
| Buses of type UNKNOWN | 1,044 | 70.22 | 37.20 | +47 in 100 |

**The range.** Promised to hold 90 in 100 times; it held 91 in 100. 

**Development.** Forecasts made from 08:00 for arrivals up to 16:00. Read the main table first.

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 33,063 | 241.88 | 326.88 |  |
| The bus stays as late as it is now | 33,063 | 51.10 | 85.63 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front | 33,063 | 37.00 | 65.48 | +28 in 100 (+2 to +48) |
| A plain linear model (ridge regression) on the same features | 33,063 | 72.94 | 92.50 | -43 in 100 (-98 to +0) |

**Other routes.** Routes in five groups: learn from four, forecast the fifth. No route is on both sides. Does it carry over to a route it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 18,003 | 310.41 | 383.53 |  |
| The bus stays as late as it is now | 18,003 | 74.94 | 122.59 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front | 18,003 | 45.35 | 73.88 | +39 in 100 (+12 to +58) |

Other routes, by horizon:

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 1 stops | 6,045 | The bus stays as late as it is now | 8.65 | 10.39 | 17.09 | -20 in 100 (-29 to -9), loses |
| 5 stops | 5,260 | The bus stays as late as it is now | 53.69 | 31.55 | 40.44 | +41 in 100 (+16 to +57) |
| 10 stops | 4,286 | The bus stays as late as it is now | 111.60 | 64.64 | 80.71 | +42 in 100 (+12 to +62) |
| 20 stops | 2,412 | The bus stays as late as it is now | 222.28 | 128.79 | 157.71 | +42 in 100 (+11 to +62) |

**Other communities.** Communities in five groups, by the stop the forecast is for: learn from four, forecast the fifth. Does it carry over to a part of the city it has never seen?

| Forecast | n | MAE | RMSE | Gain |
|---|---|---|---|---|
| The timetable: the bus will be on time | 16,774 | 310.09 | 383.48 |  |
| The bus stays as late as it is now | 16,774 | 74.03 | 120.95 |  |
| Boosted trees on the bus's run so far, the timetable ahead and the bus in front | 16,774 | 45.29 | 72.85 | +39 in 100 (+12 to +56) |

Other communities, by horizon:

| Ahead | n | Best naive forecast there | Its MAE | Model MAE | Model RMSE | Gain, with its range |
|---|---|---|---|---|---|---|
| 1 stops | 5,627 | The bus stays as late as it is now | 8.60 | 11.16 | 20.47 | -30 in 100 (-41 to -19), loses |
| 5 stops | 4,911 | The bus stays as late as it is now | 53.51 | 32.39 | 41.37 | +39 in 100 (+14 to +55) |
| 10 stops | 4,031 | The bus stays as late as it is now | 111.09 | 65.64 | 81.16 | +41 in 100 (+9 to +60) |
| 20 stops | 2,205 | The bus stays as late as it is now | 218.95 | 123.89 | 153.14 | +43 in 100 (+14 to +62) |

**The new features, and what each did.** Each was added alone to the features the model had before and scored on the development part only (forecasts made before 16:00). One that did not lower the miss there is left out of the model, and stays in this table.

| Feature | Development MAE without it | With it | Outcome |
|---|---|---|---|
| How hot it feels (heat index, from the last full hour's temperature and humidity) | 37.4041 | 37.0001 | kept: the miss fell |
| Whether schools are on holiday | 37.4041 |  | not tried: it has one value all day, so one day cannot teach it |
| Whether it is a public holiday | 37.4041 |  | not tried: it has one value all day, so one day cannot teach it |
| How late the same vehicle ended its previous trip | 37.4041 | 38.4794 | left out: the miss did not fall |
| The gap to the bus in front, against the gap the timetable gives | 37.4041 | 38.1531 | left out: the miss did not fall |

With the features kept, the boosted trees' MAE on the untouched part went from 43.9210 to 44.0693 seconds: **higher by 0.3 in 100: on the untouched part the features kept did not help**. The choice was made before the untouched part was scored, so this number is reported as it fell.

| Ahead | n | MAE before | MAE after |
|---|---|---|---|
| 1 | 11,741 | 8.5672 | 8.6819 |
| 5 | 10,202 | 29.5469 | 29.9478 |
| 10 | 8,326 | 63.9999 | 63.2647 |
| 20 | 4,734 | 127.2661 | 128.5074 |

**What the model leans on**, as each feature's share of the boosted trees' gain, learned from the hours before 16:00:

| Feature | Share |
|---|---|
| How late the bus is now | 61 in 100 |
| How many stops ahead the forecast looks | 19 in 100 |
| How hot it feels (heat index, from the last full hour's temperature and humidity) | 6 in 100 |
| The time of day | 4 in 100 |
| How many have boarded so far on the trip | 4 in 100 |
| How late the bus in front reached that stop | 3 in 100 |
| The running time the timetable gives to that stop | 2 in 100 |

## Trip time against the timetable

One row is one trip: 796 of the day's 796 trips are kept (a trip is kept if the timetable gives it at least 5 minutes and its actual time is between 0.4 and 2.5 times that). The model forecasts the stretch, actual time over the timetable's time, from: route, direction, hour of scheduled departure, minute of scheduled departure, the timetable's running time, planned break since the vehicle's previous trip, bus type, seats. Unit: minutes; an error is forecast less actual, so below zero the trip took longer than forecast.

**Strict split.** Learns from trips scheduled before 16:00 that had finished by 16:00; forecasts trips scheduled from 16:00. Learned from 405 trips, forecast 333. The range is from drawing whole routes again.

| Trips scheduled | Method | Trips | MAE | RMSE | MAPE | Closer than the timetable, with its range | Share of trips where it was closer |
|---|---|---|---|---|---|---|---|
| 16:00 to 18:59 | The timetable's running time | 133 | 10.97 | 11.33 | 11 in 100 |  |  |
| 16:00 to 18:59 | This route's usual stretch before 16:00, times the timetable | 133 | 6.32 | 6.67 | 7 in 100 | +42 in 100 (+35 to +50) | 100 in 100 |
| 16:00 to 18:59 | A plain linear model (ridge regression) | 133 | 5.27 | 5.68 | 5 in 100 | +52 in 100 (+48 to +56) | 100 in 100 |
| 16:00 to 18:59 | Boosted trees | 133 | 7.30 | 7.62 | 8 in 100 | +33 in 100 (+30 to +37) | 100 in 100 |
| 16:00 to 19:59 | The timetable's running time | 179 | 9.52 | 10.19 | 10 in 100 |  |  |
| 16:00 to 19:59 | This route's usual stretch before 16:00, times the timetable | 179 | 5.13 | 5.85 | 5 in 100 | +46 in 100 (+40 to +54) | 99 in 100 |
| 16:00 to 19:59 | A plain linear model (ridge regression) | 179 | 4.25 | 4.98 | 4 in 100 | +55 in 100 (+51 to +60) | 99 in 100 |
| 16:00 to 19:59 | Boosted trees | 179 | 5.99 | 6.69 | 6 in 100 | +37 in 100 (+33 to +42) | 99 in 100 |
| From 20:00 | The timetable's running time | 154 | 2.22 | 2.81 | 3 in 100 |  |  |
| From 20:00 | This route's usual stretch before 16:00, times the timetable | 154 | 1.52 | 1.89 | 2 in 100 | +31 in 100 (+11 to +56) | 60 in 100 |
| From 20:00 | A plain linear model (ridge regression) | 154 | 2.59 | 2.85 | 4 in 100 | -17 in 100 (-66 to +29), range includes zero | 42 in 100 |
| From 20:00 | Boosted trees | 154 | 1.04 | 1.29 | 2 in 100 | +53 in 100 (+33 to +73) | 73 in 100 |
| Every held-out trip | The timetable's running time | 333 | 6.15 | 7.71 | 7 in 100 |  |  |
| Every held-out trip | This route's usual stretch before 16:00, times the timetable | 333 | 3.46 | 4.48 | 4 in 100 | +44 in 100 (+35 to +52) | 81 in 100 |
| Every held-out trip | A plain linear model (ridge regression) | 333 | 3.48 | 4.13 | 4 in 100 | +43 in 100 (+30 to +54) | 72 in 100 |
| Every held-out trip | Boosted trees | 333 | 3.70 | 4.98 | 4 in 100 | +40 in 100 (+34 to +47) | 87 in 100 |

**As first pitched.** Learns from every trip scheduled before 16:00, finished by 16:00 or not; forecasts trips scheduled from 16:00. Learned from 463 trips, forecast 333. The range is from drawing whole routes again.

| Trips scheduled | Method | Trips | MAE | RMSE | MAPE | Closer than the timetable, with its range | Share of trips where it was closer |
|---|---|---|---|---|---|---|---|
| 16:00 to 18:59 | The timetable's running time | 133 | 10.97 | 11.33 | 11 in 100 |  |  |
| 16:00 to 18:59 | This route's usual stretch before 16:00, times the timetable | 133 | 6.01 | 6.36 | 6 in 100 | +45 in 100 (+37 to +53) | 100 in 100 |
| 16:00 to 18:59 | A plain linear model (ridge regression) | 133 | 5.05 | 5.45 | 5 in 100 | +54 in 100 (+50 to +59) | 100 in 100 |
| 16:00 to 18:59 | Boosted trees | 133 | 4.32 | 4.81 | 4 in 100 | +61 in 100 (+58 to +64) | 100 in 100 |
| 16:00 to 19:59 | The timetable's running time | 179 | 9.52 | 10.19 | 10 in 100 |  |  |
| 16:00 to 19:59 | This route's usual stretch before 16:00, times the timetable | 179 | 4.84 | 5.56 | 5 in 100 | +49 in 100 (+43 to +57) | 99 in 100 |
| 16:00 to 19:59 | A plain linear model (ridge regression) | 179 | 4.09 | 4.78 | 4 in 100 | +57 in 100 (+53 to +62) | 99 in 100 |
| 16:00 to 19:59 | Boosted trees | 179 | 3.72 | 4.34 | 4 in 100 | +61 in 100 (+57 to +64) | 97 in 100 |
| From 20:00 | The timetable's running time | 154 | 2.22 | 2.81 | 3 in 100 |  |  |
| From 20:00 | This route's usual stretch before 16:00, times the timetable | 154 | 1.66 | 2.01 | 2 in 100 | +25 in 100 (+3 to +50) | 56 in 100 |
| From 20:00 | A plain linear model (ridge regression) | 154 | 2.69 | 2.94 | 4 in 100 | -21 in 100 (-74 to +26), range includes zero | 40 in 100 |
| From 20:00 | Boosted trees | 154 | 2.93 | 3.38 | 4 in 100 | -32 in 100 (-95 to +30), range includes zero | 37 in 100 |
| Every held-out trip | The timetable's running time | 333 | 6.15 | 7.71 | 7 in 100 |  |  |
| Every held-out trip | This route's usual stretch before 16:00, times the timetable | 333 | 3.37 | 4.30 | 4 in 100 | +45 in 100 (+36 to +53) | 80 in 100 |
| Every held-out trip | A plain linear model (ridge regression) | 333 | 3.44 | 4.04 | 4 in 100 | +44 in 100 (+30 to +55) | 71 in 100 |
| Every held-out trip | Boosted trees | 333 | 3.36 | 3.92 | 4 in 100 | +45 in 100 (+30 to +57) | 69 in 100 |

On the strict split the boosted trees were closer than the timetable on 87 in 100 of the 333 held-out trips, and the timetable was closer on 13 in 100. Every trip's two errors are in `forecast/scatter.json`, with no trip, vehicle or route named.

## Pick any route and hour

`forecast/judge_pick.json` holds, for every route and every hour from 16:00 to 20:00 of the untouched part, the average lateness forecast, the naive forecast (the bus stays as late as it is now) and what happened, with the count. Of 36 route-hours the model's average miss was lower in 35 and not lower in 1; 0 with fewer than 5 forecasts are left out. The misses stay in the file.

## Seasonal normalisation and standby placement

Demand on Dubai's bus network varies by month. The seasonal index for a route and month is its passenger total for that month divided by its mean across valid months, averaged over 2024 and 2025. A year-month is excluded when the network total is below 60 per cent of that year's median: this removes partial months (February, March and August of 2023 each cover about 40 per cent of a normal month; March and November are absent from 2024; September is absent from 2025). A route needs at least 8 valid months to have its own index; otherwise the network index is used and the result says so.

|  | December index (2024-2025) |
|---|---|
| Network | 1.054 |
| Route 310 | 1.066 |
| Route C01 | 1.056 |

The normalised load factor for a route-hour group is its peak load divided by seats offered (seats only; standing capacity is not verified), then divided by the route's December index. Both values are kept side by side: `load_factor_raw` is the measured ratio, `load_factor_normalised` is after removing the seasonal effect.

Standby placement ranks route-hour groups by normalised load factor (at least 5 trips) and returns a proposed list for the planner, made days ahead from historic data. It changes nothing by itself; a planner decides.

What this does not claim: there is no split between tourist and commuter demand; the index is monthly, not hourly; seat counts only.

## Why these models

One day of data, a table of mixed features, and a planner who must be able to trust the answer. Boosted trees with a loss made for counts took the M5 forecasting competition and lead published work on bus boardings; a plain model is kept beside them for each target to show how much of the answer is simple; a deep network would have nothing to learn its extra freedom from. The comparison and its sources are in `docs/research/research-methods.md`. What the comparison came to on this day:

- **Boardings.** Three kinds of forecast were scored on the same 26,120 untouched rows: naive rules, a penalised Poisson regression, and boosted trees with a loss made for counts. WAPE: best naive rule (in proportion to the timetable) 1.33; Poisson model 1.41 (-6 in 100 (-8 to -2), loses); boosted trees 1.27 (+5 in 100 (-5 to +16), range includes zero). Of the two models the boosted trees have the lower error. The one shown (boosted trees with a loss made for counts, one model for every stop and every horizon) was chosen on the development part, before these rows were scored; the range of its gain is not clear of zero, so neither is shown to beat the naive rule. Counts are whole, mostly zero and wider when larger, which is what a count loss is for; a squared-error loss would chase the few busy quarter-hours.
- **Lateness.** MAE in seconds on the same 35,003 untouched rows: best naive rule (the bus stays as late as it is now) 75.58; boosted trees 44.07 (+42 in 100 (+22 to +57)); a plain linear model on the same features 58.77 (+22 in 100 (-3 to +40), range includes zero). The trees are kept because lateness does not grow in a straight line with the stops ahead and the bus in front; the linear model shows how much a straight line gets.
- **Trip time.** MAE in minutes on 333 held-out trips: the timetable 6.15; the route's usual stretch 3.46; a linear model 3.48; boosted trees 3.70. **A simpler method has a lower miss than the trees here**, and the table below keeps it in.

## Limits

- **One day.** Nothing here was tested on another day. Later hours of the same day, and routes and communities the model had not seen, are what was tested.
- **Loads are made from taps.** A check-in with no check-out is an alighting nobody recorded; those are spread along the trip, and the loads stage above says how many. No door counter checks them.
- **Seats, not standing.** The fleet table marks standing capacity not verified.
- **Most stop quarter-hours are empty.** That is why WAPE can sit above 1 at stop level, why MAPE is taken only where at least 5 boarded, and why the route table is the one to read first.
- **Buses, not roads.** There is no road traffic data here.

## Run it again

`python3 -m model.run --data <folder of the five tables> --out <folder>`. The same tables give the same bundle, byte for byte, and a test holds that. Boosted trees: lightgbm 4.7.0. Origins with too little of the day to learn from, whose forecasts are not shown: 06:00.
