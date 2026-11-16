# Lanes: who owns what, and how four workers share one branch

Everyone works on `main` and pushes often. That only works because each lane owns its own folders and the lanes meet through the files in `docs/CONTRACT.md`.

| Lane | Worker | Where it runs | Owns | Does |
|---|---|---|---|---|
| 1. Engine and integrator | Claude Code, Amir's account | Amir's laptop, clone at `~/dev/insiyab` | `model/`, `artifacts/`, `fixtures/`, `tools/`, `scripts/`, `tests/`, `docs/` (except the two folders below), the root files, `coordination/lane-1.md` | The data census, the forecasting model and its evaluation, the decisions, the real bundle, the gates, and every deploy. The only lane that deploys. The only lane that changes the contract. |
| 2. Twin and site | Codex, Amir's account | Amir's laptop, a second clone at `~/dev/insiyab-codex` | `web/`, `coordination/lane-2.md` | The public site: the day replayed on the map, the forecast meeting reality, the gap view, the decision cards, the four points of view. |
| 3. Open data and passenger app | Devin | Devin's own machine | `opendata/`, `rider/`, `.github/`, `coordination/lane-3.md` | Public data turned into feature tables with their sources; the Khutwa passenger prototype; the checks that run on every push. Never touches RTA's provided data. |
| 4. Pitch and proof | Claude Code, Mustafo's account | Mustafo's laptop | `docs/pitch/`, `docs/CRITERIA-MATRIX.md`, `docs/team/`, `coordination/lane-4.md` | The criteria matrix kept true, the pitch, the questions and answers, the demo path. A light lane by design. |

## How to push without breaking each other

1. Clone once. Run `bash scripts/install-hooks.sh`.
2. Before every push: `git pull --rebase origin main`. If the rebase stops on a file you do not own, you edited outside your lane: undo that edit.
3. Commit only named files inside your own folders. Small commits, one idea each.
4. Run your lane's tests and `bash scripts/gates.sh` before you push. If the gates fail because of another lane's file, do not fix it: say so in your coordination file and carry on.
5. Never force-push. Never rewrite history. Never edit another lane's coordination file.
6. A built file (a bundle, a compiled page) is rebuilt from source, never merged by hand.

Lanes 1 and 2 run on the same laptop in two separate clones. They never share a working folder: on Bayyina one shared folder made a deploy refuse to run because the other worker had left files half-edited.

## Talking to each other

Each lane has one file in `coordination/`. It appends dated lines to its own file only, newest at the bottom, each starting `TO LANE 1:`, `TO LANE 2:`, `TO LANE 3:`, `TO LANE 4:`, `TO AMIR:`, `TO MUSTAFO:` or `TO ALL:`. Every worker reads all four files at the start of every working turn. One file per lane means two workers never edit the same file, so pushes never collide.

Say what you pushed (the commit), what you checked (the command and its last line) and what you need.

## Deploying

Only lane 1 deploys, with `bash scripts/deploy.sh`, and only a commit on which `bash scripts/gates.sh` ends ALL GATES PASS. The public address is https://insiyab.amirkazemkhani.com. After a deploy, lane 1 compares what is served with what was built, file by file, and posts the result.

## Order of work and cut lines

Each lane's prompt has its own cut lines: states that are complete and can be shown. The team's are:

| Cut | What exists | By |
|---|---|---|
| A | The public site on stand-in data: the day replayed, a forecast with a held-out error number, three decisions. The census is written. | Tue 17 Nov, 09:00 (the mentors' session) |
| B | The model runs on the real day: error against the naive forecast, at several horizons, on several subsets. | Tue 17 Nov, 13:15 (demo preparation) |
| C | Real totals on the site (if export is allowed), the four points of view, the Khutwa prototype, the pitch rehearsed. | Tue 17 Nov, 22:00 |
| Freeze | Features stop. Fixes only, each with a test. | Wed 18 Nov, 06:00 |
| Submit | "Final files and demos to be ready before 10:00 AM on Day 3" | Wed 18 Nov, 09:30 |
