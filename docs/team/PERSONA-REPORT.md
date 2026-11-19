# Persona report (stream G)

**Final state (run 3, Thu 17:36, deploy 9703223): 0 blockers open, 16 fixes and 1 polish open.** Details under Runs.

Five people meet Insiyab on Friday. This report walks the public address as each of them, lists what fails them, and hands each finding to the stream that owns the file. Stream G fixes nothing outside `tests/personas/`.

**How it was run.** `bash tests/personas/run.sh` against `https://insiyab.amirkazemkhani.com`, headless Chromium, read-only: every request to `/voice/` and every non-GET request is aborted and counted, so no walk can place a call. Each failure saves a screenshot; `python3 tests/personas/publish_shots.py` copies them to `tests/personas/shots/<run>/`. The manual checklist is `tests/personas/MANUAL-CHECKLIST.md`.

Severity: **blocker** = would fail a judge or break a rule in `docs/RULES.md` or the CONSOLE-SPEC "Must never happen" list; must be fixed before Friday. **fix** = a judge would notice; fix today if possible. **polish** = worth doing if time allows.

Owners: **A** console (`live/ops/`), **B** story (`story/`: pitch page, deck, film), **C** model, **D** watchers, **E** words (`docs/pitch/`), **F** facts (`docs/research/`), **lane 1** (`web/`, integration and deploy).

## Runs

| Run | Dubai time | Deploy (`/deploy.json`) | Summary line |
|---|---|---|---|
| 1, baseline before the freeze | Thu 19 Nov 10:51 | f8509e9 (main was at 34fa9ca: the public site was behind main) | `PERSONAS: 130 PASS, 21 FAIL (4 blocker, 16 fix, 1 polish); deploy f8509e9; 0 voice requests attempted, all aborted` |
| 2, **the 12:00 run, after the freeze** | Thu 19 Nov 12:01 | 91dcd2e (equals main) | `PERSONAS: 127 PASS, 24 FAIL (5 blocker, 18 fix, 1 polish); deploy 91dcd2e; 0 voice requests attempted, all aborted` |

Per persona in run 2: controller 28 pass, 5 fail; executive 19 pass, 6 fail (4 blockers); data scientist 14 pass, 7 fail (1 blocker); planner 18 pass, 1 fail; accessibility 48 pass, 5 fail.

| 3, **after the afternoon deploy (final)** | Thu 19 Nov 17:36 | 9703223 (equals main) | `PERSONAS: 119 PASS, 17 FAIL (0 blocker, 16 fix, 1 polish); deploy 9703223; 0 voice requests attempted, all aborted` |

Per persona in run 3: controller 28 pass, 5 fail; executive 18 pass, 3 fail; data scientist 18 pass, 3 fail; planner 19 pass, 1 fail; accessibility 36 pass, 5 fail. Fewer checks than run 2 because `/` now redirects (307) to `/pitch/`: the walks skip a page that redirects to another page they already walk, instead of counting its findings twice.

**Run 3: no blocker remains open.**

| Blocker | Status after run 3 | Evidence |
|---|---|---|
| G1 pitch cited the stand-in model card | **closed** (lane 1, e7c3523): the pitch cites RTA records in Dataiku and `opendata/onday/` | check "the headline trip-time result cites a source that contains it" PASS |
| G2 "most stops are poles" on slide 10 | **closed** (e7c3523) | banned-claim check on every slide PASS |
| G3 the same line in the notes and PITCH.md | **closed** (e7c3523) | banned-claim check on speaker notes PASS |
| G4 notes timings 650 s against 8:00 | **superseded**: lane 1 moved the final to a 5-minute plan and stream E is writing the script. Kept as a fix: the deck notes now total 580 s + 40 s film = 620 s against 300 s | timing check, now against 300 s, FAIL (fix, B and E) |
| G19 judge picker with stand-in "20 stops ahead" cells that never lose | **closed** (e7c3523): while `judge_pick.json` is stand-in the console shows no picker, only the verified 6.97 vs 8.25 with "Source: RTA records, 15 Dec 2025 (opendata/onday/FORECAST-RETEST.md)" | checks "the console shows the verified result with its source" and "no stand-in cells" PASS |

