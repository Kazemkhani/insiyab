# metro-stations.csv and bus-passengers-by-route-monthly.csv: where they come from

Both from RTA datasets on Dubai's open data portal, fetched 17 November 2026 with no account and no key.

**Terms:** the portal's Open Data Licence (https://data.dubai/documents/d/guest/open-data-license-english-1-1-pdf, read 17 November 2026): free use, commercial or not; name the originator (RTA) and link to the original; do not present it misleadingly; do not suggest the government is behind the work. The datasets' own licence fields are empty.

**Made by:** `python3 opendata/tools/fetch_dataset.py 466421 <raw folder>`, the same for 459793, then `python3 opendata/tools/build_checks.py <raw folder>`.

## metro-stations.csv (55 stations)

Source: "Dubai Metro Stations", https://data.dubai/en/l/466421 , file `metro_stations_2026-09-21_17-40-59_0001.csv.gz`.

`station_id`, `station_name`, `station_name_arabic`, `line` (red: 35 stations, green: 20), `latitude`, `longitude`, `fare_zone`, `opened`, `closed` (empty for all).

- **No tram stations.** The dataset holds the Red and Green metro lines only. The portal lists a "Public Transportation Stations" dataset (https://data.dubai/en/l/467926) but it offered no file when asked, so tram stops are not here.
- The newest opening date in it is 1 January 2021. I did not check whether stations opened since are missing.

**To join (lane 1):** by position. A bus stop feeds the metro when it is within a short walk of a station: measure the distance from each stop's latitude and longitude (`bus-stops.csv`) to the nearest station. Names help too: bus stops at a station carry its name ("Union Metro Bus Stop", "Ibn Battuta Metro Station 7").

## bus-passengers-by-route-monthly.csv (14,794 rows)

Source: "Bus Passengers Trips by Route - Monthly", https://data.dubai/en/l/459793 , file `bus_passengers_trips_by_route_monthly_2026-09-30_15-47-28_0001.csv.gz`.

`year`, `month` (1 to 12), `route_name`, `passenger_trips` (the source calls it `trips`: passengers carried on the route in the month), `rows_in_source`, `source_rows_differ`.

- It runs from January 2018 to July 2026, but **24 months are missing from the source**, among them September 2025 and January 2026. November 2025 (190 routes, 15,314,037) and December 2025 (191 routes, 15,277,997) are there.
- **The source repeats 801 route-months, and for 40 of them the repeated rows disagree.** The table keeps the row the portal loaded last, says how many rows there were, and marks the 40 with `source_rows_differ` = 1. None of the 40 is in November or December 2025.
- A check I did: RTA said buses carried 197.2 million passengers in 2025 (`docs/research/research-dubai.md`, section B), about 16.4 million a month. December 2025 here is 15.3 million. The two are close, not equal, and I do not know which routes the larger figure counts.

**To use as a check (lane 1):** a route's taps on 15 December 2025 should be near one thirty-first of its December total, a little above for a working Monday. For route C01 that is 313,175 / 31, about 10,100 boardings a day. A provided-file total far from this for a route means the file is partial or the route numbers do not match. Join on `route_name`, compared as text, trimmed and upper-cased.
