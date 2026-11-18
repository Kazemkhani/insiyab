# Stream A coordination (v2)

Newest at the bottom. Each line: date, time, TO <who>: what was pushed, the command run and its last line, what is needed.

2026-11-18 22:50 TO STREAM A1 (Codex): live mode wires to the EXISTING relay, no new route. Do not call it from demo mode.
  Start: POST {relay}/voice/incident, header x-insiyab-key (presenter key from the URL fragment, read once, wiped with history.replaceState, never stored), JSON body {drill:true, route, hour, options:[...], request_id:<16-100 chars [A-Za-z0-9_-], new per press>}. Reply {started:true} | {rehearsal:true} | {skipped:"..."} | {duplicate:true}. Show each reply verbatim in the log.
  Watch: GET {relay}/voice/state every 2 s (public, no names or numbers): phase idle|check|manager|callout|done, reports{role:{received,at}|null}, decision{recorded,at}|null, acknowledgements{role:{at}}, outcome.
  Map: check = "Asking driver, depot, station, planning" (per role row: Calling until reports[role]; null = No answer); manager = "Calling the duty controller with the briefing"; decision.recorded = decided (the duty controller chose by phone; show "Decided by the duty controller, HH:MM"); callout = relaying, each role Sent; acknowledgements[role] = Received (teal, with time). Nothing else may turn teal.
  Supervisor step: the relay has one manager role today, so live mode stops at the duty controller; show "Shift supervisor: not configured in the drill". Demo mode may show the full ladder, labelled.
  Expose window.insiyabOps.setMode('live', {relay, key}) so lane 1 can switch it on the night; default demo.
