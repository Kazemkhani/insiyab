# Insiyab v2: the strategy for the final

Final: **Friday 20 November 2026, 09:15, Dubai Future Foundation, Emirates Towers (Creator's HQ Auditorium). 7 to 8 minutes, then 2 minutes of questions.** Judges: RTA and Dataiku. Scored on the sheet in `docs/REQUIREMENTS.md` section 4.

This file overrides `docs/STRATEGY.md` and `docs/WOW.md` where they disagree. `docs/REQUIREMENTS.md` and `docs/RULES.md` still override everything.

## 1. The one idea

> **Insiyab sees it coming. The controller decides.**

Version 1 sold a faster reaction: a bus is late, Insiyab makes the phone calls. The team's verdict (Mustafo, 18 Nov): every verb was reactive. Version 2 moves Insiyab upstream of the problem. It **watches the evening before it happens, predicts what will go wrong, suggests a fix early, and only then makes the calls**. A person always decides.

This is not a new product. The engine already exists and is measured. It was never put at the front of the story.

## 2. Why this wins the scoring sheet

Sixty of the hundred points are about the forecasting model (criteria 3, 4, 5). "Sees it coming" makes the model the hero instead of a footnote.

| Criterion | Points | What v2 shows |
|---|---|---|
| 1 Practical application | 20 | A controller console with a live decision, the RTA Decision Support System (DSS) link, an eight-week pilot ask |
| 2 Documentation and presentation | 20 | One story, one console, honest model card, every number with its source on screen |
| 3 Innovation | 20 | Heat-aware priority (nobody does it), conformal ranges, voice agents in parallel with a human gate, Marsad-style escalation |
| 4 AI model | 20 | Boosted trees with a count loss, justified against a Poisson model and naive rules; cross-validation by route and by community; ranges that held |
| 5 Forecast accuracy | 20 | Trip time on 2,043 held-out evening trips (RTA records, Dataiku): **6.97 vs 8.25 minutes, 15% closer than the timetable**, best of four methods on MAE, RMSE and MAPE; losses shown (next hour only, after 19:00) |

## 3. What is real today (measured, say it plainly)

| Claim | Number | Where it is |
|---|---|---|
| Trip-time forecast vs three alternatives | timetable 8.25, simple rule 7.42, linear 7.31, boosted trees 6.97 minutes (MAE); RMSE 12.57 / 11.62 / 11.47 / 10.76; MAPE 10.5 / 9.3 / 9.3 / 9.0% | Dataiku flow on RTA records; `story/index.html` accuracy table; `opendata/onday/HOW-IT-CONNECTS.md` |
| **Warning: the model card's lateness tables (+42, +43, +46 in 100) and its ranges come from STAND-IN data** | never on screen or stage | `docs/MODEL-CARD.md` first paragraph |
| Trip-time forecast vs the timetable | 6.97 vs 8.25 minutes off, 15% closer, 2,043 held-out evening trips | deck, `docs/MODEL-CARD.md` |
| Early-warning signal | 85 in 100 departures leave 5+ min late when their bus is still out on its last trip (696 cases) | deck |
| Boarding forecast | +4 to +8 in 100, **range includes zero: never claim it beats naive** | `docs/MODEL-CARD.md:49,51,103-105` |
| Stop shelters | 553 air-conditioned shelters and 993 bare poles among the 1,600 stops whose kind is published (2020 to 2022 reports) | `opendata/public/bus-stops.csv`, `bus-network.source.md` |
| Calling drill | 4 reports, 1 human decision, 4 confirmations, on real phones, 18 Nov 2026 | relay record |
| The problem | 45% of evening departures 5+ min late vs 19% in the morning, same crowd (49,707 vs 48,724); route 310 19:23 left 19:36 | RTA records, 15 Dec 2025 |

## 4. The six watchers (what "sees it coming" means)

Each watcher reads one kind of signal, raises one kind of alert, and never decides. Built status is part of the name on screen.

| Watcher | Reads | Alert, in the console's words | Built by Friday | Honest label |
|---|---|---|---|---|
| **Running late** | live position, the lateness model, the bus-still-out signal | "Route 310, 19:23: likely 13 min late. Its bus is still out." | yes | measured model |
| **Overflow** | boarding forecast, seats on the bus type in the fleet list | "Route 8, 18:40: more riders likely than seats." | yes | estimate, range shown |
| **Heat** | stop kind (pole or air-conditioned shelter), hourly temperature and humidity (Open-Meteo), forecast wait | "Stop X, 14:30: bare pole, feels like 44°C, next bus 18 min late." | yes | priority rule, not a model |
| **Lanes and roads** | dedicated bus lane openings (RTA), average speed by route and hour (Dubai open data) | "Route on Al Satwa Street gains a bus lane: trip times will change, forecast flagged for review." | rule + list | roadmap for the model |
| **Events** | public event calendar, venue capacity, nearest stops | "Global Village, 22:00 close: 4 routes, expect a surge." | list + rule | simulated where no data |
| **Connections and last mile** | a predicted-late bus, the connection its riders head for (metro, last Bus On Demand van), on-demand zones | "Route 310 riders will miss the 19:58 metro: hold the feeder 3 min, or send a Bus On Demand minibus to the stop." | rule | proposal; connection protection is proven practice elsewhere |

Then the loop, as the brand's motion spec draws it: **suggest a fix with its likely effect → if a critical alert is not acknowledged, count down and phone the duty controller (Marsad pattern) → the controller decides → Insiyab calls driver, depot, station and planning in parallel → relays the decision → each person confirms ("Received" in teal only when they did).**

## 5. Dubai-specific: what nobody addresses

- **Heat.** Dubai summers reach about 45°C with humidity (Bloomberg, Jul 2024; The National, Aug 2025). The midday outdoor-work ban (12:30 to 15:00, 15 Jun to 15 Sep, MoHRE) protects workers, not people waiting for a bus. RTA runs 893 air-conditioned shelters at 622 locations (WAM, May 2025), but most stops are poles. Singapore solved shade with 200 km of covered walkways (LTA Walk2Ride). Dubai's answer can be operational: **the same delay is more urgent at a bare pole at 15:00 in July.** A UCLA study found rerouting about 10% of a hot city's fleet cut riders' heat exposure by 35% (Phoenix model). The founder's idea extends it to riders: **shade-aware walking routes** to the stop (2030 vision; a static prototype layer only if time allows).
- **Bus lanes.** RTA expects 24 to 59% shorter peak journey times on routes that gain dedicated lanes; the network grows from 6.1 to 20.6 km (Khaleej Times, 21 Jun 2026, verified). A forecast trained before a lane opens is wrong after it: Insiyab flags those routes for retraining instead of trusting stale times.
- **Events.** RTA publishes event services days ahead (Global Village routes, Dubai Run, Eid), but not demand-responsive changes as a crowd builds. RTA already predicts marine demand with AI (WAM, May 2026); buses are next.

- **The last mile.** The most expensive part of moving people, as of moving parcels, is the last stretch: vehicles there run nearly empty. RTA already runs the pieces: Bus On Demand (984,929 riders in 2025, up 136%, 17 areas, 49 buses: Dubai Media Office, 11 May 2026), e-scooters and bikes, delivery robots on approved walkways (talabots 2023, noon 2025), robotaxi test permits (Sep 2025), and a target of 25% of all journeys autonomous by 2030. What nobody does is **protect the whole journey when the bus is late**. Insiyab can: a predicted delay triggers connection protection (hold the feeder, or send an on-demand minibus), a proven practice since Utah Transit in 2002 and a standard function in the US transit architecture. And for planners, the boarding forecast points at the route-hours that run nearly empty, which is exactly where on-demand is cheaper than a fixed bus (research finds it is cheaper only at low demand: TCRP). That is the challenge's own words: "improve cost-effectiveness".

## 6. The arc (bold, each step standing on the last)

| | What Insiyab is |
|---|---|
| **Now, 2026** | Measured on RTA's records: a trip-time forecast 15% closer than the timetable, an early-warning signal (85 in 100), a calling agent that ran end to end. The ask: one control-centre shift, selected evening routes, eight weeks. |
| **2030** | The forecast learns seasons, events, heat and new lanes from months of data. Its early warning feeds RTA's Decision Support System as a trigger. Riders get heat-aware arrival times and shaded walking routes. When a bus is late, Insiyab protects the connection and sends an on-demand or autonomous shuttle for the last mile (Dubai's target: 25% of journeys autonomous by 2030). Bus, metro, marine and on-demand share one anticipatory layer. |
| **2040** | The Dubai 2040 Urban Master Plan puts people and public transport at the centre. Insiyab is the city's foresight for movement: the control room sees tomorrow's problems today and arranges the fix before anyone waits. |

