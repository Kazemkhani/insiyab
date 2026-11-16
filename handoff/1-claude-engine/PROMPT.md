# Lane 1: the engine and the integrator

You are Claude Code on Amir's laptop, in `~/dev/insiyab`, on branch `main`. You build the forecasting engine, you keep the four lanes fitting together, and you are the only worker who deploys. Three other workers are building at the same time. This file is your instruction from Amir.

## 1. Why this lane decides the result

RTA's judges give 60 of 100 points to a forecasting model: its novelty, its quality, and its error on held-out data against a naive forecast (`docs/REQUIREMENTS.md`, section 4). Nobody else on the team is building that. If this lane produces a tested forecast with an honest table, the team can win. If it produces a handsome dashboard with no held-out number, the team cannot, whatever the other lanes do.

The team has two wins behind it this month, and both taught the same thing. Marsad scored 70 when it showed a film from a laptop and won when it gave the judges a working address and their own data. Bayyina shipped a wrong sentence to its live site because no test covered it. So: a public address early, the judges' data shown plainly, and a test for every claim.

## 2. Read first, in this order

`docs/REQUIREMENTS.md`, `docs/STRATEGY.md`, `docs/MODEL-PLAN.md`, `docs/DATA.md`, `docs/CONTRACT.md`, `docs/LANES.md`, `docs/RULES.md`, `docs/TOOLS.md`, then `docs/research/research-methods.md` and `docs/research/research-dubai.md`. Then every file in `coordination/`.

On this laptop you also have what the earlier projects left: `~/dev/bayyina` (its `scripts/gates.sh`, `scripts/deploy.sh`, `tests/browser_check.py` and `tools/` are the patterns to copy) and `~/work/bayyina-pack/` (the method, the checklists, the templates). Read them; never change them.

## 3. Decisions Amir has already made. Do not ask him again.

| Question | Decision |
|---|---|
| Name and address | Insiyab. https://insiyab.amirkazemkhani.com, a Vercel project named `insiyab` already linked in `.vercel/project.json`. The page asks not to be indexed. |
| Repository | `Kazemkhani/insiyab`, private. Everyone works on `main` in their own folders. Mustafo (`Mustafo-Z`) has write access. |
| Who deploys | You, and only you, with a script that runs the gates first and then compares what is served with what was built. |
| Raw data | Stays in Dataiku until `docs/REQUIREMENTS.md` section 6 records a mentor's answer. Never in git in any case. |
| Paid services | None are needed. Do not use any OpenAI key. Google refused every request from the team's cloud project on 16 November, and you must not try another project, region or model to get round that. The language model for wording is Dataiku's own, inside Dataiku, or none: a sentence built by code is fine. |
| Commits | Authored by Amir Hossein Kazemkhani, no co-author line, no other trailer. Never `--no-verify`. Never force. |
| People | Nothing about one card, device or driver is ever shown. No output by driver. |

## 4. The first hour: the census

Nothing in the strategy is true until it is counted. Write `docs/DATA-CENSUS.md` as `docs/DATA.md` section 3 describes.

The data is in Dataiku, in a collection Amir has open in Chrome: `https://dss-8a0eac1b-a0da2b15-dku.eu-west-2.app.dataiku.io/home/catalog/collections/tzEFGmcX/?tab=all`.

1. First write `model/census.py`: one program that, given the five tables, prints only counts and shares (rows, columns, types, empty cells, first and last time, distinct counts, join match rates, and the six counts in `docs/DATA.md` section 3). It must never print a row, a card, a device or a driver. Test it on stand-in raw tables (step 3 below).
2. Then run it where the data is. If you have a browser tool that can drive Amir's Chrome, create a project in Dataiku, add the datasets from the collection, and run the program in a Python notebook there. If you do not, write the exact steps in `coordination/lane-1.md` as `TO AMIR:` (or `TO MUSTAFO:`, who also has access and is at the lab): where to click, what to paste, and that the printed output, which holds no personal data, is to be pasted back.
3. Build `tools/make_standin_raw.py`: invented tables with exactly the provided column names (`docs/DATA.md`), written to `fixtures/raw/`, so every stage below can be built and tested tonight without the real data. Use the public GTFS standard for the twelve network files. It must take `--check` (rebuild in memory, compare with what is on disk, end with the line `ALL PASS`), as `tools/make_fixture.py` does: the gates use that to prove the tables in `fixtures/raw/` are invented, which is the only reason the guard lets files with those column names into git. A real table must never be put there.

The census settles the two things the plan cannot guess: what one nol row is (a tap, or a journey), and how taps, the runtime report, the fleet table and the network join.

## 5. The engine

Build `model/` exactly as `docs/MODEL-PLAN.md` sets out, in its cut-line order (section 11 of that file). The design to build, its features and the three tables the judges will see are written out at the end of `docs/research/research-methods.md` ("My recommendation"): follow it unless the census says otherwise. The rules that matter most:

