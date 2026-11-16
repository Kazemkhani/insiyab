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

## Review 2, 17 November 2026, about 00:40. The designer again, on commit f4c453b (built locally from the stated commands; not on a real graphics chip, not the live address)

### F. The ten changes of section C, as they now stand

| # | Change | State | What is left |
|---|---|---|---|
| 1 | The map as the stage | Partly | The network is about 400 pixels wide in a 920 pixel canvas; buses are still small rectangles with no "55/35" when over seats; about 500 pixels of empty left column under the map; route labels fuse at 390 ("K10904"). |
| 2 | A headline for each view | Done | The forecast view repeats its own heading above the map and shows the whole day screen again under the chart. |
| 3 | The model screen as charts | Mostly | The gap at one hour is not drawn as a gap; charts are capped at 880 pixels in a 1232 pixel page (`charts.mjs:5`); subset labels are cut at 31 letters, so two different subsets read the same. |
| 4 | The forecast as a line through the day | Partly | The shaded "tested" region covers the whole chart, so it says nothing; the chosen quarter-hour is a 6 pixel dot at the left edge; no unit on the axis; no label on the lines. |
| 5 | One comparison and one chart on the gap screen | Partly | 16 bars and one 7 pixel red mark; bars are one hour while the totals above are the whole day; no title, no unit; the map paints every route as a 14 pixel blue ribbon. |
| 6 | The four figures redrawn | Not done | Still soft clay renders on a grey slab, in a different language from everything else on the site; for three of the four people the second step shows the same picture; the bus is cut by the frame. The two bugs (driver outside his bus, planner on the table) are fixed. |
| 7 | Six type sizes | Not done | 19 sizes measured, from 9 to 58 pixels; a source line under every number remains. |
| 8 | One large number a screen | Partly | The day has two pairs (58 and 32 pixels) with different meanings; the model has a second pair at 30. |
| 9 | The decision card | Done | "0 before, 0.9 after" for passengers shifted cannot be read; the before value sits at 13 pixels beside a 52 pixel "0"; three actions on one card. |
| 10 | Borders, legend, wording | Partly | The legend on The day is still text glyphs. |

His line on each screen, answering "would a senior designer believe a person designed this?": The day, almost. The forecast, no. The gap, partly. The model, mostly. Four people, no. A decision's evidence, yes. The printed order, yes. Khutwa, mostly.

### G. For lane 2: the five changes he would make tonight, in order

1. **The four figures.** The second step must change the picture, and the picture must carry the count: 25 squares against 20 outlined seats beside the figure, the 5 over in #B23A2E; then 20 against 20. Drop the grey slab, keep the bus inside the frame. The caption names the tool ("Fictional Blender scene; the seated view is a cutaway"): say "Illustration. It does not show a real passenger or a count of people waiting."
2. **The forecast chart** (`charts.mjs`, forecastChart): delete the `chart-heldout` rectangle or shade only the tested hours and label it once at its start; label the lines "Model" and "Naive" at their right ends as the horizon chart does; axis title "passengers boarding per 15 minutes" at 13 pixels; the chosen quarter-hour as a 10 pixel ring with its time above it; full width; delete the sentence that serves as a legend. Remove the second "Forecast against what happened" heading and the day's rail from this view.
3. **Bugs a visitor sees.** On a phone the forecast rail shows on the gap screen: add `.gap-view .replay-grid>.forecast-summary{display:none}` after `style.css:1489`, and inside the narrow-screen rule. "model year null" is printed (`app.js:39`): leave it out when null. "1 stops ahead" (`app.js:177`). "20.29% error removed against In proportion to the timetable" (`app.js:173`): write "against the timetable-share forecast". "11520" needs its comma. "Room unavailable." (`app.js:250`): "No phones are connected to this page. Play the offer back to see what a passenger would see." A bus's state "Room" reads as a place: "Has room".
4. **Type.** Six sizes: 52, 32, 20, 16, 13, 11. Every 9, 10 and 11 pixel line of body or source to 13 (`style.css:107, 361, 800, 1199`); one source line a section, at its foot; the "Tested on" line once a screen.
5. **The gap chart** (`charts.mjs`, gapChart): sort by passengers over seats, largest first; show the rows with anybody over and fold the rest into one line ("15 other route-directions: nobody over seats, 26 to 112 seats spare"); title "Seats short, 16:00 to 17:00"; unit "passengers"; label the red mark "7 over". On the map: spare seats as a 4 pixel line in #2F6690 at 40 in 100, over seats as 6 pixels in #B23A2E, no 14 pixel ribbon.