Line for the close: **"Dubai does not wait for the impossible. It schedules it. Insiyab sees it coming. The controller decides."**

## 7. Banned claims (each one would fail in front of RTA)

| Do not say | Say instead |
|---|---|
| "RTA's AI cut delays by 68%" | "RTA's AI dashboards cut **early** departures by more than 68%" (RTA, 8 Jun 2026) |
| "RTA improved punctuality by 50%" | nothing; one newspaper headline, no RTA source |
| "Our boarding model beats the naive forecast" | "Our boarding forecast is close to the best simple rule; we show its range" |
| "The warning comes 30 minutes / an hour ahead" | "The trip-time forecast is made before departure; the bus-still-out signal is read when the departure is due" |
| "+46 / +43 in 100", "20 stops ahead", "ranges held 91 to 98" | these come from the stand-in engine run; use the real trip-time result (15%, 6.97 vs 8.25) |
| "Robots cut last-mile delivery cost by X" | no published figure; say "RTA already approves delivery robots and robotaxi trials" |
| "Every late bus was late an hour ago" | "Most late evening departures were visible before they left: 85 in 100 when the bus was still out" |
| Any count of unshaded stops we did not compute | "553 air-conditioned shelters and 993 poles among the stops whose kind RTA published" |
| "Insiyab is connected to RTA's DSS" | "Designed to sit beside the DSS; a proposal, not connected or tested" |
| "AI decides" / "AI fixed the route" | "Predicted delay. Three options ready for review. A person decides." |

## 8. What is cut from the stage

The nol Plus rewards idea (one sentence in Q&A only), the policy-alignment slide (one sentence in the arc), the seven-row DSS table (one diagram), the sources slide as a presented slide (backup only), every screen that is a debugging page.
