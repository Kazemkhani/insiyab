# Research for the RTA Future Move Hackathon: open data and Dubai bus facts

All sources were read on 16 November 2026 unless stated. "Opened" means I fetched the page and read it myself. "Search summary only" means I saw the claim in a web search result but did not open the page, so treat it as lower confidence. "Inference" marks my own reasoning, not a source statement.

## Headline finding

RTA itself publishes a multi-day bus ridership dataset on its open data portal, as one CSV per day, built from nol check-in and check-out transactions. It is very likely the same kind of data as the one-day file in Dataiku. If the team can get it, it removes the "one day only" limit. It is the single most valuable external source, but its current access route needs checking this week (see A1).

## A. Open data

### A1. Dubai Pulse / data.dubai / RTA

Dubai Pulse (dubaipulse.gov.ae) now redirects to https://data.dubai (HTTP 301, checked with curl and WebFetch). I could not open the old dataset pages live, so what follows comes from Internet Archive snapshots of the Dubai Pulse pages (snapshot dates given). Whether the same files are still downloadable on data.dubai is not confirmed.

| Dataset | URL (old Dubai Pulse) | Publisher / source | Format | Coverage and granularity | Licence field | Access |
|---|---|---|---|---|---|---|
| rta_bus_ridership-open | https://www.dubaipulse.gov.ae/data/rta-bus/rta_bus_ridership-open | RTA, source system "ITIC", provenance "Automated Vehicle Management System, Unified Automated Fare Collection / Ticketing System" | CSV, one file per day, about 76 to 97 MB each (e.g. Bus_Ridership_2025-04-05_00-00-00.csv) | Created 16 Feb 2018. Snapshot of 16 Apr 2025 lists files to 5 Apr 2025. Snapshot of 15 Dec 2025 shows page updated 09 Dec 2025. Search summary only: about 3,053 files by Feb 2026. Row per tap: txn_type (Check In / Check Out), txn_date, txn_time, start_location and end_location (stop names), route_name, start_zone, end_zone (Zone 0 to Zone 9). | "notspecified" | Page offers a Data API using an API key and secret emailed on first grant, plus a "Request Data" route. Whether a plain CSV download works without registration: not confirmed. |
| rta_bus_passengers_trips_by_route_monthly-open | https://www.dubaipulse.gov.ae/data/rta-bus/rta_bus_passengers_trips_by_route_monthly-open | RTA (ITIC) | CSV, one file per month | Created 07 Mar 2018, snapshot 07 Aug 2025 shows files to May 2025. Fields: YEAR, MONTH, ROUTE_NAME, TRIPS (passenger rides). Rights field: "Everyone". | "notspecified" | Same API-key mechanism. |
| rta_bus_stop_details-open | https://www.dubaipulse.gov.ae/data/rta-bus/rta_bus_stop_details-open | RTA, Public Transportation Planning System | CSV (Bus_Stop_Details.csv, 53.75 MB) | Snapshot 15 Dec 2025: updated 08 Dec 2025, weekly. Fields include stop_name, stop_id, street_name, route_name, stop longitude and latitude, bus_stop_type (Pole, Flag, Covered, AC Shelter), time_table_panel, mupi_available. | "notspecified" | Same. |
| rta_bus_routes-open | https://www.dubaipulse.gov.ae/data/rta-bus/rta_bus_routes-open | RTA (ITIC) | CSV (bus_routes.csv) | Snapshot 06 Dec 2025: updated 04 Dec 2025. Fields include route_name, route_type (Urban, Feeder, Intercity, Special, GlobalVillage, EK, Emaar, ENBD, Driver Shuttle and others), direction, stop_name, stop order. | "notspecified" | Same. |
| dsc_population_by_community-open | https://www.dubaipulse.gov.ae/data/dsc-statistics/dsc_population_by_community-open | Dubai Statistics Center | CSV (Population_By_Community.csv, 0.08 MB) | Snapshot 21 Apr 2025: last updated 07 Aug 2024, annual. Fields: year, community number and name (Arabic and English), population (permanent residents). No gender or nationality split in the fields I saw. | "notspecified" | Same. |

