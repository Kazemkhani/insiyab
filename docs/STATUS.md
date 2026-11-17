DEPLOYED AND VERIFIED 15b3908 https://insiyab.amirkazemkhani.com 2026-11-17 04:49 +04

- Live on the public address, on stand-in data, labelled. The first screen is the day in plain words: one headline, three counts, three things a planner could do. Under it, a real map of Dubai (OpenStreetMap streets, shipped with the site) with RTA's real routes and stops and every bus moving through the day. Then the forecast, the gap and its decisions, the model's evidence, four people, the Khutwa passenger page and the room relay.
- What is real and what is invented on that map: the network is RTA's own public timetable feed as published in late 2021 (nine routes, 478 stops, one Monday's 799 trips; opendata/public/rta-gtfs/PROVENANCE.md). The passengers, vehicles and lateness are invented. Nothing shown comes from the data RTA gave the hackathon.
- The engine (`python3 -m model.run`) runs on that day in 44 seconds, and inside Dataiku as one pasted file (`python3 tools/make_notebook.py`). It follows each vehicle across midnight: the real timetable runs to 05:31 the next morning.
- Being built, not on the site: a 3D third-person scene for each of the four people (a first version exists and is too crude to show).
- Not yet fit for use: the room relay holds the room in one copy's memory. The call to the depot is not wired.
- Not done: the census and the model on the real data; the pitch beyond a first draft (docs/PITCH-DRAFT.md); public data as features; the picture of the Dataiku flow.
- Waits on a person: what Dataiku has installed (LightGBM); the census run; a mentor's answer on whether totals may leave Dataiku; the shared store and the presenter's code; Mustafo starting lanes 3 and 4.