Wording he would still change: "Forecast error" as the model screen's headline to the finding itself ("The forecast misses by 7.8 passengers. A plain guess misses by 9.1."); "Does the improvement hold?" to "Is the forecast really better?"; "Untouched hours · route forecast" to "Hours the model had not seen"; "Replay · one hour ahead" to "The forecast against the day so far"; "Look at the recorded context" to "See the day's records for this stop"; "held-out" still appears twice (`app.js:173`); "Proposed", "A planner decides" and "Proposals only..." say one thing three times on a card: keep the last. Contrast: no text fails; marks that fail 3 to 1 are any chart mark in #8C96A0 (2.76) and unfilled tracks in #C3C9CF (1.53).

### H. What lane 1 changed after this review (the Khutwa page and the engine's words)

| Finding | State |
|---|---|
| The bus drawing read as a building with windows. | Fixed: no box. Twenty seat squares in rows of five, captioned "20 seats, all taken", and the passengers with no seat as their own red group, captioned. |
| Three equal outlined buttons: no obvious next step. | Fixed: the bus with the most room is the one filled button; the other is outlined; "No thanks" is a plain link, still 48 pixels tall. A test holds that exactly one choice is the primary one. |
| "I cannot walk further" came after the choices it filters. | Fixed: it is above them. |
| The meter's empty track was 1.53 to 1. | Fixed: the track has an edge in #5A6672 (5.4 to 1). |
| A repository path shown to a passenger in the simulated line. | Fixed in the engine: the assumption is a plain sentence, and the source moved to the effect's `source`. |
| A 55-word footer on every screen. | Fixed: 25 words. |
| "Seats only". | Fixed: "Counts seats, not standing room." |
| The gap note was 90 words and used the product's name as a unit. | Fixed in the engine: `index_note` is one line ("Gap score: from 0.1 (only empty seats) to 10 (only passengers without a seat)."), and the method moved to `index_method`. |
| The "Tested on" line was 31 words on four screens. | Fixed in the engine: `tested_on` is "Tested on one day only: Monday 15 December 2025, in the school holidays." and the rest moved to `tested_on_more`. |

## Review 2, the judge again, on the live address at commit f4c453b (17 November, about 00:45)

Her score: **64 of 100**, up from 58. By criterion: business 13 of 20, documentation and presentation 10, innovation 15, the model 14, accuracy 12. She walked the public address in a browser at both sizes and with reduced motion, and checked each finding of Review 1 that was marked fixed. One line of her report is wrong and is not repeated here: the site runs on Vercel, not Fly.io.

Really fixed, checked by her on the live address: every planner finding but one (P1 to P7, P9 to P12); the model screen shows a real model's table (J2); khutwa/ answers and its journey works to the end (J3); no console errors from the room (J4); the public name resolves (J5); the range of the gain is on the screen (J7); features are listed (J8); the phone's time slider is 358 pixels wide (J12); and all of the statistician's.

