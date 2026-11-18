# Stream A: Insiyab Live, the operations console (Amir, Claude session 1)

Paste everything below into Claude Code, opened in `~/dev/insiyab` (lane 1's clone).

---

You are building **Insiyab Live**, the operations console that is the centrepiece of the team's final on Friday 20 November 2026, 09:15, at Emirates Towers. You are also lane 1: the integrator and the only one who deploys.

## Read first, in this order
1. `CLAUDE.md`, `docs/REQUIREMENTS.md`, `docs/RULES.md`, `docs/LANES.md`
2. `docs/v2/STRATEGY.md`, `docs/v2/PLAN.md`, `docs/v2/CONTRACT-V2.md`, **`docs/v2/CONSOLE-SPEC.md`** (your spec), `docs/v2/PITCH.md` beat 4
3. The existing relay and drill dashboard: `live/voice/relay.js`, `live/voice/console.html`, `live/voice/tests/`
4. The home page map: `web/src/` and `web/build.mjs` (reuse its map stack and the day's replay; do not edit `web/`, copy patterns)
5. Last year's console, read only: `~/dev/TeamVisionary/marsad` main branch: `live/adapter.js:340-405` (escalation), `console/ui.js:437-457` (gliding markers), `console/styles.css` (sign system, alarm blocks), `live/hosted/replay-shim.js` (replay with no server). Never copy its `.env`, its `live/voice*.test.js`, `live/voice-live.js` line 307, `live/voice-info.md`, recordings or airport data.
6. Brand: `brand/guidelines/motion-spec.md` and `assets/tokens.css` .

## You own
`live/ops/` (new), `live/voice/`, `scripts/deploy.sh`, `fixtures/` checker changes, `coordination/v2-A.md`. Touch nothing else.

## Build, in this order (commit after each)
1. **Skeleton**: `live/ops/index.html` + `live/ops/build.mjs` (no framework needed; vanilla JS modules bundled with esbuild like `story/build.mjs`). The layout in CONSOLE-SPEC at 1920x1080 and 1440x900; at phone width the right panel stacks under the map. Header with the inline SVG lockup, "Stand-in alerts" banner whenever `fixture` is true.
2. **Map + replay** of 16:00 to 20:00 on 15 Dec 2025 from the bundle the home page already uses; buses glide; time slider; Replay and Demo mode buttons.
3. **Alerts**: read `fixtures/watchers/alerts.json` (stream D writes it in its first hour; until then write a 3-alert stand-in yourself with `"fixture": true`). The NOW panel, SUGGESTED with options and "likely effect (estimate)", NEXT queue.
4. **Escalation** per CONTRACT-V2: critical alerts count down (10 s on stage, configurable via `?ack=`), then `calling_duty`. Demo mode plays `live/ops/sounds/ring.mp3` (generate a short neutral ring, or reuse Marsad's `alarm.mp3` only if the licence is clear) and recorded state changes. **Demo mode is the default and can never reach the relay.**
5. **Live mode**: add one relay route to `live/voice/relay.js`: "call the duty controller with this alert" (same three guards, `x-insiyab-key`, cooldown 60 s, one per alert). Then the existing incident flow: parallel calls to driver, depot, station, planning; Sent; teal Received only on acknowledgement events from `/voice/state`.
6. **2.5D buses**: small extruded boxes over the map (three.js already in `web/node_modules`), ink, red when flagged; pointer-events none.
7. **Judge pick**: a small "Pick any route and hour" control reading `artifacts/forecast/judge_pick.json` from stream C (stand-in until it lands): forecast, simple rule, what happened, `n`. Misses shown.
8. **Integrate and deploy**: add `/ops/` to `scripts/deploy.sh` (build, copy, hash check). Thursday 10:00 and 17:00 deploys. Only from a commit where `bash scripts/gates.sh` ends ALL GATES PASS.

## Tests you must add (`live/ops/tests/`, run by `bash live/ops/tests/run.sh`, and wire into `scripts/gates.sh`)
- Decide needs two clicks; no `decided` without them.
- No `received` without an acknowledgement event for that role.
- Demo mode issues zero network requests to the relay (intercept fetch in Playwright).
- The stand-in banner shows whenever `fixture` is true; the July heat scenario is labelled.
- No red outside risk words and the unacknowledged band; no teal outside Received (check computed styles of a rendered page).
- Layout at 1920x1080, 1440x900, 390x844: no element overflows, no text overlaps (Playwright bounding boxes).

## Done means
The public address `/ops/` serves the console, the hash check passes, a 90-second demo runs start to finish in demo mode, and one live rehearsal rang a teammate's phone (with their consent) through the guarded route. Paste the real command output for each.

## Rules
`docs/v2/PLAN.md` "Rules that do not bend". No em-dash in UI copy. Fonts: Overpass for headings and numbers, IBM Plex Sans for text, Noto Kufi Arabic for Arabic. No gradients, glow, emoji, looping idle animation. Commit messages are plain sentences with no trailer or co-author line.
