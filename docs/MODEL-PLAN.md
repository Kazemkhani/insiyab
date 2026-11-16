# The model plan: what is forecast, how it is tested, what the judges see

Sixty of the hundred points are decided here (`docs/REQUIREMENTS.md`, criteria 3, 4 and 5). This file is written for whoever builds the engine in `model/`. The evidence behind each choice, with sources, is in `docs/research/research-methods.md`.

Where this file says "census", it means the answer comes from `docs/DATA-CENSUS.md` and the plan bends to it. A plan that ignores what the data turns out to be is worth nothing.

## 1. What we forecast

| | Target | Unit | Made at | For |
|---|---|---|---|---|
| **P** | Boardings at a stop on a route in one quarter of an hour | passengers | every 30 minutes from 06:00 to 22:00 | 15, 30, 60 and 120 minutes ahead |
| **B** | How late a bus arrives at a stop ahead of it | seconds | each time a bus leaves a stop | 1, 5, 10 and 20 stops ahead (the contract writes these as `stops_ahead`) |

P answers "understand demand". B answers "improve operations". Together they give the gap, which answers "optimise service".

Worked out from them, not scored on their own: the load on each bus between stops (boardings less alightings, added along the trip), and the chance that a stop visit has nobody boarding and nobody alighting.

If the open daily tap files arrive (`docs/STRATEGY.md`, section 8), P gains a third horizon: tomorrow, by route and hour. That is the only honest way to answer "longer-term horizons", and it is worth more than any tuning.

## 2. Getting the data ready, and what must be written down

Each step is one stage of the pipeline, with its own count of rows in and rows out, printed and kept, because the scoring sheet asks for "sound data cleaning" that can "be reproduced".

1. **Read** each table as given. Keep every column. Record types, empty cells, first and last time.
2. **Time**: one clock for everything, seconds after midnight in Dubai. Trips past midnight carry on above 86400.
3. **Taps to trips**: join each tap to the bus (vehicle) and then to the trip that vehicle was running at that moment, using the runtime report's actual times. Record the share that will not join, and why.
4. **Check-in and check-out**: establish from the census what CKI and CKO are. Pair them into journeys where the data allows. A check-in with no check-out is kept as a boarding and counted as "alighting unknown". We never guess silently.
5. **Loads**: along each trip, load after a stop is load before, less alightings, plus boardings. Where unknown alightings make the load go wrong (below zero, or never emptying), record how often, and spread unknown alightings in proportion to known ones at later stops. Say that this was done and how much it moved the numbers.
6. **Stops to places**: put each stop in its community (point in polygon).
7. **Bins**: count boardings by stop, route, direction and quarter of an hour. A stop and time with a scheduled visit and no boarding is a true zero and stays in the table. A stop and time with no scheduled visit is absent, not zero.
8. **Things that look wrong**: a bus in two places, a tap before the first departure, a stop not in the plan, a duplicated tap, a clock that runs backwards. Each is counted and has one written rule. Nothing is dropped without a line in the log.

## 3. Keeping the test honest

The scoring sheet asks for "proper train/test separation" and for error "on held-out data". With one day, that is easy to get wrong.

**The rule of the clock.** A forecast made at an origin time may use only what had happened before that time: taps, bus positions, anything. This includes every feature built from the day (running totals, "how busy has this stop been so far", how full the approaching bus is). A test proves it: change every record after an origin, rebuild, and the forecasts made at that origin must not change by one digit.

**Three ways the data is held out**, each answering a different question:

| Split | How | The question it answers |
|---|---|---|
| **Later hours** (rolling origin) | At each origin, learn from everything before it, forecast what comes after. Move the origin forward and repeat. | Would this have worked on the day, as the day unfolded? |
| **Other routes** | Put the routes in five groups. Learn from four, forecast the fifth, at the same origins. Never the same route in both. | Does it carry over to a route it has never seen? |
| **Other communities** | The same, by groups of communities. | Does it carry over to a part of the city it has never seen? |

For B the unit that must never be split is the trip: all the stops of one trip are either learned from or tested on.

**What stays untouched.** Forecasts made from 16:00 to 21:30, which cover the evening peak, and one group of communities, are set aside at the start and looked at once, at the end. Every choice (which model, which features, which settings) is made on forecasts made from 08:00 to 15:30. The numbers on the first screen are from the untouched part. The morning peak falls in the part used for choosing, so it is reported in its own table and labelled as such. This is said in the documentation, because a reader cannot otherwise tell a tuned number from a true one. (In the M5 forecasting competition most teams had an entry that beat the naive forecast and fewer than half chose it, misled by their own validation: `docs/research/research-methods.md`.)

