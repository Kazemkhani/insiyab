# A1 console verification

Recorded 2026-11-18 23:21 +0400. Tested console source: `a464d5098ba5f827baa42884038c02b7544c89b5`. Seven ordered feature commits. The following commit adds only this evidence and the coordination record.

## Console suite

Command: `bash live/ops/tests/run.sh`

```text
PASS exact escalation deadlines, no automatic decision, separate role receipts
PASS event injection cannot decide; wrong incident, stale, premature and duplicate acknowledgements rejected
PASS mode changes invalidate all scripted events; non-critical alerts never escalate
ALL PASS
PASS heat refuses December and invalid priorities; forecast rows preserve missing data and reject duplicates
PASS mutation check catches a decision made without selecting an option
ALL PASS
BUILT Insiyab Live demo: /tmp/insiyab-ops-test.xGhhmH
PASS 1920x1080: inline logo, attribution, no overflow, no text overlap, zero voice requests
PASS 1440x900: inline logo, attribution, no overflow, no text overlap, zero voice requests
PASS 390x844: inline logo, attribution, no overflow, no text overlap, zero voice requests
PASS 1280x720: inline logo, attribution, no overflow, no text overlap, zero voice requests
PASS browser escalation, two human clicks, per-role events, stale-run isolation and zero voice requests
PASS reduced motion: replay jumps to its final state without travel
PASS fixture=false removes the alerts banner; reduced-motion pulse is disabled
PASS WebKit: local map and buses render; every phone control has a 44-pixel touch target
ALL PASS
```

## Real-time rehearsal

Command: `OPS_REALTIME=1 bash live/ops/tests/run.sh`

```text
PASS real-time 90.1s demo: duty, supervisor, two clicks, four separate receipts, zero voice requests
ALL PASS
```

This real-time rehearsal preceded the final visual-only refinements to selected-option opacity, alert-pulse placement, large-screen typography and WebKit select appearance. The lifecycle and its timing did not change afterwards; the full console suite above verifies the final source.

## Repository gate

Command: `bash scripts/gates.sh`

```text
gates on a464d50 (main)
PASS the guard catches planted raw data (1 checks)
PASS no raw data and no identifier in the repository (1 checks)
PASS the stand-in bundle meets the contract (71 checks)
PASS the hand-off zips carry the current prompts (8 checks)
PASS the stand-in raw tables equal a fresh build (so they are invented, not real) (3 checks)
PASS the stand-in bundle equals a fresh run of the engine on the invented tables (1 checks)
PASS the model card equals a fresh one written from the stand-in bundle (1 checks)
NOTE artifacts/ is empty: no real result exists yet
PASS tests/test_measures.py (19 checks)
PASS tests/test_census.py (43 checks)
PASS tests/test_engine.py (36 checks)
PASS tests/test_notebook.py (6 checks)
PASS tests/test_real_formats.py (20 checks)
PASS live/tests/run.sh (34 checks)
PASS web/tests/run.sh (1227 checks)
PASS rider/tests/run.sh (76 checks)
PASS the gates changed no tracked file
ALL GATES PASS
```

The final gate ran without editing tracked files. An earlier development run passed its functional suites but failed its unchanged-tree check; a subsequent run was stopped to fix the WebKit phone hit targets. Neither is used as the final gate evidence.

## Build and visual evidence

`node live/ops/build.mjs --out /tmp/ops` printed `BUILT Insiyab Live demo: /tmp/ops`. The build served through Python's simple HTTP server. A separate direct-file check printed `PASS direct file preview: Route 310 · 19:23 ; 58 bus glyphs`.

Screenshots in `shots/` were generated from the built console and inspected at 1920×1080, 1440×900, 390×844 and 1280×720. The two primary desktop sizes fit the viewport; the phone stacks and scrolls vertically. The automated WebKit check also verifies all phone controls have 44-pixel hit targets.

No real phone or relay API was called, and A1 did not deploy. Live event input is deliberately disconnected. Native Safari foreground inspection was inconclusive because the computer-use server returned `noWindowsAvailable`; a physical phone and the venue browser remain for stream G. Council/Gemini returned no review because its prepaid credits were depleted; no independent-review approval is claimed.
