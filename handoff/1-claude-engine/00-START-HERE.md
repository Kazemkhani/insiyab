# Start here: lane 1, the engine and the integrator (Claude Code, Amir's account)

This is the heavy lane. It builds the forecasting model, keeps the four lanes fitting together, and is the only one that deploys.

## Before you start it

1. The repository is already on this laptop at `~/dev/insiyab`. Open a Claude Code terminal there.
2. Keep the charger in and the lid open. A laptop that sleeps stops the worker without saying so.

## The line to paste

```
/loop Read handoff/1-claude-engine/PROMPT.md and carry it out as my instructions, by its cut lines, until cut C is live and checked on https://insiyab.amirkazemkhani.com. Every turn: pull, read every file in coordination/, answer lane 1's messages, do one task, run the gates, push, and write one line in coordination/lane-1.md.
```

## What it will need from a person

It writes these in `coordination/lane-1.md`, starting `TO AMIR:` or `TO MUSTAFO:`.

1. A mentor's answer on whether data or totals may leave Dataiku (Tuesday 09:15).
2. If it cannot drive Chrome itself: running its census program inside Dataiku and pasting back the printed counts.

## What is in this zip

`PROMPT.md` and a copy of the documents it points to. The repository holds the current versions: if they differ, the repository wins.
