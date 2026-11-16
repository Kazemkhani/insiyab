DEPLOYED AND VERIFIED c948c2b https://insiyab.amirkazemkhani.com 2026-11-17 00:11 +04

- Live on the public address, on stand-in data, labelled: the day replayed, the forecast against what happened, the gap, the decisions, the four points of view, the Khutwa passenger page at khutwa/, and the room relay under api/room/. Every served file equals the build by hash; the closed paths answer 404; the site asks not to be indexed.
- What the site shows is the engine's own output on invented raw tables: a real model's table on invented data.
- The engine (`python3 -m model.run`): boardings by stop and route 15 to 120 minutes ahead against three naive forecasts; lateness 1 to 20 stops ahead against two; ranges; which features it leans on; the gap; three levers; four points of view. Tests in the gates: the clock, the splits, the untouched part, the loads, the levers' limits, the same bundle twice.
- Reviewed by a statistician, a planner, a judge and a designer: docs/TEST-LOG.md, with the state of each finding.
- Not yet fit for use: the room relay holds the room in one copy's memory, which does not survive a room of phones. It needs the shared store (two commands for Amir in coordination/lane-1.md). The call to the depot is not wired.
- Not done: the census and the model on the real data; the pitch (lane 4 has not reported); lane 3's public data and its own Khutwa page (lane 1's stands in); the model card; the picture of the Dataiku flow; the second design round (lane 2 is on it).
- Waits on a person: a mentor's answer on whether totals may leave Dataiku (docs/REQUIREMENTS.md, section 6); running the census inside Dataiku; the shared store and the presenter's code; Mustafo starting lanes 3 and 4.
