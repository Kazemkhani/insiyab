# The pitch: a first draft for lane 4 to take over

Written by lane 1 on the night of 16 November because the judge's review gave presentation 0 of 6 and nothing existed. It lives here, outside `docs/pitch/`, so it collides with nothing. Lane 4: move it, cut it, make it yours.

Two rules for whoever speaks it:

- **No number is said from memory.** Every figure in square brackets is read from `docs/MODEL-CARD.md` on the day, after the engine has run on the real tables. Until then the brackets stay empty. The numbers on the site tonight come from invented tables and must not be spoken as results.
- **The site is open before the first word.** Marsad scored 70 the day it opened with a film and won the day it opened with a working address.

Length: about seven minutes at a calm pace. The slot is not confirmed (`docs/REQUIREMENTS.md`, section 6).

## The seven minutes

**0:00. The address, and one bus.** (The first screen is up. The QR code is on it.)

> This is insiyab.amirkazemkhani.com. It is live, and you can open it now.
>
> At [time] on Monday 15 December, a bus on route [route] left [stop] with [load] passengers and [seats] seats. In the same hour, a bus with [seats] seats ran on route [route] carrying [load].
>
> Nobody did anything wrong. The timetable was written before the day happened. We built something that reads the day while it is still happening.

**0:45. What it is, in one sentence.**

> Insiyab forecasts how many passengers will board at each stop in the next two hours, and how late each bus will be at the stops ahead of it. It puts the two together to show where passengers and seats will not match, and what a planner could do about it before it happens.

**1:15. The day, replayed.** (Press play. Let it run for ten seconds without speaking.)

> This is your data: every bus on the day, where it was, how full, how late. Red is a bus with more passengers than seats.

**1:45. The forecast, and the number you will ask about.** (The model screen.)

> We had one day. So we did the only honest test one day allows. At each half hour, the model sees only what had happened by then, and forecasts what comes next. A test in our code changes every record after a moment in the day and checks that no forecast made before it moves by one digit.
>
> We set the evening aside at the start and scored it once. On those hours, for lateness, the model removes [x] in 100 of the miss of the best simple forecast, and the range of that gain is [lo] to [hi]. It does not include zero.
>
> For boardings by route the gain is [x] in 100, with a range of [lo] to [hi]. [If the range includes zero: That range includes zero. On one day, we cannot yet say the model beats the timetable for boardings, and the screen says so.]
>
> Every row is in the table, including the ones where we lose. [If the card has a caution: At two hours ahead the simple forecast is better, so that far ahead we use it.]

**3:15. What is different about how it forecasts.**

> Two things no timetable holds. First, the buses already on the road: a bus three stops away, running four minutes late, tells you when it will arrive and how many are already on it. Second, the passengers who got off near a stop this morning and have not travelled since. They are coming back. We count them. We never look at one card.

**3:55. The gap, and three decisions.** (The gap screen. Press "Close the gaps".)

> Here is where seats and passengers did not match. And here are three things a planner could do on Monday.
>
> Put the bigger bus where the passengers are: [n] pairs of trips swap vehicles. We only propose a pair if each bus can reach the other route in time, and the card says how many kilometres it runs empty to do it.
>
> Stop only when someone is there: at [n] stops on route [route], nobody boarded or alighted on [n] of [n] evening visits.
>
> And the third one is on your phone.

**4:50. The passenger's side.** (Ask the judges to scan the code. Wait.)

> You are now a passenger at [stop]. Your bus is full. The one [n] minutes earlier left with [n] seats free. Take it and you earn Khutwa points.
>
> Nobody is charged more. Nobody loses their bus. If you cannot walk further, you say so once and you are never offered a walk.
>
> In Singapore this year, an offer like this moved about 8 in 100 morning passengers on one line within six weeks. [If the room relay is on the shared store: Of the phones in this room, [n] of [n] took it.]

**5:50. What we are not claiming.**

