# Insiyab: pitch script for the Friday final

Friday 20 November 2026, 09:15. Dubai Future Foundation, Emirates Towers, Creator's HQ Auditorium. Seven to eight minutes, then two of questions.

Speakers: **Amir** (opens and closes), **Sara Alrifai** (evidence), **Sarah Maaty** (planner's decision), **Mustafo** (forecast accuracy), **Maruf** (co-pilot in action and survey programme).

Every figure is sourced or labelled. Numbers from the data are marked **measured**. Numbers we expect if something changed are marked **simulated**. Statements from the judges' session on 18 November are marked **RTA statement**.

---

## The script: seven minutes

Times are when each part starts.

---

### 0:00 · Amir: the problem that matters to the OCC (60 seconds)

**Screen:** pitch page, then Dataiku tab 1, The day.

"Good morning. Six controllers. Fourteen hundred buses. That is the Operations Control Centre on a normal Dubai day. (**RTA statement.**)

On the evening of Monday 15 December 2025, nearly half of all bus departures left at least five minutes late. Not because the crowd was bigger. We checked. The morning had forty-eight thousand boardings. The evening had forty-nine thousand. The same crowd, twice as many late buses. (**Measured.**)

The timetable gave each trip the same time all day. The road did not cooperate in the evening. And six people watching fourteen hundred buses could not catch it before it spread. That is the problem Insiyab is built for."

---

### 1:00 · Sara Alrifai: one route, three numbers (80 seconds)

**Screen:** Dataiku tab 4, Service reliability; then tab 2, Planner's worklist.

"Let me show you one route. Route 310, direction 1, at eighteen hundred hours. The timetable allowed sixty-seven minutes. The middle recorded trip took ninety-six. The planned layover before the next trip is sixteen minutes. Sixteen cannot recover thirty. So the next bus starts late, and the one after that. (**Measured, ten trips on 15 December 2025.**)

We traced it. Among nine hundred and forty-five late start times we could link to a previous trip on the same bus, five hundred and eighty-nine had the previous bus still out when the next one was due. That is sixty-two per cent. (**Measured.**)

One bus. One evening. The timetable said nineteen twenty-three. The bus left at nineteen thirty-six. The driver did nothing wrong. The timetable was written as if six in the evening behaves like ten in the morning."

---

### 2:20 · Sarah Maaty: a decision a planner can make (80 seconds)

**Screen:** Dataiku tab 2, Planner's worklist; tab 3, Passenger demand.

"Here is what a planner can do with that. Each row is a route and an hour: planned trip time, the time the data needed, and the minutes to review. I press Accept on this row. That records a proposal. It does not change a timetable. The planner still checks fleet, duties and service on the donor route before anything is filed. (**Assumption: Accept is a planning record, not an operational command.**)

Across the whole evening peak, the aggregate shortfall adds up to two hundred and forty-four bus-hours. (**Measured, 16:00 to 18:59, 15 December 2025.**)

This is sized for how RTA already works. Timetable changes happen every one to two months. A planner opens this list, reviews the rows with the most evidence, and decides which ones to file. No new hardware. No new data to collect."

---

### 3:40 · Mustafo: how well can we see it coming? (70 seconds)

**Screen:** Dataiku tab 6, Forecast; the error comparison table.

"The worklist is measured from the day itself. The forecast is what lets you see it thirty minutes early. We trained the model on the morning and midday only, then tested it on the evening it had never seen. The timetable misses by eight point two five minutes on average. The model misses by six point nine seven. That is about fifteen per cent closer, across the sixteen-to-nineteen hundred window. (**Measured, one day, one day only.**)

Where the model stops helping, we show that. After twenty-one hundred the timetable is as accurate as the model. A planner should know where not to rely on it.

December is about five per cent busier than the year-round average on this network. (**Measured from Dubai's open monthly bus passengers by route, data.dubai, 2024 and 2025, as a seasonal index.**)  The load factor you see is normalised for that: a December peak is not flagged as a crisis when it is simply December."

---

### 4:50 · Maruf: the co-pilot in action (70 seconds)

**Screen:** the live phone dashboard if rehearsed; otherwise Dataiku tab 2 with the first flagged row highlighted.

"Six controllers. Fourteen hundred buses. When a row turns red, the controller should not have to ring four people separately and wait for each one. Insiyab makes those calls at once: driver, depot and station, in parallel. Each gives a short report. The controller sees the gap, the options and the effect on waiting time and metro connections, then chooses. Insiyab relays the decision and records each acknowledgement. (**RTA statement: the decision stays human. Process time matters.**)

The same engine handles small events. A concert next Thursday with three thousand people is too small to plan manually today. (**RTA statement.**)  The event planner sets the name, the date and the expected crowd. Insiyab ranks the affected route-hours by their load, adjusted for the month, and proposes which buses to hold on standby. The controller decides.

The data to do this better comes from the passengers themselves. After a disruption, before an event, at a transfer: a thirty-second survey, three questions, opt-in, with a reward funded by a partner. The passenger gets a coffee voucher or a data credit. The partner gets aggregate travel insight for their planning. RTA gets trip purpose, event intent and transfer gaps it cannot see from the tap data alone. No individual card, device or trip is ever shared with any vendor. (**Proposal, no uptake measured.**)"

---

### 6:00 · Amir: close (60 seconds)

**Screen:** tab 2, the planner's worklist.

"The timetable said nineteen twenty-three. With this, the timetable can say a time the bus will keep.

Dubai's buses do not fail in the morning. They fail at six in the evening, and the reason is a timetable that was written as if the morning and the evening are the same. We measured that gap. We built a forecast that sees it coming. We gave the controller a tool to act before it spreads, and an engine to handle the small events nobody is planning today.

The model is better than the timetable by fifteen per cent on the evening peak, one day. We show where it is not better. We do not claim more than the data gives us.

Thank you."

---

## Five questions you will be asked

- **"It is only one day."** Yes. The test holds out the whole evening, so the model never saw it. With more days, the flow retrains each night; it is built for that. A stricter test, holding out each next hour and training only on finished trips, gives eight to ten per cent improvement. We ran it.
- **"Fifteen per cent is not much."** Against the timetable it is real, and the range excludes zero. Against a simple rule it is six per cent. The value is the list of route-hours with specific minutes, which a rule of thumb cannot give route by route.
- **"Six controllers cannot act on every flag."** That is exactly why the co-pilot makes the four calls at once and briefs the controller with options rather than raw data. Process time is the constraint; the design is built around it. (**RTA statement.**)
- **"RTA already does this."** RTA announced machine-learning route planning from nol data in 2020, which can propose removing under-used stops and creating express services. We forecast running time against the timetable, turn it into a reviewable worklist, and add the agentic co-pilot for real-time response. We are not presenting what RTA has as new.
- **"Who actually uses this?"** The OCC duty controller, for real-time response. The timetable planner, at each one-to-two-month timetable review. The event planner, for small events this week. All three are shown in the product.

---

## Where each part scores

| Part of the pitch | Criterion it earns |
|---|---|
| "Same crowd, twice as many late buses" | 1.1 Business problem alignment |
| Planner's worklist with Accept | 1.2 Actionable insights |
| "You already change timetables every month or two" | 1.3 Deployability |
| Dataiku flow, zones named as tabs | 2.1 Documentation |
| Error table with best-naive comparison and hour-by-hour chart | 2.2 Visualisations |
| A rehearsed seven minutes and clean answers | 2.3 Delivery and Q&A |
| OCC co-pilot with parallel calls, event engine, seasonal normalisation | 3. Innovation |
| Trees vs rule vs timetable, with the stricter test shown | 4. AI model |
| MAE 6.97 vs 8.25; 15% over timetable; strict test 8-10% | 5. Accuracy |

---

## Earlier version (18 Nov morning)

Written by lane 1 on 17 November, 18:00; reworded in plain English at 20:30 after Amir said the problem was not clear. This version pitched to the Wednesday judges. It is kept here for reference; the section above is the Friday version.

Pitch: Wednesday 18 November, 10:30. Ten minutes, then five of questions.
Every figure here was read from the Dataiku flow on RTA's real service day, Monday 15 December 2025. Read them off the screen when you say them.

### The problem, in one sentence

**The timetable gives each bus route the same trip time all day. In the evening the trip takes longer, so buses fall behind, and stay behind.**

Said through one bus (use this on stage; it is on the pitch page): **the timetable said 19:23, and the bus left at 19:36.** Someone at the stop planned their evening around 19:23. The driver did nothing wrong. The bus was still finishing its last trip, because that trip took 96 minutes and the timetable gave it 67. The 67, the 96 and the 16-minute break are measured on route 310 at 18:00; the two clock times are arithmetic on them (18:00 + 67 + 16 = 19:23; 18:00 + 96 = 19:36). If asked, say it is the typical trip turned into clock times, not one real passenger.

Words to use: "trip time", not "running time"; "the break between trips", not "layover"; "the delay is handed on", not "lateness is inherited"; "hours of driving time", with "bus hours" only for the planners.

### How we know (four facts, each one a step in the Flow)

1. **It is not the crowd.** The morning and evening peaks carry the same number of passengers: 48,724 boardings at 08:00, 49,707 at 18:00. But 19% of departures are 5+ minutes late at 08:00 and 45% at 18:00.
2. **It is the running time.** Route 310 at 18:00: the timetable allows 67 minutes. The middle trip took 96.
3. **The layover cannot absorb it.** The planned layover is about 16 minutes at every hour of the day.
4. **So lateness is inherited.** Of 936 trips that started late with an earlier trip by the same bus, 870 followed that bus arriving late.

### The question RTA needs answered

**Which routes, at which hours, need more running time, and how many minutes?**

### The answer we built

1. **A forecast** of how long each trip will really take, made 30 minutes before it leaves. Tested on an evening the model had never seen: RTA's timetable misses by 8.25 minutes a trip, the model by 6.97. That is 15% closer (range 12% to 19%).
2. **A worklist for the timetable planner**: each route and hour, the minutes it needs to cover 85 trips in 100. Across 16:00 to 18:59 that adds up to 244 bus hours; 630 over the day.
3. **A second ranking by passengers reached**: where lateness meets the most boardings. Top of it: route C01 at 18:00, 695 boardings in the hour with 85% of departures late.

**Who uses it:** the timetable planner. **When:** at each timetable change, which RTA makes every one to two months. **What they decide:** accept or set aside each row. Nothing applies itself, and nothing new has to be measured.

### The script: ten minutes

Times are when each part starts. Words in quotation marks are to be spoken; say them in your own voice.

**0:00 · The film (60 seconds).** Say nothing. Let it play.

**1:00 · The problem. Screen: the pitch page (insiyab.amirkazemkhani.com/pitch/), scrolled through its six numbers to "The timetable said 19:23"; then the web app, tab 1 "The day".**
"Let me show you why it happens every evening."
"This is one real day of Dubai's buses. Monday 15 December 2025. One million card taps, eleven thousand trips.
Look at the two peaks. At eight in the morning, forty-eight thousand people board. At six in the evening, forty-nine thousand. The same crowd.
But in the morning, one departure in five leaves late. In the evening, it is nearly one in two.
Same buses. Same drivers. Same passengers. So it is not the crowd. Something else changes at six o'clock."

**2:15 · The cause. Screen: tab 2 "Planner's worklist", point at the first row.**
"Here is what changes. Route 310 at six in the evening. The timetable gives the trip 67 minutes. It took 96.
Every route gets the same trip time all day, and the bus gets a break of about sixteen minutes before its next trip, at every hour. Sixteen minutes is not enough to win back half an hour. So the bus starts its next trip late, and the one after. That is the 19:23 that left at 19:36.
We counted it. Of the late departures we could trace, 870 out of 936 came after the same bus finished its last trip behind time. By a stricter count, six in ten: the bus was still out on the road when its next trip was due.
Nobody is doing anything wrong. The timetable was written for a day where six in the evening behaves like ten in the morning."

**3:45 · The question, and the answer. Stay on tab 2.**
"So the question for a planner is simple. Which routes, at which hours, need more time? And how many minutes?
This list answers it. Each row is a route and an hour: what you planned, what the day needed, and the minutes to add. The planner accepts a row, or sets it aside." (Press Accept on the first row.) "Nothing changes by itself. The planner decides.
Across the evening peak it comes to 244 bus hours of running time the timetable does not hold."

**5:00 · The model. Screen: tab 6 "Forecast".**
"That list is measured from the day itself. The forecast is what lets you see it coming. Thirty minutes before each trip, how long will it really take?
We trained it on the morning and midday only, and tested it on the evening it had never seen. Your timetable misses by a little over eight minutes a trip. The model misses by under seven. Fifteen per cent closer between four and seven in the evening, and the range of that does not include zero.
We compared it with two simple rules, and with a second model built in Dataiku's visual machine learning. The table shows all of them, with the three error measures."
(Point at the hour-by-hour chart.) "And here is where it stops helping. After nine at night the timetable is as good as the model. We show that, because you should know where not to rely on it."

**6:30 · How it is built. Screen: the Dataiku Flow.**
"All of it is here, in Dataiku. Five questions, five zones: who travels, is the bus on time, were enough buses sent, how long will the trip take, and where does lateness reach the most passengers.
Most of the steps are visual recipes. The names of the zones are the names of the tabs you just saw. A nightly scenario rebuilds the whole flow from your raw tables in about two minutes."

**7:45 · Why you can use it. Screen: back to tab 2.**
"You already change timetables every month or two. This is sized for that. Each night adds a day of evidence. At the next change, a planner opens this list. No new hardware. Nothing new to measure. It uses the taps and the running times you already collect."

**8:30 · What we do not claim. No screen change.**
"This is one day. The model is only a little better than a simple rule, and we show the number. It tells you where the timetable is short. It does not tell you why traffic is slow."

**9:00 · One step further (the extra). Screen: the phone drill if it is ready and rehearsed; otherwise no change.**
"And one step further. The same forecast can warn the control centre about one bus, today." (If the drill is ready: run it. If not: one sentence.) "And passengers offered a bus with room can be thanked with points. Those are the next phase."

**9:40 · Close.**
"The timetable said 19:23. With this, the timetable can say a time the bus will keep. Dubai's buses do not fail in the morning. They fail at six in the evening, and the timetable is why. We forecast the real evening, and we tell the planner where to give it time. Thank you."

### Where each part scores

| Part of the pitch | Criterion it earns |
|---|---|
| The problem, with the same-crowd proof | 1.1 Business problem alignment |
| The worklist with Accept | 1.2 Actionable insights |
| "You already change timetables every month or two" | 1.3 Deployability |
| The Flow, zones named as tabs | 2.1 Documentation, 2.2 Visualisations |
| A rehearsed ten minutes and clean answers | 2.3 Delivery and Q&A |
| Taps feeding a running-time forecast; two rankings | 3. Innovation |
| Two models, two simple rules, a time split | 4. AI model |
| MAE, RMSE, MAPE; 15% over the timetable; hour by hour | 5. Accuracy |

### Five questions you will be asked

- **"It is only one day."** "Yes. The test holds out the whole evening, so the model never saw it. With more days it retrains each night; the flow is built for that."
- **"Fifteen per cent is not much."** "Against your timetable it is real and the range excludes zero. Against a simple rule it is six per cent, and we show that. The value is the list of minutes per route, which a rule of thumb cannot give."
- **"RTA already does this."** "RTA announced machine learning on nol data for route planning in 2020. We forecast running time against the timetable and turn it into the timetable change. We are not presenting what you have as new."
- **"How do you know it is not the crowd?"** "The two peaks carry the same boardings, within two per cent, and lateness more than doubles."
- **"Who uses this, and how often?"** "The timetable planner, at each timetable change. Each night adds a day of records."

### Not in this pitch

AI phone calls as the main idea, skipping stops, agents scanning for events, routes that change by the day. If asked: "we looked at those and cut them; this is the one we can stand behind."

### About the second model (do not overclaim)

Cobuild trained Ridge regression and LightGBM with Dataiku's visual machine learning and saved the Ridge model in the Forecast zone. Its test is the last 40 per cent of the day (4,454 trips, 16:22 to the end). There the timetable misses by 6.02 minutes, Ridge by 5.90 and LightGBM by 7.23: two per cent better than the timetable, not more. Our 15 per cent is on the evening peak, 16:00 to 18:59. If asked why they differ: "the gain is in the peak; late at night the timetable is already right, and we show that."

### Lane 3's independent retest (21:05, 17 November; opendata/onday/FORECAST-RETEST.md)

Done in a separate notebook with other code. The 15 per cent holds (6.96 against 8.25 minutes on the same 2,043 trips). Stricter tests give less: forecasting the next hour only, 8 per cent; whole routes held out, 10 per cent, level with a simple rule. Use these if a judge pushes on the 15: "a stricter test gives eight to ten, and we ran it." One more figure worth saying: the timetable's time covers 29 per cent of evening-peak trips, against the 85 in 100 a planner aims for. That figure is lane 3's and I have not recomputed it.
