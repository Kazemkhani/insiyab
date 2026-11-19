# Core solution: what Insiyab does, and why

Written by lane 1, 18 November 2026, after judge feedback on the same morning.

---

## The problem in four sentences

RTA told us that six controllers in the bus Operations Control Centre oversee about 1,400 buses on the street per shift, and that staff, depots and events are coordinated largely by hand (RTA statement, 18 November 2026). On Monday 15 December 2025, the morning and evening peaks carried similar numbers of boardings (48,724 at 08:00; 49,707 at 18:00, measured), but late departures rose from about 19% in the morning to 45% in the evening. One mechanism we measured is the timetable's trip time: on route 310 at 18:00, the timetable allowed 67 minutes for a trip that took 96 (measured, 10 trips); a 16-minute layover cannot absorb the difference, so the next trip starts late, and 62% of linked late departures traced to a bus that was still finishing its previous run when the next was due (measured, 589 of 945 late starts, using the bus-still-out definition). Big events are planned weeks ahead by pulling buses off other routes, but small events of hundreds to a few thousand people are not planned at all, because the team cannot handle the workload (RTA statement, 18 November 2026).

## The solution

Insiyab is an OCC co-pilot that flags route-hours likely to run late or overloaded, calls the driver, depot and station at once when one does, briefs the duty controller with the situation and two or three priced options, records the human decision, relays it to all three for acknowledgement, and uses the same engine to plan small events this week before they happen.

## Who uses it

**OCC duty controller.** Six controllers cover approximately 1,400 buses per shift (RTA statement). When Insiyab flags a route-hour, the controller sees the forecast, the reason, and two or three options with their effect on waiting time and metro-transfer connections. The controller chooses. Insiyab makes the calls and records who acknowledged.

**Event planner.** For events with hundreds to thousands of attendees, where manual planning is currently not done, the planner sets the event name, date and expected attendance. Insiyab ranks the affected route-hours by their normalised load factor, proposes standby placements and runs the same co-pilot workflow on the day.

## What it does not do

Insiyab does not send dispatch orders without a controller's explicit choice. It does not edit a timetable or change a bus allocation by itself. It does not track or rank individual drivers. It does not predict road congestion from traffic data (there is no road data in the model). It does not forecast another day: everything tested here comes from one service day, Monday 15 December 2025.

## The three data sources and their honest limits

| Source | What it provides | Honest limits |
|---|---|---|
| RTA runtime and AVL report | Actual stop-level arrival and departure times against the schedule; the basis for the trip-time forecast and the planner's worklist | One service day tested. A school holiday Monday. No road-breakdown or incident codes in the data, so the cause of a late trip is not in the model. |
| Nol smart card taps | Boardings by route, stop and quarter-hour; the basis for the load forecast and seasonal normalisation | Anonymised; no destinations or transfer chains; a check-in with no check-out is an unrecorded alighting, spread over the trip in proportion to known alightings. Standing capacity in the fleet table is marked not verified. |
| data.dubai average speed by bus route | A congestion proxy at route level; judges identified this as the right external signal (RTA statement, 18 November 2026) | Not yet integrated in the model; proposed as the next feature addition. Monthly granularity, not real-time. |

The seasonal index (the December network index is 1.054, route 310 is 1.066, route C01 is 1.056; from Dubai's open monthly bus passengers by route, published by RTA on data.dubai and fetched by lane 3 into opendata/public/bus-passengers-by-route-monthly.csv, averaged over the valid months of 2024 and 2025, via model/season.py) is used to normalise load factors so a December peak is not flagged as an overload when it is simply a busy month. This is the first model step that uses external data; the trip-time forecast itself still uses only RTA's files. The other public tables already fetched (stops, routes, calendar, hourly weather, population by community, metro stations) are ready for when there are more days.

## What was dropped, and why

| What was dropped | Why |
|---|---|
| Asking riders to wait 20 extra minutes or skipping stops | Judges rejected this directly. Commutes in Dubai average about one hour; 20 extra minutes is a 40% increase. Trips chain bus to metro, so a delay breaks a connection. The last mile in Dubai is about 100 m in the heat, with no full shade (RTA statement). |
| Restaurant rewards as the main value proposition for brands | Judges said the return on investment for a restaurant was not clear. Replaced by a broader survey programme in which many vendor types fund rewards in exchange for aggregate travel insight (see SURVEY-PROGRAMME.md). |
| Surveying only by one vendor type | The judges' own concern: broadened to telecoms, cafes, gyms, cinemas, malls, ride-hailing, banks, travel and event venues, each with a concrete aggregate data return. |
| Any output that ranks or names individual drivers | Wrong use of the data. The model uses trip-level timing, not driver identity. |
| A claim that the timetable is the exclusive cause of evening delay | Demand, traffic, incidents and other factors also contribute. The timetable gap is the actionable mechanism investigated; it is not an established exclusive cause. |
