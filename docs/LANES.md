# Lanes: who owns what, and how four workers share one branch

> **From 18 November 2026 22:30 the v2 streams in `docs/v2/PLAN.md` decide who owns which folder.** The push rules below still apply to everyone. Lane 1 (Amir, stream A) still integrates and is still the only one who deploys.

Everyone works on `main` and pushes often. That only works because each lane owns its own folders and the lanes meet through the files in `docs/CONTRACT.md`.

| Lane | Worker | Where it runs | Owns | Does |
|---|---|---|---|---|
| 1. Engine and integrator | Claude Code, Amir's account | Amir's laptop, clone at `~/dev/insiyab` | `model/`, `live/` (the room relay and the call), `artifacts/`, `fixtures/`, `tools/`, `scripts/`, `tests/`, `docs/` (except `docs/pitch/`, `docs/team/` and `docs/CRITERIA-MATRIX.md`), the root files, `coordination/lane-1.md` | The census program, the forecasting model and its evaluation, the decisions, the bundle, the gates, and every deploy. The only lane that deploys. The only lane that changes the contract. Keeps the gates green: if another lane's push breaks them, lane 1 says so in its coordination file and that lane fixes it first. |
| 2. Twin and site | Codex, Amir's account | Amir's laptop, a second clone at `~/dev/insiyab-codex` | `web/`, `coordination/lane-2.md` | The public site: the day replayed on the map, the forecast meeting reality, the gap, the decision cards, the four points of view, and the QR code to the public address. |
| 3. Open data and passenger page | Devin, Mustafo's account | Devin's cloud machine | `opendata/`, `rider/`, `.github/`, `coordination/lane-3.md` | Public data turned into feature tables with their sources; the Khutwa passenger page; the checks that run on every push. Never touches RTA's provided data. |
| 4. Pitch and proof | Claude Code, Mustafo's account | Mustafo's laptop | `docs/pitch/`, `docs/team/`, `docs/CRITERIA-MATRIX.md`, `coordination/lane-4.md` | The criteria matrix kept true, the pitch, the questions and answers, the demo path. A light lane by design. |

## How to push without breaking each other

1. Clone once. Run `bash scripts/install-hooks.sh`. It installs two hooks: one refuses raw data, one refuses a co-author line or any other trailer on a commit.
2. Before every push: `git pull --rebase origin main`. If the rebase stops on a file you do not own, you edited outside your lane: undo that edit.
3. Commit only named files inside your own folders. Small commits, one idea each.
4. Run your lane's tests and `bash scripts/gates.sh` before you push. If the gates fail only because of another lane's file, do not fix it: say so in your coordination file, push your own work, and carry on.
5. Never force-push. Never rewrite history. Never edit another lane's coordination file.
6. A built file (a bundle, a compiled page) is rebuilt from source, never merged by hand. Build into a folder outside the repository, or into `dist/`, which git ignores.

Lanes 1 and 2 run on the same laptop in two separate clones. They never share a working folder: on Bayyina one shared folder made a deploy refuse to run because the other worker had left files half-edited.

## Talking to each other

Each lane has one file in `coordination/`. It appends dated lines to its own file only, newest at the bottom, each starting `TO LANE 1:`, `TO LANE 2:`, `TO LANE 3:`, `TO LANE 4:`, `TO AMIR:`, `TO MUSTAFO:` or `TO ALL:`. Every worker reads all four files at the start of every working turn. One file per lane means two workers never edit the same file, so pushes never collide.

Say what you pushed (the commit), what you checked (the command and its last line) and what you need.

**To ask for a change to the contract** (a new key, a new file), write `TO LANE 1:` in your own coordination file with the exact key and why. Lane 1 changes `docs/CONTRACT.md`, the stand-in generator and the checker in one commit. A new key never changes the contract's version; only removing or renaming one would, and that is not done.

**A mentor's answers** are written by a person in `docs/team/MENTOR-ANSWERS.md`. Lane 1 copies them into `docs/REQUIREMENTS.md`, section 6, on its next turn.

## Deploying

Only lane 1 deploys, with `scripts/deploy.sh` (which lane 1 writes first), and only a commit on which `bash scripts/gates.sh` ends ALL GATES PASS. The public address is https://insiyab.amirkazemkhani.com.

- The site is lane 2's build (`node web/build.mjs`). The Khutwa page is lane 3's build (`node rider/build.mjs`), placed in the same site at `/khutwa/`.
- The bundle the public site shows is `fixtures/` (stand-in data, labelled) unless both of these are true: `artifacts/meta.json` says `"fixture": false`, and `docs/REQUIREMENTS.md` section 6 records a mentor's yes to showing totals. The deploy script checks both.
- After a deploy, lane 1 compares what is served with what was built, file by file, and posts the result.

## Times (Dubai) and cut lines

Amir's instruction on the night of 16 November: the full solution built and deployed within eight hours. So tonight is one sprint to a complete product on stand-in data, and Tuesday is for the real data and the pitch.

| Cut | What exists | By |
|---|---|---|
| **Tonight** | The public address shows the whole walk-through on stand-in data, labelled: the day replayed, the forecast meeting reality with its error number and "Pick any stop", the gap and "Close the gaps", the decision cards, the four points of view, the Khutwa page. Then the moments in `docs/WOW.md`, in their order, as far as the night allows. The engine runs end to end on invented raw tables and passes its tests. The census program is written and tested. The pitch has a first draft. | **Tue 17 Nov, 06:30** |
| Mentors | The team shows that address to RTA's and Dataiku's mentors, and asks the four questions | Tue 17 Nov, 09:15 |
| Real data | The model has run on the real day inside Dataiku: the three tables exist | Tue 17 Nov, 13:15 (demo preparation) |
| Complete | Real totals on the site if allowed; the pitch rehearsed against the real numbers | Tue 17 Nov, 22:00 |
| Freeze | Features stop: lanes 2 and 3 at 05:00, lane 1 at 06:00 (it integrates last). Fixes only, each with a test. | Wed 18 Nov |
| Submit | "Final files and demos to be ready before 10:00 AM on Day 3" | Wed 18 Nov, 09:30 |

Presentations start at 10:00 on Wednesday. The team's slot and its length are not known yet.
