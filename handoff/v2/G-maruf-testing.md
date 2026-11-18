# Stream G: multi-persona testing, end to end (Maruf, Claude)

Paste below into Claude Code opened in your clone of the repo. You need Python with Playwright: `uv run --with playwright python -m playwright install chromium` once.

---

You test the whole product the way five different people would meet it on Friday, find what fails each of them, and hand every finding to its owner. You do not fix other streams' files.

## Read first
`docs/RULES.md`, `docs/v2/STRATEGY.md`, `docs/v2/PITCH.md`, `docs/v2/CONSOLE-SPEC.md` (its "Must never happen" list is your first test list), `docs/v2/FACTS.md`.

## You own
`tests/personas/` (new), `docs/team/PERSONA-REPORT.md`, `coordination/v2-G.md`.

## The five personas
| Persona | Goal | What fails them |
|---|---|---|
| **RTA bus controller** (night shift, 10 years) | Use `/ops/` to handle the route 310 alert in under a minute | Can't tell what to do first; text too small at 3 m; a state that lies (Received without a reply); anything that implies the AI decided |
| **RTA executive judge** | Understand in 8 minutes what changes for RTA and why to fund a pilot | Jargon; numbers without sources; a claim from the banned list; no clear ask |
| **Dataiku data scientist judge** | Trust the model | No baseline; no ranges; train/test leakage; losses hidden; "15%" and "+46" mixed up |
| **RTA planner** | Find which routes and hours need more time | Can't find the planner view; heat or lanes shown as measured when they are scenarios |
| **Accessibility and phone visitor** (QR on a phone, screen reader, reduced motion) | Read the site on a phone | Overflow at 390 px; contrast under 4.5:1; motion that ignores reduced motion; images without alt text |

## Build (`tests/personas/`)
1. One Playwright script per persona that walks the live address (`https://insiyab.amirkazemkhani.com`: `/`, `/pitch/`, `/pitch/deck/`, `/ops/` once deployed) and checks its failure list automatically where possible: banned phrases (grep the rendered text for the list in `docs/v2/STRATEGY.md` section 7), overflow at 390x844 and 1920x1080, contrast of computed colours, `prefers-reduced-motion` honoured, demo mode makes no request to `/voice/`, every number on the console has a label nearby.
2. A manual checklist for what a script can't judge (clarity, tone), which you fill in yourself while clicking through as each persona.
3. Run all five against the live address at Thursday 12:00 (after the feature freeze), screenshot every failure, and write `docs/team/PERSONA-REPORT.md`: each finding with persona, page, screenshot path, severity (blocker, fix, polish), and the owning stream (A console, B story, C model, D watchers, E words).
4. Post `TO STREAM X:` lines in `coordination/v2-G.md` for every blocker, and re-run after the 17:00 deploy.

## Also
You know the Dataiku Flow. Check that every number on the console and deck traces to a named table or the model card, and list any that don't.

## Done means
The report exists with every blocker assigned, and after the 17:00 deploy no blocker remains open. Paste the final run's summary line.