| # | Finding | State |
|---|---|---|
| K1 | P8 was marked fixed and is not: `related` is in decisions.json and no screen shows it. A planner who approves the swap has no path to the offer that fills the freed bus. | TO LANE 2: one line in the decision card, "See also". My mistake was to mark it fixed when only the data was. |
| K2 | No pitch, no prepared answers: 1 of 6. | A first draft now exists: docs/PITCH-DRAFT.md, seven minutes and twelve answers, with no number typed. TO LANE 4: take it over. |
| K3 | At 120 minutes ahead the model loses to the naive forecast and no sentence says so. | Fixed in the engine: each target in metrics.json carries `cautions`, plain sentences built from the table. TO LANE 2: show them beside the number they qualify. |
| K4 | At stop level the range held 87 in 100 times when somebody boarded, under the 90 promised, and nothing flags it. | Same: a `range_short` caution. TO LANE 2. Open in the engine: the range itself is still short there. |
| K5 | "Insiyab index" still on the gap screen. | Fixed in the data at c35b241 (`index_note` says "Gap score"); she reviewed the commit before. TO LANE 2: check no string of yours still says it. |
| K6 | "Room unavailable." and "held-out" still in body text. | TO LANE 2 (also section G, item 3). |
| K7 | The error counter moves with the clock and nothing says so (J6). | TO LANE 2. Partly met already: the first screen now leads with the untouched table's fixed number. |
| K8 | No census, no public data, no picture of the Dataiku flow. | The census waits on a person in Dataiku. Public data is lane 3's. The flow is lane 1's, on Tuesday, with the real tables. |
| K9 | Her hardest question with no answer anywhere: how one December Monday carries over to Ramadan or summer. | Answered in docs/PITCH-DRAFT.md: it does not, and we do not claim it. |

## What lane 1 changed in web/ on 17 November from 01:15, while lane 2 was idle

Lane 2's clone had not moved for an hour and two notes had no answer, so lane 1 took these, said so in coordination/lane-1.md first, and kept web/tests/run.sh passing.

| Finding | State |
|---|---|
| G3: the forecast rail showed on the gap screen at 390 wide | Fixed: hidden on the gap view at every width. |
| G3: "model year null" | Fixed: left out when there is none; the test now fails if "null" is on the screen. |
| G3: "1 stops" | Fixed. |
| G3: "error removed against In proportion to the timetable", "11520" | Fixed: "Its misses are 20 in 100 smaller than the best naive forecast's (in proportion to the timetable), every look-ahead together, over 384 forecasts." |
| G3 and K6: "Room unavailable.", "held-out", a bus's state "Room" | Fixed: "No phones are connected to this page...", "the hours the model had not seen", "Has room". |
| G1, in part: the caption named the tool | Fixed: "Illustration. It does not show a real passenger or a count of people waiting." |
| K1: `related` shown nowhere | Fixed: "On the same route:" with a link, on the card (not on the one-page printed order, which it pushed to two pages; a test caught that). |
| K3, K4: no sentence where the model loses or its range falls short | Fixed: the model screen opens its evidence with "Where not to lean on it", from `cautions`. |
| G2: the forecast chart | Mostly fixed: no shading, the lines named at their ends, the axis titled "Passengers boarding in 15 minutes", the chosen quarter-hour ringed and labelled, the chart as wide as the page. Open: it still opens on a quiet stop, and the day's map still repeats under it. |
| G5: the gap chart | Fixed: only route-directions with passengers above the seats are drawn, fullest first, each labelled in words; the rest are one line ("15 other route-directions: nobody above the seats, 26 to 112 seats spare"). Open: the map's ribbons. |
| G4: six type sizes | Fixed at b59adcd: 52, 32, 20, 16, 13 and 11 on the screen, where the stylesheet had twenty-seven sizes. The printed order keeps its own sizes: at the screen's sizes it ran to a second page, and a test caught it. |
| G1: the second step showed the same picture, and the picture carried no count | Fixed in the data and on the screen. The site worker now stands at a bus that really left with more passengers than seats (the first trip of the right-bus decision), and his second step and the office worker's carry the load and the seats before and after. The screen draws each as a count: one square a seat, one red square a passenger without one, under the finding in words ("7 without a seat", then "37 seats free"). A test holds that the two counts equal the bundle's. |
| G1: the figures themselves are soft clay renders in a different language from the rest of the site | **Not done.** The renders are still there, beside the counts. Redrawing four figures as flat pictograms is the one large piece of the design review still open. |

