# Test log: what reviewers who built none of it found

Each review was done by a reviewer who wrote none of the code and could change nothing. A finding stays here until it is fixed (with the commit) or answered (with the reason). Newest review at the bottom.

## Review 1, 16 November 2026, about 23:30. Four reviewers on commit d77ac0e (live at https://insiyab-nine.vercel.app)

### A. The planner (an RTA bus planner's eye on the decisions)

| # | Finding | State |
|---|---|---|
| P1 | The driver's step said "he keeps time" while the number beside it was 0.0 minutes saved. | Fixed, 6b6d0eb. The sentence now says only what the records hold: the bus no longer slows for a stop where nobody is waiting. |
| P2 | The right-stop card was a null result shown as a decision: its only effect was 0 minutes. | Fixed, 6b6d0eb. The effect is now the calls made with nobody there (counted). A time saved is stated only when the middle time at such a visit is at least 5 seconds; otherwise the card says no time saved is claimed. It also says it rests on one day. |
| P3 | Rewarded-choice offers of a bus 110 minutes earlier or 75 minutes later, with points growing with the inconvenience. | Fixed, 6b6d0eb. No offer more than 30 minutes away (`SHIFT_MAX`). A test holds it. |
| P4 | A swap of buses within an hour, with no check that either bus could get there. | Fixed, 6b6d0eb. Within half an hour; a pair is proposed only if each bus can reach the other trip's first stop in time, at 25 km/h over the straight line times 1.3, from where its trip before ended. Each pair states its empty kilometres and minutes to spare. Still not checked, and the card says so: blocks, depots, whether the bigger bus fits the other route. |
| P5 | The index note called the index "the share of the gap that is people without seats", which it is not. | Fixed, 6b6d0eb. The note now gives the sum it is made from. |
| P6 | Loads are called measured, yet 15 in 100 boardings had no recorded alighting and were spread along the trip. | Fixed, 6b6d0eb. The right-bus evidence and the gap note state the share. |
| P7 | `forecast_peak_load` in gap.json holds a measured load. | Answered. The key cannot be renamed (the contract). `peak_load` and `load_kind: "measured"` were added, and the note says the two are the same number until a forecast of load exists. Open: a forecast of load (engine cut 5). |
| P8 | Two decisions on one route with no pointer between them. | Fixed, 6b6d0eb: `related` on every decision. |
| P9 | Khutwa points shown with no word on nol Plus. | Fixed, 6b6d0eb, in the cost note: Khutwa is the prototype's name; nol Plus already gives points for spending; what is added is offering them only where the day shows a gap. |
| P10 | RTA's 2020 route planning already looks for little-used stops; the card did not say so. | Fixed, 6b6d0eb, in the card's reason. |
| P11 | 15 December 2025 was inside the winter break of most schools and no screen named it. | Fixed, 6b6d0eb, in `tested_on` in metrics.json. TO LANE 2: show `tested_on` where a forecast number appears. |
| P12 | Five visits, not three, before a stop is called empty. | Fixed, 6b6d0eb (`EMPTY_VISITS = 5`). |
| P13 | The stand-in bundle's cost note says points are "worth a few dirhams": not verifiable. | Open, small. To be removed when fixtures/ becomes the engine's own output. |
| P14 | The invented raw tables use route numbers that exist in Dubai (8, 11A) with invented vehicles. | Open, small. The numbers will be made plainly invented when the tables are next rebuilt. |
| P15 | Walking pace of 75 metres a minute is fast for a hot month. | Answered: December was mild. Open for the pitch: say the pace is a number a planner sets by month. |

The planner's three questions for the stage, to lane 4: how long does it take to bring the bigger bus across, and is that enough; how often would an offer go to someone whose bus turned out to have room; what changes on a school day.

### B. The judge with the scoring sheet, who also walked the site in a browser

Her score tonight: 58 of 100. Where the points are, in her order of points for each hour of work:

