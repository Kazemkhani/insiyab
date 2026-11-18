# Stream A1 for Codex: the Insiyab Live console UI (demo mode only)

Run Codex inside `~/dev/insiyab-codex` (its own clone; never the same folder as a Claude session). Paste everything below.

---

You are building the user interface of **Insiyab Live**, the bus operations console that is the centrepiece of Team Visionary's final on Friday 20 November 2026 at Emirates Towers. A separate Claude session (lane 1) owns the phone-call relay, the integration and every deploy. You build the console in **demo mode only**, to a written spec, with tests.

## Read first, in this order
1. `CLAUDE.md`, `docs/RULES.md`, `docs/LANES.md` (the push rules)
2. `docs/v2/STRATEGY.md`, `docs/v2/CONTRACT-V2.md`, **`docs/v2/CONSOLE-SPEC.md` (your spec; follow it exactly)**, `docs/v2/PITCH.md` beat 4
3. `brand/guidelines/motion-spec.md`, `brand/assets/tokens.css`, `brand/assets/logo/insiyab-lockup-ink.svg`, `brand/assets/icons/`
4. Patterns to reuse (read, do not edit): the home page map in `web/src/` and `web/build.mjs`; the build style of `story/build.mjs`; the existing drill dashboard `live/voice/console.html` (for the role rows Driver, Depot, Station, Planning)

## You own, and may edit only
`live/ops/` (new folder) and `coordination/v2-A1.md` (new file). Nothing else. Do not edit `live/voice/`, `scripts/`, `web/`, `story/`, `fixtures/` or any other folder; if you need a change there, write `TO LANE 1:` in your coordination file.

## Build, in order (one commit per step)
1. `live/ops/build.mjs` (esbuild, like `story/build.mjs`; `node live/ops/build.mjs --out <dir>`) and `live/ops/src/` (vanilla JS modules, no framework). Layout from CONSOLE-SPEC at 1920x1080 and 1440x900; at 390x844 the right panel stacks below the map. Header with the inline SVG lockup. A "Stand-in alerts" banner whenever the alerts file says `"fixture": true`.
2. Map with the 16:00 to 20:00 replay of the service day, reusing the home page's map approach and data files; buses glide between positions; time slider; Replay and Demo buttons. OpenStreetMap attribution visible.
3. Alerts panel reading `fixtures/watchers/alerts.json` (another stream writes it; until it exists, read `live/ops/demo/alerts.json`, which you create with three alerts in the CONTRACT-V2 format and `"fixture": true`, using route 310 at 19:23 as the critical one). NOW, SUGGESTED (options with "likely effect (estimate)"; "Simulated pick: RTA's system is not connected"), NEXT.
4. The escalation lifecycle from CONTRACT-V2 in **demo mode**: `predicted → suggested → unacknowledged` (red band, countdown, default 10 s, `?ack=` to change) `→ calling_duty → calling_supervisor` (60 s) `→ decided` (needs a click on an option, then a confirming click) `→ relaying → sent → received` per role. In demo mode the call steps are simulated: play `live/ops/sounds/ring.mp3` (synthesise a short, neutral two-tone ring with a script; no copyrighted sound) and advance on a scripted timeline; `received` arrives one role at a time from the demo script. Expose `window.insiyabOps = { setMode, onEvent }` so lane 1 can later plug in live relay events; do not write any network call to `/voice/`.
5. 2.5D buses: small extruded boxes over the map (three.js from `web/node_modules/three`), ink, red when their route has a `running_late` alert; `pointer-events: none`.
6. "Pick any route and hour": a small control reading `artifacts/forecast/judge_pick.json` if present, else `live/ops/demo/judge_pick.json` (a 3-row stand-in, labelled). Show forecast, simple rule, what happened, `n`; misses stay visible.
7. Heat layer toggle reading `artifacts/watchers/heat_stops.json` if present, else a labelled stand-in; label it "July scenario".

## Tests (`live/ops/tests/run.sh`, Playwright via `~/dev/insiyab/.venv/bin/python` or `uv run --with playwright`)
- No `decided` without the two clicks. No `received` for a role without its event.
- Demo mode makes **zero** network requests matching `/voice/` (intercept all requests).
- The stand-in banner shows when `fixture` is true; the heat layer says "July scenario".
- Colour rules on the rendered page: red only on risk words and the unacknowledged band; teal only on Received; gold only on the Suggested rule and the logo.
- At 1920x1080, 1440x900 and 390x844: no element overflows the viewport, no two text boxes overlap (bounding boxes).
- `prefers-reduced-motion`: no travel animation, opacity only.

## Every turn
`git pull --rebase origin main`; build; `bash live/ops/tests/run.sh`; `bash scripts/gates.sh`; commit named files inside `live/ops/` with a plain sentence and **no co-author line or any trailer**; push to main; add a dated line to `coordination/v2-A1.md` (what you pushed, the test command's last line, what you need from lane 1).

## Never
Edit outside `live/ops/` and your coordination file; call the relay or any phone API; deploy; put keys, phone numbers or raw RTA data anywhere; use gradients, glow, emoji, rounded pill tags, Instrument Serif, or looping idle animation; say done without the test output.

## Done means
`node live/ops/build.mjs --out /tmp/ops && (cd /tmp/ops && python3 -m http.server)` serves a console that runs the full 90-second demo start to finish; all tests pass (paste the output); screenshots at three sizes are in `live/ops/tests/shots/`; your coordination file tells lane 1 exactly how to wire live mode and add `/ops/` to the deploy.
