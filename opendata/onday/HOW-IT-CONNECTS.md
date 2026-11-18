# How Insiyab's pieces connect, and answers to likely questions

Lane 3, 18 November 2026. Everything here was run on the one real day, Monday 15 December 2025.
The flow below is in the Dataiku project `John` (lane 3 has no write access to `INSIYAB`). Nothing in `INSIYAB` was changed.
In Dataiku, steps 1, 3 and 4 are chains of visual recipes (prepare, group, window, join, sort), one box per step, in four flow zones; step 2 is Dataiku's built-in split, model training (LightGBM) and scoring. That built-in model, on default settings, misses by 7.15 minutes against the timetable's 8.25 from 16:00 to 18:59, 13% closer; the tuned script gives 6.93, 16% closer. The script is kept in a fifth zone, `5. Extra checks (script)`, for the three stricter tests and the coverage figures below. The project wiki in John lists every box. The Python files in `opendata/onday/dataiku/` hold the same logic in code for lane 1; the visual chain gives the same totals (244 bus hours, 696, 62%). Only totals are quoted here; trip rows stay in Dataiku.

## The chain

```
Running_time_15-Dec-2025 ─┐
                          ├─ 1. Trips (8 visual steps) ──► insiyab_trips (11,136 trips)
Fleet_List ───────────────┘                                    │
                                                               ├─ 2. Forecast (split, train, score, compare) ► insiyab_forecast_result; script ► insiyab_forecast_scores, _coverage, _by_hour
                                                               ├─ 3. Planner's list (8 visual steps) ► insiyab_planner_list (1,705 rows), insiyab_planner_by_hour
                                                               └─ 4. Control room flag (4 visual steps) ► insiyab_occ_flags (9,787 departures), _rule_scores, _by_hour
```

| Step | What it does | Who uses the output |
|---|---|---|
| 1. Trips | One row per trip: planned and measured running time, the same bus's previous trip, the planned break, the bus type. | Steps 2 to 4 |
| 2. Forecast | Forecasts a trip's running time and scores it four ways against the timetable, a simple rule and a linear model. | Evidence that the gap is predictable |
| 3. Planner's list | For each route, direction and hour: time the timetable gives, time that covers 85 trips in 100, minutes to add, bus hours that costs. | Planner, before the day |
| 4. OCC flags | Flags a departure when its bus is past its planned arrival and not back. Writes the message text. | Control room, on the day |

The voice drill (`live/voice/`) takes one flagged departure as its incident: route, hour, minutes late and the options. It is a drill on the team's own phones.

**What connects to what, stated exactly**

- Steps 3 and 4 are measured from the day. They do not use the forecast's output.
- Step 2 shows that the gap follows the hour and the route, which is why a fixed list for planners is a sound answer.
- The link between "before the day" and "on the day" is the bus's break. On route 310 at 18:00 the timetable gives 67 minutes, the usual trip took 96, and the planned break is 16. The trip uses the whole break and more, so the next departure leaves late.

## Figures from the flow

**Forecast, evening peak 16:00 to 18:59, 2,043 trips on 162 routes. Average miss in minutes.**

