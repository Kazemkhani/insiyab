# Facts for v2, with their sources and how sure we are

**Verified** = a team member or Claude read the primary source and saw the words. **Reported** = a research agent found it; stream F (Sarah) must open the link and either mark it verified or drop it before it goes on a screen. Nothing marked Reported goes on stage.

## From our own work (measured)

| Fact | Status | Source |
|---|---|---|
| Trip-time forecast, 2,043 held-out evening trips: MAE timetable 8.25, simple rule 7.42, linear 7.31, boosted trees 6.97 min; RMSE 12.57/11.62/11.47/10.76; MAPE 10.5/9.3/9.3/9.0% | Verified | RTA records in Dataiku; `story/index.html` accuracy table |
| Model card lateness tables (+42/+43/+46 in 100) and conformal ranges | **STAND-IN, never on screen** | `docs/MODEL-CARD.md` first paragraph: invented raw tables |
| Boarding forecast tables in the model card | STAND-IN, never on screen | `docs/MODEL-CARD.md` |
| Trip time 6.97 vs 8.25 min, 15% closer, 2,043 held-out evening trips | Verified | deck, model card |
| 85 in 100 late when the bus is still out; 696 cases | Verified | Insiyab analysis, deck |
| 45% vs 19% late; 49,707 vs 48,724 boardings; route 310 19:23 left 19:36; 67 vs 96 min | Verified | RTA records 15 Dec 2025 (aggregates) |
| Six controllers per shift, about 1,400 buses | Verified (team notes, stated by RTA staff) | RTA control-centre and planning staff, in conversation with the team, 18 November 2026. RTA's DSS release says it monitors 1,100+ buses: say both and where each comes from |
| 1,071 buses, 166 routes, 11,201 trips, 1,056,343 card taps, 544,583 check-ins on Monday 15 Dec 2025 | Verified | RTA hackathon records in Dataiku (aggregates computed by the census program, `model/census.py`); rows stay on RTA's platform |
| 553 `ac_shelter`, 993 `pole` among 1,600 stops of known kind (of 4,526); kinds from 2020 to 2022 reports | Verified | `opendata/public/bus-stops.csv`, `opendata/public/bus-network.source.md` |
| Drill: 4 reports, 1 human decision, 4 confirmations, 18 Nov 2026 | Verified | relay record |

## RTA and Dubai

| Fact | Status | Source |
|---|---|---|
| RTA Decision Support System: 1,100+ buses, 26 scenarios, deployment cut from 30 to 60 min to under 1 min, built with RTA's AI Centre on its Dataiku platform | Verified | RTA press release, 6 Jul 2026, https://www.rta.ae/wps/portal/rta/ae/home/news-and-media/all-news/NewsDetails/enhancing-the-operational-efficiency-of-1100-buses-through-an-ai-powered-system ; Khaleej Times same day |
| Dedicated bus and taxi lanes: peak journey times 24 to 59% shorter on routes using them (Naif St 59%, Al Satwa 54%, Omar Bin Al Khattab 50%, Al Nahda 38%); network 6.1 km growing by 14.5 km to 20.6 km, 30% of the expansion done | Verified | Khaleej Times, 21 Jun 2026, https://www.khaleejtimes.com/uae/dubai-new-taxi-bus-lanes |
| 893 air-conditioned bus shelters at 622 locations | Reported | WAM, May 2025, https://www.wam.ae/en/article/bjxo8ym-rta-announces-full-readiness-air-conditioned-bus-shelters ; Khaleej Times https://www.khaleejtimes.com/uae/dubai-rta-893-air-conditioned-bus-shelters |
| 595 of 762 new shelters done; only part of primary stops (over 750 riders a day) get an air-conditioned area | Reported | RTA, 7 Dec 2025 |
| RTA AI dashboards cut **early** departures by more than 68% (not delays) | Reported | RTA, 8 Jun 2026, https://www.rta.ae/wps/portal/rta/ae/home/news-and-media/all-news/NewsDetails/ai-contributes-68percent-to-reducing-early-bus-departures |
| RTA AI strategy: Agentic AI Bus Network Planner, about 20 agents; up to 10% better bus on-time performance | Reported | Gulf News, Nov 2026; WAM https://wam.ae/en/article/c31bwf9-rta-launches-updated-artificial-intelligence |
| RTA predicts marine transport demand with AI (seasons, holidays, events) | Reported | WAM, May 2026, https://www.wam.ae/en/article/c0b3e4c-rta-uses-optimise-seasonal-marine-transport |
| UAE Cabinet, 23 Apr 2026: 50% of government sectors, services and operations to agentic AI within two years | Verified (earlier session) | Dubai Media Office, 23 Apr 2026 |
| Midday outdoor-work break 12:30 to 15:00, 15 Jun to 15 Sep (MoHRE); covers outdoor workers, not the public | Reported | The National, 15 Jun 2025; Gulf News |
| Dubai summer highs about 45°C; humid days feel above 60°C | Reported | Bloomberg, 30 Jul 2024; The National, 4 Aug 2025 |
| RTA publishes event services in advance (Global Village 4 routes; Dubai Run; Eid) | Reported | RTA / Media Office, Khaleej Times |

