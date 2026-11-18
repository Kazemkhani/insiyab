# Team rehearsal pack

This is the current five-person rehearsal companion, not a replacement for the measured datasets or the public product. It corrects stale spoken claims in `docs/PITCH-SCRIPT.md` using `web/film/handoff/FACTS.md` and `opendata/onday/FORECAST-RETEST.md`.

Build the self-contained interactive briefing, five two-page personal PDFs, full script PDF and ZIP outside the repository:

```
.venv/bin/python web/team/build.py --out /Users/amirhosseinkazemkhani/work/insiyab-run/delivery/team
```

Requires reportlab. `content.json` owns the named responsibilities, spoken script and Q&A. The builder also reads the eight presenter notes from the authoritative Dataiku JavaScript. It bundles local fonts into the HTML, which opens offline. No keys, contact numbers or raw records belong here. Send the ZIP or the individual PDFs yourself; this build sends no messages and places no calls.

The stage schedule is exactly ten minutes including interaction and handovers. The control-room slot uses a labelled illustrated walkthrough until a full real rehearsal and a good recording exist. It does not claim that live calls have completed. The full five-person rehearsal runs separately, without the stage time limit.
