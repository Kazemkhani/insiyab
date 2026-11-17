# Insiyab: the whole context, as of Tuesday 17 November 2026, 15:45 Dubai time

One file for anyone, person or AI, who joins now. Written by lane 1. It says what exists, what was learned, what was decided, and what is still open. Where it gives a number, the number was computed inside Dataiku on RTA's real day, and says who checked it.

**The pitch is Wednesday 18 November at 10:30. Ten minutes, then five of questions. Wednesday is the shortlist; the final is Friday.**

## 1. What this is

Insiyab is a team entry for the RTA Future Move Hackathon (Dubai Roads and Transport Authority, with Dataiku as technical partner). RTA gave every team one real service day of bus data, Monday 15 December 2025, inside a Dataiku instance. The brief: use it to optimise bus services, and be scored on five criteria of 20 points each.

| Criterion | What it rewards |
|---|---|
| 1. Practical | fits the business problem, gives actions, can be deployed |
| 2. Documentation and presentation | clear documentation, good visuals, a delivered pitch |
| 3. Innovation | new technique, creative use of data and features, original design |
| 4. AI model | model choice, data preparation and training, explainability |
| 5. Accuracy | MAE, MAPE, RMSE; gain over a baseline; accuracy across horizons |

## 2. The people and the lanes

| Lane | Who | Owns |
|---|---|---|
| 1 | Claude, on Amir's laptop (`~/dev/insiyab`) | the engine (`model/`), Dataiku, deploys, contract, `docs/` |
| 2 | Codex, on Amir's laptop | the public site (`web/`), the film (`web/film/`) |
| 3 | Devin, on Mustafo's laptop | open data (`opendata/`), the passenger page (`rider/`) |
| 4 | Claude, on Mustafo's laptop | the pitch (`docs/pitch/`): **has written nothing** |

Amir Hossein Kazemkhani leads. A teammate ("John" in Dataiku) analysed the real day independently in project `JOHN`, notebook `ops_issues_analysis`. Lanes talk through `coordination/lane-N.md`, append-only.

## 3. Where everything is

| Thing | Where |
|---|---|
| Repository | `~/dev/insiyab`, GitHub `Kazemkhani/insiyab` (private), branch `main` |
| Public site (plan B, stand-in data, labelled) | https://insiyab.amirkazemkhani.com : `DEPLOYED AND VERIFIED 14dcf8e`, 13:31 |
| Dataiku project | `INSIYAB` : https://dss-8a0eac1b-a0da2b15-dku.eu-west-2.app.dataiku.io/projects/INSIYAB/flow/ |
| Dataiku web app | "Insiyab", id `kvDViy2` : .../projects/INSIYAB/webapps/kvDViy2_insiyab/view |
| Dataiku scenario | "Nightly rebuild": one run, SUCCESS, 131 seconds; switched off (one day of data) |
| Dataiku notebook | `insiyab_build` (how the flow was created; holds helper functions) |
| Web app source and test | `dataiku/webapp/`, `tests/test_dataiku_webapp.py` |
| Engine as flow stages | `dataiku/lib/`, `dataiku/recipes/`, `tests/test_dataiku_flow.py` |
| The pitch, minute by minute | `docs/PITCH-RUN.md` |
| Real formats of RTA's tables | `docs/DATA.md` section 7 |
| Every review and what RTA's engineer said | `docs/TEST-LOG.md` |
| What other cities have done (31 sources) | `docs/research/bus-optimisation-worldwide.md` (not yet checked line by line) |
| Film | `~/work/insiyab-run/film/comic/Insiyab-comic.mp4`; sound in `~/work/insiyab-run/film/audio/` |
| Team briefing page | https://claude.ai/artifact/UEZq7WYVQPfWB41vAh1U92 (private until Amir shares it) |

**Not in the repository:** the six Python recipes of the live flow exist only inside Dataiku. Exporting the project from Dataiku is the backup.

## 4. The data, as it really is

All in Dataiku project `DATA`, shared into `INSIYAB`. Every column arrives as text.

