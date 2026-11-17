# Digital twin rebuild — 17 November 2026

## Implemented direction

The first screen links one service day to a geographic map and a concrete vehicle exchange. A visitor can find a real stop, focus a route, move through the day and compare the first proposed swap. The two trip loads and capacities come from decisions.json; demand does not change when capacities exchange. Repositioning and unchecked constraints stay beside the action. Detailed forecast evidence remains one named action away.

The shared bundle now supplies nine archived RTA routes and 478 real stops. This supersedes the separate public-reference map developed against the earlier fictional network. The historical source is explicit: late 2021, not today's timetable. Counts, vehicle assignments and lateness remain invented. The fixture metadata still says "Invented network"; lane 1 owns that stale upstream sentence and must correct it. The web source note distinguishes the actual provenance.

MapLibre draws local OpenStreetMap streets, with deck.gl drawing the bundle's routes, stops and replay. Direct-file operation decodes the same PMTiles archive through FileSource; HTTP uses same-origin byte ranges. Neither mode needs an external map service. The map's archive and public-network notices ship with the site.

Four fictional perspectives use one live Three.js renderer. A planner sits at a desk with the proposed pair; a site worker watches a bus arrive; an office worker can follow the existing Khutwa offer; a driver sees an illustrative cab and stop request. The cutaway creates one seat mesh per seat and one passenger per supplied passenger. Excess passengers occupy distinct positions. Furniture, seat layout, movements and stop requests are illustrations, not measured telemetry or surveyed assets. Closed doors cannot establish that nobody waited.

One tap advances each story. Arrival motion stops after 1.5 seconds; reduced motion goes directly to the final position. Camera controls offer a third-person and overhead seat view. Role changes reuse one renderer and dispose scene resources. The unused alternate 3D experiment and static image implementation were removed.

## Review method

Automated journeys represent a nontechnical judge, service planner, passenger, driver and accessibility reviewer. These are simulated perspectives, not interviews with RTA or actual passengers. Tests inspect real rendered layer and mesh data, not just labels. Negative controls reject duplicate standing positions, missing fixture labels and incorrect changed counts. Existing forecast, room and print checks remain part of the suite.

Before integration with the new shared network, council review found three defects: overlapping standing figures, an unscoped full-programme cost note and lost keyboard focus after a swap. All were corrected; its second pass returned SHIP. That review did not certify the later combined network integration. Final combined checks and screenshot evidence are recorded below after execution.

International references and the decisions they informed are in INTERNATIONAL.md. No external programme's effect size is claimed for this prototype.

## Integrated review fixes

The geographic merge was reviewed independently by council's Codex reviewer. Its source probes found omitted return paths and a global stop search that preserved the selected route filter. Both are fixed and tested against actual rendered layers. A follow-up found inconsistent symbols in the network-only fallback. Both renderers now share one symbol function; a browser test removes the local map file and checks the fallback, notice and usable records.

Visual inspection caught forecast endpoint labels in the wrong order and standing figures too close for the larger stand-in load. Labels now follow their values in both orders, and the 3D test measures nonintersecting figure bounds. The new upstream briefing is retained as a disclosure below the map. Its claims distinguish boardings from waiting passengers, zero boarding/alighting from an empty stop, and fractional expected responses from whole passengers.

The final council follow-up found only the briefing's waiting-queue wording; that phrase is corrected to “How many passengers will board?” and checked in the rendered page. The council did not execute browser journeys or certify production. The parent executed the browser tests.

## Final validation and delivery

Source revision `f44fe6f` was pushed to main at 05:14 Dubai time on 17 November, before the 06:00 target. Cuts 1–4 were already pushed and announced individually the previous evening; this revision replaces the old schematic and static scenes while retaining those workflows. Deployment belongs to lane 1 and was not performed by lane 2.

Commands and actual final output:

```text
node web/build.mjs --bundle fixtures --out /tmp/insiyab-site
BUILT /tmp/insiyab-site: 20 bundle files; fixture=true; local fonts, deck.gl and QR. Open index.html directly, including offline.

INSIYAB_SHOTS="$HOME/work/insiyab-run/review/merged" bash web/tests/run.sh
  basemap: 8 passed, 0 failed
  ALL PASS
ALL PASS

bash scripts/gates.sh
PASS tests/test_engine.py (36 checks)
PASS tests/test_notebook.py (6 checks)
PASS live/tests/run.sh (34 checks)
PASS web/tests/run.sh (885 checks)
PASS the gates changed no tracked file
ALL GATES PASS

INSIYAB_SHOTS="$HOME/work/insiyab-run/review/merged" bash web/tests/engine.sh
ALL PASS
ENGINE TO BROWSER PASS

bash web/film/render.sh /tmp/insiyab-site "$HOME/work/insiyab-run/film/rebuild"
FILM BUILT
```

Build, standalone web tests, repository gates and film ran on `f44fe6f`. The explicit engine-to-browser command ran before the last map-label and film-timing polish; the final repository gate also regenerated the engine bundle and ran the web suite. Full logs are outside git at `~/work/insiyab-run/review/logs/twin-final-{web,gates,engine,film,twin}.log`.

The browser journeys open the built folder directly with network access disabled and reject remote requests. A separate test exercises same-origin PMTiles byte ranges. Removing the map file deliberately proves the network-only fallback. Geometry and label negative controls prove the assertions reject incorrect positions and overlap. Final visual review also checked actual bus pointer selection, keyboard focus after the swap, readable route labels and the before/after count changes.

Thirty-seven screenshots at 1280×720 or 390×844 are in `~/work/insiyab-run/review/merged/`, all opened. They cover the overview, forecast, gap, model, route selection, exchange, briefing, four roles before and after, overhead seats, room and Khutwa. `manifest.json` records dimensions and SHA-256 hashes. Two additional HTTP basemap screenshots at both sizes are in the parent review folder and were opened.

The 38-second H.264 opening film is `~/work/insiyab-run/film/rebuild/Insiyab-opening.mp4` at 1280×720. Nine sampled scene-boundary/end frames were opened. Recording startup varies by scene; the capture now measures each clip's start offset instead of applying a fixed one-second trim. The final role captions match their scenes.

These checks are local evidence. The room test uses the actual relay handler and passenger page with simulated shared-store status; it does not prove public-store durability. No depot message or operational instruction was sent. The archive is historical, and operational counts are stand-ins. Broader real-data route loading remains a future scaling task if approved totals become available.
