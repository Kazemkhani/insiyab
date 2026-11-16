# Start here: lane 2, the twin and the site (Codex, Amir's account)

This lane builds everything a judge sees: the day replayed on the map, the forecast meeting reality, the gap, the decision cards and the same morning from four places.

## Before you start it

Open Codex on this laptop with full access to the folder `~/dev` (it makes its own clone at `~/dev/insiyab-codex`, apart from Claude's at `~/dev/insiyab`).

## The first message to paste

```
Unzip this file, read 00-START-HERE.md and PROMPT.md, and carry out PROMPT.md as my instructions. Start with section 2 (clone the repository into ~/dev/insiyab-codex), then work by the cut lines in section 6. Cut 1 is wanted before 09:00 Dubai time on Tuesday 17 November.
```

## If you use a goal

```
/goal All seven conditions in section 9 of PROMPT.md are true, each checked by running it: the site builds from the stand-in bundle, bash web/tests/run.sh ends ALL PASS, bash scripts/gates.sh ends ALL GATES PASS, cut lines 1 to 4 of docs/TWIN.md are pushed to main and announced in coordination/lane-2.md, the screenshots exist at 1280x720 and 390x844 and have been opened, the built site works with the network off, and git status is clean with main equal to origin/main.
```

## The one decision that is yours

When it writes `TO AMIR: FIGURES READY FOR YOUR EYE` in `coordination/lane-2.md`, open the two pictures in `~/work/insiyab-run/review/` and type yes or no, with the reason, into the Codex window.

## What is in this zip

`PROMPT.md` and a copy of the documents it points to. The repository holds the current versions: if they differ, the repository wins.
