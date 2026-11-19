# The call theatre: the incident told on the map

The console's calls move from a list on the right onto the map, where the people are. The audience watches Insiyab reach each person, hears and reads what they say, sees the answers become one briefing, sees a person decide, and sees the decision travel back out. Then Insiyab writes the incident report and shows what it learned.

## Sequence (demo mode is scripted and labelled; live mode follows the relay's real events)

| Step | On the map | Right panel | Sound |
|---|---|---|---|
| 1 Predict | the route glows; a predicted-risk marker appears ahead of the bus ("likely 13 min late, its bus is still out") | NOW card with the range and why | ui tick |
| 2 Suggest | gold suggestion line; options with "likely effect (estimate)" | SUGGESTED | — |
| 3 Unacknowledged | red band, countdown | — | soft alarm |
| 4 Calling | five people appear as markers: **Driver** on the moving bus (it keeps moving along its route), **Depot**, **Station**, **Planning desk**, **Duty controller** at the control centre. Each being called gets a **pulsing red ring** (attention) | each row: Calling | ring |
| 5 Talking | when a person answers, the ring turns to an **ink ring with a live voice-wave** (animated bars) and a speech bubble streams their words (demo: the real drill's words from 18 Nov; live: the relay's report text) | the row shows the report | voice-wave tick |
| 6 Compile | each report flies from its marker along a thin line into the briefing card, which assembles line by line | ONE BRIEFING: what each said, the options with likely effect, the simulated RTA system pick | soft chimes |
| 7 Decide | the duty controller's marker pulses; the decision is taken (demo: two clicks; live: by phone) | "Controller's decision, HH:MM" | confirm tone |
| 8 Relay | one sweep travels from the control centre to each person; each turns **Sent**, then **teal Received** only on an acknowledgement | per row | chime per Received |
| 9 Report | "Incident report" panel: timeline with times, what each person said, the options, the decision and who made it, who confirmed and when, what is still open | **Save as PDF** (print stylesheet, A4, brand) | — |
| 10 Learn | "What Insiyab learned": the incident becomes one labelled example (signal, prediction, decision, outcome); a small counter of labelled incidents (simulated in demo) and the line "The forecast retrains on outcomes every night" | — | — |

## Rules

- Colour: red only for attention (calling, risk); teal only for Received; gold only for Insiyab's own suggestion and the emblem; talking is ink.
- Demo mode makes zero network requests to `/voice/`; every scripted element carries "Simulated" or "Drill words, 18 Nov 2026".
- Locations of depot, station, planning desk and control centre are illustrative unless taken from public data; say so on the map.
- The driver's leg: in a real deployment it goes through RTA's in-vehicle messaging; the drill used phones.
- Reduced motion: no travel, opacity only; the report and the learning step still appear.

## Why it matters for the pitch

It is the clearest picture of "Insiyab handles the people": a judge sees five people reached at once, their words become one decision, and the system gets smarter after every incident. It is the cognitive city in one minute.
