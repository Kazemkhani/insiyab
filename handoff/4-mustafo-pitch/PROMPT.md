# Lane 4: the pitch and the proof

You are Claude Code on Mustafo's laptop. This is the light lane, on purpose: Mustafo's account has less usage than Amir's, so this lane is a small number of short, high-value tasks. Work in short sessions. Do not start long loops or many helpers. Do one task, push it, stop.

This file is your instruction from Amir and Mustafo.

## 1. What the project is

The team is in RTA's Future Move Hackathon (16 to 18 November 2026): "Can AI make Dubai's bus network more efficient?" Our product, Insiyab, forecasts an hour ahead where buses and passengers will not match, and closes each gap from both sides: RTA moves the bus, or the passenger is rewarded for moving. Three other workers are building the forecast, the site and the open data. You make sure that what gets built is what gets marked, and that it can be said in a few minutes.

Why this matters: twenty points are for documentation and presentation, six of them for "well-structured, on-time delivery with confident, accurate answers to judges' questions". On Marsad, the team that won last Sunday, a rehearsed pitch that handed the judges a working address made the difference between 70 and first place.

## 2. Set up

```
git clone https://github.com/Kazemkhani/insiyab.git
cd insiyab && bash scripts/install-hooks.sh
```

Read `AGENTS.md`, `docs/REQUIREMENTS.md`, `docs/STRATEGY.md` and `docs/RULES.md` (the glossary in section 9 is the vocabulary of the pitch). You own `docs/pitch/`, `docs/CRITERIA-MATRIX.md`, `docs/team/` and `coordination/lane-4.md`. Change nothing else.

Before every push: `git pull --rebase origin main`. Commit only named files in your own folders. Never force-push. No co-author line on commits.

## 3. Mustafo's own tasks, as a person (no AI needed)

1. **Tuesday 09:15, ask a mentor the four questions** in `docs/REQUIREMENTS.md`, section 6, and write the answers in `docs/team/MENTOR-ANSWERS.md` with who said it and when. The first one decides how the whole team works: may the data, or totals worked out from it, leave Dataiku?
2. **If lane 1 asks**, run its census program inside Dataiku and paste back the printed counts (they contain no personal data). The steps will be in `coordination/lane-1.md` under `TO MUSTAFO:`.
3. **Write what you know from riding the buses** in `docs/team/RIDER-NOTES.md`: five true things, each with the route or stop and the time of day. The four points of view in the product are built on the data, and these notes keep them honest.

## 4. The AI's tasks, in order. Each is one short session.

**Task A: the mentor sheet (do this first, tonight).** `docs/pitch/MENTOR-SHEET.md`, one page for Tuesday morning: the four questions from `docs/REQUIREMENTS.md` section 6, then five more that would improve the product, taken from `docs/STRATEGY.md` and `docs/research/research-dubai.md` (for example: what is charged when a passenger does not check out; which stops already have a request button; whether RTA's 2020 route-planning system is still in use). Each question in one plain sentence, with why we ask.

**Task B: the criteria matrix, kept true.** `docs/CRITERIA-MATRIX.md` has one row for each of the fifteen scoring lines. Twice a day (Tuesday 13:00 and Tuesday 21:00), pull, open the proof named in each row, and set the status to Shown only if you opened it and it is there. Otherwise Planned or Missing. List the three weakest rows in `coordination/lane-4.md` under `TO ALL:`. Never mark a row from memory.

**Task C: the pitch.** `docs/pitch/PITCH.md`, written as spoken English and read aloud before it is kept. Two lengths, because the Wednesday length is not yet known: five minutes and eight minutes (the Friday final is "7-8 Mins pitch + 2 Mins Q&A"). The shape:

1. The problem in RTA's own words, and one true thing from `docs/team/RIDER-NOTES.md`.
2. The sentence: what Insiyab does.
3. The QR code and the address, early, so the judges can hold it.
4. The forecast and its error, against the naive forecast, said plainly, with the one-day limit said first by us.
5. One decision, shown on the map, with what it changes.
6. One person: what that decision does to their morning.
7. What RTA already has and what we add.
8. The limits, then the ask.

Rules for it: every number is copied from `metrics.json`, `decisions.json` or `summary.json` at the time of writing, with the file named beside it, and a blank left where the number does not exist yet. No number from memory. Words from the glossary. The last twenty seconds get the same care as the first ten: on Marsad the only criticism of the winning film was that its ending was filler.

**Task D: the hard questions.** `docs/pitch/QA-PREP.md`: twenty questions a judge from RTA or Dataiku could ask, hardest first, each with an answer of at most three sentences and the file that proves it. Include: why trust a model trained on one day; what is your MAPE and over which bins; what was the naive forecast; how do you know no future data leaked in; what about a passenger who cannot walk further; RTA already skips stops, so what is new; what does this cost; what would you need from RTA to run it next month.

**Task E: the demo path and the fallback.** `docs/pitch/DEMO-PATH.md`: the exact taps of the walk-through, counted, under a minute and a half. `docs/pitch/IF-IT-BREAKS.md`: ten lines on what to do if the address, the Wi-Fi or the laptop fails.

## 5. Rules

- British English, full sentences, no em-dashes, no emojis, plain words.
- Never claim more than the product shows. If a number is simulated, the pitch says "we estimate". If the site is on stand-in data, the pitch says so.
- RTA already uses machine learning on its bus routes (announced in 2020) and already has nol Plus and Bus on Demand. The pitch names them and says what we add. It never says RTA has nothing.
- We never say we reduce road congestion or save money: we have no road data and no costs. We say minutes, seats, kilometres and passengers.
- After each push, add one dated line to `coordination/lane-4.md` saying what you pushed and what you need.
