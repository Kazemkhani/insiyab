# Lane 2: the twin and the site

You are Codex on Amir's laptop. You build everything a judge sees: the public site, the day replayed on the map, the forecast meeting reality, the gap, the decision cards and the same morning from four places. This file is your instruction from Amir.

## 1. Why this lane matters

Twenty of the hundred points are for "effective use of visualizations to explain the model's performance" and for how the solution is presented, and every other criterion is judged through what you put on screen. Another lane builds the forecast. Your job is to make a judge see, in five seconds, that it is real and that it changes something.

Two lessons from this team's last two projects shape everything here. On Marsad the owner threw out a three-dimensional view with the words "nothing wow happens. Like what? So what?" and won two days later with one scene built from real records, a public address and a QR code. On Bayyina he said "it's too technical" three times in one day. So: real records as the stage, one thing to do on each screen, plain words.

## 2. Set up

```
git clone https://github.com/Kazemkhani/insiyab.git ~/dev/insiyab-codex
cd ~/dev/insiyab-codex && bash scripts/install-hooks.sh
```

Work only in that clone, on `main`, and only inside `web/` and `coordination/lane-2.md`. Lane 1 (Claude) works in `~/dev/insiyab` on the same laptop: never open or change that folder.

Read, in this order: `docs/REQUIREMENTS.md`, `docs/STRATEGY.md`, `docs/TWIN.md` (your specification), `docs/TOOLS.md` (which tools to use and which to leave: deck.gl for the moving buses, Blender from scripts for the figures, no map service), `docs/CONTRACT.md` (the only files you may read data from), `docs/RULES.md` (words, honesty, design, the glossary and the identity), `docs/LANES.md`. Then every file in `coordination/`.

On this laptop, `~/dev/bayyina/twin/` is a working guided scene you built last week (three.js 0.187.0, esbuild 0.28.2, chapters, a fitted camera, tests at five screen sizes), and `~/dev/bayyina/web/` and `~/dev/bayyina/tests/browser_check.py` show the patterns for a plain static site with a browser test. Reuse the patterns. Never change those folders.

## 3. What you build

`docs/TWIN.md` is the specification: three parts, a first screen, tests and cut lines. In short:

1. **The day, replayed.** The bus network drawn by us from the bundle, with no map service. Every bus moving along its real path at its real times, coloured by how full it is. Stops rising with boardings. A clock to drag.
2. **The forecast meeting reality.** Ahead of the clock, what the model forecast. Behind it, what happened. A counter with the error so far, next to the naive forecast's.
3. **The gap, and "Close the gaps".** Red where there are more people than seats, blue where there are seats with nobody in them. One control, and the decisions appear where they apply.
4. **The model, shown.** The table from `metrics.json`, with one plain sentence above it.
5. **The same morning from four places.** The planner, the site worker, the office worker, the driver. Third person, from above and to one side. What happened (measured), then with Insiyab (simulated).

## 4. The rules that will be tested

- **You read the bundle and nothing else.** `fixtures/` now; `artifacts/` when lane 1 says a real one exists. No route, stop, count or error number is written in your code. A test changes a number in a copy of the bundle and expects the screen to change.
- **Stand-in data is labelled.** If `meta.json` says `"fixture": true`, every screen shows STAND-IN DATA, NOT A RESULT. If false, none does.
- **Measured and simulated are never mixed.** Every simulated number has the word beside it, and the bundle tells you which is which.
- **No outside service at run time.** No map tiles, no fonts from another address, no analytics. The built site works from a folder with the network off, because the hall's connection dropped on Bayyina in the middle of a deploy.
- **Plain words**, from the glossary in `docs/RULES.md` section 9. "Passenger", not "rider". "Forecast", not "prediction". "Naive forecast" on screen, not "baseline".
- **The identity** in `docs/RULES.md` section 10. Light mode. Colour only for state, and never colour alone. Nothing from the banned list in section 5.
- **No RTA, nol or Dataiku logo or look.** The footer says: "A student prototype for the RTA Future Move Hackathon. Not an RTA product."
- **The four people are fictional and say so**, are drawn plainly with no faces, and the site worker is drawn with the same care as the planner.

## 5. The build, so lane 1 can deploy you

- `node web/build.mjs --bundle <folder> --out <folder>` builds the whole site into a folder of plain files, copying the bundle to `data/` inside it. No other step.
- `bash web/tests/run.sh` runs every test of yours and ends with the line `ALL PASS`. Tell lane 1 when it exists, so it goes into `scripts/gates.sh`.
- Pin every dependency to an exact version. Ship the fonts with the site.
- Judge pictures on the real graphics chip (`--use-angle=metal` in the test browser). On Bayyina a figure looked ribbed under software rendering and was smooth on the chip.

## 6. Cut lines. Each is finished, tagged, pushed and announced.

1. The map with buses moving and the clock, on the first screen, at 1280x720 and 390x844.
2. The forecast meeting reality with its counter, and the model screen.
3. The gap, "Close the gaps", and the decision cards.
4. The four points of view with a flat drawn scene.
5. The scene in three dimensions with figures.
6. Polish.

After each: `git pull --rebase origin main`, your tests, `bash scripts/gates.sh`, commit named files under `web/`, push, and one line in `coordination/lane-2.md`: `TO LANE 1: cut <n> pushed at <commit>. bash web/tests/run.sh ends ALL PASS. Build with node web/build.mjs.` Lane 1 deploys; you never do.

Cut 1 is wanted before Tuesday 17 November 09:00, Dubai time, when RTA's mentors look at the team's work. Your freeze is Wednesday 18 November 05:00.

## 7. One decision that is Amir's

When the first figure exists, save two pictures (1280x800 and 390x844, real graphics chip) in `~/work/insiyab-run/review/` and add `TO AMIR: FIGURES READY FOR YOUR EYE` with their paths to `coordination/lane-2.md`. Do not wait for the answer: carry on, and keep the plainest figures that read correctly if none comes.

## 8. Proof

Never say a thing is done without the command and its real output. Open every screenshot you take and look at it. If a test of yours has never failed, make it fail once to see that it can. If something is skipped, say so first.

## 9. If you are given a goal to work towards

Stop only when all of these are true, and check each by running it: (1) `node web/build.mjs --bundle fixtures --out /tmp/insiyab-site` builds with no error; (2) `bash web/tests/run.sh` ends `ALL PASS`; (3) `bash scripts/gates.sh` ends `ALL GATES PASS`; (4) cut lines 1 to 4 of `docs/TWIN.md` are pushed to `main` and each is announced in `coordination/lane-2.md`; (5) screenshots of the first screen, the gap view, the model screen and each of the four points of view exist at 1280x720 and 390x844 and you have opened them; (6) the built site works with the network off; (7) `git status` is clean and `main` equals `origin/main`.
