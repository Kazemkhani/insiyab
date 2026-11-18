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
| 5 Forecast accuracy | 20 | Lateness 5 to 20 stops ahead: **43 to 46 in 100 better than the best naive rule**; trip time 15% closer than the timetable; by horizon, by peak, losses shown |

## 3. What is real today (measured, say it plainly)

| Claim | Number | Where it is |
|---|---|---|
| Lateness forecast, 5 stops ahead | +46 in 100 vs "the bus stays as late as it is now" (MAE 29.6 s vs 54.3 s, n 10,202) | `docs/MODEL-CARD.md:217` |
| Lateness forecast, 10 and 20 stops ahead | +43 in 100 each (n 8,326 and 4,734) | `docs/MODEL-CARD.md:218-219` |
| Lateness forecast, 1 stop ahead | +2 in 100: no real gain that close, say so | `docs/MODEL-CARD.md:216` |
| Trip-time forecast vs the timetable | 6.97 vs 8.25 minutes off, 15% closer, 2,043 held-out evening trips | deck, `docs/MODEL-CARD.md` |
| Early-warning signal | 85 in 100 departures leave 5+ min late when their bus is still out on its last trip (696 cases) | deck |
| Confidence ranges | promised 90 in 100, held 91 to 98 in 100 (conformal, rolling) | `docs/MODEL-CARD.md:81,144` |
| Boarding forecast | +4 to +8 in 100, **range includes zero: never claim it beats naive** | `docs/MODEL-CARD.md:49,51,103-105` |
| Stop shelters | 553 air-conditioned shelters and 993 bare poles among the 1,600 stops whose kind is published (2020 to 2022 reports) | `opendata/public/bus-stops.csv`, `bus-network.source.md` |
| Calling drill | 4 reports, 1 human decision, 4 confirmations, on real phones, 18 Nov 2026 | relay record |
| The problem | 45% of evening departures 5+ min late vs 19% in the morning, same crowd (49,707 vs 48,724); route 310 19:23 left 19:36 | RTA records, 15 Dec 2025 |

## 4. The five watchers (what "sees it coming" means)

Each watcher reads one kind of signal, raises one kind of alert, and never decides. Built status is part of the name on screen.

| Watcher | Reads | Alert, in the console's words | Built by Friday | Honest label |
|---|---|---|---|---|
| **Running late** | live position, the lateness model, the bus-still-out signal | "Route 310, 19:23: likely 13 min late. Its bus is still out." | yes | measured model |
| **Overflow** | boarding forecast, seats on the bus type in the fleet list | "Route 8, 18:40: more riders likely than seats." | yes | estimate, range shown |
| **Heat** | stop kind (pole or air-conditioned shelter), hourly temperature and humidity (Open-Meteo), forecast wait | "Stop X, 14:30: bare pole, feels like 44°C, next bus 18 min late." | yes | priority rule, not a model |
| **Lanes and roads** | dedicated bus lane openings (RTA), average speed by route and hour (Dubai open data) | "Route on Al Satwa Street gains a bus lane: trip times will change, forecast flagged for review." | rule + list | roadmap for the model |
| **Events** | public event calendar, venue capacity, nearest stops | "Global Village, 22:00 close: 4 routes, expect a surge." | list + rule | simulated where no data |

Then the loop, as the brand's motion spec draws it: **suggest a fix with its likely effect → if a critical alert is not acknowledged, count down and phone the duty controller (Marsad pattern) → the controller decides → Insiyab calls driver, depot, station and planning in parallel → relays the decision → each person confirms ("Received" in teal only when they did).**

## 5. Dubai-specific: what nobody addresses

- **Heat.** Dubai summers reach about 45°C with humidity (Bloomberg, Jul 2024; The National, Aug 2025). The midday outdoor-work ban (12:30 to 15:00, 15 Jun to 15 Sep, MoHRE) protects workers, not people waiting for a bus. RTA runs 893 air-conditioned shelters at 622 locations (WAM, May 2025), but most stops are poles. Singapore solved shade with 200 km of covered walkways (LTA Walk2Ride). Dubai's answer can be operational: **the same delay is more urgent at a bare pole at 15:00 in July.** A UCLA study found rerouting about 10% of a hot city's fleet cut riders' heat exposure by 35% (Phoenix model). The founder's idea extends it to riders: **shade-aware walking routes** to the stop (2030 vision; a static prototype layer only if time allows).
- **Bus lanes.** RTA expects 24 to 59% shorter peak journey times on routes that gain dedicated lanes; the network grows from 6.1 to 20.6 km (Khaleej Times, 21 Jun 2026, verified). A forecast trained before a lane opens is wrong after it: Insiyab flags those routes for retraining instead of trusting stale times.
- **Events.** RTA publishes event services days ahead (Global Village routes, Dubai Run, Eid), but not demand-responsive changes as a crowd builds. RTA already predicts marine demand with AI (WAM, May 2026); buses are next.

## 6. The arc (bold, each step standing on the last)

| | What Insiyab is |
|---|---|
| **Now, 2026** | Measured: a lateness forecast that sees 20 stops ahead, an early-warning signal, a calling agent that ran end to end. The ask: one control-centre shift, selected evening routes, eight weeks. |
| **2030** | The forecast learns seasons, events, heat and new lanes from months of data. Its early warning feeds RTA's Decision Support System as a trigger. Riders get heat-aware arrival times and shaded walking routes. Bus, metro and marine share one anticipatory layer. |
| **2040** | The Dubai 2040 Urban Master Plan puts people and public transport at the centre. Insiyab is the city's foresight for movement: the control room sees tomorrow's problems today and arranges the fix before anyone waits. |

Line for the close: **"Dubai does not wait for the impossible. It schedules it. Insiyab sees it coming. The controller decides."**

## 7. Banned claims (each one would fail in front of RTA)

| Do not say | Say instead |
|---|---|
| "RTA's AI cut delays by 68%" | "RTA's AI dashboards cut **early** departures by more than 68%" (RTA, 8 Jun 2026) |
| "RTA improved punctuality by 50%" | nothing; one newspaper headline, no RTA source |
| "Our boarding model beats the naive forecast" | "Our boarding forecast is close to the best simple rule; we show its range" |
| "The warning comes 30 minutes / an hour ahead" | "The lateness forecast looks up to 20 stops ahead; the trip-time forecast is made 30 minutes before departure" |
| "Every late bus was late an hour ago" | "Most late evening departures were visible before they left: 85 in 100 when the bus was still out" |
| Any count of unshaded stops we did not compute | "553 air-conditioned shelters and 993 poles among the stops whose kind RTA published" |
| "Insiyab is connected to RTA's DSS" | "Designed to sit beside the DSS; a proposal, not connected or tested" |
| "AI decides" / "AI fixed the route" | "Predicted delay. Three options ready for review. A person decides." |

## 8. What is cut from the stage

The nol Plus rewards idea (one sentence in Q&A only), the policy-alignment slide (one sentence in the arc), the seven-row DSS table (one diagram), the sources slide as a presented slide (backup only), every screen that is a debugging page.