| # | Finding | State |
|---|---|---|
| J1 | No pitch and no prepared answers: criterion 2.3 scores 0 of 6. | Open. TO LANE 4. |
| J2 | The model screen says "Stand-in for the real model": the site shows the hand-made bundle while the engine's own table exists. | Open, lane 1, next: make fixtures/ the engine's output on the invented tables, so the screen shows a real model's table on stand-in data. |
| J3 | khutwa/ is a 404, and two screens link to it. | Open. Lane 3 has not reported. |
| J4 | The page asks /api/room/state every two seconds and gets a 404 each time: 39 errors in the console in three minutes. | Open, lane 1: the room relay. |
| J5 | The QR code points at insiyab.amirkazemkhani.com, which does not resolve. | Open. TO AMIR: one DNS record (coordination/lane-1.md). |
| J6 | The error counter on the first screen shows a different number on each load, because it moves with the clock. | TO LANE 2: say on the screen that it is the miss so far at the time the clock shows. |
| J7 | The range for the gain on boardings crosses zero; on lateness it does not. Neither range is on the screen. | TO LANE 2 and LANE 4: show `pooled[].skill_lo` and `skill_hi`; lead with what holds. |
| J8 | No reasons for a forecast, no table of which features matter. | Open, lane 1 (engine cut 3). |
| J9 | docs/DATA-CENSUS.md is empty. | Waits on a person running the census in Dataiku, and on a mentor's yes before counts are written here. |
| J10 | No public data added yet. | Lane 3. |
| J11 | No picture of the same stages as a flow in Dataiku. | Open, lane 1, Tuesday. |
| J12 | On a phone the time slider is 84 pixels wide: about 11 minutes a pixel. | TO LANE 2. |

Her five hardest questions, to lane 4: which error number to believe and in what unit; why trust a gain whose range includes zero; how one December Monday carries over to Ramadan or summer; where "passengers affected" comes from; whether a few points move anyone.

### C. The design review (asked for by Amir: "no AI slop text, diagrams or visuals")

The palette is right and every text pair passes contrast. The failure is that nothing is given weight: every screen is a stack of thin bands of 11 to 16 pixel text, the map that should be the stage is 250 pixels tall, the numbers that matter are never the largest thing, and the screens that need a chart have tables. All of this is in web/, which is lane 2's.

Contrast failures (not text): route lines on the map #8C96A0 on #E6E8EA are 2.45 to 1; control borders #C3C9CF on paper are 1.53 to 1; the red and blue bands of the gap differ in hue only and their legend is hidden in that view.

The ten changes, in order:

1. **Make the map the stage.** Delete the 250 pixel and 210 pixel heights; use `clamp(440px, 60vh, 640px)` on desktop. Fit the network to at least 85 in 100 of the longer side. Drop the community labels (show one only for the selected record). Routes in #5A6672 at 2 pixels. A bus is one 12 pixel mark coloured by state, with "55/35" beside it only when it is over its seats.
2. **Each view gets its own headline.** The same headline, purpose line and QR code sit above The day, The forecast and The gap. Keep them on The day only. Delete "The bus day, understood.", "Passengers. Seats. The next hour." and "From the day's records".
3. **Turn the model screen into charts.** A two-line chart of average miss against how far ahead (the model and the best naive forecast, labelled at the line ends, the gap at one hour marked). A paired-dot chart for the subsets in place of the 32-row table, the worst one named in words. The finding as two 52 pixel numerals above. Other measures inside a closed "More measures". Remove the red left stripe on the worst row.
4. **Show the forecast against what happened as a line through the day** for the chosen stop or route: naive thin and grey, model blue, what happened in ink up to the clock, the tested hours shaded and labelled once. The visitor taps a point and the truth drops in. Delete the 52 pixel "0.51" and "?".
5. **One comparison and one chart on the gap screen.** "Now" and "after" as one pair in the same unit, the after figure large. A two-sided bar chart (passengers without a seat one way, empty seats the other) in place of the table, rows with no gap folded into one line. Put the legend back and give red and blue a word each. Fix "1 seats".
6. **Redraw the four figures.** One solid-ink pictogram language in two weights, each figure 55 to 60 in 100 of the panel's height, no street slab, no title drawn inside the picture. Draw the load as data: 55 small squares against 35 seats. The driver is drawn outside his bus on a floating panel and the planner sits on the table: both are bugs.
7. **Six type sizes and no more:** 52, 32, 20, 16, 13, 11. Remove the 10 pixel source line under every number; one source line a section.
8. **One large number a screen**, at 52 pixels: the error pair on The day, the after total on The gap, the miss pair on The model.
9. **A decision card is a lever, a title, one sentence, and its effect as the large number**, with the evidence, cost and sources inside a closed "Evidence".
10. **Control borders in #5A6672**, real shapes in the legend, and the wording below.

