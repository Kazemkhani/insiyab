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
