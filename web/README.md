# Insiyab twin

Lane 2 owns this plain static site. It reads only the version 1 bundle in docs/CONTRACT.md. No transport counts, route names or stop names are embedded in the application source.

Build from the repository root:

```
node web/build.mjs --bundle fixtures --out /tmp/insiyab-site
```

The command installs pinned dependencies with `npm ci` if needed, validates the bundle, bundles deck.gl with esbuild, copies the JSON under `data/`, embeds the same JSON in `bundle.js` for direct-file use, and builds a QR image locally. Open `/tmp/insiyab-site/index.html` directly. No local server or network is required. Lane 1 alone deploys.

```
bash web/tests/run.sh
INSIYAB_SHOTS="$HOME/work/insiyab-run/review/cut-1" bash web/tests/run.sh
```

Python Playwright and its Chromium browser are test prerequisites. The browser uses `--use-angle=metal`, asserts the GPU renderer is Metal, disables networking before opening the folder, and walks laptop, phone, narrow phone, landscape and reduced-motion layouts. Saved pictures must also be opened by the reviewer. Tests exercise actual deck.gl layer data and independently check the position between two stop records. A bent path unit case rejects the straight-line shortcut. Negative controls prove missing fixture labels and stale counts fail their assertions. A copied bundle changes the count and fixture flag with unchanged app code.

Map positions use an equirectangular local projection, fitted to the supplied network. Stop locations are projected onto the supplied route shape in visit order; bus distance is interpolated between actual departure and next actual arrival, with dwell at stops. This represents the available records, not GPS precision. The stop columns are boardings in a bin, never a claim about a queue. Replay load is the count at departure.

The identity lives in CSS custom properties. Tests print WCAG contrast for ink, flow, over, spare, simulated, muted and dark-grey against paper (all at least 4.5:1). Pale grey is a map surface; grey and line are non-text geometry. The fixture banner reverses paper on simulated, the same contrast ratio. Fonts and their licences ship with the build.

Cut 2 adds a one-hour forecast held fixed while the replay clock moves. Actuals fill only after the bin ends. The rolling error is MAE on completed one-hour forecast rows, excluding null actuals; it is separate from the full-day metrics table. The stop challenge offers afternoon bins present in the bundle and states explicitly when a stop has no supplied forecast. The model screen renders every target, model, horizon and subset, with its worst MAE, percentage denominators and single-day limit.

Cut 3 colours route-hour gap totals and locates proposals. It does not invent per-stretch forecasts or recalculate a route load after a proposal. The before/after whole-day totals and assumptions come directly from gap.json; decision evidence and effects come from decisions.json. Every simulation is labelled. Read-only room state is optional on HTTP(S); direct-file use never calls it. Absent room playback uses the supplied rewarded-choice effect, explicitly says nobody is connected, and never claims a depot confirmation. Presenter authentication is documented; writes await the relay's readiness announcement. Printing waits for local QR decoding and prints only one marked simulation order; missing vehicle/trip assignments remain explicit.

Cut 4 draws four faceless, fictional figures in flat oblique scenes. Every step, role, anchor, timestamp and displayed transport value is read from personas.json or replay/. Steps advance only by tap. Recorded replay context is labelled separately from the story's supplied numbers. No queue is inferred from boardings. The office worker's phone is a link to `khutwa/`, supplied by lane 3 and integrated by lane 1; this lane's standalone folder does not contain that page.

Current screenshot set: `~/work/insiyab-run/review/cut-5/`, eight views at 1280x720 and 390x844. `INSIYAB_SHOTS` is optional, so ordinary gate runs do not overwrite reviewed pictures. The Python browser disables networking before navigation and asserts the Metal GPU, local asset load, the entire view sequence, figure state transitions, print isolation, fixture toggles and bundle mutations.

The review pass adds route focus and a selected bus's passenger/seat reading. The model headline compares the explicitly selected model with the lowest naive MAE in the displayed horizon, rather than choosing the first naive in the file. This is a table comparison, not a deployment-selection rule. Stops with multiple series expose a route/series selector. Missing series, null actuals and a missing local forecast file are tested in `web/tests/review.py`. Printed orders use `swaps` when supplied.

Run `bash web/tests/engine.sh` to exercise the full invented-raw-data → engine → build → offline-browser path. Use `INSIYAB_BUNDLE=/path/to/bundle bash web/tests/run.sh` for an existing bundle. International source research and the simulated judge/expert review are in `web/review/`.

Cut 5 replaces the flat figure drawings with locally rendered Blender scenes. Rebuild them with `/Applications/Blender.app/Contents/MacOS/Blender --background --python web/figures/render.py -- web/assets/scenes`. These are fictional geometry, not measured streets, buses or people. The planner's screen draws its route from the bundle; seat squares and excess triangles are exact counts from the current story step. No runtime Blender or external asset service is needed.

The optional opening film has its own pinned dependencies under `web/film/`. `bash web/film/render.sh /path/to/built-site ~/work/insiyab-run/film` captures the actual offline Metal browser, then composes a 38-second captioned, silent film in Remotion. The output and recordings stay outside git. It ends on the required domain QR; DNS and the public deployment are lane 1's integration, so confirm resolution before using that QR with an audience. No paid voice or music service is called.
