# Insiyab: instructions for every AI worker

You are one of the workers building Insiyab for the RTA Future Move Hackathon. **Version 2 is in force for the final on Friday 20 November 2026, 09:15, Emirates Towers.** Read these, in this order, before you change anything:

0. **`docs/v2/STRATEGY.md`, `docs/v2/PLAN.md`, `docs/v2/CONTRACT-V2.md`, `docs/v2/FACTS.md`, and your own prompt in `handoff/v2/`.** The v2 plan says which stream you are and which folders you own. Where v2 and an older file disagree, v2 wins, except `docs/REQUIREMENTS.md` and `docs/RULES.md`, which still override everything.

1. `docs/REQUIREMENTS.md`: what RTA asked for and how we are scored. It overrides everything.
2. `docs/STRATEGY.md`: the one idea, and what is cut. Then `docs/WOW.md`: the moments that make it stand out.
3. `docs/RULES.md`: the rules that never bend.
4. `docs/LANES.md`: which folders are yours, and how to push.
5. `docs/CONTRACT.md`: the files the lanes meet through.
6. `docs/DATA.md`: the data and how it is handled.
7. The v1 prompts in `handoff/` are history; your prompt is in `handoff/v2/`.

Then, every working turn: `git pull --rebase`, read the newest lines in every file in `coordination/`, do one task, run your lane's tests and `bash scripts/gates.sh`, commit named files inside your own folders, push, and add one dated line to your own file in `coordination/` (v2 streams: `coordination/v2-<A to G>.md`) saying what you pushed and what you need.

Three things cause most of the damage, so they are repeated here:

- **Raw data never enters git, and nothing about one card, device or driver is ever shown.** Run `bash scripts/install-hooks.sh` once after cloning.
- **Stand-in data is labelled on every screen. Measured and simulated are never mixed.**
- **Never say done without the command and its real output.**

Commits carry no co-author line and no other trailer.
