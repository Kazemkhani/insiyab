# Manual checklist: what a script cannot judge

Fill this in while clicking through as each person, on the public address, after the scripts have run. Write Yes, No or a short note in the last column. Every No becomes a finding in `docs/team/PERSONA-REPORT.md` with a screenshot, a severity and an owner.

Deploy checked: `curl -s https://insiyab.amirkazemkhani.com/deploy.json` = ________  Date and time: ________

## 1. RTA bus controller (night shift, ten years)

Open `/ops/` on a large screen and stand 3 m back.

| # | Question | Answer |
|---|---|---|
| 1.1 | After five seconds, can I say which bus is in trouble and what Insiyab suggests? | |
| 1.2 | Is the one thing to do next obvious without reading the whole column? | |
| 1.3 | Can I read the risk line, the suggestion and the four call rows from 3 m? | |
| 1.4 | Does any word suggest that Insiyab or the AI decided, picked or dispatched? | |
| 1.5 | Does the countdown band feel urgent but not alarming (no siren, no full-screen flash)? | |
| 1.6 | After I decide, is it clear that the decision is mine, with my time? | |
| 1.7 | Does each "Received" look earned (arrives one by one, with a time), not instant? | |
| 1.8 | Is anything on screen a debugging leftover a controller would not understand? | |

## 2. RTA executive judge

Read the deck from slide 1 to 15 with the speaker notes open (`N`), then the pitch page's first screen.

| # | Question | Answer |
|---|---|---|
| 2.1 | After the deck, can I say in one sentence what changes for RTA? | |
| 2.2 | Is the ask (one shift, selected evening routes, eight weeks, what is measured) unmistakable? | |
| 2.3 | Does any slide need a technical word explained that is not explained? | |
| 2.4 | Does the tone stay plain and confident, without hype words? | |
| 2.5 | Does the DSS slide make clear Insiyab sits beside RTA's system and is not connected? | |
| 2.6 | Do the speaker notes describe the same sequence the console shows (who is called, and when)? | |
| 2.7 | Is "1,400 buses" always paired with where it came from, and with RTA's "1,100+"? | |

## 3. Dataiku data scientist judge

Read the pitch page's forecast section, deck slide 7 and the console's judge picker.

| # | Question | Answer |
|---|---|---|
| 3.1 | Is it clear what was forecast (trip time), on what (2,043 held-out evening trips) and against what? | |
| 3.2 | Is it clear how the held-out trips were separated (by time, by route, random)? | |
| 3.3 | Are the losses stated as plainly as the wins? | |
| 3.4 | Is any stand-in number (from the model card's invented tables) presented as a result? | |
| 3.5 | Is "15% closer" ever read as "15% fewer late buses"? | |
| 3.6 | Would I trust the boosted trees over the linear model on a 0.34 min difference without a range? | |
| 3.7 | Are the two still-out figures (85 in 100, and 589 of 945) explained, or confusing? | |

## 4. RTA planner

Start at `/` and try to find which routes and hours need more time, without being told where.

| # | Question | Answer |
|---|---|---|
| 4.1 | How many clicks to the worklist? Did I find it without help? | |
| 4.2 | Does the worklist give route, hour and the minutes to add, with its source? | |
| 4.3 | Is every heat or lane figure clearly a scenario, a rule or RTA's expectation, never a measurement? | |
| 4.4 | Could I take one row of the worklist to a timetable meeting tomorrow? | |

## 5. Accessibility and phone visitor

Scan the QR on the closing slide with a real phone. Turn on reduced motion. Try VoiceOver or TalkBack on `/pitch/`.

| # | Question | Answer |
|---|---|---|
| 5.1 | Does the page open fast enough on mobile data that I would not give up? | |
| 5.2 | With reduced motion on, does anything still move by itself? | |
| 5.3 | Does the screen reader read the headings in a sensible order, and the charts as words? | |
| 5.4 | Can I play the film with captions or a transcript? | |
| 5.5 | Can I use the console on the phone at all, or does it say to use a larger screen? | |
| 5.6 | Is the text comfortable to read without zooming? | |
