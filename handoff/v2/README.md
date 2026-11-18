# Insiyab v2: start here (team of five)

The final is **Friday 20 November 2026, 09:15, Dubai Future Foundation, Emirates Towers**: 7 to 8 minutes, then 2 minutes of questions, judged by RTA and Dataiku.

The new idea in one line: **Insiyab sees it coming. The controller decides.** Read `docs/v2/STRATEGY.md` (10 minutes) before anything else.

## Who does what

| Person | Claude sessions | Prompt file(s) | Clone folder(s) |
|---|---|---|---|
| **Amir** | 2 | `A-amir-console.md` (the operations console, integration, deploys), `B-amir-story.md` (deck, pitch page, film) | `~/dev/insiyab`, `~/dev/insiyab-story` |
| **Mustafo** | 2 | `C-mustafo-model.md` (the forecast model), `D-mustafo-watchers.md` (overflow, heat, lanes, events) | `~/dev/insiyab`, `~/dev/insiyab-watchers` |
| **Sara** | 1 | `E-sara-pitch.md` (spoken script, Q&A, rehearsal) | your own clone |
| **Sarah Maaty** | 1 | `F-sarah-facts.md` (every fact checked at its source) | your own clone |
| **Maruf** | 1 | `G-maruf-testing.md` (five personas, end-to-end tests) | your own clone |

## Start, in five steps

1. Clone the repo into the folder in the table: `git clone https://github.com/Kazemkhani/insiyab.git <folder>`
2. In that folder: `bash scripts/install-hooks.sh` (it refuses raw data and commit trailers).
3. Open Claude Code in that folder.
4. Paste the whole of your prompt file from `handoff/v2/`.
5. Two sessions on one laptop? **Two clones, never one folder.**

## How we stay out of each other's way

- You edit only the folders your prompt says you own.
- Before every push: `git pull --rebase origin main`, then your tests and `bash scripts/gates.sh`.
- You talk through your file in `coordination/` (`v2-A.md` to `v2-G.md`): one dated line per push, starting `TO STREAM X:` or `TO ALL:`.
- Only Amir (stream A) deploys.

## Times (Dubai)

| When | What |
|---|---|
| Thu 02:00 | First versions of everything pushed |
| Thu 10:00 | Integration deploy |
| **Thu 12:00** | **Feature freeze**, then persona testing |
| Thu 17:00 | Final deploy |
| Thu 18:00 to 21:00 | Three timed rehearsals plus one fallback run |
| Fri 07:30 | Venue tech check |
| Fri 09:15 | Pitch |

## Never

- Put RTA's raw rows, keys, phone numbers or anything about one card, device or driver in git, a chat, an email or a zip.
- Show a simulated or stand-in number without its label, or mix measured and simulated in one number.
- Say anything on the banned list (`docs/v2/STRATEGY.md` section 7).
- Place a real phone call without the person's consent and all three guards.
- Say "done" without the command and its real output.