Wording to change: "Take the passenger's side" to "Scan to see the offer on your phone"; "The forecast meeting reality" to "Forecast against what happened"; "Afternoon bin" to "Time of day"; "held-out" on a button to "not seen in learning"; "The room closes the gap / Room unavailable" to "Try the offer on a phone"; "Insiyab index" to "Gap score" on screen; "0 before; 2.5 after. minutes saved per trip." to "Saves 2.5 minutes a trip"; "Confidence: low" explained once; `mape_n` must not appear on a screen (fixed at the source: the engine's MAPE rule no longer names the field).

The review's screenshots are in /tmp/design-review on Amir's laptop. Not tested by it: a real graphics chip, the print dialogue, the live address.

### D. How other cities do this (for the pitch and for what we add)

Sources were opened by the reviewer; agency claims are marked as such.

- **Sydney.** Transport for NSW's Opal app has sent passengers a forecast of how full their usual service will be since 2020, from a model that needs 21 days of that person's travel. What we add: a forecast from one day of totals, shown to the planner as a gap, with nothing kept about a person. https://www.itnews.com.au/news/nsw-extends-predictive-opal-app-occupancy-alerts-to-buses-ferries-561453
- **Singapore.** The Land Transport Authority adds buses when loading passes 80 to 85 in 100 over the busiest hour: it reacts. Its Travel Smart Journeys moved about 8 in 100 morning-peak passengers on one line within six weeks (4 March 2026). That is the newest support for our 8 in 100. https://www.lta.gov.sg/content/ltagov/en/newsroom/2026/3/news-releases/8-percent-nel-commuters-shift-out-morning-peak-travel.html
- **London.** Transport for London publishes fixed "quieter times" bands for buses, not a forecast. https://tfl.gov.uk/quiet-times
- **Seoul.** The Night Owl bus routes were drawn in 2013 from mobile-phone and taxi data, and checked later against card taps.
- **Boston and Los Angeles.** Crowding shown in three bands from door counters; the Transit app claims 88 in 100 agreement with counters (a company's claim, no method published).
- **The Gulf.** No published forecast of bus boardings from card taps was found for Riyadh, Doha or Abu Dhabi.
- **Error elsewhere, to judge our own:** published stop-level work reports average misses of about 0.5 passengers a stop and 3 to 3.4 passengers on board a bus. Ours on invented tables is in that range, which says the invented tables are plausible and nothing more.
- **What the best systems have that we should name as future work:** door counters to check loads made from taps; weeks of history; journeys inferred from a card's next tap; a forecast for one passenger's own trip.

### E. The statistician (leakage, splits, measures)

He found no leak: the clock test, the rolling origin, the route and community splits, the count model's scaling, the join of taps to trips, the untouched part and the loads were each probed and held. What he did find:

| # | Finding | State |
|---|---|---|
| S1 | The range claimed nine in ten and kept it overall, but only by being right about empty quarter-hours: it held 97 in 100 times when nobody boarded and 70 in 100 when somebody did. A range of 0 to 0.86 cannot hold one passenger. | Fixed. Ranges are widened to whole passengers, and metrics.json now reports how often the range held when nobody boarded and when somebody did, apart. On the invented day: 99.9 in 100 and 86 in 100. Open: 86 is still under the 90 promised where it matters, and the screen must show both numbers. TO LANE 2. |
| S2 | At stop level the model did not beat the best naive forecast, and WAPE was above 1: worse than forecasting nobody, because nine in ten stop quarter-hours are empty. | Partly answered. After the new features and a denser invented day the gain at stop level is +5 in 100 with a range that still crosses zero, and at route level +21 in 100 (range -10 to +47). WAPE at stop level is still above 1. This is invented data, so the size means little; the method of saying it does: lead with the route table, show the stop table whole, say why. TO LANE 4. Open: a forecast of whether anybody boards at all, apart from how many. |
| S3 | The plan's distinctive features did not exist: only timetable and same-day counts. | Two built: buses already on the road (where the timetable, moved by each bus's lateness now, puts them, and how many have boarded them), and passengers who got off within 300 metres today and have not travelled since. The clock test caught a leak in the first on its first run (a bus leaving at exactly the origin was counted as seen) and it was fixed before the commit. metrics.json has `features`: each feature in plain words with its share of the model's gain. Open: public data (lane 3's tables), the two-part model, levels made to add up above route. |
| S4 | The ranges come from earlier hours and earlier models, so the promise is not a guarantee. | Answered in the code and in `range.method`: it is a promise to be checked, and the table checks it. |
| S5 | A test clause that could never fail. | Removed. |
| S6 | No test that a community is never on both sides of its split. | Added. |
| S7 | A tap after midnight that the real table dates the service day would be lost. | The taps stage now counts such rows, so the census run shows it. Open until the census has run. |
| S8 | "Best naive forecast" was chosen by MAE in one table and WAPE in another. | Fixed: WAPE for counts in both, MAE for lateness in both. He notes choosing the best naive forecast on the test rows makes the model's gain smaller, not larger. |
| S9 | The kind-of-bus label for a route was set from the whole day, the untouched hours among them. | Fixed: from visits before 16:00. |
| S10 | MAPE at stop level rests on very few quarter-hours. | Answered: the table gives the count beside it. TO LANE 4: say the count out loud. |