| Table | Rows | What it holds |
|---|---|---|
| `nol_card_details_15-Dec-2025` | 1,056,343 | taps: 544,583 check-ins, 511,760 check-outs, separate rows; about 313,000 cards |
| `Running_time_15-Dec-2025` | 259,435 | every bus at every stop: scheduled and actual times; 11,201 trips; 1,071 vehicles; 166 city routes |
| `Fleet_List` | 3,264 | vehicle, type, model year, seats, standing (marked "not verified") |
| GTFS tables | | the PLANNED service for September to December 2026, not the day |
| Communities | 224 | a map export |

Things that cost a day to learn: a tap's vehicle is written `B6424_EVD_02`; doors are `Door Open` or `Drive Through`; tap times have no seconds; times after midnight are written 24:00 to 30:59; taps before 03:00 belong to the end of the service day; the running-time table covers city routes only, so some tapped routes have no trips.

**What the data does not hold:** how many people were waiting at a stop; any record of a breakdown, a fault, a cancelled trip or its cause; any message between the control centre and a driver; weather; traffic.

## 5. What is built in Dataiku, on the real day

Four zones, fourteen steps: eight visual Group recipes, six short Python recipes.

| Zone | Question | Steps |
|---|---|---|
| Passenger demand | who boards, where, when | `count_taps` (Python); `demand_by_hour`, `demand_by_route_hour`, `demand_by_stop` (Group) |
| Service reliability | does the bus leave on time | `clean_running_time` (Python); `punctuality_by_hour`, `punctuality_by_route_hour`, `punctuality_by_bus_type` (Group) |
| Supply and capacity | were enough buses sent | `buses_needed_rule` (Python); `supply_status_by_hour` (Group) |
| Forecast | how long will each trip take | `build_trip_table`, `forecast_running_time`, `running_time_bands` (Python); `running_time_ledger_by_hour` (Group) |

The web app has seven tabs with the same names as the zones: The day, Passenger demand, Service reliability, Supply and capacity, Forecast, What if, How it is built. All seven were opened on the real day and work. An eighth, "Planner's worklist", is being built.

## 6. What the day shows

| Finding | Figure | Checked by |
|---|---|---|
| Departures 5+ minutes late at 19:00, against 07:00 | 47% of 15,475, against 16% of 14,970 | lane 1, in the web app |
| Trips from 16:00 to 18:59 finishing 5+ minutes late | 52.6% (morning 22.3%) | lane 1 and the teammate, separately |
| Late starts that follow the same bus arriving late | 870 of 936 (teammate: 604 of 998, another definition) | both |
| Scheduled layover | about 16 minutes at every hour | both |
| RTA's planning rule at 18:00 | 118 routes short of buses, 2 with room | lane 1 |
| Extra running time needed to cover 85 trips in 100 | about 244 bus hours from 16:00 to 18:59; about 630 in the day (teammate: 569) | both, separately |
| Worst case | route 310 at 18:00: planned 67 minutes, the middle trip took 96 | lane 1 |
| Older buses (2012 or before) finishing late | 33.0% against 28.8% for 2017 to 2020; routes not controlled for | lane 1 |

**The forecast** predicts how long a trip will take, 30 minutes before it leaves. It learned from trips before 16:00 and was tested on the evening.

| Method, 2,043 trips from 16:00 to 18:59 | Average miss |
|---|---|
| RTA's timetable | 8.25 minutes |
| Best simple forecast (this route earlier that day) | 7.42 |
| The model (gradient-boosted trees) | 6.97 : 15% better than the timetable, range 12% to 19% |

Its limits, to be said aloud: only 6% better than the best simple forecast; live signals added nothing 30 minutes ahead, because a bus's previous trip has not finished by then; from about 21:00 the timetable beats the model; one day of data.

**Not to be trusted yet:** the engine's passenger loads ("how full was this bus"). A fix for taps at a terminus is in the code (`42b09b7`) and has not been rerun on the real day.

**A correction made today:** "the buses exist, in the wrong place" is not what the day shows. It shows short at the peak nearly everywhere and room at other hours. The gap is one of timing.

## 7. What each outside voice said

