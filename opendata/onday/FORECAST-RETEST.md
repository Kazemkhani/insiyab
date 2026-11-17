# The running-time forecast, tested four ways

Lane 3, 17 November. Run in a separate notebook (`lane3_forecast_review`, project John). It rebuilds the trip table from the
running-time and fleet data, without the boardings feature. Nothing in project INSIYAB was read for writing or changed.
Only totals left Dataiku. The rebuild matches the Flow: 2,043 evening-peak trips, 244 and 630 bus hours.

One day only: Monday 15 December 2025. Average miss (MAE) in minutes, evening peak 16:00 to 18:59, 2,043 trips.
The range is from redrawing whole routes 200 times.

| Test | Timetable | Simple rule | Linear (ridge) | Boosted trees | Trees against the timetable |
|---|---|---|---|---|---|
| 1. Learn before 16:00, test the evening (the pitch's test) | 8.25 | 7.42 | 7.31 | 6.96 | 16% better (12% to 19%) |
| 2. Next hour, learning only from trips already finished | 8.25 | 7.48 | 7.37 | 7.61 | 8% better (5% to 10%) |
| 3. Whole routes held out, five folds | 8.25 | 7.39 | 7.58 | 7.38 | 10% better (7% to 14%) |
| 4. Route-hours held out, five folds | 8.25 | 6.69 | 6.91 | 6.28 | 24% better (21% to 27%) |

The simple rule in each test: (1) this route before 16:00; (2) this route so far today; (3) the usual stretch at that hour
on other routes; (4) the hour's usual stretch times this route's usual stretch.

RMSE and MAPE for test 1: timetable 12.57 and 10.5%; linear 11.47 and 9.3%; trees 10.78 and 9.0%.

## What it says

- The 15% on the pitch page holds (6.96 here against 6.97 in the Flow).
- On a route the model has never seen, it ties the simple rule. The gain there is the hour of the day.
- Test 4 fills in a missing hour on a known route within the same day. It is not a forecast ahead in time.
- In the stricter next-hour test the linear model and the simple rule are slightly ahead of the trees.
- From 19:00 the timetable is ahead in test 1 (4.40 against 4.94). In test 3 the two are level (4.40 against 4.48, range includes zero).
- Lead time makes no difference: at 15, 30 and 60 minutes ahead the miss in test 4 is 6.28 with or without the previous-trip signals.
- A forecast of the time that covers 85 trips in 100 covered 78% to 80% of evening-peak trips; the simple rule covered 85% to 87%.
  The worklist should stay measured.
- The timetable's own time covers 29% of evening-peak trips and 41% over the whole day. The planning standard is 85%.
- Trips dropped as extreme (under 0.4 or over 2.5 times the plan): 33 of 11,169, of which 2 in the evening peak.

## The 62% and the 93%

Of 945 departures more than 5 minutes late that had a previous trip on the same bus, 589 (62%) had the bus arrive back
after the departure was due, and 714 (76%) had it back with under 3 minutes to spare. The pitch page's 870 of 936 (93%)
must use a wider definition; whichever is kept, state the definition beside it.