> One day, a Monday in the school holidays. We do not say this forecasts another day, because we have not tested another day. We count seats, not standing room, because your fleet table marks standing as not verified. We measure buses, not roads. And RTA already plans routes with machine learning and shows how full a bus is in its app: what we add is the hour ahead, the gap, and the passenger's choice.

**6:30. Close.**

> The code runs with one command, on your tables, inside Dataiku. Give it a second day and it tests itself on a day it has never seen. The address stays up.

## Answers to prepare

Each answer is two or three sentences. The first sentence is the answer.

**Which error number should we believe?**
The table for the evening hours we set aside, in `docs/MODEL-CARD.md`: [MAE] passengers per route per quarter of an hour against [MAE] for the best simple forecast. The number moving on the first screen is the miss so far at the time the clock shows, so it changes as the day plays.

**The range of your gain includes zero. Why should RTA trust it?**
For boardings, on one day, it should not yet, and our screen says "improvement is not established". For lateness the range is [lo] to [hi] and does not include zero. A second day of data settles the first question, and the code is written so that a second day is a change of input and nothing else.

**How does one December Monday tell you about Ramadan, or July?**
It does not, and we do not claim it. What one day can show is whether the method works as a day unfolds, and whether it carries over to routes and communities it has not seen: those two tests are in the card. School terms, Ramadan and heat are the first features to add with more days.

**Is this leakage? The model has seen the whole day.**
No. Each forecast is made from records strictly before its own time, and a test proves it by changing every later record and requiring the forecast to stay the same. That test caught a real leak while we were building: a bus leaving at exactly 12:00:00 was being counted as seen by 12:00. It failed, and we fixed it before it was committed.

**Why not a neural network?**
One day of data, a table of mixed features, and a planner who has to trust the answer. Boosted trees won the M5 forecasting competition on data of this shape. We kept a plain count model beside them, and it loses to the timetable, which tells you how much of the problem is not simple.

**Your stop-level error is above 100 per cent.**
Yes, and that is the measure, not a mistake: about [n] in 100 stop quarter-hours have nobody boarding, so any forecast above zero adds error and nothing subtracts it. That is why we lead with routes, report MAPE only where at least five boarded and say over how many, and show the stop table whole.

**How long does it take to bring the bigger bus across?**
Each pair on the card states it: the kilometres the bus runs empty and the minutes to spare, at 25 km/h over the straight line times 1.3, from where its trip before ended. What we have not checked, and the card says so, is the block, the depot, and whether the bigger bus fits every stop on the other route. A planner decides.

**Would a few points really move anyone?**
Published trials say about 7 to 11 in 100: BART Perks in San Francisco, INSINC and this year's Travel Smart Journeys in Singapore. We use 8, we mark the effect simulated, and the planner can move the number.

**RTA already does this.**
RTA announced route planning from nol data in 2020, and its app shows how full a bus is now. We forecast the hour ahead, put passengers and seats side by side as one gap, and give the passenger a choice. We are careful on every screen not to present what you already have as new.

**How do we know the loads are right?**
We do not, fully. A check-in with no check-out is an alighting nobody recorded: [n] in 100 boardings on the day. We spread those along the trip in proportion to the alightings that were recorded, and the card says how many. A door counter on a handful of buses would check it.

**What about privacy?**
Nothing about one card, one device or one driver leaves the first stage of the code, and a test searches the whole output for every identifier in the input. Vehicles appear as v1, v2. No output is broken down by driver: this is a tool for planning a network, not for watching staff.

**Can we run it?**
One command, pandas and scikit-learn, with LightGBM where it is installed. The same tables give the same output byte for byte, and a test holds that.

## Three sentences that are true and sourced

- Transport for NSW's Opal app has sent passengers a forecast of how full their usual service will be since 2020, from a model that needs 21 days of that person's travel. We forecast from one day of totals and keep nothing about a person.
- Singapore adds buses when loading passes 80 to 85 in 100 over the busiest hour: it reacts. We show the gap an hour before it opens.
- Transport for London publishes fixed "quieter times" for buses. Ours is a forecast for this stop, this hour.

Sources for all three are in `docs/TEST-LOG.md`, section D.
