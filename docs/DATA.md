# The data: what we were given, what we may add, how we handle it

Read `docs/REQUIREMENTS.md` first. The field lists below are copied from the organisers' appendix slide. A speaker stood in front of part of the GTFS column, so the GTFS list is completed from the public GTFS standard and marked.

## 1. The five datasets

### 1.1 GTFS network and schedule package (12 files): the plan

| File (standard name) | Fields shown on the slide |
|---|---|
| agency | agency_id, agency_name, agency_url, agency_timezone, agency_lang, agency_phone |
| routes | route_id, agency_id, route_short_name, route_long_name, route_type, route_color, route_text_color |
| trips | route_id, service_id, trip_id, shape_id, trip_headsign, direction_id, block_id, trip_short_name |
| stop_times | trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled |
| stops | stop_id, stop_name, stop_lat, stop_lon, zone_id (part hidden), location_type, stop_code, stop_desc (part hidden), platform_code |
| calendar | service_id, monday to sunday, start_date, end_date |
| calendar_dates | service_id, date, exception_type |
| frequencies | trip_id (hidden), start_time, end_time, headway_secs, exact_times (hidden) |
| shapes | shape_id (hidden), shape_pt_lat, shape_pt_lon, shape_pt_sequence, shape_dist_traveled |
| transfers | from_stop_id (part hidden), to_stop_id, transfer_type, min_transfer_time (part hidden) |
| translations | table_name (hidden), field_name, language, record_id and record_sub_id (part hidden), field_value |
| feed_info | feed_publisher_name (part hidden), feed_publisher_url, feed_start_date, feed_end_date |

Use: network structure, scheduled supply, frequencies, stop coverage, route geometry, transfers.

### 1.2 Nol smart card transactions: demand. One day, 15 December 2025.

`Transaction_date, Transaction_Time, Body_EVD_ID, device_id, device_id_hex, NOL_ID, CKI, CKO, Route, Stop_name, Amount, Stop_Id`

Use: demand by time, route and stop; passenger flow patterns; vehicle-level demand. The slide warns: "Nol data is anonymised. Fields such as CKI, CKO and Amount should be interpreted based on the data guidance and validated in your analysis."

### 1.3 Bus runtime / AVL report: what actually happened. Same day.

`Date, Day_type, Body, Trip_ID, Route, Driver_id, Direction, Stop_Seq, Stop_ID, Stop_Name, Sched_Arr, Act_Arr, Sched_Dep, Act_Dep, Difference, Door_Status, block_no, avm_pattern_id, Trip_end, Diff_in_seconds, OP_Hour, TID`

Use: early and late running, runtime variability, schedule adherence, stop performance, reliability by time and route.

### 1.4 Bus fleet and capacity

`Body_number, Manufacturer, Bus_Type, Model Year, Operator, No_of_Seats, RTA Standing (not verified), Total`

Bus types on the slide: STANDARD, ARTICULATED, DOUBLE, MIDI, COACH (MIDI appears twice on the slide: check whether one is MINI). The slide warns: "'RTA Standing' is marked as 'not verified' in the supplied data and should be treated accordingly." So we never present standing capacity as fact: we use seats, and show standing only as "not verified".

### 1.5 Dubai community boundaries

`c_prefix_a, c_prefix_e, cname_a, cname_e, comm_num, community_a, community_e, dgis_id, label_a, label_e, ndgis_id, objectid, shape, shape.area, shape.len` (Excel and KML).

Use: community-level demand, spatial coverage, route and community relationships, mapping.

### 1.6 Also in the toolkit

