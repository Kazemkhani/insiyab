# Persona tests (stream G)

Five walks of the public address, one per person who will meet Insiyab on Friday. Each walk checks that person's failure list automatically and saves a screenshot of every failure. What a script cannot judge is in `MANUAL-CHECKLIST.md`. Findings, owners and severities are written up in `docs/team/PERSONA-REPORT.md`.

| File | Person | Checks |
|---|---|---|
| `p1_controller.py` | RTA bus controller | CONSOLE-SPEC "Must never happen" 1, 2, 3, 5 and part of 4; text size at 3 m; two-click decision in under a minute; Received only after a decision; no `/voice/` request from demo mode or without the presenter key |
| `p2_executive.py` | RTA executive judge | banned claims (STRATEGY section 7) on every page and in speaker notes; a source on every slide with a number; jargon; the pilot ask; timing; stage words match the console |
| `p3_data_scientist.py` | Dataiku data scientist | baseline, RMSE and MAPE, held-out set, losses, ranges, leakage statement, 15% never mixed with stand-in "in 100" figures, judge picker, and every number on the console and deck traced to FACTS, STRATEGY, the model card or the contract |
| `p4_planner.py` | RTA planner | the worklist can be found and reads route, hour, minutes, source; watchers carry their honest labels; heat and lanes never shown as measured |
| `p5_accessibility.py` | phone and screen-reader visitor | overflow at 390x844 and 1920x1080, contrast, reduced motion, alt text, 44 px targets, page language |

Run all five (about four minutes; the controller walk plays the demo twice in real time):

```
bash tests/personas/run.sh
```

Safety: a route guard in `common.py` aborts every request to `/voice/` and every request that is not GET or HEAD, and counts it. A persona walk can never place a call. Results go to `tests/personas/out/<stamp>/` (ignored). Screenshots referenced by the report are copied into `tests/personas/shots/`.

Each check has watched itself fail at least once against the live address (see the first run in the report). The walks are not a release gate and are not in `scripts/gates.sh`: they test the deployed site, which the gates do not touch.