**How sure the gain is.** The gain over the naive forecast is reported with a range, found by resampling whole origins and whole communities, so a judge can see it is not luck.

**If other days arrive:** learn from earlier days, test on later ones, and test once on the organisers' day, which the model will never have seen.

## 4. The forecasts we must beat

A model is only as good as the simple thing it beats. Each naive forecast is written, tested and reported exactly like the model.

| For | Naive forecast | Why it is fair |
|---|---|---|
| P | **Same as the last quarter of an hour seen** at that stop | The simplest thing a control room could do |
| P | **The stop's average so far today**, scaled by how the whole network usually moves through the day so far | Uses the same information the model has |
| P | **In proportion to the timetable**: demand follows the number of scheduled buses | What a planner assumes when no demand data is to hand |
| B | **The timetable**: the bus will be on time | The existing forecast every passenger is given |
| B | **The bus stays as late as it is now** | The simplest correction, and hard to beat a few stops ahead |

"Improvement over baseline" on the scoring sheet is reported as the share of the naive forecast's error that the model removes, against the best of these, never the worst.

## 5. The models, and why

The sheet wants the choice "justified against alternatives". So several are built, on the same splits, and the table decides.

| Model | What it is | Why it is here |
|---|---|---|
| 1 | The naive forecasts above | The floor |
| 2 | A plain count model (Poisson regression with a penalty) on a handful of features | Easy to explain; shows how much of the answer is simple |
| 3 | Boosted trees with a loss made for counts with many zeros (LightGBM with a Tweedie loss), one model across every stop and every horizon | The method that won the M5 competition and the best in a published study of bus boardings in Brisbane; handles zeros and mixed features |
| 4 | **Two parts added together**: what kind of place this is (learned across all stops from the timetable, the stop's place on the route, the community and public data), and what today has been so far (learned from the hours already seen) | With one day there is no history for any single stop. This lets every stop borrow from stops like it, and still follow the day. This is the design we expect to choose. |
| 5 | Model 4 with the levels made to add up: stops sum to routes, routes to communities, communities to the network | A planner who sees 400 on the route screen and 380 summed from the stops stops trusting both |

For B: the two naive forecasts, a boosted-tree model, and the same model given how late the buses ahead on the same road are.

**Each forecast comes with a range.** The range is set from the errors on held-out data, so that it holds about nine times in ten, and the screen shows how often it actually held. A decision can then say "the load will be over the seats with nine chances in ten", not "the load will be 71".

**What makes it more than a standard model** (criterion 3):

1. **The bus as a sensor.** The taps on a bus that is three stops away say how full it will be when it arrives. The forecast for a stop uses the buses approaching it.
2. **Two sides, one gap.** People and buses are forecast together, and the product is the difference.
3. **Borrowing across stops** to make one day enough (model 4).
4. **Ranges that are tested**, and decisions that state their risk.
5. **Levels that add up.**
6. **People who will come back.** A passenger who got off at a stop this morning and has not boarded since is likely to board near there later. The count of such passengers at each stop is a feature no timetable holds. Cards are only counted, never shown.
7. **Public data as features**: population of the community, the kind of stop (pole, shelter, air-conditioned shelter), the weather that hour, the school calendar, and if they arrive, RTA's own open daily taps.

**Why not a deep network.** One day of data, a table of mixed features, a deadline of hours, and a judge who must trust it. Say this in the documentation, with the comparison table, and with the published comparisons from the research file.

## 6. How error is reported

Every one of these, for every model, at every horizon, on every subset. The engine writes them to `metrics.json` (`docs/CONTRACT.md`); nothing is typed by hand.

| Measure | What it is | Care needed |
|---|---|---|
| WAPE | total miss over total passengers | Lead with this one. It is a share, and it does not break on zeros. |
| MAE | the average size of the miss | In passengers, or seconds. The one a planner can feel. |
| RMSE | the same, punishing large misses | |
| MAPE | the average miss as a share of what happened | Breaks when what happened is zero or tiny, and most stop-quarter-hours are. So it is taken only over bins with at least 5 boardings, and `mape_n` says how many that was. Say this out loud in the pitch before a judge asks. |
| Gain over naive | 1 less (model MAE over naive MAE) | Against the best naive forecast |
| Range kept | how often the truth fell inside the stated range | Should be near the nine in ten promised |

**Subsets** (the slide's "multiple subsets of the data"): time of day (early, morning peak, midday, evening peak, late); route groups never seen in learning; community groups never seen; kind of bus; direction; busy stops against quiet ones.

**The three tables the judges see** are set out, with their rows and columns, at the end of `docs/research/research-methods.md`: the headline table on the untouched part (every naive forecast and every model); the table by horizon and by peak or off-peak; and the table by subset. Every row is shown, including any where the model loses to the naive forecast. A row where it loses tells a planner where not to rely on it, and is what makes the other rows believable.

## 7. Explaining it

- For every forecast, the three things that moved it most, in words ("the bus two stops away is already full; this stop has been busier than usual since 06:30").
- For the model as a whole, which features matter and in which direction.
- For a decision, the sentence in `why` is built from those numbers by code. The provided language model may reword it; a check throws the wording away if it contains a number the record does not.

## 8. From forecast to decision

Each lever is a rule on the forecasts and the day's records. The rule, its thresholds and its assumption are written beside it in the code and shown on the card. Effects are simulated on held-out hours, never on the hours the model learned from.

| Lever | A decision is proposed when | The effect is worked out by |
|---|---|---|
| Right bus | the top of the forecast range for a trip's largest load is over its seats, and in the same hours another trip's is under a third of its seats, on a bus of a different size | replaying the day with the vehicles swapped: passenger-minutes over seats, before and after |
| Right time | a stretch of route in an hour is late, or early, on most held-out trips by more than a set number of seconds | re-marking arrivals against the proposed times: share on time, before and after |
| Right stop | the forecast chance of nobody boarding and nobody alighting is high for a stop in an hour, and was right on held-out visits | the time a bus loses at such a visit, measured from the day (a visit with the door shut against one where the bus did not slow), times the visits |
| Rewarded choice | a stop's forecast shows more passengers than seats, and a trip within a short wait, or a stop within a short walk on another route, has room | a stated share of passengers taking the offer, from published trials, shown as a range the planner can move |
| On demand | a stretch of route carries very few passengers per bus-hour, and a busy stop is near | bus-hours released against passengers still served |

Decisions are ranked by passenger-minutes improved for each bus-hour they cost. The first screen shows the top few.

One caution from the research binds the right-stop lever: published work finds that skipping stops and holding buses can make service worse when the forecasts behind them are unreliable. So a request stop is proposed only where the forecast was right on held-out visits, and the card shows how often it was. That is also the answer to "why does accuracy matter": the decision is only as safe as the forecast.

## 9. Running it again

- One command runs every stage and writes the bundle: `python3 -m model.run --data <folder> --out artifacts`. With `--data fixtures/raw` it runs on invented tables, so every stage can be built and tested before the real data is touched.
- Fixed random seeds. The same input gives the same bundle, byte for byte apart from the time and the commit written in `meta.json`, and a test checks it.
- `docs/MODEL-CARD.md` is written by the engine from `metrics.json`: what was forecast, the data and its one day, the splits, the table, the limits. Never by hand.
- The same stages are laid out as a flow in Dataiku, one recipe for each stage, because that is where RTA would run it, and a picture of that flow goes in the documentation. Dataiku's own analysis of a model by sub-population is run as well: it answers the slide's "multiple subsets of the data" in the organisers' own tool.
- Few libraries, all common, so the code runs inside Dataiku without special set-up.

## 10. Tests that must exist before any number is shown

| Test | Passes when |
|---|---|
| The clock | changing every record after an origin does not change a forecast made at that origin |
| No trip on both sides | no trip, and in the route split no route, is in both learning and testing |
| The measures | MAE, RMSE, MAPE and WAPE give the right answers on small cases worked by hand, including a zero |
| The naive forecasts | each gives the values worked by hand on a small case |
| Loads | the load on every trip is never below zero and ends at zero, or the exception is counted |
| The same twice | two runs give the same bundle |
| The bundle | `python3 tools/contract_check.py artifacts` ends ALL PASS |
| The untouched part | the code that chooses the model cannot read it (it is in a separate file opened by one function, and a test fails if anything else opens it) |

## 11. Cut lines for the engine

1. P at route level with the naive forecasts, rolling origin, the full table. Complete on its own.
2. P at stop level with models 2 and 3, the route and community splits.
3. Model 4, the ranges, and the explanation of each forecast.
4. B, with its naive forecasts.
5. Loads, the gap, and the right-bus and right-stop decisions.
6. The remaining levers, the levels made to add up, the points of view.

If the freeze comes at line 2, line 2 is what is shown: a tested forecast with its table already answers criteria 4 and 5.
