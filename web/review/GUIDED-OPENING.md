# A first visit that explains the decision

Amir rejected a dashboard as the first impression. The morning cut walked a visitor through a fictional passenger, an underused vehicle on another trip, a reversible simulated exchange, the forecast evidence and the passenger's voluntary choice. The afternoon order is documented below. Each chapter has one primary next action; the network remains one click away. The original cut 1–4 screens and decision deep links remain available.

The counts and visible seat/passenger geometry come from the selected decision pair. Changing that pair in a test changes both the picture and the text, even if the persona still contains older counts. The two trip peaks are explicitly separate. Extra running and unchecked vehicle access/driver duties remain beside the swap. Forecast errors say smaller is better, retain units and the one-day limitation, and expose the actual forecast experiment. The passenger offer makes no seat reservation.

The same Three.js renderer serves the guide and the four perspectives. During the guide's exchange, the bus stays in place and added seat rows appear. State colours bypass tone mapping, simulated scenes carry an in-scene label, and a one-finger swipe can scroll the page. Switching scenes disposes the previous scene's controls and markup.

Validation on 17 November:

- `bash web/tests/run.sh` ended `ALL PASS`. New `guide.py` covers default entry, all chapters, exact scene counts before/after/undo, keyboard focus, reduced motion, onward forecast navigation, return/restart, source mutation and offline operation. The existing geographic, decision, four-person, room and fallback journeys also pass.
- Source-only council review found the hidden disclaimer, home-link routing, focus restoration and OrbitControls' inline touch override. All were corrected. Final focused verdict: `SHIP` (`/tmp/insiyab-guide-council-verified.log`). This is a simulated expert review, not an RTA interview.
- Twelve screenshots, six states at 1280×720 and 390×844, were opened under `~/work/insiyab-run/review/guide/`. The first action fits both viewports. Browser tests also cover 320×568, landscape and reduced motion.
- The first suite failures exposed stale hidden scene controls and a tile-readiness race in the assertions. The scene now clears its old host, and map tests await completed local tile loading rather than sampling a transient source state.

Local preview: `/tmp/insiyab-site/index.html`. Deployment remains lane 1's responsibility. This pass improves the introduction; it does not claim the broader 3D art-direction review is fully resolved.

Follow-up to the independent judge's Review 5: the first screen now names both forecasts in plain words. Decisions now opens with one starting total; the visitor requests the before/after comparison. Reliability uses short model names, explains the naive comparison and provides a direct, keyboard-focused link to the supplied stop-model inputs. The inputs were already present on the stop target; the default route target has none. Feature importance explicitly belongs to the chosen model, even when the table is comparing another model. The brand and map attribution links have 44-pixel hit areas. The phone comparison action occupies a full row.

The updated browser suite checks these behaviours. Live checks on deployment `9d6b8ee` at 1280×720 and 390×844 confirmed guided entry, the primary action above the fold and a labelled interactive swap without page errors. The later judge fixes are separately pushed for lane 1 to deploy. Eight screenshots under `~/work/insiyab-run/review/judge-fixes/` were opened. The 60-second film now uses all thirteen corrected voice lines; its source and independent encoded-media checks are in `web/film/`.


## Dataiku judge direction, 17 November afternoon

The guide now orders the supplied day's fact, a timetable comparison, the vehicle exchange, forecast evidence, how it is built, and the optional reward last. The timetable chapter reads the selected trip's first and last scheduled/recorded departures; it does not attribute the cause of lateness from that example. The six build steps are RTA's tables, Prepare, Insights, Forecast, Decisions, Published, with one sentence each. It uses the existing identity and a semantic ordered list. A Dataiku source statement is quoted only from the contracted meta.notes; the current fixture has none. Partner surveys are explicitly proposed and not connected.

The morning/evening insight contract has not been published. Its marked template in index.html is inert, never mounted, and contains no invented figure or guessed bundle key. The current first fact reads meta.counts.boardings. Unknown insight fields are ignored. Once lane 1 publishes the contract, it owns the evidence needed to activate the morning/evening headline and its explanation.

Review 5 V2, V4 and V8 fixes remain in place and tested. V3 was a target-selection issue: the inputs are on the stop forecast; the route forecast opens by default. The direct button selects the supplied target and focuses its inputs. The room integration now builds rider/ and passes through the real local relay handler. The driver story no longer infers that nobody was waiting from a closed-door record.
