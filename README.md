# Insiyab (انسياب)

**Insiyab forecasts, an hour ahead, where Dubai's buses and passengers will not match, and closes each gap from both sides: RTA moves the bus, or the passenger is rewarded for moving.**

A student prototype for the RTA Future Move Hackathon, 16 to 18 November 2026 ("Can AI make Dubai's bus network more efficient?"). Not an RTA product. The name is Arabic for smooth flow.

Public address: https://insiyab.amirkazemkhani.com

## Where things stand

Set up on 16 November. The plan, the contract between lanes, the stand-in data and the gates exist. No model has been run on RTA's data yet, so there is no result to report. `docs/STATUS.md` says what is true now.

## Read in this order

| File | What it is |
|---|---|
| `docs/REQUIREMENTS.md` | The challenge, the scoring sheet and the deadlines, word for word |
| `docs/STRATEGY.md` | The one idea, the five levers, the four points of view, what is cut |
| `docs/MODEL-PLAN.md` | What is forecast, how it is tested, what the judges will see |
| `docs/TWIN.md` | The day replayed on the map, and the same morning from four places |
| `docs/DATA.md` | The five datasets, the joins to prove, and how data is handled |
| `docs/CONTRACT.md` | The files the four lanes meet through |
| `docs/LANES.md` | Who owns what, how to push, cut lines |
| `docs/RULES.md` | The rules that never bend, the glossary and the identity |
| `docs/CRITERIA-MATRIX.md` | Every scoring line, what we show for it, and where the proof is |
| `docs/research/` | Sources, each with its address |
| `handoff/` | The four prompts, one for each worker |

## Run it

```
bash scripts/install-hooks.sh          # once: the guard that keeps raw data out of git
python3 tools/make_fixture.py          # rebuild the stand-in bundle
python3 tools/contract_check.py fixtures
bash scripts/gates.sh                  # every gate; the last line must be ALL GATES PASS
```

## The team

Team members push to `main` in their own folders (`docs/LANES.md`). Raw data from the organisers never enters this repository.
