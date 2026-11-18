# Team rehearsal pack

This is the current five-person rehearsal companion, not a replacement for the measured datasets or the public product. It corrects stale spoken claims in `docs/PITCH-SCRIPT.md` using `web/film/handoff/FACTS.md` and `opendata/onday/FORECAST-RETEST.md`.

Build the self-contained interactive briefing, five two-page personal PDFs, full script PDF, six-page call guide and ZIP outside the repository:

```
.venv/bin/python web/team/build.py --out /Users/amirhosseinkazemkhani/work/insiyab-run/delivery/team
```

Requires reportlab. `content.json` owns the named responsibilities, spoken script and Q&A. The builder also reads the eight presenter notes from the authoritative Dataiku JavaScript. It bundles local fonts into the HTML, which opens offline. No keys, contact numbers or raw records belong here. Send the ZIP or the individual PDFs yourself; this build sends no messages and places no calls.

The requested rehearsal schedule is exactly ten minutes including interaction and handovers. The control-room slot uses a labelled illustrated walkthrough until a full real rehearsal and a good recording exist. It does not claim that live calls have completed. The full five-person rehearsal runs separately, without the stage time limit.

The official final slot in docs/REQUIREMENTS.md is 7–8 minutes of pitch plus 2 minutes of Q&A. This pack is the expanded ten-minute rehearsal requested by Amir; it is not a claim that the final allows ten minutes of presentation before questions.

Start with `phone-cards.html` for the calls. Its five clickable names lead to the prepared role facts, agent question, exact example answer, uncertainty fallback and callback line. `call-cards.pdf` has an overview plus one page per person; `call-cards.md` is the copyable text version. These operating conditions are fictional rehearsal inputs, not observed RTA reports. The agent prompts live in `live/voice/relay.js` under `AGENT_SPECS`; the ten-minute human presentation script and phone cards live in `content.json`.
