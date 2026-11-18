# Insiyab v2: who builds what, by when

Read `docs/v2/STRATEGY.md` first. This file says who does what. Times are Dubai time.

## The team and their sessions

Five people, each with Claude Code. Amir and Mustafo have the large accounts, so they carry the heavy builds and each runs **two sessions in two separate clones** (never two sessions in one folder: that broke two deploys on 18 Nov).

| Stream | Person | Session | Clone folder | Owns (only edit these) | Prompt |
|---|---|---|---|---|---|
| **A. Insiyab Live console** | Amir | Claude 1 | `~/dev/insiyab` | `live/ops/` (new), `live/voice/` | `handoff/v2/A-amir-console.md` |
| **B. Story: pitch page, deck, film** | Amir | Claude 2 | `~/dev/insiyab-story` | `story/`, `web/film/` | `handoff/v2/B-amir-story.md` |
| **C. Forecast model, stronger** | Mustafo | Claude 1 | `~/dev/insiyab` | `model/`, `tests/test_model*`, `docs/MODEL-CARD.md` | `handoff/v2/C-mustafo-model.md` |
| **D. Watchers: overflow, heat, lanes, events** | Mustafo | Claude 2 | `~/dev/insiyab-watchers` | `watchers/` (new), `opendata/` | `handoff/v2/D-mustafo-watchers.md` |
| **E. Pitch words, rehearsal, Q&A** | Sara | Claude | own clone | `docs/pitch/` | `handoff/v2/E-sara-pitch.md` |
| **F. Facts and sources** | Sarah Maaty | Claude | own clone | `docs/research/` (new) | `handoff/v2/F-sarah-facts.md` |
| **G. Multi-persona testing** | Maruf | Claude | own clone | `tests/personas/` (new), `docs/team/` | `handoff/v2/G-maruf-testing.md` |

Integration and every deploy stay with **lane 1 (Amir, session A)**, with `scripts/deploy.sh`, as in `docs/LANES.md`. Nobody else deploys.

## How the streams meet

They meet through files, not conversations. The contract is `docs/v2/CONTRACT-V2.md`:

```
C (model)     --> artifacts/forecast/*.json  --+
D (watchers)  --> artifacts/watchers/alerts.json --> A (console reads them; demo replay)
A (console)   --> screenshots, live URL /ops/  --> B (deck, film, pitch page) and G (tests)
F (facts)     --> docs/research/FACTS.md        --> B, E (only verified lines go on screen)
G (tests)     --> docs/team/PERSONA-REPORT.md   --> everyone fixes their own findings
```

Until C and D deliver real files, A works from the stand-in `fixtures/watchers/alerts.json` that D writes first (within its first hour), clearly labelled.

## Cut lines

| When | What must exist |
|---|---|
| **Thu 19 Nov 02:00** | A: console skeleton on the map with stand-in alerts, escalation countdown working in demo mode. C: new features trained, new horizon table. D: `alerts.json` stand-in, then the heat score on real stop kinds. B: deck and pitch page rewritten to "sees it coming"; film v2 rendered. F: facts list verified. E: first full script. |
| **Thu 10:00** | Integration: A wires C and D outputs; lane 1 runs `bash scripts/gates.sh` and deploys to the public address. |
| **Thu 12:00** | **Feature freeze.** After this only fixes, each with a test. |
| Thu 12:00 to 15:00 | G runs the five personas against the live address; findings to owners. |
| Thu 15:00 to 17:00 | Fixes; final deploy at 17:00, verified by hash. |
| Thu 18:00 to 21:00 | **Three timed full rehearsals** (7:30 target) with the real phone on the table, plus one rehearsal of the fallback (no network). |
| Fri 07:30 | Venue: laptop, clicker, HDMI, sound, phone signal, the fallback video on the desktop. |
| Fri 09:15 | Pitch. |

## Rules that do not bend (from `docs/RULES.md`, repeated because they cost the most)

- Raw RTA data never enters git, a chat, an email or a zip. Nothing about one card, device or driver is ever shown.
- Stand-in or simulated data is labelled on every screen. Measured and simulated are never mixed in one number.
- A real phone call needs all three guards (roster file, `INSIYAB_CALLS=armed`, `--live`) and the person's consent. Demo mode can never ring a phone.
- Never say done without the command and its real output. Commits carry no co-author line or trailer.
- Brand: `docs/v2/STRATEGY.md` section 7 (banned claims) and the brand kit colour meanings: red = attention, teal = verified receipt only, gold = Insiyab only, ivory and ink for everything else. No Instrument Serif, no gradients, no glow, no emoji.

## Every working turn

1. `git pull --rebase origin main`
2. Read the newest lines in every file in `coordination/`.
3. Do one task from your prompt.
4. Run your tests and `bash scripts/gates.sh`.
5. Commit named files inside your own folders only. Push.
6. Add one dated line to your coordination file (`coordination/v2-<stream>.md`): what you pushed, the command you ran and its last line, and what you need.