Also new in run 3 and passing: the stage entry `/ops/?stage=1` (live mode with a 5-second acknowledgement window) makes no request to `/voice/` and no write for a visitor without the presenter key. The Overflow watcher row was removed from the pitch page (its claim came from the stand-in card); the planner walk no longer expects it, but checks its label if it returns.

Still open as fixes (owners unchanged, screenshots in `tests/personas/shots/20261119T133606Z/`): G5 (pitch says driver, depot, station and planning are called before a decision; the demo keeps them Waiting), G6 to G9 and G18 (console: disabled options under "Choose an option", small honesty labels, two contrast failures, the 14 px map credit link), G10 (deck cut off on a phone), G11 (pitch contrast), G12 (15% and 16% on one screen), G13 (two still-out figures), G15 (244 bus hours and 162 routes not in FACTS), G16 (no "eight weeks" on the pitch page), G17 (no link to the planner's worklist). G14 is resolved with G19.

**Run 2 against run 1:** none of the 21 run-1 findings is fixed in deploy 91dcd2e (that deploy carried the call theatre, voice-agent settings, film sources and model modules). It adds one blocker (G19: the console's judge picker now shows the stand-in engine's "1 to 20 stops ahead" cells, in which the forecast never loses) and two fixes folded into G14. Screenshots below are from run 2 unless marked.

## Blockers (5 in run 2), each posted in `coordination/v2-G.md`

| # | Persona | Page | Finding | Owner | Screenshot |
|---|---|---|---|---|---|
| G1 | data scientist | `/pitch/` forecast section | The headline result (6.97 vs 8.25 min) says **"Source: MODEL-CARD.md, lines 216 to 219"**. The model card contains neither number, its first paragraph says **"STAND-IN DATA, NOT A RESULT"**, and lines 216 to 219 are now stand-in boarding tables. A Dataiku judge who opens the cited source finds the opposite of a source. Fix: cite the table already named under it (`running_time_metrics`, trips due 16:00 to 18:59) or `opendata/onday/HOW-IT-CONNECTS.md`; C may also add the real trip-time result to the card in a section that is not stand-in. | B (citation), C (card) | `tests/personas/shots/20261119T080124Z/data-scientist-01-the-headline-gain-is-one-number-on-one-scr.jpg` |
| G2 | executive | `/pitch/deck/` slide 10, on screen | **"Here, most stops are poles in the sun."** Banned (STRATEGY section 7: any count of unshaded stops we did not compute). We know 993 poles among 1,600 stops of known kind out of 4,526; "most" is not established. Say: "553 air-conditioned shelters and 993 poles among the stops whose kind RTA published." The slide's own footer already says this. | B | `tests/personas/shots/20261119T080124Z/executive-02-no-banned-claim-in-the-rendered-text.jpg` |
| G3 | executive | `/pitch/deck/` slide 10, speaker notes | The same sentence is in the notes Sara will read aloud ("Here, most stops are poles in the sun"). PITCH.md beat 5 has it too. | B (notes), E (script) | none (notes) |
| G19 | data scientist, executive | `/ops/` judge picker ("Pick any route and hour") | New in run 2. The picker now loads stream C's stand-in `judge_pick.json`: 36 route-hours, and its footnote says "Each cell averages forecasts made in that hour, **1 to 20 stops ahead**". "20 stops ahead" is on the STRATEGY section 7 list of stand-in figures that are never on screen. Worse for a Dataiku judge: across all 36 cells the forecast is closer in 35 and tied in 1; the simple rule never wins. The real result is the opposite shape (only 6% past the simple rule; from 19:00 the timetable is closer). It is labelled "Stand-in data: invented tables, not a result", but on stage a judge who picks a route sees an invented model that never loses. Either feed the picker real held-out trip-time cells (C), or take the picker off the console for Friday (A). | A (console), C (file) | `tests/personas/shots/20261119T080124Z/executive-01-no-banned-claim-in-the-rendered-text.jpg`, `tests/personas/shots/20261119T080124Z/data-scientist-05-the-judge-picker-shows-real-held-out-forec.jpg` |
| G4 | executive | `/pitch/deck/` speaker notes | The notes' own timings for slides 1 to 15 add up to **610 s, plus the 40 s film = 650 s (10 min 50 s)** against a target of 7:30 and a hard stop at 8:00. Either the timings in the notes are stale or the talk is three minutes too long. Rehearse against a clock and update the notes. | B (notes), E (timing) | none |

## Fix (16 in run 1; 18 in run 2, the two new ones under G14)

| # | Persona | Page | Finding | Owner | Screenshot |
|---|---|---|---|---|---|
| G5 | executive | `/pitch/` hero and "Our answer"; deck slide 8 notes | The words contradict the console and CONSOLE-SPEC. The pitch says twice: "When a critical alert is not acknowledged, it calls driver, depot, station and planning at once". Slide 8's notes say "It asks the driver, depot, station and planning at once, then phones the duty controller". CONSOLE-SPEC: "The driver, the depot, the station and planning are called only after a person has decided", and the demo keeps all four rows Waiting until the controller confirms. Judges will watch the console straight after hearing the opposite. A and B agree one sequence (v2-A 22:50 describes the live relay asking for reports first), then B and E make the words match it. | B and E (A to confirm the sequence) | none (text) |
| G6 | controller | `/ops/` before Demo mode | The panel says "Choose an option, then confirm the decision." while all three option buttons are disabled until Demo mode is pressed. A controller who clicks first gets nothing. Either enable the options on load or say "Press Demo mode to start". | A | `tests/personas/shots/20261119T080124Z/controller-01-the-risk-line-is-at-least-28-px-readable-from-.jpg` |
| G7 | controller | `/ops/` at 1920x1080 | "likely 13 min late" is 26 px; from 3 m on a wall screen 28 px or more is safer. Several labels are 11 to 13 px: "15 Dec 2025 replay", "Simulated calls. Nobody is connected.", "July scenario", the network credit, "Stand-in alerts", the call status line, the NEXT rows, the judge-picker headers. The words that keep us honest (stand-in, simulated) are among the smallest on screen. | A | same as G6 |
| G8 | controller, accessibility | `/ops/` | Contrast under WCAG AA: the map hint "Use Ctrl + scroll to zoom the map" (white on grey, 3.07:1) and the word "Suggested" in brand gold #9C7B3E on ivory at 14 px (3.63:1; needs 4.5:1 at that size, or make it 18.66 px bold or larger for 3:1). | A | same as G6; phone: `tests/personas/shots/20261119T080124Z/accessibility-04-text-contrast-at-least-4-5-1-3-1-for-large-.jpg` |
| G9 | accessibility | `/ops/` at 390 px | The "OpenStreetMap contributors" link is 140x14 px, under the 44 px touch target (RULES 5.5). | A | `tests/personas/shots/20261119T080124Z/accessibility-04-text-contrast-at-least-4-5-1-3-1-for-large-.jpg` |
| G10 | accessibility | `/pitch/deck/` on a phone | The slide stage is centred off-screen: it spans -292 to 682 px on a 390 px screen, so the left of every slide is cut off ("m Dubai", "bai's bus control centre"). The page also scrolls sideways (scrollWidth 683). The pitch page links to the deck, and the QR leads to the pitch page. | B | `tests/personas/shots/20261119T080124Z/accessibility-03-the-slide-fits-the-phone-screen-nothing-cut.jpg`, `tests/personas/shots/20261119T080124Z/accessibility-01-no-sideways-scroll-at-390x844.jpg` |
| G11 | accessibility | `/pitch/` at 390 px | Contrast: "Watch the film" (ink on gold #9C7B3E, 4.41:1) and the 12 px label "Measured on the real day" (teal #2E7D6B on pale blue, 4.08:1). | B | `tests/personas/shots/20261119T080124Z/accessibility-02-text-contrast-at-least-4-5-1-3-1-for-large-.jpg` |
| G12 | data scientist | `/pitch/` forecast section | The same result is "15% closer" in the headline and the bar label and **"16% closer"** in the table's last column (1 - 6.97/8.25 = 15.5%). The deck and the stage say 15%. Round the table the same way. | B | `tests/personas/shots/20261119T080124Z/data-scientist-01-the-headline-gain-is-one-number-on-one-scr.jpg` |
| G13 | data scientist | `/pitch/` | Two figures for the still-out signal sit on one page: "late 85 in 100 when the bus is still out (696 departures)" and "589 of 945 late trip starts with the bus still out" (62%). They are different questions (late given still out, and still out given late), but side by side they read as two rates for one thing. Say which is which in one line, or keep one. | B | none (text) |
| G14 | data scientist | `/ops/` judge picker | "Pick any route and hour" offers 3 route-hours, all "Invented console rehearsal ... Stand-in rows, not a model result". It is honestly labelled, but the one interactive proof for the Dataiku judge is invented. Needs C's real held-out picks (`judge_pick.json` from the RTA run), or the picker should leave the stage. Run 2: now 36 stand-in route-hours, with no cell where the simple rule wins (losses no longer visible) and cell values (1.8, 4.8, 5.8 min) that trace to no document; see blocker G19. | C (real file), A (wiring) | `tests/personas/shots/20261119T080124Z/data-scientist-05-the-judge-picker-shows-real-held-out-forec.jpg` |
| G15 | data scientist | `/pitch/deck/` slides 3 and 7 | Numbers not in FACTS.md, STRATEGY.md, the model card or the contract: slide 3 "244 bus hours" (and "80 buses: 244 ÷ 3"), slide 7 "162 routes". They trace to the Dataiku tables named on the pitch page (`running_time_ledger_by_hour`, `running_time_metrics`), so they are probably right, but FACTS has no line for them. Full list in "Traceability" below. | F (add to FACTS), B | none |
| G16 | executive | `/pitch/` | The pitch page states the pilot as "one control-centre shift on selected routes" but not "eight weeks", which the deck and the stage say. Use the same ask everywhere. | B | none |
| G17 | planner | `/` and `/pitch/` | No link or button names the planner view. The worklist ("Which routes, at which hours, need more time") exists on the pitch page and is good, but the navigation lists Film, Bus journey, The problem, Our answer, How it's built, Executive deck, the console and Dataiku. A planner arriving cold does not find it. Add "Planner's worklist" to the navigation. | B | `tests/personas/shots/20261119T080124Z/planner-01-a-visible-link-or-button-leads-to-the-planner-vie.jpg` |

G7 counts as two script checks (risk line size, text under 14 px), G8 as two (one per persona) and G10 as two (cut off, sideways scroll): 16 fix results in all.

## Polish (1)

| # | Persona | Page | Finding | Owner |
|---|---|---|---|---|
| G18 | controller | `/ops/` | Median text size in the decision column (NOW, Suggested, Calls) is 14 px. A wall screen in a control room is read from a distance; 18 px would help. | A |

## The "Must never happen" list (CONSOLE-SPEC), each with its test

| # | Rule | Test in `p1_controller.py` | Runs 1 and 2 |
|---|---|---|---|
| 1 | "Decided" without a human click and a confirming second click | one click on an option, wait, check no decision stamp and no relay phase; a separate confirm control must appear; during the escalation one click alone also does not decide; with no click at all for the full escalation, nothing is decided | PASS |
| 2 | "Received" without an acknowledgement from that person | the role rows are sampled every 200 ms from Demo mode to the fourth receipt; no row is Received before the controller's stamp; teal (#2E7D6B) only on received rows; each Received has a time and the word | PASS |
| 3 | A real call from demo mode or from a visitor without the presenter key | every request is watched; the demo runs twice, and the console is opened with `?live=1`, `#live`, `?mode=live` and `#key=wrong` and both buttons pressed; zero requests to `/voice/`, zero writes | PASS (0 voice requests) |
| 4 | A simulated number without its label; December weather shown as a heat emergency | the alert carries stand-in or simulated; every likely effect says estimate; no temperature without "July"; the heat layer says July scenario and stand-in and never measured | PASS |
| 5 | Any option labelled as recommended by the AI | no "recommend", "AI decides", "AI pick" anywhere on the console; the RTA pick says simulated; the decision stamp says the controller's | PASS |

Also checked and passing: the "Not acknowledged" band disappears once the controller decides; a controller can decide 5 s after pressing Demo mode and see all four receipts by about 17 s (under a minute); with no click, escalation reaches the duty controller and then the supervisor; no role row moves from Waiting before a decision.

## Traceability of numbers (the Dataiku Flow check)

Every number on the console, the deck's main slides and the pitch page was compared with `docs/v2/FACTS.md`, `docs/v2/STRATEGY.md`, `docs/MODEL-CARD.md`, `docs/v2/PITCH.md` and `docs/v2/CONTRACT-V2.md` (`p3_data_scientist.py`, plus a pass over the pitch page).

- **Console:** in run 1 every number traced. In run 2 the judge picker's stand-in cells (for example 1.8, 4.8, 5.8 min) and its routes 84, 320 trace to no document, only to the stand-in `judge_pick.json` (G19).
- **Deck:** two numbers have no line in FACTS (G15): 244 bus hours (slide 3), 162 routes (slide 7). The headline 6.97 vs 8.25 traces to FACTS and the Dataiku table `running_time_metrics`, but its cited source on the pitch page is wrong (G1).
- **Pitch page:** the worklist rows and the fleet chart trace to Dataiku tables named under each block (`running_time_ledger_by_hour`, `demand_by_hour`, `punctuality_by_hour`, `running_time_metrics`). These figures have **no line in FACTS and no named source next to them**, so F should verify and add them, or B should name the table beside each:
  - "131 seconds" for one rebuild of the Flow (How it's built): no table or log named.
  - "630 bus hours" across the day and "244 bus hours" in the evening: `running_time_ledger_by_hour` is named; not in FACTS.
  - "29 in 100 evening-peak trips" covered by the timetable, against a planning standard of 85: no source for the standard.
  - "589 of 945" late starts with the bus still out, "62%" (see G13).
  - "range 12% to 19%" for the 15% gain: no method given (bootstrap? by route?). A data scientist will ask.
  - "16% at 07:00, 47% at 19:00" and "118 short at 18:00, 2 with room" on the journey strip.
  - Deck slide 13 notes: "stricter tests give 8 to 10%": not in FACTS.

## Manual click-through (stream G, Thursday 10:30 to 11:00)

What the scripts cannot judge. Filled in from the run-1 screenshots and walks at 1920x1080 and 390x844 in a headless browser, not yet on a real phone or a wall screen.

- **Controller.** The console reads well at a glance: one alert, red risk words, one suggestion under a gold rule, four call rows. The words "Controller's decision, 18:53:05" make ownership clear. Two things a controller would trip on: G6 (options disabled before Demo mode while the panel asks for a choice) and the small honesty labels (G7). No word anywhere implies the AI decided.
- **Executive.** The deck tells one story and ends with a bounded ask on the arc slide: "one control-centre shift, selected evening routes, eight weeks", with what is measured. The DSS slide says it is a proposal, not connected. Biggest risk is length (G4), then the "most stops are poles" line (G2, G3).
- **Data scientist.** The forecast section is strong: four methods, three error measures, losses stated ("Only 6% past the simple rule", "From 19:00, the timetable is closer"), the time split stated ("learns from trips before 16:00 and scores 2,043 trips from 16:00 to 19:00"), and an honest note that some training trips may still have been running at the cutoff. G1 (wrong source), G12 (15% and 16%), G14 (judge picker is invented) and the unexplained 12% to 19% range are what a Dataiku judge would press on.
- **Planner.** The worklist is exactly what a planner wants (route, hour, minutes, source), but hidden (G17). Heat is labelled a July scenario everywhere it appears; the lane percentages carry "RTA expects" and Khaleej Times.
- **Phone visitor.** The pitch page works at 390 px with no sideways scroll, reduced motion switches the scroll story to static chapters, and no video plays by itself. The deck on a phone is cut off (G10).

## What the scripts cannot prove

- Headless Chromium on a server, not a real graphics chip or a real phone (RULES 5.7). The 2.5D buses and the map tiles were not judged for look.
- Contrast is measured only where text sits on a flat colour; text over the map, photos and video is skipped, and the map hint (G8) was caught only because its background is flat.
- The live relay (phone calls) was never exercised, by design. Its guards are lane 1's tests.
- "Under a minute" is measured from pressing Demo mode in a scripted browser, not from a person seeing the alert.
