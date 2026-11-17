# The pitch, run in order: ten minutes, then five of questions

Written by lane 1 on 17 November after the Dataiku judge's two talks, RTA's scheduling engineer, and the first real run in Dataiku. It replaces the order in `docs/PITCH-DRAFT.md`; the answers to questions there still stand. Lane 4 or the presenter: make it yours.

**The one message, said three times (tell, show, tell):** Dubai's buses hold up in the morning and fall behind in the evening, because one timetable serves the whole day. We forecast how long each trip will really take, and show the planner where the timetable needs more time.

**Who it is for, when, and what they decide** (say this in the first two minutes; an outside reviewer on 17 November asked exactly this and the team could not answer): it is for the timetable planner. Every night the day's taps and running times are added and the Flow rebuilds. At each timetable change, which RTA makes about every one to two months, the planner works down a ranked list of routes and hours that need more running time, and accepts or sets aside each one. Nothing applies itself. Nothing new has to be measured.

**Not in this pitch**, each cut after someone outside the team took it apart: AI phone calls to drivers (nobody on the team knows how the control centre reaches a driver today); skipping stops (three people have now called it odd, and no table says a stop is empty); agents scanning the news for events (events are known a month ahead); routes that change by the day (a passenger cannot follow one). If asked, say: "we looked at those and cut them; this is the one we can stand behind."

**Every number below is read off the screen on the day.** They are from RTA's real day, Monday 15 December 2025, computed inside Dataiku (project Insiyab). Check each against the web app before saying it.

| Time | Part | On screen | Say (in your own words) |
|---|---|---|---|
| 0:00 | **Tell.** The film, as a teaser | `Insiyab-comic.mp4`, 60 seconds or less | Nothing. Let it play. |
| 1:00 | The scene, in one breath | The web app, tab "The day" | "At seven in the morning about one departure in five leaves five minutes late. At seven in the evening it is about one in two. Same buses, same drivers, same timetable. Nobody is doing anything wrong: the timetable was written for a day that does not exist, one where six in the evening behaves like ten in the morning." |
| 1:40 | The answer, before the evidence | Tab "Planner's worklist" | "This is what a planner gets: the routes and hours where the plan falls short, and the minutes each one needs. Accept, or set aside. Now let me show you where that list comes from." |
| 2:00 | **Show.** Demand | Tab "Passenger demand" | "This is when people travel: two peaks. And this is where." One sentence, move on. |
| 2:30 | Reliability | Tab "Service reliability" | "This is when buses run late, by route and hour. The evening band is red across most of the network. So it is not one bad route." |
| 3:15 | Supply, in RTA's own arithmetic | Tab "Supply and capacity" | "Your own planning rule: boardings in the hour, divided by what a bus carries. At six in the evening most routes come out short. The room is at other hours. Buses are spread across the day more evenly than passengers are." Say "by your rule of thumb": it counts every boarding against a seat. |
| 4:15 | The deep example: the forecast | Tab "Forecast" | "So we forecast it. Thirty minutes before each trip is due to leave, how long will it really take? The model learned only from the morning and midday, and we tested it on the evening it had never seen. Your timetable misses by about eight minutes a trip. The model misses by about seven: fifteen in a hundred better, and the range of that does not include zero." Then one route, trip by trip. |
| 5:45 | What a planner would change | Same tab, "What a planner would change" | "And this is the output you can use. For each route and hour: the time you planned, and the time that would cover 85 trips in 100. On this route at six in the evening the plan is 67 minutes and the day needed over 100. Across the evening peak that is about 240 bus hours of running time the timetable does not hold." |
| 6:45 | What if | Tab "What if" | Add a bus to the worst route and hour; show the shortage fall. "Simulated, and it says so." |
| 7:15 | How it is built | The Dataiku Flow, four zones | "Four questions, four zones, same names as the tabs you just saw: who travels, is the bus on time, are there enough, and what will happen next. Most steps are visual. Every number in the app is read live from these tables." |
| 8:15 | **Tell.** Why you can use it | Back to "The day" | "You change timetables every month or two. This is sized for that cycle: it tells you which routes and hours to give more time in the next change. No new hardware, no new process." |
| 9:00 | What we do not claim | (same) | "One day. The gain over a simple forecast is small, and we show it. Live signals did not help thirty minutes ahead, because a bus's previous trip has not finished by then: a sixteen minute layover hides the warning. That is itself a finding." |
| 9:30 | The cherry, and close | The public site, passenger page | "And one step further: a passenger offered the bus with room, thanked with points, with a partner survey while they wait. That is the next phase. The message again: forecast the real evening, and give the timetable the time it needs." |

## If something fails on the day

- The web app does not load: the public site (`insiyab.amirkazemkhani.com`) is the fallback, on stand-in data and labelled as such. Say so.
- A question on accuracy: the Forecast tab's table has MAE, RMSE and MAPE for all five methods and three time bands.
- "RTA already does this": RTA announced machine learning on nol data for route planning in 2020, and shows how full a bus is. We forecast running time against the timetable and turn it into the timetable change. Do not present what RTA has as new.

## Not ready as of 15:00 on 17 November

The Forecast tab is being built into the web app; the film has not been recut to the evening story; nobody has rehearsed this aloud; the chatbot is not built.