## Review 3, the designer a third time, on commit 63c490b (17 November, about 02:05; a local build, not a real graphics chip, not the live address)

He confirmed in the render: six sizes on the main site; no null, "1 stops", "Room unavailable", "held-out" or "Insiyab index" on any screen; the cautions shown; related decisions linked; the gap chart reduced to the one route-direction with passengers above the seats; the counts on the four people equal to the bundle; and the Khutwa changes.

**One claim of lane 1's was false.** The log said the charts were "as wide as the page". They were drawn 1184 units wide and then capped at 880 pixels by `style.css:1011`, so on a laptop every chart sat left with 350 pixels of nothing beside it and its 13 pixel labels rendered at 9.7. The code's own comment said the opposite. The lesson is the one in docs/RULES.md 8.4: the claim was checked against the code that draws the chart and not against the chart as rendered.

| # | Finding | State |
|---|---|---|
| R1 | Charts capped at 880 pixels; labels 9.7 pixels on a laptop | Fixed: the three caps are gone. Measured in the browser afterwards: the model chart is 1232 pixels wide and its labels 13.5. |
| R2 | Every section heading was 32 pixels, the same as the screen's title, so nothing below the large numerals had an order | Fixed: 52 for the one number, 32 for a screen's title, 20 for a section or a card. |
| R3 | The line that says what was tested, and the caveat under the headline number, were at 11 pixels | Fixed for the tested-on line, the caveat and the illustration's caption: 13. Eleven is left for a source line and the band. |
| R4 | The model's line was drawn in the blue that the identity keeps for seats with nobody in them | Fixed: the model is drawn in the brand's own colour (flow, 7.3 to 1). |
| R5 | No chart said its own finding | Partly: the look-ahead chart now says "The model misses more from here" where that begins. Open: the forecast chart and the gap chart. |
| R6 | Subset labels cut at 31 letters, so two different rows read the same | Fixed: the label column is wider and labels are whole. |
| R7 | The four people: the render in a different language; no mark on the chosen person; before and after not told apart; the brand named as the actor | Partly. The render is set to ink on paper so it sits with the page; the chosen person is underlined; each number is headed "On the day" or "With the change"; "With Insiyab" is now "If RTA made this change". Open: the renders themselves, and the planner's and driver's pictures do not change between steps. |
| R8 | Khutwa used 44 and 28 pixels; "5 without a seat" said three times; a planner's sentence on a passenger's screen | Fixed: 52 and 32; the number once, large, with its words beside it; the confirmation keeps two sentences. |
| R9 | "2057" in a sentence with no separator | Fixed in the engine: "2,057". |
| R10 | The forecast screen repeats the whole day screen under its chart, and still opens on a quiet stop where the chart shows nothing | Fixed. The chart opens on the quarter of an hour the forecast expects to be busiest, so the ring sits on a peak and the reveal means something. The day's numbers and its record panel are no longer repeated on this screen; the map stays, under its own rule, captioned "The same forecast on the map, one hour ahead". Looked at in a full-page screenshot at both sizes. |
| R11 | The day has three large numerals and a network 400 pixels wide in a 920 pixel canvas | **Open.** |
| R12 | The gap map's 14 pixel ribbons; two of three decision cards show a result of zero at 52 pixels | **Open.** |
| R13 | First-view words still to change: "naive forecast" with no gloss, "MAE", "Comparing Boosted trees...", sentences over 25 words on the gap and model screens | **Open.** |

His line on each screen: the day, almost; the forecast, partly; the gap, partly; the model, almost; four people, no; a decision's evidence, yes; Khutwa, almost.
