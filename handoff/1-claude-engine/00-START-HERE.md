# Start here: lane 1, the engine and the integrator (Claude Code, Amir's account, in Ghostty)

This is the heavy lane. It builds the forecasting model, keeps the four lanes fitting together, and is the only one that deploys.

## Before you start it

1. Open a Claude Code terminal in `~/dev/insiyab` (the repository is already there).
2. Keep the charger in and the lid open. A laptop that sleeps stops the worker without saying so.

## The line to paste

```
/loop Read handoff/1-claude-engine/PROMPT.md and carry it out as my instructions. Tonight's target is in its section 11: the whole walk-through live and checked on https://insiyab.amirkazemkhani.com by 06:30 Dubai time. Every turn: pull, read every file in coordination/, answer lane 1's messages, do one task, run the gates, push, deploy when another lane has delivered a cut, and write one line in coordination/lane-1.md.
```

## What it will need from a person

It writes these in `coordination/lane-1.md`, starting `TO AMIR:` or `TO MUSTAFO:`.

1. Running its census program inside Dataiku. The printed counts stay on your machine.
2. A mentor's answer on whether data or totals may leave Dataiku (Tuesday 09:15).

## What is in this zip

`PROMPT.md` and a copy of the documents it points to. The repository holds the current versions: if they differ, the repository wins.
