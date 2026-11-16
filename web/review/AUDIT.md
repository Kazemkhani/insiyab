# Review of the complete lane 2 journey

16 November 2026. These are simulated reviewer roles, not interviews with RTA judges, passengers or external experts. An independent Gemini council call could not run because its provider returned 402 (prepaid credits depleted); no independent model approval is claimed. The connected browser host was unavailable, so verification uses the repository's authorised Chromium tests on Metal and opened screenshots.

| Reviewer / step | Finding | Change and evidence |
|---|---|---|
| RTA judge: first five seconds | The original screen spent more space explaining itself than showing the day. Community labels overlapped. | Shorter opening, larger replay, route focus, selected bus and passenger/seat reading. `browser.py` checks focus, label suppression, viewport, touch size and timing. Desktop and phone images inspected. |
| Forecast expert: choose model and horizon | The headline picked the first model and first naive forecast, even when stronger naive models were supplied. | Model choice is explicit; comparison follows each result’s named naive on the same horizon/subset, with lowest-MAE fallback for older bundles. Losses say the naive misses less. `review.py` plants a stronger naive at the end and proves it is used; a negative control fails the old claim. Deployment model selection is not inferred from this table. |
| Forecast expert: pick a stop | Multiple route series at a stop were silently collapsed to the first. Missing series could accidentally resolve index zero. | Explicit route/series choice; empty selection has no row. Tests plant a second series, a missing stop and null actual. Interval result is stated only after reveal. Direction is included when supplied by the checked contract. |
| Depot planner: hold the order | The original printout said assignments were missing even after lane 1 supplied them. | Uses exact `swaps` trip, route, stand-in vehicle, start, seats and largest load. Prints proposal status and unverified operational constraints. Browser checks every supplied trip, print-only visibility and exactly one A4 page. The page-count test first failed on the six-pair engine bundle; one combined assignment table fixed it, and the PDF was rendered and opened. Nothing is dispatched. |
| Fixed-shift site worker | An incentive can be useless if the passenger cannot change time. Boardings are not a queue. | Kept the capacity exchange as a separate lever; no uptake percentage is imported from overseas. Story and recorded context stay separate. Passenger eligibility remains lane 3's responsibility. |
| Office worker / accessibility | A route alternative has a walking and time burden. A scene is not proof that the walk is accessible. | Keep offer fields and links tied to the bundle; request eligibility checks in lane 3. No generated walking time. 320px, 390px, landscape, keyboard focus styles and reduced motion checked locally. No claim of testing on a physical phone. |
| Presenter with no connection | Forecast failure originally rejected the view-change promise. The passenger page and room are separate integrations. | Missing local forecast reports a retry path and leaves replay usable. Browser contexts start offline, with zero HTTP(S) requests in the standalone walk. Room fallback stays explicitly played back. `khutwa/` cannot be verified until lane 3 supplies it. |

## Journey health

Replay and inspection: checked. Forecast and reveal: checked, including loss and missing data. Model table: checked against the named naive at the selected horizon and subset. Gap and proposals: checked against bundle totals. Printed order: checked against supplied trip pairs. Four viewpoints: checked for manual steps, labels, provenance and return path. Presenter mutations and one audience answer are now checked end to end through the real relay handler locally. Passenger offer, live depot reply and deployment remain cross-lane integrations.

## Commands

- `bash web/tests/run.sh`: fixture build, deterministic geometry checks, offline Metal browser walk and adversarial review; ends `ALL PASS`.
- `bash web/tests/engine.sh`: invented raw tables through the engine, contract build and the same browser/review tests; ends `ENGINE TO BROWSER PASS`.
- `bash scripts/gates.sh`: repository gate, including engine and web tests.

Full run logs and inspected pictures live outside git under `~/work/insiyab-run/`. The final coordination entry gives the pushed commit and verified run results. A passing assertion does not certify visual quality or operational feasibility; those boundaries are kept separate.

## Review follow-through

Lane 1 published independent planner, judge, designer and statistician reviews in `docs/TEST-LOG.md`. Its original 58/100 judge score predates these changes; no new score is claimed. Priorities C1–C5 are implemented with the enlarged stage, model horizon/subset charts, stop forecast/reveal chart and gap comparison. J6/J7/J12/P11 are covered by the named clock, pooled gain range including zero, full-width phone timeline and exact supplied testing limits. Separate empty/occupied interval coverage and feature importance are shown from checked metadata. Lateness uses stops ahead and seconds.

The four figures are now scripted Blender renders, paired with exact one-seat/one-passenger marks. A 38-second Remotion opening uses actual offline browser recordings and ends with the local QR asset. Sixteen desktop/phone screenshots and the print PDF were opened; the film's view transitions and ending were inspected as extracted frames. Fictional scenes and stand-in data remain explicit.

Cut 6 also opens at the first untouched origin, separates pooled evaluation from the replay counter, keeps the reveal action above the chart, folds decision evidence, and removes superseded CSS declarations. The loopback relay test confirms wrong-code refusal, no visitor mutation, audience answers, evidence remaining open during polling, in-memory-only presenter authority, reload clearing it, and explicit fallback after store failure. A read-only public GET returned HTTP 200 with a waiting empty room; no public state was changed.