"Open Data" (we may add public data: see section 5) and "LLM" (Dataiku's provided LLM capabilities).

## 2. What we believe joins to what (to be proved by the census, not assumed)

| From | To | Believed key | What to measure |
|---|---|---|---|
| Nol `Body_EVD_ID` | AVL `Body`, Fleet `Body_number` | the vehicle | share of nol rows whose vehicle is in the fleet table and in the AVL report |
| Nol `Route` | AVL `Route`, GTFS `route_short_name` | the route's public number | exact-match rate, and the formats that fail |
| Nol `Stop_Id` | AVL `Stop_ID`, GTFS `stop_id` or `stop_code` | the stop | match rate against each candidate |
| Nol tap (vehicle and time) | AVL trip | the tap falls between the bus's actual arrival at one stop and at the next | share of taps given a trip; share that land on the wrong stop |
| AVL `Trip_ID`, `avm_pattern_id` | GTFS `trip_id`, `shape_id` | unknown | whether they match at all |
| GTFS stop position | community polygon | point in polygon | stops outside every polygon |

The most important unknown is what one nol row is. Either one row is one tap (with a flag saying check-in or check-out), or one row is one journey (with both ends). The census must say which, and how it was established (for example: "every card appears on two rows, one with CKI filled and one with CKO"). It never writes down a row or a card number.

## 3. The census: the first task, before any model

Whoever has access to Dataiku writes `docs/DATA-CENSUS.md` with, for every dataset: rows, columns with types, the first and last timestamp, the number of distinct routes, stops, vehicles, trips and cards, the share of empty cells per column, and five oddities. Then the join table above with real match rates. Then these counts, which the whole idea rests on:

1. Stop visits in the AVL report, and the share where the door did not open.
2. Stop visits with no tap on and no tap off.
3. Trips whose largest load is over the vehicle's seats, and trips whose largest load is under a quarter of its seats.
4. Scheduled against actual running time, by hour of the day.
5. Vehicles by model year and type, and how many kilometres each age band ran that day.
6. Taps by hour of the day, to see the peaks.

Nothing in the strategy is treated as true until its count is in this file.

**Where the counts are kept.** Counts are totals worked out from the provided data, and whether totals may leave Dataiku is not yet answered (`docs/REQUIREMENTS.md`, section 6). Until it is, the census program is run where the data is, by a person, and its printed counts are kept in `data/CENSUS-LOCAL.md` on that person's machine. Git ignores that folder. `docs/DATA-CENSUS.md` in the repository holds only what RTA's own slides already say, and the list of what is still to be counted. Once a mentor says totals may be shared, the counts are copied in.

## 4. One day only, and what that does to every claim

Both the nol transactions and the AVL report cover a single day, Monday 15 December 2025, which fell inside the winter break of most schools. So:

- We can test how well the model forecasts later hours of that day from earlier ones, and how well it carries over to routes, stops and communities it was not trained on.
- We cannot test how well it forecasts another day. We say so on every screen where a forecast number appears.
- Everything is built so that adding more days is a change of input and nothing else.

## 5. Open data we may add

The slides say teams "may add open data". The verified list, with addresses and terms, is in `docs/research/research-dubai.md` and is turned into feature tables by the open-data lane, each with a provenance file saying where it came from and when it was fetched.

## 6. Handling rules. These bind every worker, human or AI.

1. **Raw data stays where the organisers put it** until a mentor has said it may leave. `docs/REQUIREMENTS.md`, section 6, records the answer. Until then the model code is written against stand-in data with the same shape (in `fixtures/`), and run on the real data inside Dataiku.
2. **Raw rows never enter git, in any case.** `.gitignore` blocks `data/` and data file types. `tools/guard.py` refuses a commit that contains a column named like a card, device or driver identifier.
3. **Nothing about a single card, device or driver is ever shown or exported.** `NOL_ID`, `device_id`, `device_id_hex` and `Driver_id` are used only to count and to group. No output is broken down by driver: this is a tool for planning a network, not for watching staff.
4. **Counts are totals; journeys are private.** A count of boardings at a stop is a total and may be shown, however small. A journey from one stop to another made by fewer than five cards is never shown: such a cell is left out.
5. **The public site shows made-up stand-in data, labelled on every screen, until rule 1 is settled.** If export of totals is allowed, the site switches to real totals by replacing the files in `artifacts/`; nothing else changes.
6. **Open data keeps its source.** Every table built from public data carries the address, the date fetched and the licence.
