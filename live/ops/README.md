# Insiyab Live console

Stream A1's static, demo-only console. It has no relay client, phone API, credentials, deployment command or automatic decision. The seven implementation steps follow `handoff/v2/A-codex-console.md`.

## Build and rehearse

```sh
node live/ops/build.mjs --out /tmp/ops
cd /tmp/ops
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. The build uses the pinned packages in `web/node_modules`; it does not install or update packages. It packages the existing home-page map, local fonts, original role icons and an original generated ring. The PMTiles archive is read into memory on HTTP so Python's simple server does not need byte-range support. Opening the built `index.html` directly also uses the home map's offline archive reader.

Press **Demo mode** to begin. The 90-second sequence pauses for a human whenever needed:

| Elapsed | Demo event |
| --- | --- |
| 0 s | Reset to the route 310 alert, replay clock 18:53. |
| 1 s | Options become available. |
| 2 s | Critical-alert countdown begins. |
| 12 s | Simulated duty-controller call, original neutral ring. |
| 72 s | If still undecided, simulated supervisor call. |
| About 75 s | Presenter clicks an option, then the separate confirmation. |
| Confirmation + 0.8 s | Four role rows become Calling. |
| Confirmation + 1.6 s | Four role rows become Sent. |
| Confirmation + 4 / 6.6 / 9.2 / 11.8 s | Scripted acknowledgement events arrive separately for Driver, Depot, Station and Planning. |
| 90 s or later | Demo complete only after all four receipts. |

Without the two clicks, nothing is decided or relayed. At 132 s neither decision-maker has answered: the red unacknowledged band remains. `?ack=5` changes only the first countdown; valid values are 1 to 300 seconds, default 10. The supervisor wait remains 60 seconds. Replay independently traverses 16:00 to 20:00 in 90 seconds and stops; reduced motion jumps to the final position.

Audio uses a short neutral 440/554 Hz ring made with `python3 live/ops/sounds/generate.py` and ffmpeg. No recording or copyrighted source is used. A browser refusing audio leaves the calling state visible and explains that sound is unavailable.

## Data boundaries

The build chooses existing files in this order, and validates the July and judge-pick inputs rather than silently inventing missing values:

| Content | Preferred file | Fallback |
| --- | --- | --- |
| Alerts | `fixtures/watchers/alerts.json` | `live/ops/demo/alerts.json` |
| Judge pick | `artifacts/forecast/judge_pick.json` | `live/ops/demo/judge_pick.json` |
| Heat | `artifacts/watchers/heat_stops.json` | `live/ops/demo/heat_stops.json` |
| Map replay | The home-page `fixtures` network, meta and replay files | None |
| Stop kind | `opendata/public/bus-stops.csv`, matching public current/older stop IDs | Unknown kind |

Every fallback has `fixture: true` and a visible local label. All replay movements remain labelled stand-in even when an independent forecast or heat input is real. The supplied replay has nine routes and no route 310 trajectory; the 310 marker is an illustrative alert location, never a private bus position. The heat layer is always a July scenario, never December weather; 160 priority points is an illustrative threshold, not a measured emergency boundary. Unknown shelter kinds stay unknown. The fallback forecast contains a loss and a tie as well as a win.

The v2 contract does not yet specify judge-pick row keys. A1's explicit provisional shape is `{version, fixture, service_day, unit, target, source, tested_on, rows}` with each row `{route: string, hour: '16:00'..'20:00', forecast: number|null, baseline: number|null, actual: number|null, n: integer}`. All quantities use `unit`, normally `min`. Stream C/lane 1 must agree this boundary before swapping in their file; no hidden field aliases or derived values are used.

## Lane 1 integration boundary

`window.insiyabOps` exposes exactly two functions:

```js
const context = window.insiyabOps.setMode('live');
// Returns { mode, run_id, alert_id }; resets selection, receipts and all demo timers.
window.insiyabOps.onEvent({
  ...context,
  type: 'suggested',
  at: Date.now() // Numeric Unix milliseconds, no earlier than this run.
});
```

`setMode('demo')` returns to a static demo preview; pressing Demo mode starts a fresh script. `live` means **event input only**, with an explicit disconnected label. It does not read a URL fragment, store a key, start polling or accept a `{relay, key}` transport configuration. All network/authentication work stays with lane 1 under separate authorisation. Demo mode rejects externally supplied events.

Permitted incoming types are `suggested`, `unacknowledged` (critical only), `calling_duty`, `calling_supervisor`, `unanswered`, `relaying`, `sent` and `received`. Role events also carry `role: 'driver'|'depot'|'station'|'planning'`. Events must carry the current `run_id` and `alert_id`. Unknown, future, stale, out-of-order and duplicate events return `false`. A role must be Calling before Sent, and Sent before Received. One role's receipt never acknowledges another. Only the confirmed UI decision permits `relaying`. An incoming `decided` event is deliberately rejected: this demo scope requires two human UI clicks.

After the second trusted UI click, the page dispatches one local `insiyab:decision` CustomEvent with `{mode, run_id, alert_id, option, at}` in `event.detail`. Lane 1 can listen to it, check `mode === 'live'`, and perform its own authorised, guarded dispatch. The console itself never sends that event over the network. Programmatic `.click()` calls do not select or confirm an option.

The 22:50 lane-1 coordination note describes the existing relay's `check/manager/callout/done` phases, including a phone-recorded controller decision and no supervisor roster. That transport/phone-decision flow is outside A1's authorised demo scope and cannot simply be mapped to `decided`. Lane 1 must reconcile it with the two-click console contract before connecting it. Normalise the old relay's `planner` role to `planning` in that adapter. The supervisor ladder here is explicitly simulated.

Lane 1's `scripts/deploy.sh` already gained a conditional `/ops/` build on remote main while A1 was working. The console needs only the complete output of `node live/ops/build.mjs --out <site>/ops`; the output must be outside the source tree. Include every generated file in the served-equals-built hash scan. Add `live/ops/tests/run.sh` to the shared gates if desired. A1 never runs a deploy.

## Verification

```sh
bash live/ops/tests/run.sh
OPS_REALTIME=1 bash live/ops/tests/run.sh
bash scripts/gates.sh
```

The suite serves the actual build in Chromium, intercepts requests, exercises the real buttons, checks roles and escalation timing, tests reduced motion, checks rendered semantic colours, checks text bounding boxes and horizontal overflow, and writes screenshots at 1920×1080, 1440×900, 390×844 and 1280×720. Primary desktop screenshots must fit their full viewport; the stacked phone layout scrolls vertically. The optional real-time run takes at least 90 seconds and waits the full 60 seconds for supervisor escalation. Data tests reject a December heat scenario, preserve missing forecast values and deliberately remove the selection guard in memory to prove the test catches that defect.

Each test run writes screenshots to git-ignored `live/ops/tests/out/`: normal received state, countdown and July heat at each size, plus the optional real-time demo's final screen. Committed evidence from the initial verification remains in `live/ops/tests/shots/`; tests do not overwrite it. Council's independent Gemini review returned no assessment because its prepaid credits were depleted. Stream G's independent human/persona review remains a separate check. Native Safari inspection could not establish a rendering result: the computer-use server returned `noWindowsAvailable`, and its background capture did not advance animation. The automated WebKit check renders the map and buses successfully. A physical phone and a foreground venue-browser check remain for stream G; emulated viewport checks are not physical-device evidence.
