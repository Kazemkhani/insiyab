# Strategy: the one idea, why it wins, and what is cut

Written on the evening of 16 November 2026. Read `docs/REQUIREMENTS.md` first. Anything below marked "to be measured" is a belief until `docs/DATA-CENSUS.md` has its count.

## 1. In one minute

**The sentence.** Insiyab forecasts, an hour ahead, where buses and passengers will not match, and closes each gap from both sides: RTA moves the bus, or the passenger is rewarded for moving.

**The picture.** Dubai's bus network on 15 December 2025, replayed minute by minute from the real records. Ahead of the clock, the forecast. Behind it, what happened. Where the forecast shows more people than seats the line is red; where it shows seats with nobody in them it is blue. One press, "Close the gaps", and each red is paired with a blue.

**The number the screen measures about itself.** The forecast error on hours the model had not seen, next to the naive forecast's error, at every horizon. It is on screen all the time, and it moves as the day replays.

## 2. What the scoring tells us to build

Sixty of the hundred points are for a forecasting model: its novelty (criterion 3), its quality and its behaviour on subsets of the data (criterion 4), and its error on held-out data against a naive forecast across horizons (criterion 5). The remaining forty ask how "the model" serves the business problem and how its performance is shown.

Our team's talk on day one was almost all about rewards, stops and the last mile. Those are good ideas, and section 6 keeps every one of them. But a rewards app with no held-out error number would be marked on forty points at most. So the order is fixed:

1. A forecast, tested properly, with its error on screen.
2. Decisions that come out of the forecast, each with its evidence.
3. The picture and the points of view that make a judge feel it.

## 3. What RTA already has, so we do not offer it as new

From public sources (`docs/research/research-dubai.md`, each with its address):

| RTA already has | So we do not say | What we add |
|---|---|---|
| Machine-learning route planning from nol data, announced in 2020: a trial on 10 routes cut wasted time by 13.3%, and the system can propose removing little-used stops and creating express services | "Nobody has used nol data to find wasted stops" | The same question asked an hour ahead with a stated error, and the passenger's cost shown beside the saving |
| An app, S'hail, reported to show live buses and how full they are, and an on-time rate RTA gave as above 77% for 2024 | "Buses are always late and nobody measures it", or "nobody knows how full a bus is" | A forecast of lateness and of load an hour ahead, tested against the timetable and the naive forecast |
| Bus on Demand: 17 areas and 49 minibuses in May 2026, more since; 984,929 passengers in 2025 | "Dubai should try on-demand buses" | Where the next zone should be, from the day's records |
| nol Plus, a points programme | "RTA should start a loyalty programme" | Points earned for the choice that closes a gap, offered only where the forecast shows one |
| 637 new buses arriving in 2025 and 2026 | | Which old bus each new one should replace first, from load and distance run |

We found no public sign of a reward for travelling off-peak or by the emptier route in Dubai. That may be the part that is new to RTA. The pitch says "we found none", not "there is none".

## 4. The idea in full

### 4.1 Two forecasts, because a gap has two sides

| Forecast | Says | From |
|---|---|---|
| **People** | How many passengers will board at each stop in each quarter of an hour, 15 minutes to 2 hours ahead, and so how full each bus will be | nol taps, the timetable, what kind of place the stop is, what the day has been like so far |
| **Buses** | How late each bus will be at the stops ahead of it | the runtime report: scheduled against actual at every stop |

A **gap** is where the two do not match: more people than seats, or seats with nobody in them, or a bus that will not be where the timetable says. The slide calls this "potential supply-demand mismatches". Everything else in the product is a way of showing a gap or closing one.

How the forecasts are built and tested is in `docs/MODEL-PLAN.md`. That file is where sixty points are won or lost.

### 4.2 Five levers. A decision is one lever pulled in one place at one time.

