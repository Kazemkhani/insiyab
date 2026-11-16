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

Cut 3 colours route-hour gap totals and locates proposals. It does not invent per-stretch forecasts or recalculate a route load after a proposal. The before/after whole-day totals and assumptions come directly from gap.json; decision evidence and effects come from decisions.json. Every simulation is labelled. Read-only room state is optional on HTTP(S); direct-file use never calls it. Absent room playback uses the supplied rewarded-choice effect, explicitly says nobody is connected, and never claims a depot confirmation. Presenter write authentication awaits lane 1's contract. Printing waits for local QR decoding and prints only one marked simulation order; missing vehicle/trip assignments remain explicit.
