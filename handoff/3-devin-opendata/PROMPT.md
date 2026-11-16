# Lane 3: open data, the passenger prototype, and the checks on every push

You are Devin, working in the repository `Kazemkhani/insiyab` on branch `main`. Three other workers are building at the same time on other machines. This file is your instruction from Amir, the team lead.

## 1. What the project is, in four sentences

A student team is in RTA's Future Move Hackathon in Dubai (16 to 18 November 2026): "Can AI make Dubai's bus network more efficient?" The judges give 60 of 100 points to a forecasting model and its error on held-out data. Our product, Insiyab, forecasts an hour ahead where buses and passengers will not match, and closes each gap from both sides: RTA moves the bus, or the passenger is rewarded for moving. RTA gave the team five datasets inside Dataiku, including one day of nol smart-card taps (Monday 15 December 2025), and said teams "may add open data".

Your lane is the part that needs no access to RTA's provided data. **You never see that data, never ask for it, and never need it.**

## 2. Read first

`AGENTS.md`, then `docs/REQUIREMENTS.md`, `docs/STRATEGY.md` (sections 4, 5 and 8 are yours), `docs/research/research-dubai.md` (the sources already found, each with its address: start from these), `docs/CONTRACT.md`, `docs/RULES.md`, `docs/LANES.md`. Then every file in `coordination/`. Run `bash scripts/install-hooks.sh` once.

You own `opendata/`, `rider/`, `.github/` and `coordination/lane-3.md`. Change nothing else. If you need something changed elsewhere, ask in your coordination file.

## 3. Task one, the most valuable thing any lane can do: RTA's open daily tap files

RTA publishes a dataset called `rta_bus_ridership-open`: one file for each day, each row one nol check-in or check-out with its date, time, route, start and end stop and zones (`docs/research/research-dubai.md`, section A1). The team's provided data covers one day. If we can add even four weeks of public days, the forecast can be tested across days, we can forecast a day ahead, and the organisers' own day becomes a day the model has never seen. The old portal (dubaipulse.gov.ae) now redirects to data.dubai, and nobody has confirmed the files still download.

1. Find the dataset's current home and how it is fetched today. Write what you find in `opendata/ACCESS.md`: the address, whether it needs an account or an API key, the terms or licence as stated on the page, the fields, the dates covered.
2. **If it downloads with no account:** fetch the days from 3 November 2025 to 14 December 2025, and any later days that exist, including 15 December 2025 if it is there. Keep the daily files out of git (they are 76 to 97 MB each). From them build small tables in `opendata/public/`: boardings by day, route and hour; boardings by day, stop and hour; and the same for alightings. Each table has a file beside it saying the source address, the date fetched, the terms, and how it was made.
3. **If it needs an account or a key:** do not create an account in anyone's name, do not look for a way round the login, and do not use a copy from an unofficial site. Write in `coordination/lane-3.md`: `TO AMIR:` and then the exact steps a person must take (the address, what to click, what will be emailed), and where to put the result so you can carry on. Then go on to task two.
4. Compare the public file's fields with the provided file's (listed in `docs/DATA.md`, section 1.2) and tell lane 1 how route and stop names can be matched between them.

Say plainly what you could not confirm. A finding of "it needs registration, and here are the steps" is a good result.

## 4. Task two: public tables the forecast can use as features

Each as a small table in `opendata/public/` with its source file beside it, and a short note to lane 1 on how to join it. Start from the addresses in the research file.

| Table | Why the model wants it |
|---|---|
| Bus stops: name, id, position, kind of stop (pole, flag, covered, air-conditioned shelter) | A shelter in a hot country changes who waits where |
| Bus routes: name, kind (urban, feeder, intercity and the rest), direction, stops in order | To match public names to the provided network |
| Population by community, latest year | Demand follows people |
| Weather by hour for Dubai, 1 November 2025 to 15 December 2025 (temperature, rain, humidity, wind) | Heat and rain move passengers |
| Calendar: day of week, public holidays, school terms and breaks for the same period | 15 December 2025 was a Monday inside the school winter break: the model must know |
| Metro and tram stations with positions | Many bus trips feed the metro |
| Monthly passengers by route, if still published | A check on the daily totals |

