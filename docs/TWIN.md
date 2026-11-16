# The twin: the day replayed, and the same morning from four places

The owner asked for a digital twin and for the third-person view of someone at a bus stop, seen from the decision maker's side and from the side of ordinary people. This file is the specification for lane 2. Everything in `docs/RULES.md` binds it.

## 1. Two lessons that shape it

On Marsad the owner threw out two three-dimensional views. Of the first: "you click fog, you click emergency, and then just some fake planes, some fake dots come in. Like nothing happened, nothing wow happens. Like what? So what?" Of the walk at eye level: "so slow and pointless ... we dont even know what we are". What worked was one scene, from a named person's position, built from real records.

On Bayyina he said three times in one day that the product was too technical, and asked for it to be "much more interactive".

So a twin here is not scenery. It passes five tests, or the part that fails is cut:

1. It is built from the day's records: every bus, stop, time and count on screen is read from the bundle. The screen holds no number of its own.
2. Something real happens within two seconds of every tap.
3. A stranger can say what it showed after five seconds.
4. It says what is measured, what is simulated and what is stand-in data, on the screen.
5. It works on a phone held upright, with no outside service at run time, and from a folder on a laptop with the network off.

## 2. Part one: the day, replayed

One map of the bus network, drawn by us from the bundle's routes, stops and communities: no map service, so it cannot fail in a hall with poor Wi-Fi. A clock and a bar to drag across the day.

| What is drawn | From | Meaning |
|---|---|---|
| Every bus, moving along its route's real path | `replay/`: actual arrival and departure at each stop, placed between stops by time | Where each bus really was |
| The bus's colour and a small bar | `load` against `seats` | Room, full, more people than seats |
| A late bus | actual against scheduled arrival | Drawn with a trailing mark as long as its lateness |
| Each stop | boardings in the current quarter of an hour | A column that rises with people |
| The clock | the service day | Play, pause, drag, three speeds |

Tap a bus: its trip, its size and age, its load stop by stop. Tap a stop: its boardings through the day, and the buses that called. Tap a community: its totals.

**The forecast meeting reality.** One switch. Ahead of the clock the map shows what the model forecast for the next hour, drawn lighter. As the clock moves, what happened fills in over it. A counter shows the error so far today, next to the naive forecast's error. This is the rolling-origin test from `docs/MODEL-PLAN.md`, shown instead of described, and it is the answer to the scoring line "Charts and visuals explain model behaviour and performance accurately and simply".

**The gap.** One switch. Each stretch of route in the next hour is red where the forecast shows more people than seats and blue where it shows seats with nobody in them. One control, "Close the gaps": the decisions from `decisions.json` appear on the map where they apply, each red pairs with a blue or with an offer, and the two totals (passenger-minutes without a seat, seat-kilometres run empty) change from before to after, marked simulated.

## 3. Part two: the same morning from four places

Four people, one morning, read from `personas.json`: the planner, the site worker, the office worker, the driver. Each is a short guided sequence, moved forward by hand, never by a timer.

- The map moves to their stop or their bus at their time. A small scene shows one bus stop on one street from above and to one side, in the third person: the stop, the people waiting, the bus arriving. The person is on screen and named by their role from the first frame.
- Each step has one sentence from the file, one thing that happens, and at most one control.
- "What happened" comes first, marked measured. "With Insiyab" comes second, marked simulated, with the decision card it comes from.
- The count of people waiting, the bus's load and its lateness in the scene are the bundle's numbers for that stop and time.

The figures are plain and have no faces. Four outlines that read at a glance: the planner at a screen; the office worker with a bag; the site worker in work clothes and a hard hat; the driver at the wheel. No real uniform, no logo. Each carries the label "Fictional. Built from the day's totals, not from any one person." The dress research and the figure pipeline from Bayyina are in `~/work/bayyina-pack/13-SETTING-AND-DRESS.md` and `14-3D-PIPELINE.md` on the owner's laptop, and its working scene is `~/dev/bayyina/twin/`. Judge every figure on the real graphics chip, never from a test browser.

## 4. Part three: the model, shown

One screen for the table from `metrics.json`: horizons across, models down, the chosen model against the naive forecasts, then by subset with the worst marked. A sentence above it in plain words ("One hour ahead, the forecast misses by 7 passengers in a quarter of an hour on average. The naive forecast misses by 15."). The MAPE rule is on the screen. The words "tested on later hours of one day, Monday 15 December 2025" are on the screen.

## 5. The first screen

A visitor who scans the QR code on a phone sees, without scrolling: what this is in one sentence; the map with buses moving; the error number against the naive one; and one control. Then the gap and its decisions. Then the four people. The documentation is one tap away, never in the way.

## 6. Tests that must pass before it is shown

| Test | Passes when |
|---|---|
| It reads the bundle | change a count in a test bundle and the screen changes; the page's own code contains no route, stop or number |
| Stand-in data is labelled | with `"fixture": true` every screen shows STAND-IN DATA, NOT A RESULT; with `false` none does |
| A bus is where the record says | at a time between two stops, the drawn bus lies on the route's path between them, to within a few pixels |
| Measured and simulated | every simulated number on screen has the word beside it |
| Nothing waits | every tap is answered within two seconds; the first screen is usable within three on a mid-range phone |
| The whole path | first screen to the last point of view with no page error at 1280x720, 390x844, 320x568 and 844x390, and with reduced motion |
| No network | the built site works from a folder with the network off |
| The picture is used | on the first screen the network spans most of the map's width or height at every size (measured, as Bayyina's opening view was) |
| Touch | every control is at least 44 pixels |

## 7. Cut lines

1. The map with buses moving and the clock. Complete on its own: it is already the day, replayed.
2. The forecast meeting reality, with the error counter. The model screen.
3. The gap and "Close the gaps", with the decision cards.
4. The four points of view with a drawn scene (flat, from above).
5. The scene in three dimensions with figures.
6. Polish: sound on a tap only, off by default.

If the freeze comes at line 3, line 3 is what is shown.
