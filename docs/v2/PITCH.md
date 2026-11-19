# The final: 7 minutes 30 seconds, beat by beat

Target 7:30, hard stop 8:00, then 2 minutes of questions. Spoken pace about 140 words a minute, sentences of 12 words or fewer, one number per beat. Speakers are a proposal; stream E (Sara) finalises them after the first rehearsal.

Screen order: **film (first 40 s) → deck → live console → deck → close.** One clicker. The console runs on a second browser tab, already open and at its start state.

| # | Time | Speaker | On screen | What is said (draft) |
|---|---|---|---|---|
| 1 | 0:00 to 0:40 | (film) | Film v2, scenes 1 to 4: the bus stop at 19:23, 19:36 in red, 45%, six controllers | The film's own voice. Lights low. |
| 2 | 0:40 to 1:20 | Amir | Deck: black, then **"Insiyab sees it coming."** | "That evening was not bad luck. It was visible before it happened. The bus that left at 19:36 was still out on its last trip at 19:23. When that happens, the next departure leaves late 85 times in 100. The signal was there. Nobody was reading it. Insiyab reads it." |
| 3 | 1:20 to 3:00 | Mustafo | Deck: the six watchers, then the model: four methods on 2,043 held-out trips (MAE, RMSE, MAPE) | "Insiyab watches six things: buses running late, buses about to overflow, stops in the heat, roads that change, events, and the connections riders are heading for. The heart is a forecast of how long each evening trip will really take. We tested it on 2,043 evening trips it never saw, on RTA's own records. Four methods: the timetable misses by 8.25 minutes, our boosted trees by 6.97. Fifteen per cent closer, and the lowest error on all three measures. Where it loses, we show it: for the next hour only, a simple rule wins; after seven in the evening, the timetable is as close." |
| 4 | 3:00 to 4:30 | Amir (talks) + Mustafo (clicks) | **Live console** | "This is Insiyab Live. Map on the left, decisions on the right. At 18:53 it flags route 310: likely 13 minutes late. It suggests a fix, with the likely effect of each option. Nobody acknowledges. Insiyab does not wait." Countdown, then **a phone on our table rings**: the duty controller answers. "The controller decides. Insiyab calls the driver, the depot, the station and planning at once, relays the decision, and each one confirms." Teal "Received", one by one. |
| 5 | 4:30 to 5:30 | Sara | Deck: Dubai heat map (poles vs air-conditioned shelters), bus lanes | "Dubai is not Singapore. Singapore built 200 km of covered walkways. Here, of the 1,600 stops whose kind RTA published, 993 are bare poles and 553 are air-conditioned shelters. Insiyab ranks the same delay higher at a bare pole at 15:00 in July. And when RTA opens a bus lane, journeys get up to 59% shorter. A forecast trained before the lane is wrong after it. Insiyab knows which routes changed. And when a bus is late, Insiyab protects the whole journey: it holds the connection or sends a Bus On Demand minibus. The last mile is where a city shows it thought about people." |
| 6 | 5:30 to 6:00 | Maruf | Deck: one diagram, RTA's Decision Support System in the middle | "RTA's Decision Support System picks the bus in under a minute. Insiyab is what happens before it, and around it: the early warning going in, the people coming out. Same Dataiku platform. A proposal: we have not connected to it." |
| 7 | 6:00 to 6:50 | Sarah | Deck: the arc 2026, 2030, 2040; the shade-route vision | "Now: one shift, selected evening routes, eight weeks. We measure controller minutes on calls, departures leaving late, and incidents caught before they happened. By 2030 the forecast learns seasons, events, heat and new lanes, riders get shaded walking routes to their stop, and on-demand and autonomous shuttles cover the last mile when a bus runs late. Dubai wants a quarter of all journeys autonomous by 2030; Insiyab is how they arrive on time. By 2040, the city sees tomorrow's problems today." |
| 8 | 6:50 to 7:30 | Amir | Deck: ink, the logo, the QR | "Dubai does not wait for the impossible. It schedules it. Insiyab sees it coming. The controller decides." Silence. QR held. |

## The live moments, and their fallbacks

| Moment | Works when | Fallback (rehearse it) |
|---|---|---|
| Judge picks a route | `judge_pick.json` loads (it is a static file) | none needed: it is offline |
| Phone rings on the table | relay running, tunnel up, phone has signal, all three guards set | console "Demo mode" plays the identical state sequence with the ring as audio; the presenter's words do not change |
| Console itself | the public address loads | the same build opened from the laptop's disk (`dist/` folder on the desktop) |
| Film | plays from the laptop | the deck's first slide carries the same opening line |

## Questions we will be asked (answers in `docs/pitch/QA.md`, stream E)

1. "One day of data. Why should we trust it?" 2. "RTA already has a Decision Support System." 3. "Your boarding forecast does not beat the simple rule." 4. "What if the AI is wrong, who is liable?" 5. "How does this scale to the whole fleet?" 6. "Why 1,400 buses when RTA says 1,100?" 7. "What does the heat feature cost to run?" 8. "Who did you call, and did they agree?"
