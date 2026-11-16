# Criteria matrix: every scoring line, what we show for it, where the proof is

Kept true by lane 4. A line is "Shown" only when the proof exists and has been opened. Until then it is "Planned" or "Missing". Never mark a line from memory.

| # | The sheet asks for | Points | What we show | Where the proof will be | Owner | Status |
|---|---|---|---|---|---|---|
| 1.1 | The model directly targets the stated business problem, with clear objectives and scope | 8 | The gap between buses and passengers, forecast an hour ahead: the slide's "potential supply-demand mismatches" | `docs/STRATEGY.md` section 4; first screen | Lane 1 | Planned |
| 1.2 | Outputs translate into concrete decisions the business can act on | 6 | Decision cards: where, when, the change, the effect, the reason | `artifacts/decisions.json`; the gap view | Lanes 1, 2 | Planned |
| 1.3 | Realistic to implement, integrate and scale | 6 | The same stages as a flow in Dataiku; plain files; uses what RTA already has (nol Plus, Bus on Demand, the fleet on order) | A picture of the Dataiku flow; `docs/MODEL-PLAN.md` section 9 | Lanes 1, 4 | Planned |
| 2.1 | Approach, data, assumptions and steps documented clearly enough to be reproduced | 7 | One command; row counts at every stage; the model card written by the engine | `docs/MODEL-CARD.md`; `docs/DATA-CENSUS.md`; README | Lane 1 | Planned |
| 2.2 | Charts explain model behaviour and performance accurately and simply | 7 | The forecast meeting reality on the map; the error table with the worst subset marked | The twin, parts one and three | Lane 2 | Planned |
| 2.3 | Well-structured, on-time delivery with confident, accurate answers | 6 | A rehearsed pitch that ends on time; answers prepared with their numbers | `docs/pitch/PITCH.md`, `docs/pitch/QA-PREP.md` | Lane 4 | Planned |
| 3.1 | Advanced or non-standard methods beyond a basic baseline | 8 | Two forecasts joined into a gap; borrowing across stops; tested ranges; levels that add up; the approaching bus as a sensor | `docs/MODEL-PLAN.md` section 5; the comparison table | Lane 1 | Planned |
| 3.2 | Inventive feature engineering or external data | 6 | Public population, stop type, weather, school calendar; RTA's open daily taps if obtained | `opendata/` with a source file for each table | Lane 3 | Planned |
| 3.3 | The concept and problem framing is distinctive | 6 | Closing the gap from both sides: RTA moves the bus, or the passenger is rewarded for moving. Four points of view. | The Khutwa prototype; the twin, part two | Lanes 2, 3 | Planned |
| 4.1 | The model fits the data and problem, justified against alternatives | 8 | Five models on the same splits, one table, the choice explained, and why not a deep network | `docs/MODEL-CARD.md` | Lane 1 | Planned |
| 4.2 | Sound cleaning, features, training, with proper train/test separation | 6 | The rule of the clock with its test; three ways of holding data out; the untouched part | `docs/MODEL-PLAN.md` sections 2, 3, 10; test output | Lane 1 | Planned |
| 4.3 | Outputs can be explained and trusted; reliable on unseen data | 6 | Three reasons for every forecast; routes and communities never seen; ranges with how often they held | `metrics.json` subsets; the model screen | Lanes 1, 2 | Planned |
| (slide) | Performance on multiple subsets of the data | | Error by time of day, route group, community group, kind of bus, direction, busy and quiet stops | `metrics.json` | Lane 1 | Planned |
| 5.1 | Low error on held-out data, correctly computed | 8 | MAE, RMSE, MAPE (with its rule) and WAPE on the untouched part | `metrics.json`; the measures' tests | Lane 1 | Planned |
| 5.2 | Quantified gain over a naive or existing forecast | 6 | Share of the best naive forecast's error removed; for buses, against the timetable | `metrics.json` | Lane 1 | Planned |
| 5.3 | Accuracy holds for short and longer horizons and at peak periods | 6 | 15 to 120 minutes ahead; the two peaks as their own rows; a day ahead if public days arrive | `metrics.json` | Lane 1 | Planned |