Other RTA datasets that appeared in search results (search summary only, not opened): rta_metro_ridership-open (daily files, same structure idea), rta_metro_stations-open, rta_public_transportation_routes_stops-open (GTFS-like registry), a number-of-trips-by-transport-type dataset updated 21 Jan 2026. MobilityData also lists a Dubai GTFS feed at https://mobilitydatabase.org/feeds/gtfs/mdb-904 (search result only).

Licence. The portal's pages say "notspecified", but Dubai Pulse hosts a separate "Open Data Licence" PDF (opened via Internet Archive copy of https://www.dubaipulse.gov.ae/docs/DDE%20_%20DRAFT_Open_Data%20Licence_LONG_Form_English%203.pdf). The file is labelled DRAFT. Its clause 2.1 grants a worldwide, royalty-free, non-exclusive licence for commercial and non-commercial use. Clause 2.2 excludes personal data and private-entity data. Clause 2.3 bans misleading presentation. Clause 3.2 requires attribution (name of originator, copyright notice, link where practicable). I could not confirm that this draft licence is the one that governs each RTA dataset. RTA's own open data page (https://rta.ae/wps/portal/rta/ae/home/open-data?lang=en) names no licence and says RTA is not liable for use of the data. It points to Dubai Pulse for data requests and ask@rta.ae.

Caveat for the team (inference). The hackathon one-day nol file was described as "anonymised". The public portal fields above include no card ID. If the team already holds a day of data, check its schema against the public one before deciding whether the public files add anything beyond more days.

Whether the 15 December 2025 file itself is on the public portal: not found. The December 2025 snapshot shows the ridership page updated 09 Dec 2025, so it may or may not include 15 Dec.

### A2. Dubai Statistics Centre

- Population by community: see table above. Annual, latest update seen 07 Aug 2024 (snapshot). Newer estimates may exist on data.dubai.
- Dubai-wide population: Dubai Statistics Centre figure of 3.825 million at end of 2024 (Khaleej Times, search summary). About 4.58 million at end of 2025, attributed to Digital Dubai in TradeArabia and Gulf News (search summary only).
- Employment: datasets dsc_employment-open and dsc_unemployment-open are listed in the DSC archive with 2022 update dates (search summary only). Employment or establishments by community: not found.
- Labour Force Survey 2026 launched by Digital Dubai, 5,000 households (WAM, search summary only). Not a source of area-level data.
- Population by gender or nationality group or labour camps by community: not found.

### A3. Community and land-use data

- Schools: khda_dubai_private_schools-open, CSV, updated 27 Aug 2024, with curriculum, rating and enrolment, but access "requires a request permission" (search summary only, not opened).
- Metro and tram stations: Dubai Pulse datasets exist (rta_metro_stations-open seen in search results, not opened).
- Labour accommodation areas, malls: no open dataset found. OSM tags are the practical route (A4), with quality that varies.
- Dubai Land Department area lookup dld_lkp_areas-open appeared in search results (not opened). It might help map area names.

### A4. OpenStreetMap

- Geofabrik "GCC States" extract, opened at https://download.geofabrik.de/asia/gcc-states.html: PBF 245 MB (gcc-states-latest.osm.pbf), Shapefile zip 485 MB, GeoPackage zip 499 MB. Data up to 2026-11-15. Licence ODbL 1.0. The page says no sub-regions are defined, so there is no UAE-only or Dubai-only file there. No login.
- Cut Dubai from the GCC file with a bounding box using osmium or similar tools (inference, standard practice).
- BBBike (https://extract.bbbike.org) lets you draw a custom area. I tried https://download.bbbike.org/osm/bbbike/Dubai/ and got HTTP 404, so there is no ready-made Dubai city file there. A custom extract is possible but I did not test it (search summary only).
- ODbL requires attribution "© OpenStreetMap contributors" and share-alike for derived databases (standard ODbL terms, from my knowledge, not opened this session).

### A5. Weather

- Open-Meteo historical API, opened at https://open-meteo.com/en/docs/historical-weather-api and https://open-meteo.com/en/terms. No API key needed for non-commercial use. Data licence CC-BY 4.0. Free tier: 600 calls per minute, 10,000 per day. Non-commercial examples include educational content and public research. Coverage: ERA5 from 1940 (about 25 km grid), ERA5-Land from 1950 (about 11 km), ECMWF IFS from 2017 (9 km).
- I ran the API for central Dubai (25.2048, 55.2708) for 15 December 2025 on 16 Nov 2026. Result: daily max 30.6 C, min 17.5 C, precipitation 0.0 mm. Hourly temperature ranged from 17.6 C at 07:00 to 30.5 C at 15:00. Humidity 30 to 84 percent. Wind 0.4 to 16.2 km/h. This is reanalysis data, not a station reading.
- Query used: `https://archive-api.open-meteo.com/v1/archive?latitude=25.2048&longitude=55.2708&start_date=2025-12-15&end_date=2025-12-15&hourly=temperature_2m,precipitation,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FDubai`

### A6. Calendar

- 15 December 2025 was a Monday (computed with Python).
- UAE National Day (Eid Al Etihad) holiday for 2025 was 1 and 2 December (Monday and Tuesday), paid for private sector, announced 17 November 2025. Work resumed Wednesday 3 December. (Search summary, citing The National, Khaleej Times, Middle East Briefing; page not opened.) So 15 December had no public holiday.
- School calendar: Khaleej Times (opened, https://www.khaleejtimes.com/uae/schools-and-parents/uae-2025-2026-academic-calendar-schools-universities-students-parents-educators): term 1 ended 5 December 2025 for international curriculum schools, winter break 8 December 2025 to 4 January 2026, schools reopened 5 January 2026. Search summary only: Indian-curriculum schools that start in April began their winter break on 15 December 2025. So 15 December was inside the winter break for most schools. This matters for demand features (students absent).
- The Ministry of Education page itself (moe.gov.ae) appeared in results but I did not open it.

## B. Dubai bus system facts

### B1. Size and ridership

| Fact | Value | Source (opened unless noted) |
|---|---|---|
| Buses | 1,390 (Euro 6) as of 2024 figures | RTA via Dubai Media Office, 18 May 2025: https://mediaoffice.ae/en/news/2025/may/18-05/al-tayer-says-public-bus-coverage-now-reaches-88-percent-of-dubai-urban-areas |
| Buses | 1,387 | Dubai Media Office, 20 Jul 2025: https://mediaoffice.ae/en/news/2025/july/20-07/rta-completes-upgrade-of-22-bus-stations |
| Buses | 1,518 (170 double-decker, 935 standard, 339 articulated; these add to 1,444) | RTA bus page https://www.rta.ae/wps/portal/rta/ae/public-transport/dubaibus. Looks outdated. Conflicts with the two rows above. |
| Routes | 187 in 2024: 110 urban and rural, 64 metro link, 13 intercity, plus seasonal | Dubai Media Office 18 May 2025 |
| Daily trips | about 11,000, covering over 333,000 km | same |
| On-time arrivals | above 77 percent | same |
| Coverage | about 88 percent (body text says emirate, headline says urban areas) | same. The RTA bus page says 82 percent of urban areas. |
| Stops | RTA bus page: 17 bus stations, 2,185 "bus stands", 554 air-conditioned waiting areas. "Stands" may not equal "stops". | RTA bus page |
| Air-conditioned shelters | 895 shelters at 621 locations inspected in May 2026 | Khaleej Times, 6 May 2026: https://www.khaleejtimes.com/uae/transport/dubai-rta-inspects-895-ac-bus-shelters. 893 shelters at 622 locations in 2025 (Gulf News, search summary). The 554 on the RTA page conflicts with these. |
| Bus ridership 2024 | 188 million, up 8 percent; over 500,000 daily | Dubai Media Office 18 May 2025 |
| Bus ridership 2025 | 197.2 million, up 5 percent; 25 percent of all users across public transport, shared mobility and taxis (Metro 37, taxi 26, shared mobility 9, marine 2, tram 1). All modes 802.1 million, 2.2 million per day. | Dubai Media Office, 15 Feb 2026: https://mediaoffice.ae/en/news/2026/february/15-02/rta-records-802-riders-in-dubai-2025 |
| Bus ridership H1 2025 | 95.7 million | search summary only |
| Mode share | Public transport plus shared mobility share of trips 22.3 percent in 2025 (21.6 in 2024); target 25 percent by 2030. Excludes private cars and counts shared mobility with public transport. | search summary only (several outlets), not opened |

Note (inference): 197.2 million rides over 365 days is about 540,000 per day. The RTA bus page figure of 369,248 per day is old. Use about 0.5 million per day for 2025.

### B2. nol fares and rules

- RTA nol card page (opened, https://www.rta.ae/wps/portal/rta/ae/public-transport/About-Nol-Card?lang=en): fares depend on zones crossed. Minimum balance AED 7.50 to check in. Tap at entry and at exit. "Ensure to check-out to avoid getting over-charged." The page lists no fare amounts and no overcharge amount. Blue personalised card: students and residents 50 percent off, people of determination free. Bundles (weekly to annual) give unlimited travel.
- Fare table from Bayut and Dubizzle (search summary only, pages not opened; Bayut returned HTTP 410 when I tried): Silver card AED 3 within one zone, AED 5 for two adjacent zones, AED 7.5 for more than two. Red ticket AED 4, 6, 8.5. Gold card AED 6 within one zone. One source says Red is AED 2, which conflicts. Check on rta.ae before quoting.
- Fines (Gulf News, opened): AED 200 for fare evasion, for not showing a card, or using an invalid card. AED 500 for a fake card. Minimum balance AED 7.50 single trip, AED 15 round trip.
- Penalty for not tapping out: not found. The RTA page says only "over-charged", and Gulf News does not say what happens. Do not state a figure. (Whether the system charges a default or maximum fare is the key unknown for any ridership model built from taps. Ask RTA.)
- Zones: RTA bus page links a "Fare Zones of Dubai" PDF. Dubai Pulse data uses Zone 0 to Zone 9 values.

### B3. nol Plus

- RTA press release dated 26 February 2019 (opened): loyalty programme inside the RTA app, "mainly aimed to encourage the digitalisation of payments". Personalised blue card earns 1 point per dirham spent, silver card 1 point per 2 dirhams. Points pay for fares, paid parking, parks, Etihad Museum and retail outlets. No partners named on that page. 27,000 members at launch.
- Current terms: not found on RTA. Search summaries mention nolplus.ae and a nol Travel card with brand discounts.
- Off-peak travel incentive: not found. Search found only identity-based discounts (student, senior, determination), not time-based fares. I cannot say none exists.

### B4. Bus on Demand

- Dubai Media Office, May 2026 (opened): 17 areas after adding Al Qusais, Jumeirah Village Circle, Al Warqa'a and Dubai Investments Park. Fleet 49 minibuses. Fare AED 5 per trip plus AED 4 per extra rider. 984,929 riders in 2025 versus 417,315 in 2024, a 136 percent rise. Next phase: more areas and changes to operating model and fares. No operator named on that page.
- August 2026: 20 areas, 55 buses, after adding Al Satwa, Al Quoz and Mirdif (search summary only; the Media Office URL I tried returned 404).
- Operator name, vehicle seat count: not found.
- Search summary: not integrated with nol fare (separate payment). Not opened.

### B5. Bus lanes

- Khaleej Times, 21 June 2026 (opened, https://www.khaleejtimes.com/uae/dubai-new-taxi-bus-lanes): existing 6.1 km of dedicated bus lanes (4.3 km on Khalid Bin Al Waleed Street). Expansion of 14.5 km on six streets (Sheikh Sabah Al Ahmad Al Jaber Al Sabah, 2nd December, Al Satwa, Al Nahda, Omar Bin Al Khattab, Naif) to reach 20.6 km, 30 percent complete. Claimed peak journey time savings 24 to 59 percent; bus arrival time improvement 28 to 56 percent. Earlier phases saved about 5 minutes per bus (24 percent).
- Earlier RTA claim (Dubai Media Office, May 2025): six lanes, 13 km, total 20 km; ridership up 10 percent, on-time arrival up 42 percent, journey time down 41 percent. The figures differ from the 2026 article. These are RTA projections, not measured results. Bus priority at signals already improved arrival times by up to 12 percent.
- 2022 plan: 37 km on eight streets, works 2023 to 2027 (RTA press release dated 8 May 2022, opened).

### B6. First and last mile

- Dubai Walk Master Plan (Dubai Media Office, 7 Dec 2024, opened): 6,500 km across 160 areas; 3,300 km new and 2,300 km rehabilitated by 2040; 110 pedestrian bridges and underpasses; pedestrian and soft-mobility share from 13 to 25 percent by 2040. Pilot 2025 to 2027. "The Future Loop" is a 2 km elevated walkway with 30,000 sq m air-conditioned level. Gulf News gives 16 percent as the starting share, which conflicts with 13 percent.
- Careem Bike (search summary only): AED 1 unlock plus per-minute rate; day, week and month passes about AED 29, 59, 99; 200+ stations (Platinumlist, Oct 2025); cycling trips 57.3 million in 2025 against 46.6 million in 2024 (Khaleej Times). Sources conflict on prices; verify before quoting.
- E-scooters (search summary only): allowed in designated districts only, permit needed unless holding a driving licence, minimum age 16, AED 200 fine for obstructive parking, banned on Metro and Tram. Zone lists differ between sources.
- Summer heat: AC shelters at 895 locations (B1). Khaleej Times says Dubai summer temperatures regularly exceed 45 C.

### B7. Fleet

- Dubai Media Office, 20 Jul 2025 (opened): 637 new buses due 2025 and 2026: 40 electric Zhongtong (12 m, 72 passengers), 400 MAN city buses (12 m, 86), 51 Zhongtong city buses, 76 Volvo double-deckers (13 m, 98), 70 Isuzu Anadolu articulated (18 m, 111).
- Khaleej Times, 19 June 2025 (opened): deals with Volvo, MAN, Zhongtong, Anadolu Isuzu; all Euro 6; MoU with BYD to pilot an electric bus through summer.
- Fleet age distribution and manufacturer split of the existing fleet: not found. The hackathon fleet table is the only source I know of.
- Zero-emission goal: Gulf News (opened) says RTA Strategic Plan 2023 to 2030 aims to "expedite the migration to zero-emission mobility means by 2050". A figure of 735 electric buses in one blog conflicts with the 40 above and is unverified.

### B8. Strategy targets

- Public transport plus shared mobility to reach 25 percent of trips by 2030 (B1, search summary).
- 20-minute city: Dubai 2040 Urban Master Plan; search summary says 80 percent of essential services within 20 minutes on foot or bike, and 55 percent of the population within 800 m of main public transport (Bayut, The National; not opened). The Gulf News article I opened (4 Feb 2026) gave no timeline for the 20-minute goal and no public transport share target.
- RTA Strategic Plan 2023 to 2030: five goals including Seamless and Innovative Mobility; aligned with Dubai 2040 (Gulf News, opened).
- 25 percent of trips driverless by 2030 (Gulf News, opened).

### B9. Workers' transport

- No official RTA or MOHRE source on how labourers commute was found.
- A labour-bus rental company says it runs between camps in Sonapur, Al Quoz, Muhaisnah, Jebel Ali and Sharjah and job sites (vendor marketing, search summary).
- Rome2rio (aggregator) lists an RTA bus from Naif to Galadari Labour Camp, Muhaisnah 2, about every 30 minutes, 75 minutes, AED 6 to 9. Unverified.
- Dubai Pulse route types include "Driver Shuttle", "Emaar", "ENBD", "EK" (employer shuttles inside the RTA data). Whether these cover labour transport: not found.
- Population by community data may show labour-camp communities (inference); the dataset does not label them.

### B10. RTA apps

- S'hail (search summary only): journey planner for Metro, tram, bus, marine, taxi; live bus locations; an RTA-published note says real-time journey information, bus occupancy data and alerts; nol top-up including NFC; guest use allowed. App Store reviews are mixed on bus timing accuracy (anecdotal). nol Pay app: NFC passes and card details.
- Bus occupancy data exists in the app according to that note, which suggests RTA already has crowding information (inference; not verified).

### B11. What RTA already says it does with AI and data

- Dubai Media Office, 6 Sept 2020 (opened): RTA tested machine learning on nol card data to plan routes by how stops are used through the day. Plan for 150 routes and 2,158 buses; trial on 10 routes for 30 days cut wasted time by 13.3 percent; plan to extend to all routes; can propose removing under-used stops or creating express services; "automated route-proposal and improvement process".
- Dubai Media Office, May 2025 (opened): RTA is "expanding smart systems and AI in bus operations"; route reviews use recorded data and passenger feedback.
- GITEX 2024 RTA PDF "AI LED Bus" (https://rta.ae/links/promotions/gitex-2024/pdf/AI_LED_Bus.pdf): I could not read it (compressed Arabic). A search summary says it describes a "Skip Stop" feature and "Update Scheduling" feature. Treat as unverified.
- Search summary: a Bus Performance Monitoring Centre tracking new Volvo buses; WGS 2025 claim that AI will cut travel time 25 percent by 2035 (not opened).
- Consequence: stop-skipping, express-route proposal and demand-based timetables are things RTA says it already does. A hackathon pitch should not present them as new.

## C. Risks: things an RTA judge may know to be wrong

1. Bus fleet size. Sources say 1,387, 1,390 and 1,518. Use the hackathon fleet table's own count and say which source you use.
2. Do not call the public transport share "public transport only". RTA's 22.3 percent includes shared mobility (search summary).
3. Do not say Bus on Demand uses nol fares. It has its own fare and app (search summary; the May 2026 Media Office page gives AED 5 plus AED 4 per extra rider).
4. Do not claim RTA has no AI for buses. It announced one in 2020 (B11).
5. Do not state a penalty for failing to tap out. None was found (B2). Unmatched check-ins or check-outs will exist in the data; treat as a data quality issue and ask the organisers.
6. Do not assume 15 December 2025 was a normal school day. Most international schools were on winter break (A6).
7. Do not state "dedicated bus lane" length as one number. It is 6.1 km existing and 20.6 km planned (June 2026), or 20 km (2025 statement), or 48.6 km in the 2022 plan. Date every figure.
8. Do not say everyone is exposed to 45 C heat in December. The recorded range on 15 December 2025 was about 17.5 to 30.6 C (reanalysis).
9. Do not claim e-scooters are allowed everywhere or that Dubai Pulse data is "free for any use" without citing the licence draft and attributing RTA.
10. Do not call Dubai Pulse the live portal. It redirects to data.dubai.
11. Anonymised card data: do not attempt to re-identify riders. The open data licence excludes personal data.

## Not found or not verifiable

- Whether the daily bus ridership CSVs are still downloadable today at data.dubai and whether a login or API key is required.
- Whether a public file exists for 15 December 2025 and whether its schema equals the Dataiku file.
- Which licence governs each RTA dataset (portal says "notspecified"; draft Open Data Licence exists).
- Fare amounts from an RTA page (RTA pages I opened give none); fare table is from secondary sources.
- What happens, and what is charged, when a rider fails to tap out on a bus.
- Current nol Plus earn and redeem terms, partners; any off-peak incentive.
- Bus on Demand operator name and vehicle capacity; August 2026 expansion from a primary source.
- Total bus stops (2,185 "stands" on RTA page is the only figure; meaning unclear).
- Age profile and manufacturer split of the current bus fleet.
- DSC population by gender or nationality by community, employment or establishments by community, labour accommodation or mall datasets.
- Official source on labourer commuting, and which public routes serve labour camps.
- Contents of the GITEX 2024 AI bus PDF.
- Current Careem Bike prices and e-scooter zones from official sources.
- A Dubai-specific OSM extract (BBBike Dubai URL returned 404; Geofabrik has GCC only).
- RTA's own measured (not projected) results for the bus lanes, beyond the "5 minutes, 24 percent" statement.