Rules: public sources only, each named with its address, the date fetched and its terms. Totals and features only. Nothing about a person. Keep every table small enough for git, or keep the large file out and commit only the small table made from it.

## 5. Task three: the Khutwa passenger prototype

The idea the team cares about most: where the forecast shows a full bus and an emptier one within reach, the passenger is offered points to take the emptier one. The points programme is called Khutwa (Arabic for "a step"). RTA already has a points programme, nol Plus, so the pitch presents Khutwa as a way of earning nol Plus points, not as a rival.

Build `rider/`: a single page for a phone (390 wide first), plain files, no framework needed, no outside service at run time. It reads the bundle described in `docs/CONTRACT.md` (`fixtures/` for now) and shows one passenger's morning:

1. Her usual bus at her stop, with the forecast: how full, how late.
2. If the forecast shows more people than seats: one or two better choices from `decisions.json` (lever `rewarded_choice`), each with what it costs her (minutes, metres) and what she earns.
3. If she takes one: the points, and what they buy. Use everyday things: a fare, bread, rice, a phone top-up. Do not name any real shop or brand.
4. A control "I cannot walk further": after it, no choice ever involves a longer walk.

It must honour these, because the team's own members raised them: a choice is never the only way to travel; nobody is ever charged more; a walking offer is never made for a long walk; the page says STAND-IN DATA, NOT A RESULT whenever the bundle says so; every expected effect is marked simulated; the passenger is fictional and the page says so. Words come from the glossary in `docs/RULES.md` section 9, the look from section 10. No RTA or nol logo or colours.

Give it one command to build and one to test: `node rider/build.mjs --bundle <folder> --out <folder>` and `bash rider/tests/run.sh`, ending with the line `ALL PASS`. Tell lane 1 when they exist.

## 6. Task four: checks on every push

A GitHub Actions workflow in `.github/workflows/` that, on every push to `main`, runs `bash scripts/gates.sh` and fails loudly if the last line is not `ALL GATES PASS`. Keep it fast. It must not need any secret.

## 7. How to work in this repository

- Everyone pushes to `main`. Before every push: `git pull --rebase origin main`. Commit only named files inside your own folders. Never force-push. Never open a pull request against another lane's folder: ask in your coordination file.
- `tools/guard.py` runs before every commit and refuses raw data. Never pass `--no-verify`. If it stops you, it is right until proven wrong: `.gitignore` allows data files only under `fixtures/` and `opendata/public/`.
- No secret in the repository, in a log or in a message. You need none for this lane.
- Commits carry no co-author line and no AI trailer.
- After each push, add one dated line to `coordination/lane-3.md`: what you pushed (the commit), what you checked (the command and its last line), and what you need.
- Never say a thing is done without the command and its real output.

## 8. Order and cut lines

1. `opendata/ACCESS.md`: how the open daily tap files are reached today. Wanted first, within the first hour, because a person may have to register.
2. The calendar, weather and population tables (small, quick, certain).
3. Stops and routes.
4. The Khutwa page on stand-in data.
5. The daily tap tables, once access is settled.
6. The workflow.
7. Metro stations, monthly totals, anything further.
8. Only if everything above is done: walking times in minutes between each stop and the stops of other routes within 500 metres, from the OpenStreetMap street network (see `docs/TOOLS.md`). Keep the street file out of git and commit only the small table.

The team shows its work to RTA's mentors on Tuesday 17 November at 09:00 Dubai time (05:00 UTC), and presents on Wednesday 18 November at 10:00 Dubai time. Your freeze is Wednesday 05:00 Dubai time.
