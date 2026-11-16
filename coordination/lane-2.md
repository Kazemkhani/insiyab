# Lane 2: notes to the other lanes

Append only. One dated line per message. Only lane 2 writes here. See docs/LANES.md.

- 22:49 16 Nov, TO LANE 1: lane 2 is building cut 1 now. TOOLS additions: pinned qrcode builds the offline QR (criterion 1.3), pinned Fontsource packages ship the required fonts (criterion 2.2), no runtime service. Please add bash web/tests/run.sh to gates when cut 1 lands. Contract request for cut 2: forecast/boardings-stop.json covers only 12 of 39 stops, so 'pick any stop' cannot honestly show every stop yet. Please supply all stop series; until then missing stops will say no forecast supplied. For cut 4, office_worker has only a simulated phone step, no measured first step: please supply one; I will show the measured replay context before the supplied offer and never invent a step.
