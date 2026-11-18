# Insiyab Live: the operations console

A control product, not a dashboard. The team asked for "Dubai Airports' operations UI": map on the left, decisions and their impact on the right, emergencies, buses in 2.5D. It reuses last year's Marsad console patterns (`~/dev/TeamVisionary/marsad`, main branch) and this repo's home-page map.

## Layout at 1920 x 1080

```
+----------------------------------------------------------------------------------------+
| [logo] Insiyab Live   Route network, 15 Dec 2025 replay   STAND-IN ALERTS (if fixture) |
+------------------------------------------------------+---------------------------------+
|                                                      |  NOW  (the one open alert)      |
|   MAP (about 62%)                                    |  Route 310, 19:23               |
|   - routes as thin ink-50% lines on an ivory map     |  likely 13 min late    [red]    |
|   - buses as 2.5D glyphs, ink; one red when late     |  why: its bus is still out      |
|   - stops: pole = small ring, AC shelter = filled    |  range 8 to 17 min (90 in 100)  |
|   - the alert's stop pulses ONCE in red, then holds  |  -------------------------------|
|   - heat layer (toggle): poles in the July scenario  |  SUGGESTED  [gold rule]         |
|     sized by priority, red only above the threshold  |  Send the standby bus, 18:55    |
|                                                      |  options + likely effect (est.) |
|                                                      |  RTA system pick: simulated     |
|                                                      |  [ Decide ]  (needs a 2nd click)|
|                                                      |  -------------------------------|
|                                                      |  CALLS  driver depot station    |
|                                                      |         planning: Calling, Sent,|
|                                                      |         Received (teal) per row |
|                                                      |  -------------------------------|
|                                                      |  NEXT (collapsed, 2 or 3 rows)  |
+------------------------------------------------------+---------------------------------+
| 16:00 ======================O====================== 20:00   [Replay] [Demo mode]      |
+----------------------------------------------------------------------------------------+
```

## The alert lifecycle and its colours (brand kit meanings, no exceptions)

| State | What the controller sees | Colour |
|---|---|---|
| predicted | the alert row appears; the stop pulses once | headline ink, risk words red |
| suggested | gold rule above the suggestion; options with "likely effect (estimate)" | gold only on the rule and the word "Suggested" |
| unacknowledged (critical only) | a full-width band: "Not acknowledged. Insiyab will phone the duty controller in 10 s", counting down | red band, ivory text |
| calling duty | "Calling the duty controller", the ring sound | ink |
| decided | the chosen option gets a 2 px ink border and "Controller's decision, 18:55:12" | ink |
| relaying, sent | each role row: Calling, then Sent | ink |
| received | per role, only after that person acknowledged | teal text and a teal mark, with the time |

Marsad's full-screen pulsing red alarm is too loud for a controller who is already looking; use the band. No glow, no siren animation, no looping idle motion. Motion durations from `brandkit/Insiyab/guidelines/motion-spec.md` (18 to 27 frames at 30 fps, easing cubic-bezier(0.4,0,0.2,1)).

## Map and 2.5D buses

Use the map stack the home page already ships (`web/src`, read it first: reuse its tiles, projection and bus replay). Buses as small extruded boxes (three.js on top of the map, `pointer-events: none`) or MapLibre `fill-extrusion`, ink by default, red when the running-late watcher flags them. Glide between positions (Marsad `console/ui.js:437-457`, smoothstep over the update interval). Map attribution always visible (OpenStreetMap contributors).

## Escalation and calls

- Port Marsad's escalation timer (`live/adapter.js:340-405`): first-seen time, owner check, one escalation per incident.
- The call goes through this repo's existing relay (`live/voice/relay.js`, which already ran the full drill), not a new one. Add one relay route for "call the duty controller" with the same guards: roster file, `INSIYAB_CALLS=armed`, `--live`, the `x-insiyab-key` header, a cooldown.
- **Demo mode is the default and can never place a call**: it plays recorded state changes and the ring as audio. Live mode needs the presenter key in the URL fragment, read once and wiped (the pattern already in `live/voice/console.html`).
- Do not copy from Marsad: `.env`, `live/voice-*.test.js` (number-like strings beside teammates' names), `live/voice-live.js` line 307 (an information-line number), `live/voice-info.md`, recordings, airport data, any Dubai Airports branding.

## Must never happen (each one gets a test)

1. "Decided" without a human click and a confirming second click.
2. "Received" without an acknowledgement event from that person.
3. A real call from demo mode, or from a visitor without the presenter key.
4. A simulated number shown without its label; December weather shown as a heat emergency.
5. Any option labelled as recommended by the AI. The suggestion is Insiyab's; the RTA system pick is labelled simulated; the decision is the controller's.

## Served at

`https://insiyab.amirkazemkhani.com/ops/`, built by `node live/ops/build.mjs --out <dir>`; lane 1 adds the copy step to `scripts/deploy.sh` and the hash check covers it.
