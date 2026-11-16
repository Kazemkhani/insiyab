# Rules that never bend

These held through two projects that came before this one (Marsad, which won the Dubai Airports hackathon on 15 November 2026, and Bayyina, shown at the World Police Summit). Each rule exists because breaking it cost something. Where the reason is not obvious it is given.

## 1. Words

1. British English, full sentences, short paragraphs. No em-dashes. No emojis. No arrows or bracket tags in prose.
2. One word for one idea, the same on every screen, in every test and in the pitch. The glossary is section 9. Do not drift.
3. Say why a thing matters before saying what it is. Show a real example instead of defining a term.
4. No filler. Banned on sight: "seamless", "robust", "leverage", "elevate", "cutting-edge", "revolutionary", "it's not X, it's Y", and any sentence that would still be true of a different product.
5. A number carries its unit, its source and its date. A number with no source is deleted.
6. Plain words on every screen a judge sees first. On Bayyina the owner said "it's too technical" three times in one day. The test: a stranger can say what the screen showed after five seconds.

## 2. Honesty on the screen

1. **Stand-in data says so, on the screen it appears on**: STAND-IN DATA, NOT A RESULT.
2. **Measured and simulated are never mixed.** A count from the day's records is "measured". What we expect if RTA made a change is "simulated", and shows its assumption beside it.
3. **One day.** The provided transactions and the runtime report cover one day, Monday 15 December 2025, inside the winter break of most schools. Wherever a forecast number appears, the screen says what it was tested on. We never say the model predicts another day unless it was tested on another day.
4. **We measure buses, not roads.** We have no road traffic data. We may say a bus was crowded or late. We never say we reduce road congestion by a number.
5. **Seats, not standing.** The fleet table marks standing capacity "not verified". We count seats and say so.
6. **RTA already uses AI on its buses.** It announced machine-learning route planning from nol data in 2020, which can propose removing little-used stops and creating express services, and its app is reported to show live buses and how full they are. We never present those as new. We say what we add.
7. If the honest number is small or zero, show it and explain it. Marsad showed "0 connections at risk" on live data and said so on stage.
8. The tool advises. A planner decides. A driver drives. Nothing here instructs a driver or changes a timetable by itself.
9. Never claim a saving in money. We do not have RTA's costs. We report kilometres, minutes, seats and passengers.

## 3. People

1. Nothing about one card, one device or one driver is ever shown or exported (`docs/DATA.md`, section 6). No output is broken down by driver.
2. The four points of view are fictional and say so. They are built from the day's totals. They are drawn as plain figures with no faces. A site worker is drawn and written with the same care as a planner.
3. Rewards only reward. Nobody is charged more, and nobody loses a stop without a way to ask the bus to call there. An offer to walk further is never made to someone who has said they cannot, and never when the walk is long or the day is hot.
4. Never generate the likeness of a ruler, an official or any real person.

## 4. Brand

1. No RTA, nol or Dataiku logo, colours or look on the product or the public site. Their names appear as plain text only.
2. The page says what it is: a student prototype built for the RTA Future Move Hackathon.
3. Credit every source of a map, a dataset or a figure on the screen that uses it.
4. The identity is in section 10. Never invent a colour inside a component.

## 5. Design

1. Light mode. One focal point per screen and one obvious next action.
2. No generated look: no pills, no boxes inside boxes, no gradients, no glow, no frosted glass, no three cards in a row, no checkmark lists, no stock icons, no sparkle icons for "AI".
3. Colour only for state, and state is never carried by colour alone: it also has a word or a shape.
4. Real things as the stage: the real network, the real day. Never decoration that mirrors nothing.
5. Every control at least 44 pixels on a phone. Works at 390 wide with no sideways scroll.
6. Motion only when a state changes, and the end state at once when the visitor asks for reduced motion.
7. Judge a picture on a real graphics chip and a real phone. On Bayyina a figure looked ribbed in a test browser and was fine on the real chip.

## 6. Secrets and data

1. A key lives in one file outside the repository and is never printed, committed, pasted into a chat or put in a zip.
2. Raw data never enters git. `tools/guard.py` runs before every commit. Never pass `--no-verify`.
3. If a hook, a permission prompt or a provider refuses something, the refusal applies to the goal, not to the wording. Record it, tell Amir, and do not look for another route.
4. Before any paid call, confirm whose account pays and the ceiling.

## 7. Git

1. Everyone works on `main`, in small commits, and pushes often. Pull with rebase before every push. Never force-push. Never amend a pushed commit.
2. Each lane commits only inside the folders it owns (`docs/LANES.md`). A change outside them is asked for in `coordination/`.
3. Add named files. Never `git add -A`.
4. Commits are authored by the person whose account runs the worker (Amir for lanes 1 and 2, Mustafo for lanes 3 and 4), with no co-author line and no other trailer. A hook refuses a commit that has one.
5. Never commit a built file by hand: rebuild it from source and check it matches.

## 8. Proof

1. Never say "done" without the command and its real output.
2. Say which state was reached: written, committed, pushed, gates green, deployed, checked on the public address. These are different facts.
3. A test that has never failed has proved nothing. Watch it fail once.
4. An exit code is a claim. On Bayyina a background job reported exit code 0 twice while the deploy had stopped. Check the thing itself.
5. Whoever builds a thing is not the only one who tests it.
6. For anything visible: a screenshot at 1280x720 and at 390x844 that has been looked at.

## 9. Glossary

| Word | Means | Not |
|---|---|---|
| passenger | a person who rides a bus (the challenge's own word) | rider, user, customer |
| stop | a place where a bus calls | station (unless it is a bus station) |
| tap | one nol check-in or check-out | transaction, swipe |
| boarding | one passenger getting on | |
| load | passengers on board when the bus leaves a stop | occupancy |
| forecast | what the model says will happen | prediction |
| held-out | data the model did not see while it learned | test set (say held-out on screen) |
| naive forecast | the simple forecast we must beat | baseline (allowed in the model card) |
| gap | where buses and passengers do not match: more people than seats, or seats with nobody in them | mismatch, imbalance |
| decision | one change RTA could make, with its evidence and its expected effect | recommendation, insight |
| lever | the kind of decision: right bus, right time, right stop, rewarded choice, on demand | |
| stand-in data | invented data with the real shape | fixture (code only), dummy, fake |
| Khutwa points | the reward for a passenger who takes the choice that closes a gap | coins, credits |
| site worker, office worker, driver, planner | the four points of view | labourer, user, persona (code only) |

## 10. Identity

The name is **Insiyab** (انسياب): smooth flow. It is the word Arabic uses for traffic that moves freely.

| Token | Value | Used for |
|---|---|---|
| paper | #F6F5F1 | page background |
| ink | #12263A | text, lines |
| flow | #0E5A5A | the brand accent; a bus with room |
| over | #B23A2E | more people than seats; late |
| spare | #2F6690 | seats with nobody in them |
| simulated | #8A5A00 | anything simulated (always with the word) |
| greys | #E6E8EA, #C3C9CF, #8C96A0, #5A6672, #33404D | everything else |

Headlines and numerals: Overpass (drawn from road-sign lettering). Body: IBM Plex Sans. Records and codes: IBM Plex Mono. Arabic: Noto Kufi Arabic for the name, IBM Plex Sans Arabic for text. Fonts are shipped with the site, never fetched from another address at run time. Lane 2 measures and states the contrast of each pair before using it.