| Lever | The decision | Where it came from | The measure |
|---|---|---|---|
| **Right bus** | Put the larger bus on the trip the forecast fills, the smaller on the one it does not. Retire the oldest buses from the heaviest work first. | the fleet table; the team's point about buses from 2007 and 2008 | passenger-minutes without a seat; seat-kilometres run empty |
| **Right time** | Change the timetable where the bus is reliably early or late, so the printed time is the true one | a teammate who rides these buses: "for every single bus stop, there is around four, five minute latency" | share of arrivals on time |
| **Right stop** | At stops and hours where the forecast says nobody will board or alight, the bus calls on request | the teammate's proposal for dynamic stops; "make the buses faster by finding wasted time" | minutes saved per trip; passengers who must now ask |
| **Rewarded choice** | Where the forecast shows a full bus and an emptier one within reach, offer the passenger Khutwa points to take the emptier one | Amir's rewards; the teammate's proposal for dynamic pricing | passengers who shift; passenger-minutes without a seat |
| **On demand** | Where a fixed route carries almost nobody, replace that stretch with an on-demand zone that feeds the nearest busy stop | the last-mile point from the meeting; Amir's bus on demand | bus-hours released; passengers still served |

Every decision is a card: where, when, the evidence with its source, the change in one sentence, the effect before and after marked measured or simulated, who is affected, and one plain reason.

### 4.3 What trials elsewhere found, so our estimates are not guesses

Each has its source in `docs/research/research-methods.md`, section 6. These set the range a simulated effect may use. They are never shown as our results.

| Lever | What was measured elsewhere |
|---|---|
| Rewarded choice | San Francisco's BART Perks: those who joined cut their peak travel by about 10 in 100, and a third of the shift lasted after the rewards ended. Singapore's INSINC: about 7.5 in 100, more among heavy peak travellers. Melbourne's free early travel moved only 1.2 to 1.5 in 100. So we assume 5 to 10 in 100 of those offered, and let the planner move it. |
| Right stop | Removing or merging close stops sped buses by about 6 in 100 in Portland and 4 to 14 in 100 in San Francisco. Guidance puts stops roughly 250 to 400 metres apart. |
| On demand | Often costs more for each passenger than a bus: about twice in Los Angeles, and many trials closed. So we propose it only where a fixed route carries almost nobody, and we show the bus-hours released, not a saving in money. |
| Fares | Bus passengers respond to price modestly: a 10 in 100 fare cut brings roughly 4 in 100 more trips in the short run, more off-peak. |
| Walking | In one hot-city study, passengers accepted about 80 metres more walking to avoid a route 1 degree hotter. No measurement for Dubai was found, so any walking offer here is short and never the only choice. |

### 4.3 The demonstration goes deep on two scenes, not wide on five

Dubai Airports told Marsad that two scenarios were enough. A judge counted buttons aloud. So all five levers exist as cards, and the walk-through shows two, chosen from the real day once the census is in:

- **Morning, a full corridor.** More people than seats. Right bus first; rewarded choice for what is left.
- **Late evening, an empty stretch.** Seats with nobody in them. Right stop, then on demand.

## 5. The same morning from four places

The owner asked to see the solution from the point of view of the decision maker and of ordinary people: those who take the bus, site workers, the driver. Each is fictional and says so, is built from the day's totals, and follows the same pattern: what the records show happened, then what would change, marked simulated.

| Who | Where we meet them | What happened on the day (measured) | What changes (simulated) |
|---|---|---|---|
| **The planner** | the control room, 06:00 | the forecast shows the morning's gaps before they open | one decision closes the largest gap with no extra bus |
| **The site worker** | an early stop near workers' housing | his bus left with more people than seats | the larger bus is on his trip: he sits |
| **The office worker** | a stop on a slow route, 07:20 | her usual bus will be full and late | her phone offers an emptier bus a short walk away, with points |
| **The driver** | the same bus, late evening | he slowed for stops where nobody waited, against a timetable he could not keep | request stops, and a timetable that matches the road |

Two cautions from the meeting are built in. One teammate doubted that people should be asked to walk further: so the offer is never the only way to travel, never made to someone who says they cannot walk further, and never for a long walk or a hot day. The same teammate said a reward must suit a man earning AED 2,000 a month: so points buy groceries and fares, not cinema tickets.

Which stop, which route and which hour stand behind each person is decided from the census, and written in `artifacts/personas.json`.

## 6. Every idea the team raised, and where it went

From the team's meeting on 16 November and the written proposal for dynamic pricing and dynamic stops. Nobody's idea was dropped without a reason.

