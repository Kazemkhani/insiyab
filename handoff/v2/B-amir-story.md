# Stream B: the story, pitch page, deck and film (Amir, Claude session 2)

Paste below into Claude Code opened in a SECOND clone: `git clone https://github.com/Kazemkhani/insiyab.git ~/dev/insiyab-story`, then `bash scripts/install-hooks.sh`, and link `web/node_modules` and `.venv` from `~/dev/insiyab` if you need them (they are git-excluded).

---

You own how Insiyab is told: the pitch page (`/pitch/`), the executive deck (`/pitch/deck/`), and the film. The message changes from reactive to proactive: **"Insiyab sees it coming. The controller decides."**

## Read first
1. `CLAUDE.md`, `docs/REQUIREMENTS.md`, `docs/RULES.md`
2. `docs/v2/STRATEGY.md` (especially sections 3, 4, 7), `docs/v2/PITCH.md`, `docs/v2/FACTS.md` (only lines marked Verified go on screen)
3. What exists: `story/index.html`, `story/deck/index.html`, `story/build.mjs`, `story/tests/browser.py`; the film compositions in `web/film/cinematic/` and `web/film/cinematic-root.jsx`, render script `~/work/insiyab-run/film/cinematic/render.sh`
4. Brand: `brand/` (colour meanings, motion spec). The owner rejects "AI slop": rows of bordered cards, letter-spaced labels above headings, two-tone headlines, pill tags, node diagrams with tiny labels, Instrument Serif, gradients.

## You own
`story/`, `web/film/`, `coordination/v2-B.md`.

## Tasks, in order
1. **Deck** (`story/deck/index.html`): restructure to `docs/v2/PITCH.md` order, about 12 slides plus backups. New slides: "Insiyab sees it coming" (black, the line only); the six watchers (one row each, icon, one line, built-status word); the model (horizon table from `docs/MODEL-CARD.md:216-219` as a clean chart with the range band, cross-validation grid, the honest losses); Dubai heat (map of 553 AC shelters vs 993 poles, July scenario labelled) and bus lanes (24 to 59%); the DSS diagram (one picture: DSS in the middle, Insiyab before and around it); the arc 2026/2030/2040 with the shade-route vision; close. Every verb proactive: predicts, flags, suggests, prepares, then calls, relays. Keep photo credits exactly as in `story/deck/photos/LICENSES.md`.
2. **Pitch page** (`story/index.html`): same message in the hero and the "Insiyab" section; add the six watchers; link to `/ops/` (the console) once stream A deploys it. Keep every `story/tests/browser.py` constraint true; update a test only where the intent is preserved and say which.
3. **Film**: render the latest cinematic film, watch every 2-second frame, fix anything off-brand, and keep it 75 to 85 s. Photo credits must match `LICENSES.md` exactly (an earlier render invented "Unsplash" and "Shutterstock" credits: grep for them). Provide a 40-second cut (scenes 1 to 4) for the stage opening and the full film for the site.
4. **Presenter view** (`story/presenter.html`): notes for the new section ids, with speaker and seconds from `docs/v2/PITCH.md`.
5. Screenshots of the console from stream A for the deck once `/ops/` is live.

## Checks before every push
`~/dev/insiyab/.venv/bin/python story/tests/browser.py` (read the file for its exact invocation), `bash scripts/gates.sh`, and a Playwright render of every deck slide at 1920x1080 that you open and look at. List any slide you have not looked at.

## Done means
Deck, pitch page and film all say the v2 story with no banned claim (grep for: "none ranked", "delays by 68", "an hour ahead", "30 minutes ahead" next to 85 in 100, "Shutterstock", "Unsplash (CC0)"), the 40 s and full film files exist with sha256, and lane 1 has what it needs to deploy (`coordination/v2-B.md`).
