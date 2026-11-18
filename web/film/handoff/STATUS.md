# Delivery state — 18 November 2026

Implemented: guided pitch chapters, number overflow fix, local offline 3D library, recorded-day link, one late-return definition, forecast scope and linear comparison; five-person phone relay and protected dashboard; presenter notes for all eight Dataiku tabs; production prompts, storyboard, sound specification and team briefing.

Live Dataiku: JavaScript saved in INSIYAB webapp kvDViy2. All eight tabs were observed live after saving, as well as exercised locally with test fixtures. No backend or raw table was changed.

Verification output:

```
.venv/bin/python tests/test_dataiku_webapp.py
ALL PASS  (155 checks)

bash live/voice/tests/run.sh
Tests run: 7  Passed: 7  Failed: 0
ALL PASS

.venv/bin/python story/tests/browser.py <built-pitch> <screenshots>
ALL PITCH CHECKS PASS
```

Targeted dashboard checks also passed after the final optional-field clearing fix: viewing-key header, delayed response after sample playback, reconnect/idle clearing, older poll arriving last, and previous incident options cleared on sample playback. Desktop and phone chapter screenshots were opened at 1280×720 and 390×844. The offline browser tests also cover 320×568, 768×1024 and reduced motion.

Independent read-only review covered RTA operations, Dataiku evidence and business adoption. It identified stale-response and sample/connected-state mixing defects; these were fixed and reproduced in browser regression tests. This is an AI review, not a claim of judging-panel approval.

## First real phone attempt

Amir explicitly confirmed all five phones ready. Five calls were attempted: four reporting roles, then manager. Driver and planner reports arrived; Twilio reported the depot call unanswered and the station line busy. The manager call reached its 90-second duration limit while clarifying a choice; no decision tool event was recorded. No callbacks were sent. Outcome: no_decision, not a completed relay.

After Amir's feedback, all six provider agents were updated and read back: natural opening identifies Insiyab as the AI operations assistant, no repeated drill disclaimer. Internal instructions and the dashboard retain the demonstration context. The manager now receives private names/roles and has 150 seconds; staff calls remain capped at 90 seconds. A fresh complete rehearsal still needs the participants available. Private call records remain outside git. No successful backup film of the relay is claimed.

## Still to produce elsewhere

The new narrated film is specified, not rendered. Follow EXECUTE.md and FILM.md. Do not present this package as a finished video or replace the existing labelled concept film before the audio, visual and comprehension checks pass.

Repository gate before commit:

```
bash scripts/gates.sh
PASS web/tests/run.sh (1227 checks)
PASS rider/tests/run.sh (76 checks)
PASS the gates changed no tracked file
ALL GATES PASS
```

## Current public delivery and single-person sample

Production code fff8258 was deployed and verified at 08:39 Dubai time on 18 November. All 56 served artifacts matched the clean build by hash; the main browser passed 20 checks. The visible concept-film player and animated bus journey passed fresh public playback/navigation checks at 1280×720 and 390×844: ALL PUBLIC MEDIA CHECKS PASS. The main page now links to /pitch/. Reduced-motion visitors can explicitly opt into the bus animation. The existing concept film uses stand-in data; it is not the newly specified film.

The offline team pack is built from web/team/: five named two-page PDFs, a ten-minute rehearsal script, all eight Dataiku presenter notes, Q&A and interactive timing explanation. The five personal PDFs, full script and HTML were opened and inspected. Offline interaction checks passed at desktop, phone and tablet sizes.

At Amir's request a manager-only sample connected to his phone for 65 seconds and ended remotely. No decision tool was invoked; no staff calls or callbacks were made. The old tunnel had failed; its replacement and all three provider callback URLs were verified. Manager-only sample mode now checks its authenticated public endpoint before dialling; a negative test proves an unavailable endpoint causes zero calls. The subsequent full-team attempt is described below; no successful end-to-end sequence is claimed. Browser automation could not restore the private viewing-key field, so the Safari console may need its viewing key entered again. The protected endpoint itself was verified.


## Full-team attempt at 08:42 and revised phone cards

All four reporting roles were called after Amir confirmed readiness. Station, depot and planner reports arrived; the driver line was busy. Amir chose the second option, to hold the next departure two minutes. Station acknowledged the callback; depot did not record an acknowledgement and the planner callback was busy. The previous code did not call the driver back after the missed first call. Outcome: incomplete, not a successful nine-call relay. Private transcripts remain outside the repository.

Transcript review found the station question abstract, the depot questions encouraging guesses, and the analyst role unclear. The revised `web/team/` guide gives each person one concrete check, prepared fictional role facts, an exact example answer, an uncertainty fallback and the callback response. `phone-cards.html`, `call-cards.pdf` and `call-cards.md` are the current phone instructions; the five personal briefs and full pitch script remain in the same ZIP.

The revised agents ask one question at a time, preserve uncertainty and end after logging. All six explicitly configure the provider's end_call tool, which was absent in the earlier calls. Orchestration now attempts all four callbacks after a manager choice, handles duplicate acknowledgements once, and stops the routine sequence after an explicitly flagged real emergency. These changes require a fresh real rehearsal to prove conversation quality; automated tests do not establish that people understood or acknowledged the new calls.

Revision verification: voice suite 9 passed / 0 failed / ALL PASS; team pack ALL TEAM BRIEFING CHECKS PASS; frozen-tree repository run ALL GATES PASS, including 1227 web checks. All six provider agent prompts and end_call tools were read back successfully; the report tool exposes the emergency flag. No additional phone calls were placed. The completed old relay process still displays the incomplete run; restart it before another armed rehearsal. New film sources through 0a82b79 were pulled; their rendering/deployment is not established by this call-card work.
