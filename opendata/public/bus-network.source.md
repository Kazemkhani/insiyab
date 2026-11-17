# bus-stops.csv, bus-routes.csv, bus-route-stops-ordered.csv: where they come from

Three tables of RTA's public bus network, made from three datasets on Dubai's open data portal. All fetched 17 November 2026 with no account and no key.

| Dataset | Address | What it gave |
|---|---|---|
| Bus Stops Details (RTA) | https://data.dubai/en/l/460287 | Every stop with its position and the routes that call there, in 157 reports from 13 July 2020 to 1 November 2026 |
| Public Transportation Routes Stops (RTA) | https://data.dubai/en/l/467874 | Stops in order along each route, the kind of stop, a number for the kind of route. Reports of 27 December 2020, 31 December 2021 and 31 October 2022 only |
| Bus Routes (RTA) | https://data.dubai/en/l/460261 | The kind of route in words (Urban, Feeder, Marine), but for 18 routes only |

**Terms:** the portal's Open Data Licence (https://data.dubai/documents/d/guest/open-data-license-english-1-1-pdf, read 17 November 2026): free use, commercial or not; name the originator (RTA) and link to the original; do not present it misleadingly; do not suggest the government is behind the work. The datasets' own licence fields are empty.

**Made by:** `python3 opendata/tools/fetch_dataset.py <number> <raw folder>` for 460287, 467874 and 460261, then `python3 opendata/tools/build_network.py <raw folder>`. Nothing about a passenger, card, vehicle or driver is in any of the three sources.

## bus-stops.csv (4,526 stops)

One row for each stop number that ever appears in Bus Stops Details, from its newest report.

| Column | Meaning |
|---|---|
| `stop_id` | The stop's number as published. Reports up to 2023 use six digits (`112001`); newer reports use four or five (`1447`) for the same stops |
| `stop_name`, `latitude`, `longitude` | As published in the stop's newest report |
| `stop_kind` | `pole`, `ac_shelter` (air-conditioned shelter), `intercity_stop`, `marine_station`, `not_a_passenger_stop` (the source says "Dummy"), or empty when no source states it |
| `stop_kind_from` | Where the kind comes from: the stop's own record and its report date, or an older record of the same name within 60 metres |
| `older_stop_id` | That older record's six-digit number, when the kind was taken from it. It is the number RTA's public timetable feed uses (`opendata/public/rta-gtfs/stops.txt`) |
| `first_report`, `last_report` | First and last report date the stop appears in |
| `in_newest_report` | 1 for the 2,696 stops in the report of 1 November 2026: today's network |
| `routes_count`, `routes` | The routes calling there in that report, separated by spaces |

What to know before using it:

- **The kind of stop is known for 1,600 of 4,526 stops, and for 879 of today's 2,696.** It was last published in the reports of 2020 to 2022. A shelter built or removed since is not in it. Empty means not stated, not "no shelter".
- The source has only two kinds for ordinary stops: pole and air-conditioned shelter. It has no "flag" or "covered, not air-conditioned" kind.
- **There is no report for 15 December 2025.** The reports near it (14 December 2025: 344 rows) list only part of the network, so the table gives today's network and each stop's first and last report date, not the network of that day.

## bus-routes.csv (212 routes)

One row for each route in the report of 1 November 2026, with how many stops it has there.

`route_kind` is in words where a source gives it. `route_kind_from` says which: the Bus Routes table (18 routes), or the number in the route-stops dataset. **The portal gives no key for those numbers.** I read them off the routes under each: 1 urban, 3 feeder and 7 marine agree with the Bus Routes table; 2 express (the X routes), 4 night (N30, N55), 5 intercity (the E routes), 6 seasonal, 8 metro link and 0 other are my reading and are marked "meaning inferred". 62 routes are in neither source and are left empty. Some names here are not bus routes (BM, CR, FR are boat lines).

## bus-route-stops-ordered.csv (11,119 rows, 214 routes)

Stops in order along each route, from the newest report each route has in the route-stops dataset (2020, 2021 or 2022: see `report_date`). One run of stops is one `route_name`, `direction`, `first_stop`, `last_stop`; `stop_order` counts from 0.

- **This is the network of 2020 to 2022, not of December 2025.** Routes have changed since. Use it to learn which stops follow which, and check a route against the provided network before trusting it.
- The source has flaws that are kept, not repaired: on some runs two rows share a stop number with different names, and some runs have two stops at one order number.
- `opendata/public/rta-gtfs/` (lane 1's) holds nine routes of the 2021 timetable feed with times and paths; this table has the order of stops for all routes but no times.

## To join (lane 1)

- **Stops, by number:** try the provided `Stop_Id` against `stop_id` first, then against `older_stop_id`. Count the matches on each before choosing: the provided file's numbers are hidden from me, so I cannot say which form they use.
- **Stops, by name:** the open tap files carry only a stop name (`start_location`, `end_loaction`). Match it to `stop_name` after lowering the case and removing punctuation and doubled spaces. Names are not unique (a "1" and a "2" on opposite sides of the road are two stops), so keep the trailing number.
- **Routes:** `route_name` here, `route_name` in the open tap files and `Route` in the provided file are the same public route numbers ("8", "F21", "X28"). Compare as text, trimmed and upper-cased.
- **Not checked:** I have not run any of these matches against the provided file. The match rate is lane 1's to measure.
