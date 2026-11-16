# RTA's public network feed, a part of it

What this is: 9 bus routes (8, C01, 27, F47, 320, 84, 91A, 17, J01) out of RTA's public timetable feed, with the 799 trips they ran on Monday 15.11.2021, the 478 stops those trips call at, their paths, and the transfers between those stops. Rows are copied unchanged; rows for other routes and other days are left out.

| | |
|---|---|
| Publisher | Roads and Transport Authority (RTA), Dubai |
| Published as | `rta_gtfs-open` on Dubai Pulse (now data.dubai) |
| Copy used | MobilityData, feed mdb-904: https://storage.googleapis.com/storage/v1/b/mdb-latest/o/ae-dubayy-road-and-transport-authority-rta-gtfs-904.zip?alt=media |
| The feed's own dates | calendar from 9 September 2021 to 31 December 2021: this is the network as published in late 2021 |
| Fetched | 17 November 2026 |
| Terms | Dubai's Open Data Licence (the long form on Dubai Pulse is marked DRAFT): use with attribution to RTA. The MobilityData catalogue marks this copy "deprecated", meaning a newer feed replaced it; it is used here for its shape, not as today's timetable. |
| Made by | `python3 tools/make_public_network.py --feed <folder>` |

What it is not: it is not part of the data RTA gave the hackathon, and it holds no passenger, card, device, driver or vehicle. The stand-in day invents those on top of this network (`tools/make_standin_raw.py`).

Rows kept: agency 1, routes 9, trips 799, stop_times 27,034, stops 478, calendar 1, calendar_dates 0, shapes 12,426, transfers 10, translations 478, feed_info 1.
