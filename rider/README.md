# rider/: the Khutwa passenger page

One page for a phone (390 wide first). Plain files, no framework, nothing fetched from another address. Lane 3's.

```
node rider/build.mjs --bundle <bundle folder> --out <folder>     # writes <folder>/index.html, one file
bash rider/tests/run.sh [--shots DIR]                            # last line: ALL PASS
```

**Where it goes.** Lane 1 places the out folder at `khutwa/` in the public site. Every address in the page is relative: `../` (the site), `../fonts/` (the site's fonts; the page falls back to the phone's own if they are missing) and `../api/room/` (the room). The bundle is read at build time, from the same folder the site serves as `data/`, and what the page needs is written into it, so the page opens with the network off and from a file.

**What it shows.**

1. One fictional passenger's usual bus at her stop: the load when it left, its seats, how late it left, and the forecasts the bundle holds for that stop and that trip.
2. The choices: the `offers` of a `rewarded_choice` decision (`docs/CONTRACT.md`). Each says what it costs her (walk in metres and minutes, extra minutes; never money) and what she earns.
3. If she takes one: the points and what they buy (bread, a fare, a phone top-up, rice; no shop, no brand).
4. "I cannot walk further": after it no choice involves a walk, and the phone remembers it.

Opened as `khutwa/?stop=<stop_id>` it shows that one stop's next buses in the hour, each with its load against its seats, and the boardings forecast for the stop.

**The room** (`docs/CONTRACT.md`, "The live room"). The page joins (`POST ../api/room/join`), asks the state once a second, and when the phase becomes `offer` shows the offer and buzzes the phone where the browser allows. "I'll take it" and "No thanks" are sent as `{"seat": n, "accept": true or false}`. A call with no answer in two seconds means no room: the page shows "Show me the offer" and works by itself. It asks the visitor for nothing.

**The rules it keeps** (each has a test):

- A choice is never the only way to travel: the usual bus and "No thanks" are on the offer screen.
- Nobody is charged more: every choice says the fare is the same.
- A long walk is never offered: an offer of more than 400 metres is dropped at build time and never reaches the page.
- STAND-IN DATA, NOT A RESULT is shown whenever the bundle's `meta.json` says `fixture: true`.
- The expected effect and the prices in points are marked simulated. The passenger is fictional and the page says so.
- Nothing about a vehicle, a trip, a driver, a card or a device is written into the page.

**What it does not have.** The bundle holds no forecast of each bus's load, so "how full" is the load counted on the day, and the forecast shown is of boardings at the stop. The prices in points (`src/logic.js`, `REWARDS`) are this prototype's example.

**Files.** `src/logic.js` the rules, with no screen in them; `src/page.js` the screen and the room; `src/page.html`, `src/page.css`; `tests/logic.test.mjs` (Node alone) and `tests/page_check.py` (a real browser at 390 by 844, with a stand-in room; skipped where Playwright is not installed).
