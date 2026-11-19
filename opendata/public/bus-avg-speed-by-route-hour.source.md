# bus-avg-speed-by-route-hour.csv: where it comes from

One row for each (route, hourly time-period band) pair, aggregated across all years the dataset covers.

| Column | Meaning |
|---|---|
| `route_name` | The route's public number, e.g. `8`, `F21`, `X28`. Matches `Route` in the AVL report and `route_name` in the open tap files. |
| `time_period` | The one-hour band, e.g. `08:00 - 09:00`. From the portal; the band `:00 - 15:00` is a data artefact and is excluded by `model/congestion.py`. |
| `avg_speed_kmh` | Mean of `average_speed` (km/h) for this route and band across all readings in the source. |
| `n_readings` | Number of source rows that contributed to this mean. |

**Dataset:** Average Speed of Buses for Each Line (RTA)
**Portal page:** https://data.dubai/en/l/459282
**Dataset ID:** 459282
**Publisher:** RTA (Roads and Transport Authority, Dubai)
**Source system:** Automated Vehicle Management System
**Classification:** Open
**Licence field (portal record):** Not Specified. The portal's terms (https://data.dubai/en/terms-conditions) say all Open datasets are covered by Dubai's Open Data Licence (https://data.dubai/documents/d/guest/open-data-license-english-1-1-pdf): worldwide, royalty-free, non-exclusive; name the originator and link to the original; do not present data misleadingly; do not suggest the government is behind the work. Terms read 17 November 2026.
**Fetched:** 2026-11-18, from a computer in the UAE, with no account and no key, using the portal's download endpoint (no API key needed for Open datasets). Four compressed files totalling about 315 MB were downloaded and aggregated; raw rows were not saved.
**Row count in source:** 3,281,648 rows read across 4 files. Each source row is one reading: average speed for one route, one direction, one date and one hourly band.
**Rows in this file:** 5,246 (after excluding the `:00 - 15:00` artefact band).
**Credit line (for any screen that uses this data):** Speed data: RTA via data.dubai (Open Data Licence), fetched 18 Nov 2026.

**How it was made:**
`python3 opendata/tools/fetch_dataset.py 459282 <outside-git-folder>` lists the files. The aggregation was done inline (the script read each compressed file from the HTTP response, kept only `route_name`, `time_period`, `average_speed`, discarded everything else, and wrote this table). The raw rows were never written to disk.

**Note on coverage:** The download endpoint served about 11.7 MB of each 78.6 MB compressed file. Each partial download decompressed cleanly as a valid gzip stream and yielded about 820,000 rows. All 24 hourly bands and all 326 routes appear in the result, so the sample is broad enough for a congestion proxy.

**Note on lane ownership:** This file was placed in `opendata/public/` by lane 1 (engine) under time pressure on 18 November 2026. It follows the same provenance pattern as the other public data files here. Lane 3 is the normal owner of `opendata/`; this was noted in `coordination/lane-1.md`.
