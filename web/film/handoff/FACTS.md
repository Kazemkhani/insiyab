# Fact ledger and boundaries

Use the committed source and exact evaluation definition. All real measurements below refer to 15 December 2025. The supplied data contains one day; model generalisation to another day is untested.

| Claim | Definition and source | Presentation rule |
|---|---|---|
| 1,056,343 taps | Existing INSIYAB Flow snapshot used by story/index.html. Includes check-in and check-out events. | Not unique passengers, not all boardings, not people waiting. |
| 16.3% at 07:00, 46.6% at 19:00 | Share of recorded stop departures 5+ minutes late, punctuality_by_hour. | Rounded 16% / 47% allowed; not the fraction of unique buses. |
| 48,724 / 49,707 | Recorded boardings at 08:00 / 18:00, demand_by_hour. | Similar totals, not proof that demand cannot cause delay. |
| Route 310: 67.3 planned, 96.4 median actual | running_time_bands, direction 1, 18:00, 10 trips. 104.4 min is the 85th percentile; Add min is 37.2 from source precision. | The 67/96/16/13 clock story is an illustration. Do not claim an observed individual trip or verified layover. |
| 244 bus-hours | Evening 16:00–18:59 measured planning shortfall using route-hour trip-time percentile differences weighted by trips. | Not model output, money saved, actual elapsed delay or guaranteed improvement. |
| 589 of 945 = 62% | Late trip starts over five minutes with a linked previous trip on the same bus; previous arrival later than the next scheduled departure. FORECAST-RETEST.md. | Use this one definition. Retire 870/936/93% from the pitch. Different denominators must not be mixed. |
| 696, of which 85% start over five minutes late | All linked trip starts with bus still out when due; onday/index.html. | 696 departures, not 696 unique buses. This is a different denominator from the previous row. |
| 6.97 vs 8.25, about 15% closer | Main Flow pitch test, train before 16:00, test 2,043 trips due 16:00–18:59. | Say window beside claim. Never “15% less delay”. |
| 7.31 linear; 6.96 trees | Independent retest, project John, same pitch window; FORECAST-RETEST.md. | Label the separate run; do not silently replace the main Flow's 6.97. |
| 7.61 trees / 7.48 rule / 7.37 linear / 8.25 timetable | Committed strict-next-hour retest, using only finished trips. | Simpler methods beat trees. This is more operationally realistic than the pitch split. |
| 29 in 100; standard 85 | Timetable running time covers 29% of evening-peak trips in independent retest. | Target coverage is not achieved model accuracy. |
| From 19:00 timetable ahead | Retest reports 4.40 timetable vs 4.94 trees in the later band. | Remove the earlier “after 21:00” line. |

## Differences still requiring a new source

The latest user-provided lane-3 summary says 6.95/16% in the pitch split and 7% in the strict next-hour test. The committed retest currently says 6.96 and 8%. The site retains the committed analysis and labels it. Pull the promised reproducible Flow/recipes before replacing those values. Similarly, the 11,201 displayed trip records and 11,136 cleaned modelling trips are different populations; do not present them as contradictory estimates of the same denominator. The retest reports 11,169 before removal of 33 extreme ratios. Keep each population named.

## Government context

Dubai Media Office, 23 April 2026: https://www.mediaoffice.ae/en/news/2026/april/23-04/mohammed-bin-rashid-chairs-uae-cabinet-meeting

The announced UAE framework aims to deploy agentic AI across 50% of government sectors, services and operations within two years. It does not say half the workforce will be replaced. Insiyab is a student demonstration of a bounded agent workflow with a human decision; it is not a government deployment, endorsement or compliance certification. Keep this contextual point after the concrete use case, never as a substitute for evidence.