| Who | The point |
|---|---|
| Dataiku judge, first talk | Build it in Dataiku as a Flow he can see. Facts before vision. One idea done well, "one and a half" at most. Rewards and surveys are "the cherry", said last. |
| Dataiku judge, his own demo | Flow zones that match the web app's tabs; a what-if; a chatbot is a quick win. "No excuse to land without something visual." Six pm being bad "is not surprising": show why. Keep the public site as plan B. |
| RTA's scheduling engineer | Buses needed = boardings in the hour divided by what a bus carries (about 35 seated and 35 standing). Timetables change every one to two months; routes four times a year. Spare buses are sent from staffed stations when the next bus is full and none follows within the frequency. Most stops are not monitored. Drivers and stations speak to the control centre live. |
| The teammate's analysis | The evening breaks, not the morning; one running time and one layover all day; pay for the evening from near-empty off-peak trips. |
| Outside reviewer (UAE Digital Lab) | "They have seen it. How do they USE it?" Who is the user, how often does it rerun, what changes daily, where is the human. Calling drivers: "don't they have screens?" Nobody knew. Skipping stops: odd. Event agents: events are known a month ahead. Ask a bus driver. |
| Independent judge review of the site | 58, then 64, then 72 of 100 on stand-in data. Presentation 0 of 6 because nobody has delivered it. |

## 8. Decisions that stand

- The product is built and shown inside Dataiku. The public site is the fallback.
- The story order is tell, show, tell: film teaser, web app, the Flow, one deep example (the forecast), wrap.
- Nothing about one card, device, driver or single vehicle is ever shown.
- Measured and simulated are never mixed; simulated is labelled.
- Boardings, never people "waiting". Seats and standing named separately. Bus hours, not money.
- Cut at 15:20 after the outside reviewer: AI phone calls to drivers, skipping stops, agents scanning for events, routes that change by the day.
- The hackathon's own AI connection in Dataiku (`RTA_Hackathon_OpenAI`) may be used; aggregated totals may be shown (Amir, 13:20).

## 9. OPEN DECISION, raised by Amir at 15:40: handling one situation live, with phone calls

**The idea.** Not long-term planning, which RTA already does. A specific situation: a bus is badly delayed. The control centre's system calls the people involved by phone (Twilio), gathers what each one knows, then calls the duty manager, who decides. The team would act it out: four of us receive the calls.

**What exists that it could stand on.**
- A trigger from the real day: a trip leaving 10 or 15 minutes late, or forecast to run long. Both are in `trip_table` and `running_time_forecast`.
- The effect of a decision: the What if tab already recomputes a route and hour when a bus is added.
- RTA's own dispatch test, from the engineer: next bus full, none within the frequency, send a spare.
- A phone relay with a call endpoint (`live/api/room/`), and a Twilio account. Its rule: calls go only to numbers Amir has typed into a file outside the repository, and the first real call is made only after Amir types "call me".

**What it cannot stand on.**
- The data has no breakdowns and no causes. "What causes breakdowns" cannot be answered from these tables. What can be measured is lateness and where it starts.
- Nobody on the team knows how the control centre reaches a driver today. The outside reviewer asked; no one could say.
- This contradicts the cut made at 15:20 (AI calls to drivers), three hours of work on the planner's use, and the judge's "one idea done well".

**Lane 1's advice.** If it is done, do it as the "half" and not the whole: one incident, replayed from the real day, with a human deciding, shown after the forecast. Call it a control-centre drill, say plainly that the calls are a demonstration to the team's own phones, and do not claim it is how RTA works. Do not rebuild the pitch around it tonight.

**Amir decides.** Until he does, the plan in `docs/PITCH-RUN.md` stands.

## 10. Not done, in order of worth for 10:30

1. Nobody has rehearsed the pitch. Nobody is named to present.
2. The "Planner's worklist" tab (being built).
3. The film still tells the old "empty bus across the city" story (lane 2 has the brief).
4. The engine's loads have not been rerun on the real day with the terminus fix.
5. No chatbot.
6. The live flow's Python recipes are not in the repository.
7. Lane 4 has written nothing.
8. The shared store for the public site's live room is not set up.

## 11. How to check anything yourself

```
cd ~/dev/insiyab
bash scripts/gates.sh                               # last line: ALL GATES PASS
.venv/bin/python tests/test_dataiku_webapp.py       # last line: ALL PASS
.venv-dss/bin/python tests/test_real_formats.py     # the engine on RTA's real formats
curl -s https://insiyab.amirkazemkhani.com/deploy.json
```

A lesson repeated four times today: a step that finishes is not a step that worked, and a test on made-up tables proves only what was imagined. Read the counts, and open the real screen.