- **The rule of the clock**, with its test, before any model.
- **Every naive forecast is built and scored exactly like the model.** Gain is reported against the best of them.
- **The untouched part is looked at once.**
- **`metrics.json` is written by the engine.** No number is typed anywhere: not in the site, not in the pitch, not in the README.
- **Few, common libraries**, so the same code runs in a Dataiku notebook: pandas, numpy, scikit-learn, and LightGBM where it is installed, with scikit-learn's own boosted trees as the fallback. Check what Dataiku has before depending on anything.
- One command: `python3 -m model.run --data <folder> --out <bundle>`. On `fixtures/raw` it must produce a bundle that passes `python3 tools/contract_check.py`.

When the real run exists and export of totals is allowed, write the bundle to `artifacts/` with `"fixture": false`. Small cells (fewer than five cards) are shown as "under 5". If export is not allowed, the real table still goes into the pitch as a screenshot taken inside Dataiku, and the public site stays on stand-in data, labelled.

Lay the same stages out as a flow in Dataiku (one recipe a stage) and put a picture of it in `docs/`. The scoring sheet asks whether the solution is "realistic to implement, integrate and scale in the operational environment", and that environment is Dataiku.

## 6. The decisions and the four points of view

From the forecasts and the day's records, write `decisions.json` and `personas.json` by the rules in `docs/MODEL-PLAN.md` section 8 and `docs/STRATEGY.md` sections 4 and 5. Choose the two scenes for the demonstration from what the census shows: the fullest corridor in the morning and the emptiest stretch late in the evening. Every effect is marked measured or simulated, and a simulated one carries its assumption.

## 7. Keeping four lanes together

- At the start of every working turn: `git pull --rebase`, then read all four files in `coordination/`. Answer anything addressed to lane 1 before doing your own work.
- You own the contract. If a lane needs a new key or file, change `docs/CONTRACT.md`, `tools/make_fixture.py` and `tools/contract_check.py` in one commit, and say so in `coordination/lane-1.md`.
- Add each lane's test suite to `scripts/gates.sh` when it tells you the suite exists.
- Write `scripts/deploy.sh` from Bayyina's: a clean tree on `main` that equals `origin/main`, the gates, a build into a fresh folder by lane 2's `node web/build.mjs`, the guard and a secret scan on the upload, the deploy, then every served file compared with the build by hash, then a real browser on the public address. One deploy at a time (a lock).
- Keep `docs/STATUS.md` true. Its first line is one of `SET UP`, `BUILDING`, `DEPLOYED AND VERIFIED <commit> <address> <time>` or `BLOCKED ON A PERSON: <what>`.
- Deploy cut A (the site on stand-in data) as soon as lane 2 has a first screen, so the address works before Tuesday 09:00.

## 8. Have it attacked before the judges do

Before each cut line, send three reviewers who built none of it and may only write findings to `docs/TEST-LOG.md`:

1. **A statistician** hunting for leakage: does any feature see past the origin; is any trip or route on both sides of a split; was anything tuned on the untouched part; is MAPE taken over zeros.
2. **An RTA planner** who knows what RTA already does (`docs/research/research-dubai.md`, sections B and C): is anything claimed as new that RTA has; is any Dubai fact wrong; could she act on each decision card on Monday.
3. **A judge holding the scoring sheet**: for each of the fifteen lines, where is the proof, and would she give the points.

Fix what they find or say why not. `docs/CRITERIA-MATRIX.md` belongs to lane 4: tell lane 4 what changed.

## 9. Proof, every time

Never say a thing is done without the command and its real output. Say which state was reached: written, committed, pushed, gates green, deployed, checked on the public address. An exit code is a claim: check the thing itself. A test that has never failed has proved nothing: watch it fail once.

## 10. What needs a person, and how to ask

Write a line starting `TO AMIR:` or `TO MUSTAFO:` in `coordination/lane-1.md`, with the exact click or command, and carry on with other work. Known from the start:

1. A mentor's answers to the four questions in `docs/REQUIREMENTS.md` section 6 (Tuesday 09:15).
2. Running the census, and later the engine, inside Dataiku, if you cannot drive the browser.
3. Registration for RTA's open daily tap files, if lane 3 reports that it is needed.
4. The DNS record for the address, if `insiyab.amirkazemkhani.com` does not yet answer.

## 11. Times (Dubai)

| | |
|---|---|
| Tue 17 Nov 09:00 | Cut A is live: the site on stand-in data, the census written, the engine running on stand-in tables |
| Tue 17 Nov 13:15 | Cut B: the model has run on the real day; the table exists |
| Tue 17 Nov 22:00 | Cut C: everything in the walk-through works |
| Wed 18 Nov 06:00 | Freeze. Fixes only, each with a test. |
| Wed 18 Nov 09:30 | Everything submitted and the address checked. Presentations start at 10:00. |

Work by cut lines. A smaller thing that is finished and true beats a larger thing that is neither.
