# Review of the complete lane 2 journey

16 November 2026. These are simulated reviewer roles, not interviews with RTA judges, passengers or external experts. An independent Gemini council call could not run because its provider returned 402 (prepaid credits depleted); no independent model approval is claimed. The connected browser host was unavailable, so verification uses the repository's authorised Chromium tests on Metal and opened screenshots.

| Reviewer / step | Finding | Change and evidence |
|---|---|---|
| RTA judge: first five seconds | The original screen spent more space explaining itself than showing the day. Community labels overlapped. | Shorter opening, larger replay, route focus, selected bus and passenger/seat reading. `browser.py` checks focus, label suppression, viewport, touch size and timing. Desktop and phone images inspected. |
| Forecast expert: choose model and horizon | The headline picked the first model and first naive forecast, even when stronger naive models were supplied. | Model choice is explicit; comparison uses the lowest supplied naive MAE on the same horizon and all-bin subset. Losses say the naive misses less. `review.py` plants a stronger naive at the end and proves it is used; a negative control fails the old claim. Deployment model selection is not inferred from this table. |
| Forecast expert: pick a stop | Multiple route series at a stop were silently collapsed to the first. Missing series could accidentally resolve index zero. | Explicit route/series choice; empty selection has no row. Tests plant a second series, a missing stop and null actual. Interval result is stated only after reveal. Direction names await a checked contract. |
| Depot planner: hold the order | The original printout said assignments were missing even after lane 1 supplied them. | Uses exact `swaps` trip, route, stand-in vehicle, start, seats and largest load. Prints proposal status and unverified operational constraints. Browser checks every supplied trip and print-only visibility. Nothing is dispatched. |
| Fixed-shift site worker | An incentive can be useless if the passenger cannot change time. Boardings are not a queue. | Kept the capacity exchange as a separate lever; no uptake percentage is imported from overseas. Story and recorded context stay separate. Passenger eligibility remains lane 3's responsibility. |
| Office worker / accessibility | A route alternative has a walking and time burden. A scene is not proof that the walk is accessible. | Keep offer fields and links tied to the bundle; request eligibility checks in lane 3. No generated walking time. 320px, 390px, landscape, keyboard focus styles and reduced motion checked locally. No claim of testing on a physical phone. |
| Presenter with no connection | Forecast failure originally rejected the view-change promise. The passenger page and room are separate integrations. | Missing local forecast reports a retry path and leaves replay usable. Browser contexts start offline, with zero HTTP(S) requests in the standalone walk. Room fallback stays explicitly played back. `khutwa/` cannot be verified until lane 3 supplies it. |

## Journey health

Replay and inspection: checked. Forecast and reveal: checked, including loss and missing data. Model table: checked against the strongest supplied naive at the selected horizon. Gap and proposals: checked against bundle totals. Printed order: checked against supplied trip pairs. Four viewpoints: checked for manual steps, labels, provenance and return path. Passenger offer, presenter mutations, live depot reply and deployment remain cross-lane integrations, not completed lane 2 claims.

## Commands

- `bash web/tests/run.sh`: fixture build, deterministic geometry checks, offline Metal browser walk and adversarial review; ends `ALL PASS`.
- `bash web/tests/engine.sh`: invented raw tables through the engine, contract build and the same browser/review tests; ends `ENGINE TO BROWSER PASS`.
- `bash scripts/gates.sh`: repository gate, including engine and web tests.

Full run logs and inspected pictures live outside git under `~/work/insiyab-run/`. The final coordination entry gives the pushed commit and verified run results. A passing assertion does not certify visual quality or operational feasibility; those boundaries are kept separate.
