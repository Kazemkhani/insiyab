# Insiyab twin

Lane 2 owns this plain static site. Operational values come from the version 1 bundle in docs/CONTRACT.md. The current stand-in bundle uses archived public RTA route and stop geometry. Operational counts remain invented. No transport counts, route names or stop names are hard-coded in the application logic.

Build from the repository root:

```
node web/build.mjs --bundle fixtures --out /tmp/insiyab-site
```

The command installs pinned dependencies with `npm ci` if needed, validates the bundle, bundles MapLibre, deck.gl and Three.js with esbuild, copies the JSON under `data/`, embeds the same JSON in `bundle.js` for direct-file use, and builds a QR image locally. Open `/tmp/insiyab-site/index.html` directly. No local server or network is required. Lane 1 alone deploys.

```
bash web/tests/run.sh
INSIYAB_SHOTS="$HOME/work/insiyab-run/review/cut-1" bash web/tests/run.sh
```

Python Playwright and its Chromium browser are test prerequisites. The browser uses `--use-angle=metal`, asserts the GPU renderer is Metal, disables networking before opening the folder, and walks laptop, phone, narrow phone, landscape and reduced-motion layouts. Saved pictures must also be opened by the reviewer. Tests exercise actual deck.gl layer data and independently check the position between two stop records. A bent path unit case rejects the straight-line shortcut. Negative controls prove missing fixture labels and stale counts fail their assertions. A copied bundle changes the count and fixture flag with unchanged app code.

Map positions use an equirectangular local projection, fitted to the supplied network. Stop locations are projected onto the supplied route shape in visit order; bus distance is interpolated between actual departure and next actual arrival, with dwell at stops. This represents the available records, not GPS precision. The stop columns are boardings in a bin, never a claim about a queue. Replay load is the count at departure.

The identity lives in CSS custom properties. Tests print WCAG contrast for ink, flow, over, spare, simulated, muted and dark-grey against paper (all at least 4.5:1). Pale grey is a map surface; grey and line are non-text geometry. The fixture banner reverses paper on simulated, the same contrast ratio. Fonts and their licences ship with the build.

Cut 2 adds a one-hour forecast held fixed while the replay clock moves. Actuals fill only after the bin ends. The rolling error is MAE on completed one-hour forecast rows, excluding null actuals; it is separate from the full-day metrics table. The stop challenge offers afternoon bins present in the bundle and states explicitly when a stop has no supplied forecast. The model screen renders every target, model, horizon and subset, with its worst MAE, percentage denominators and single-day limit.

Cut 3 colours route-hour gap totals and locates proposals. It does not invent per-stretch forecasts or recalculate a route load after a proposal. The before/after whole-day totals and assumptions come directly from gap.json; decision evidence and effects come from decisions.json. Every simulation is labelled. Read-only room state is optional on HTTP(S); direct-file use never calls it. Absent room playback uses the supplied rewarded-choice effect, explicitly says nobody is connected, and never claims a depot confirmation. When the relay answers, presenter controls keep a typed code only in this tab's memory. Closing gaps opens the room offer only for that presenter; visitors can inspect the same local scenario without sending a change. A failed or refused change is stated explicitly. Printing waits for local QR decoding and prints only one marked simulation order; missing vehicle/trip assignments remain explicit.

The four perspectives are live Three.js scenes, with faceless fictional figures. Every step, role, anchor, timestamp and displayed transport count comes from personas.json, decisions.json or replay/. The cutaway has one actual 3D seat object per supplied seat and one passenger object per supplied passenger. The planner sees the first proposed trip pair. Movement is an illustrative transition, not measured vehicle telemetry. Steps advance only by tap, reduced motion reaches the end state immediately, and camera controls remain local. The driver scene explicitly warns that closed doors do not prove an empty stop. The office worker links to `khutwa/`, integrated by lane 1; this standalone folder does not include that page.

Current rebuild screenshots are in `~/work/insiyab-run/review/rebuild/`; the prior cut-6 screenshots document the superseded presentation. `INSIYAB_SHOTS` is optional, so ordinary gate runs do not overwrite reviewed pictures. The browser disables networking before navigation and checks the Metal GPU, local assets, complete view sequence, rendered 3D counts, print isolation, fixture toggles and bundle mutations.

The review pass adds route focus and a selected bus's passenger/seat reading. The model headline compares the explicitly selected model with the naive named by that result, with a lowest-MAE fallback for older bundles without that name. This is a table comparison, not a deployment-selection rule. Stops with multiple series expose a route/series selector. Missing series, null actuals and a missing local forecast file are tested in `web/tests/review.py`. Printed orders use `swaps` when supplied.

Run `bash web/tests/engine.sh` to exercise the full invented-raw-data → engine → build → offline-browser path. Use `INSIYAB_BUNDLE=/path/to/bundle bash web/tests/run.sh` for an existing bundle. International source research and the simulated judge/expert review are in `web/review/`.

The geographic overview reads routes and stops from the same `network.json` as the replay. The current stand-in network is nine routes and 478 stops from an archived RTA feed, valid in late 2021; it is not today's timetable. `opendata/public/rta-gtfs/PROVENANCE.md` records the source and selection. The build ships that notice as `NETWORK-NOTICE.md`. Vehicle assignments, passenger counts and lateness are invented. Selecting a real stop states this explicitly.

The street basemap is a local Protomaps/OpenStreetMap archive (`web/assets/map/dubai.pmtiles`), documented in `opendata/public/basemap/PROVENANCE.md`. HTTP uses byte ranges against that same-origin file. Direct-file use loads the same bytes through `map/offline.js` into PMTiles' FileSource, so it also shows streets with networking disabled. There is one source archive, encoded twice at build time for the two delivery methods. No Google map API or external tile request is used. RTA and OSM attribution stays visible on the map. A renderer failure leaves the record controls usable.

The executive example reads the first proposed vehicle exchange and reports its repositioning estimate and unchecked constraints. The programme-wide cost note is explicitly separate from that first pair's distance. The comparison retains keyboard focus and announces the result in a persistent live region. Replay, forecast challenge, detailed model evidence and every decision remain available. The dormant alternative 3D prototype and six static scene images were removed when the interactive renderer became the single implementation.

The optional opening film has its own pinned dependencies under `web/film/`. `bash web/film/render.sh /path/to/built-site ~/work/insiyab-run/film` captures the actual offline Metal browser, then composes a 38-second captioned, silent film in Remotion. The output and recordings stay outside git. It ends on the required domain QR; DNS and the public deployment are lane 1's integration, so confirm resolution before using that QR with an audience. No paid voice or music service is called.

The replay opens at the route evaluation split’s first origin. A fixed pooled model/naive pair from the untouched table is separate from the running one-hour counter. Decision evidence starts folded; the printed order expands it and keeps every paired trip on one A4 sheet. `web/tests/room.py` exercises the browser against lane 1’s real relay handler in a loopback-only server: visitor isolation, wrong code, opening and ending an offer, a phone answer, reload forgetting authority, and store failure. It does not call the public relay or ring a phone.

The relay must report `store: shared` before audience counts or presenter controls are offered. A memory-only or unknown store keeps playback primary. The local integration test uses the real relay handler with a simulated shared-store status, builds lane 1’s Khutwa fallback, accepts an offer in a separate 390px browser, and observes the answer on the presenter screen. This verifies the interface chain, not distributed-store durability.
