# Start here: lane 2, the twin and the site (Codex, Amir's account)

This lane builds everything a judge sees: the day replayed on the map, the forecast meeting reality, the gap, the decision cards and the same morning from four places.

## Before you start it

Open Codex on this laptop with full access to the folder `~/dev`. It makes its own clone at `~/dev/insiyab-codex`, apart from Claude's at `~/dev/insiyab`.

## The first message to paste

```
You are lane 2 of four on the repository Kazemkhani/insiyab. First run: git clone https://github.com/Kazemkhani/insiyab.git ~/dev/insiyab-codex && cd ~/dev/insiyab-codex && bash scripts/install-hooks.sh. Then read handoff/2-codex-twin/PROMPT.md in that clone (it is the current copy; the attached zip is the same file at the time it was made) and carry it out as my instructions. Tonight's target: cut lines 1 to 4 pushed to main by 06:00 Dubai time, cut 1 as early as you can.
```

## If you use a goal

```
/goal All seven conditions in section 9 of handoff/2-codex-twin/PROMPT.md are true, each checked by running it: the site builds from the stand-in bundle, bash web/tests/run.sh ends ALL PASS, bash scripts/gates.sh ends ALL GATES PASS or fails only on a reported file outside web/, cut lines 1 to 4 of docs/TWIN.md are pushed to main and announced in coordination/lane-2.md, the screenshots exist at 1280x720 and 390x844 and have been opened, the built site works with the network off, and git status is clean with main equal to origin/main.
```

## The one decision that is yours

When it writes `TO AMIR: FIGURES READY FOR YOUR EYE` in `coordination/lane-2.md`, open the two pictures in `~/work/insiyab-run/review/` and type yes or no, with the reason, into the Codex window.