| Test | Timetable | Simple rule | Linear | Boosted trees | Trees against timetable |
|---|---|---|---|---|---|
| A. Learn before 16:00, forecast the evening (the pitch's test) | 8.25 | 7.42 | 7.31 | 6.93 | 16% closer (12% to 20%) |
| E. Next hour, learning only from finished trips | 8.25 | 7.48 | 7.37 | 7.76 | 6% closer (3% to 9%) |
| B. Whole routes held out | 8.25 | 7.39 | 7.58 | 7.39 | 10% closer (6% to 14%) |
| C. Route-hours held out (fills in a missing hour) | 8.25 | 6.69 | 6.91 | 6.23 | 25% closer (20% to 28%) |

- The trees differ by a few hundredths of a minute between runs. Test E gave 7.61 in the earlier notebook, 7.70 in the first build of this flow and 7.76 in the current one (6% to 8% closer); in all three it is behind the simple rule and the linear model.
- From 19:00 in test A the trees are 15% further off than the timetable (5.06 against 4.40 minutes).
- Time that covers 85 trips in 100: the timetable covers 29% of evening-peak trips. A simple rule set at 85 covers 85% to 87%. The trees set at 85 cover 78% to 80%, so the planner's list is not built from the model.
- 33 of 11,169 trips were dropped as extreme (under 0.4 or over 2.5 times the plan); 2 of them were in the evening peak.

**Planner's list**

- 244 bus hours short from 16:00 to 18:59 and 629 over the day, the same as lane 1's figures (244 and 630).
- If the frequency is kept, that is the extra bus time needed. If the buses are kept instead, about 139 of 1,396 evening-peak departures would go (one in ten). Both are arithmetic on the day, not RTA procedure.
- Top row: route 310, direction 1, 18:00. Ten trips, 67 minutes given, 104 covers 85 in 100, add 37 minutes, 6.2 bus hours.

**OCC flag**

| Rule | Flags | Share that left over 5 minutes late | Share of all late departures caught |
|---|---|---|---|
| Bus still out when the departure was due | 696 | 85% | 62% |
| Flag 5 minutes before departure | 1,317 | 58% | 81% |
| Flag 10 minutes before | 2,337 | 34% | 84% |
| Flag 15 minutes before | 2,242 | 20% | 47% |

945 departures left over 5 minutes late. It peaks at 19:00: 140 of 651 departures had the bus still out.

## Likely questions

**How accurate is the model?** In the evening peak it misses by 6.95 minutes on average against the timetable's 8.25, which is 16% closer, on 2,043 trips it had not seen. RMSE 10.7 against 12.6. Outside the evening peak it is no better than the timetable.

**Why this model and not a simpler one?** We tested a simple rule and a linear model beside it. The trees win when they learn before 16:00 and forecast the evening. In the strictest test, next hour from finished trips only, the simple rule and the linear model are slightly ahead. So we keep the trees for the evening forecast and build the planner's list from measured times.

**Does it use information from the future?** Test A learns from trips due before 16:00 and forecasts the evening; a few of those trips were still running at 16:00. Test E removes that: for each hour it learns only from trips finished 30 minutes before the hour starts, and gives 6% to 8% depending on the run. Test C is labelled as filling in a missing hour on a known route, not a look ahead.

**Does it work on a route it has never seen?** It is 10% closer than the timetable there, the same as a simple hour-of-day rule.

**Is one day enough?** No, and we say so. One day shows the pattern and its size. It cannot show that the same routes are short every Monday, or how weather and school terms change it. With more days we would train on earlier days and test on a later one.

**If the forecast is only a little better, what is it for?** It shows the evening gap is predictable from the hour and the route. That makes it a timetable problem a planner can fix in advance. The product is the list: where, when, how many minutes, and what it costs.

**Surely planners already know evenings are slower?** The day's data says the timetable does not reflect it: its time covers 29 in 100 evening-peak trips against 42 in 100 in the morning peak. We cannot say why; the data holds no planning history.

**Do you just make every bus later?** No. The list gives one route at one hour a realistic time. The planner chooses how to pay for it: more bus time at the same frequency, or the same buses at a lower frequency. The list shows both costs.

**Have you shown the change improves service?** No. We measured the gap and its cost. We have not rerun a timetable with the added time.

**What triggers the message to the control room?** A measured fact: the bus is past its planned arrival and not back, 5 minutes before its next departure. It is not a forecast and gives no cause; the data has no incident or breakdown field.

**How often would the control room be flagged, and how often wrongly?** 1,317 flags over the day. About three in five were followed by a departure over 5 minutes late, and the rule caught 81% of all such departures.

**Is the voice part real?** It is a drill on the team's own phones. It rings a person, takes a one-line report, reads the options to the duty manager and passes the decision back. It contacts no RTA system and says so on each call.

**Who decides?** A person, in both cases. The planner accepts or sets aside each row. The duty manager picks the option.

**Why two figures, 93% and 62%, for late departures?** Different definitions. 62% (589 of 945): the bus was still out when its next departure was due. 93% (870 of 936) is lane 1's wider definition: the bus finished its last trip behind time.

**How was the data handled?** Raw rows stay in Dataiku. Only totals leave it. The running-time forecast uses no passenger card data.

## For lane 1

- To adopt a recipe in `INSIYAB`, change the two input names in step 1 and the dataset names to yours. Steps 2 to 4 read only the trip table.
- Step 1 takes the stop count from the plan and does not use boardings.
- The 85-in-100 coverage (29%) and the "departures lost" arithmetic are new; neither is on the pitch page.