| Bus On Demand: 984,929 riders in 2025 (417,315 in 2024, about +136%); 17 areas, 49 buses (May 2026); AED 5 a trip | Verified | Dubai Media Office, 11 May 2026, https://www.mediaoffice.ae/en/news/2026/may/11-05/rta-adds-four-new-areas-to-bus-on-demand-network-following-136-percent--ridership-growth-in-2025 |
| Dubai Smart Self-Driving Transport Strategy: 25% of all journeys autonomous by 2030; RTA test permits to Apollo Go, WeRide, Pony.ai, 26 Sep 2025 | Verified | Dubai Media Office, 26 Sep 2025, https://prod.mediaoffice.ae/en/news/2025/september/26-09/rta-grants-first-autonomous-driving-test-permits |
| Delivery robots: talabots (RTA, DIEZ, talabat), Dubai Silicon Oasis, Feb 2023; noon with Yango, RTA-approved walkways, Dec 2025. No cost-saving figure published | Reported | Gulf Today 15 Feb 2023; MENA Startup Digest 10 Dec 2025 |
| RTA last-mile plan (Jul 2026): 34 residential areas linked, 63 Metro and bus stations upgraded by 2030 | Reported | The National, 19 Jul 2026 |
| 57.3 million bike rides and 39.6 million e-scooter trips in 2025 | Reported | Gulf News, Jul 2026 |

## Elsewhere (comparators)

| Fact | Status | Source |
|---|---|---|
| Connection protection: Utah Transit Authority since 2002, about 8 buses held a day at 20 light-rail stations; US ITS service package PT17 | Reported | US DOT / Battelle evaluation 2004, https://rosap.ntl.bts.gov/view/dot/38877 |
| Demand-responsive transit is cheaper per trip than fixed route only at low density or low demand | Reported | TCRP / National Academies report 25414 |
| Last mile is 41% (2018) to 53% (2024) of parcel shipping cost | Reported, secondary only | attributed to Capgemini Research Institute |
| Singapore LTA Walk2Ride: 200 km of sheltered walkways by Sep 2018; within 400 m of MRT stations | Reported | LTA walking page; LTA factsheet 2018 |
| Rerouting about 10% of a hot desert city's fleet cut riders' heat exposure by 35% (simulation, Phoenix) | Reported | UCLA IoES summary; Sustainable and Resilient Infrastructure |
| Hong Kong MTR crowd prediction for Kai Tak events, about 90% accuracy claimed | Reported | SCMP; RTHK Aug 2025 |
| Google Opinion Rewards 100M+ downloads (Sep 2024); in the UAE since April 2020; ESOMAR US$153bn (2024); nol Plus points | Verified (earlier session) | 9to5Google; Android Police; ESOMAR; RTA |

## Never say (see `docs/v2/STRATEGY.md` section 7)

68% "delays"; 50% punctuality; boarding model beats naive; "30 minutes / an hour ahead" for the 85-in-100 signal; any count of unshaded stops we did not compute; "connected to the DSS"; "AI decides".