| Idea | What happened to it |
|---|---|
| Reward passengers for the longer or emptier route, with coupons like a supermarket receipt | The rewarded-choice lever and the Khutwa prototype |
| Bus on demand to bring people to stops | The on-demand lever, shown as "where the next zone should be" |
| Twice as many stops as buses; buses from 2007 and 2008 | Stop spacing is measured in the census. Fleet age drives the right-bus lever. Note: stops and buses are different things, so the ratio alone proves nothing, and we do not present it as a finding. |
| Skip stops where nobody boards or alights; a button or an app tap to call the bus | The right-stop lever. RTA's 2020 system already proposes removing little-used stops, so we add the forecast and the passenger's cost. |
| Lower fares at the peak, and bus lanes | A fare offer is one form of rewarded choice. Bus lanes need road works and road data we do not have: named in the pitch as RTA's own plan, not ours. |
| A congestion index from 0.1 to 10, and 1, 2 or 3 buses by level | The gap, shown on that scale on the planner's screen and called the Insiyab index (`gap.json` in the contract). Buses are allocated by forecast load, not by three fixed steps. |
| The last mile; bikes and e-scooters; knee problems; heat | The on-demand lever, and the limits on walking offers in section 5 |
| Collection zones, as the metro has | On-demand zones feed a busy stop: the same thought |
| Tap-in to tap-out times; where buses are wasted or too full | The census and both forecasts |
| A heat map of under-served areas, as in an earlier RTA project | The gap view |
| "One of the criteria is forecast accuracy, so we must forecast something" | The whole of `docs/MODEL-PLAN.md` |
| A digital twin; the third-person view of someone at a bus stop | `docs/TWIN.md` |

## 7. What we carry over from three earlier projects

| From | What worked | Here |
|---|---|---|
| **Tanzeem** (third place, an earlier RTA hackathon) | One product with two faces: a parent's phone and an operations screen. Rules that change behaviour. An Arabic name that says what it does. | The planner's screen and the passenger's phone. Rewards that change behaviour. Insiyab. Its weakness, not repeated: its numbers were invented. |
| **Marsad** (first place, Dubai Airports, 15 November 2026) | A public address and a QR code on the first slide; the judges' own data shown raw; one sentence, one picture, one number; honesty on the screen; two scenes shown deeply; gates and one deployer | All of it. The score fell from 84 to 70 the day the team presented from a laptop with a film; it won the day it handed the judges a working address. |
| **Bayyina** (World Police Summit, this week) | A contract and stand-in data so lanes build at once; a test for every claim; plain words; a verdict in one word | The contract, the stand-in bundle and the gates were written before the first line of the product. |

## 8. The bet worth making first

RTA publishes daily bus tap files as open data (`docs/research/research-dubai.md`, section A1): one file a day, each row a check-in or check-out with its time, route, stops and zones. The portal has moved, so whether they still download is not confirmed.

If we can get even four weeks of them, three things change:

1. The forecast can be tested across days, which is what "generalises" really asks.
2. We can forecast a day ahead as well as an hour ahead, which is what "longer-term horizons" asks.
3. The organisers' own day becomes a day the model has never seen: trained on public history, tested on their file.

This is the first task of the open-data lane and it needs a person to register for access. It does not block anything: every other part is designed to work on one day.

## 9. What is cut, and why

| Cut | Why |
|---|---|
| Bus lanes, signal priority, road congestion | We have no road data. RTA has its own programme. |
| Changing routes' paths | It needs demand between places we cannot see from one day, and it is the work RTA's 2020 system does. |
| Money saved | We do not have RTA's costs. We report kilometres, minutes, seats and passengers. |
| Anything that ranks or watches drivers | Wrong tool, wrong use of the data. |
| A phone app in the app stores | A page that works on a phone is enough to show the choice. |
| Voice, a chatbot, AI-written advice with no numbers behind it | The provided language model may put a decision's numbers into a sentence. It never makes a number. |

## 10. What could beat us, and the answer

| Risk | Answer |
|---|---|
| Another team shows a lower error number | Ours is on held-out hours, against a named naive forecast, on every subset, with the worst subset shown. A lower number with none of that is weaker, and the judges' sheet asks for exactly those things. |
| "You only had one day" | We say it first, on the screen. We show how the model does on routes and communities it never saw. If the public days arrive, we show other days too. |
| "RTA already does this" | Section 3. We name what RTA has and say what we add. |
| The data may not leave Dataiku | The engine is written to run inside Dataiku. The public site runs on stand-in data, labelled, until a mentor says totals may be shown. |
| The demonstration needs the internet | The site is plain files with no outside service at run time. It also runs from a folder on the laptop. |
| Too much, shown thinly | Two scenes. Cut lines in every lane. |
