# INSIYAB: full context for a new Claude chat (paste this whole file as your first message)

Written Wednesday 18 November 2026 at 09:15 Dubai time (UTC+4) by the Claude Code session that has been working in Amir's repository. Everything below was read from the repo, the lane notes and the live site this morning. Where something was not checked, it says so.

## 0. How to use this chat (instructions to the Claude reading this)

You are Amir Hossein Kazemkhani's thinking partner for the last hour before a hackathon pitch. **You have no access to his laptop, repository, Dataiku or the live site.** Do not say you ran, deployed, tested or checked anything. You write text, plans, scripts, answers and checklists; Amir (or a Claude Code session on his laptop) runs commands and pastes results back to you.

Rules for how you answer:
1. Plain, short sentences. British English. No em-dashes, no emojis, no filler (banned: seamless, robust, leverage, elevate, cutting-edge, game-changing, "it's not X, it's Y").
2. Use only the numbers in section 5. Never invent a figure. If asked for one that is not here, say it is not known.
3. Lead with the least flattering true thing. Say plainly when something is assumed, simulated or unverified.
4. End every answer with a block headed **What you need to do**: numbered, exact commands or URLs, marked blocking or optional. If nothing is needed, write "Nothing needed from you".
5. Be fast. The clock in section 1 is real.

## 1. The clock (Dubai time)

| When | What |
|---|---|
| Now: 09:15 | |
| **before 10:00** | RTA's deadline: "Final files and demos to be ready before 10:00 AM on Day 3; submission details to be confirmed." **What exactly counts as "the files" is still not confirmed** |
| 09:30 | Our own freeze: fixes only |
| 10:00 to 11:30 | Presentations to the judges |
| **10:30** | **Our slot: ten minutes, then five of questions.** Wednesday picks three finalists of seven |
| Fri 20 Nov, 09:15 | Final at Emirates Towers (7 to 8 minutes plus 2 of questions), only if shortlisted |

A deploy needs about eleven minutes for its test gates alone, so anything not started by about 09:30 will not be on the public page for the pitch. Plan the presenter's screen so that nothing depends on a deploy.

## 2. What the project is

**Insiyab** is a team entry for the RTA Future Move Hackathon. RTA (Dubai Roads and Transport Authority) and Dataiku (technical partner) gave seven teams one real bus day, **Monday 15 December 2025**, inside a Dataiku instance. The challenge: "Can AI make Dubai's bus network more efficient? Deliver more value from every bus, every trip and every kilometre, while protecting the passenger experience." Output wanted: an AI-powered prototype, analytical model or decision-support solution. "Don't just find patterns. Turn them into decisions." Prize AED 20,000.

The team: **Amir Hossein Kazemkhani** (leads; presenter not yet named), **Mustafo** (owns the phone-drill side and the Twilio account holding the Marsad number), **Cobuild** (trained the second model in Dataiku), **John** (analysed the day independently in Dataiku project `JOHN`), and AI workers called lanes 1 to 4. The earlier project **Marsad** (Dubai Airports hackathon) won, and its ideas (a live phone moment, decisions with three priced options) are being reused.

## 3. How we are scored (100 points)

Five criteria of 20. The split inside each is the sheet's own suggested weighting. **Sixty of the hundred points are about a forecasting model.**

| # | Criterion | Sub-lines (points) |
|---|---|---|
| 1 | Practical Application | 1.1 Business problem alignment (8); 1.2 Actionable insights (6); 1.3 Deployability and scalability (6) |
| 2 | Documentation and Presentation | 2.1 Clarity of documentation (7); 2.2 Effective visualisations (7); 2.3 Presentation delivery and Q&A (6) |
| 3 | Innovativeness and Creativity | 3.1 Novelty of techniques (8); 3.2 Creative use of data and features (6); 3.3 Originality of solution design (6) |
| 4 | AI Model | 4.1 Model selection and suitability (8); 4.2 Data preparation and training, proper train/test separation (6); 4.3 Explainability and reliability (6) |
| 5 | Forecast Accuracy | 5.1 Error metrics MAE, MAPE, RMSE (8); 5.2 Improvement over baseline (6); 5.3 Accuracy across horizon and peaks (6) |

The briefing slide also calls criterion 4 "Model Stability: performance on multiple subsets of the data". We answer both. Judges: RTA's 4IR Emerging Technology Lab, with Dataiku people in the room.

## 4. The idea (changed on 17 November)

We began with a passenger idea (move the bus, or reward the passenger for moving). After talks with Dataiku's judge, RTA's scheduling engineer, an outside reviewer, and after the real data showed something stronger, the pitch is now about **evening lateness and the timetable**. The passenger idea survives only as one sentence about "the next phase".

**The problem, one sentence.** The timetable gives each bus route the same trip time all day. In the evening a trip takes longer, so buses fall behind and stay behind.

**Told through one bus.** The timetable said 19:23. The bus left at 19:36. The driver did nothing wrong. The bus was still finishing its last trip, which took 96 minutes where the timetable allowed 67. The 67, 96 and the 16-minute break are measured on route 310 at 18:00. The two clock times are arithmetic on them (18:00 + 67 + 16 = 19:23; 18:00 + 96 = 19:36), so they are **always labelled "illustration"**.

**Why it is not the crowd.** 48,724 boardings at 08:00 and 49,707 at 18:00, yet 19 per cent of departures are 5 or more minutes late at 08:00 and 45 per cent at 18:00.

**Why it snowballs.** A 16-minute break cannot win back half an hour, so the next trip starts late, and the one after.

**Our answer.** (1) A forecast of how long each trip will really take, made 30 minutes before it leaves. (2) A worklist for the timetable planner: each route and hour, and the minutes it needs. (3) A second ranking by passengers reached (top: route C01 at 18:00).

**Who uses it, when, what they decide.** The timetable planner, at each timetable change (RTA makes one every one to two months), accepts or sets aside each row. Nothing applies itself. Nothing new has to be measured.

**Cut after outside review, say so if asked:** AI phone calls to drivers as the main idea (nobody knew how the control centre reaches a driver), skipping stops, agents scanning the news, routes that change by the day.

## 5. The verified numbers (RTA's day, 15 December 2025, one day only)

All computed inside Dataiku by lane 1 unless marked. Say "one day" wherever a forecast figure appears.

| Fact | Value | Source |
|---|---|---|
| Card taps, trips, routes | 1,056,343 taps; 11,201 trips; 166 city routes | Dataiku tables |
| Same crowd at both peaks | 48,724 at 08:00; 49,707 at 18:00 | `demand_by_hour` |
| Late departures (5+ min) | 19% at 08:00; 45% at 18:00 | `punctuality_by_hour` |
| Trips 16:00 to 18:59 finishing 5+ min late | 52.6% (morning 22.3%) | lane 1 and John, separately |
| Route 310 at 18:00 | timetable allows 67 min; the middle trip took 96 | Flow |
| Break between trips | about 16 min at every hour | Flow |
| Lateness handed on | 870 of 936 late starts followed the same bus finishing its last trip late (stricter count: 589 of 945, 62%, bus still out when next trip due). John got 604 of 998 on another definition | lane 1; lane 3 |
| **Forecast** | Evening peak 16:00 to 18:59, 2,043 trips never seen in training. Timetable misses by 8.25 min, best simple rule 7.42, model 6.97. **15% closer than the timetable, range 12% to 19%.** Lane 3's independent retest got 6.96 | lane 1; lane 3 |
| Stricter retests | next-hour only 8%; whole routes held out 10% (level with a simple rule); route-hours held out 24% (fills in an hour; not forecasting ahead) | lane 3 |
| Where it stops helping | after about 21:00 the timetable is as good; over the whole evening and night the gain nearly vanishes | lane 1 |
| Second model (Cobuild) | Ridge, first 60% of the day to train, last 40% (4,454 trips, 16:22 to end) to test. Test miss: Ridge 5.90, timetable 6.02, LightGBM 7.23. So 2% better than the timetable on that wider window | Dataiku's own record |
| Worklist | 244 bus hours of trip time the timetable does not hold, 16:00 to 18:59 (measured, not predicted); about 630 over the day (John: 569) | lane 1, John |
| Passenger ranking | route C01 at 18:00: 695 boardings in the hour, 85% of departures late | lane 1 |
| Timetable coverage | the timetable's time covers 29% of evening-peak trips against the 85 in 100 a planner aims for | lane 3 only; not recomputed |
| Build | Dataiku Flow: five zones, 18 steps (12 visual, 6 Python); nightly scenario rebuilds in 131 seconds | lane 1 |

**Never say:** the model beats a simple rule by a lot (6% only). "Ridge won with 5.90". Any money saved (we have no RTA costs). Anything about road traffic (we have none). That the model works on another day (tested on one). That passenger loads are reliable (a terminus fix is unconfirmed).

**Words:** "trip time" not "running time"; "the break between trips" not "layover"; "the delay is handed on" not "lateness is inherited"; "never saw" not "held-out" when speaking.

**What RTA already has (never present as new):** machine-learning route planning from nol data (2020; a 10-route trial cut wasted time 13.3%); the S'hail app showing live buses; Bus on Demand; nol Plus.

## 6. The data

All in Dataiku. Every column arrives as text. Taps 1,056,343 rows; running-time table 259,435 rows (every bus at every stop, scheduled and actual arrival and departure, door status); fleet 3,264 vehicles (standing capacity marked "not verified"); GTFS tables (the planned service for Sep to Dec 2026, not the day); 224 community boundaries. **The data does not hold:** people waiting at a stop, breakdowns or their causes, driver messages, weather, traffic.

## 7. What is built and where (state at 09:15)

| Thing | State |
|---|---|
| Dataiku project `INSIYAB` and web app "Insiyab" (id `kvDViy2`) | Eight tabs, all opened on the real day by script; includes "The day" (1), "Planner's worklist" (2), "Forecast" (6), "How it is built"; a Presenter notes panel (Say / Point at / Then click) |
| Repo | GitHub `Kazemkhani/insiyab` (private), branch `main`, head `0a82b79` |
| Public site | https://insiyab.amirkazemkhani.com ; pitch page `/pitch/`. `deploy.json` reports commit `fff8258`. Two later commits are pushed but **not live**: `23ee7b3` (new film source) and `0a82b79` (pitch page film label) |
| Pitch page | Sections: film, bus journey, the problem, the same crowd, the short hours, our answer, the worklist, "And on the day itself" (drill), forecast, fleet, how it is built, link into Dataiku |
| **Uncommitted on Amir's laptop right now** | the priced-options work (section 9): `live/voice/options.js`, `relay.js`, `console.html`, tests, and a new "three options" slide in `story/index.html`; plus an edit to `web/film/story.jsx` by another worker |
| Why deploys failed last night | The test gate on the engine (`model/forecast.py`) hung three times because the laptop was starved (swap 12.7 of 13.8 GB, under 1.3 GB disk). At 06:00 it had 28 GiB free and no swap use. The gate was never skipped |

## 8. The film

**The deployed film is bad** and Amir wants it replaced. The old film (`Insiyab-comic.mp4`, 7.98 MB, still served at `/pitch/film.mp4`) is the old passenger story with comic panels, a stand-in banner, and sound with a build about twice as loud as the rest (a quickening pulse, an out-of-tune drone, a low blow).

**Amir's brief:** a 60-second film; motion graphics (no comic images, nothing dramatic); an ElevenLabs voice; the problem in four plain sentences; the solution clear and shown visually; very good sound effects and animation; tension building and then release; sound engineered so nothing is extremely loud; plain spoken English with no headline-style filler.

**A new film now exists** on his laptop: `~/work/insiyab-run/film/story/Insiyab-film.mp4` (60.0 s, 1920x1080, H.264 plus AAC, about 2.7 MB), built this morning by a second Claude worker from a handoff pack, with source in `web/film/story.jsx`, `story/film-facts.json`, `render-story.sh`, `verify-story.py`. **It is not deployed and nobody has listened to it.** The file was rebuilt while this was written (its size changed), so treat the exact cut as in flux.

**The voice-over script it speaks (ElevenLabs, a calm British man; "Insiyab" is said in-SEE-yab):**

1. The timetable said seven twenty-three, and the bus left at seven thirty-six.
2. Every trip is given the same time all day, but at six in the evening route three-ten needs ninety-six minutes, not sixty-seven.
3. The break before the next trip is only sixteen minutes, so the bus starts that trip late.
4. The delay is handed on, trip after trip.
5. *(a proof beat with no voice: the same crowd at 08:00 and 18:00, 48,724 and 49,707 boardings; late 19% then 45%)*
6. Insiyab forecasts how long each trip will really take, thirty minutes before it leaves.
7. It turns that into a list for the timetable planner: each route, each hour, and the minutes to add.
8. In the evening rush it is fifteen per cent closer than the timetable, tested on trips it never saw.
9. The planner accepts a row, or sets it aside. Nothing changes by itself.
10. So the timetable can promise a time the bus will keep.
11. Insiyab.

Line 2 is the heaviest sentence; if it is hard to say aloud, split it.

**Sound targets (gates, not wishes):** -16 LUFS integrated, true peak no higher than -1.5 dBTP, momentary loudness never above -11 LUFS, the voice at least 12 dB above everything else while it speaks, a 300 ms dip (not a bang) at the 30-second turn from problem to answer. Tension comes from rhythm, pitch and density, never from level.

**Look:** paper `#F6F5F1`, ink `#12263A`, flow `#0E5A5A`, late `#B23A2E`, neutral blue `#2F6690`, simulated `#8A5A00`; Overpass, IBM Plex Sans/Mono, Noto Kufi Arabic for انسياب. No gradients, glow, blur, comic panels, faces, emojis, em-dashes, shake, flashes. Every number has a visible source; "illustration" on the 19:23 and 19:36; "one day, 15 December 2025" on forecast figures.

**A human must listen** (laptop speaker, phone speaker, headphones, at one fixed volume) before it is shown. Three questions: can you repeat the problem; did anything make you reach for the volume; does "Insiyab" sound right.

**Fallback if it is not ready:** the presenter plays the new MP4 from the laptop directly, or skips the film and opens with the 19:23 and 19:36 sentence aloud. The pitch script already supports opening without it.

## 9. The control-centre phone drill, and the three priced options (new this morning)

**What it is.** A relay (`live/voice/relay.js`) that runs one simulated bus incident as a drill, acted out on the team's own phones. It calls driver, depot controller, station supervisor and planning analyst at the same time, each asked one question for their role; then the duty manager (Amir) is called with the reports and the options and chooses one; then staff are called back with the decision and each confirms. It says it is an AI operations assistant, never claims to be RTA, never instructs anyone, and tells anyone reporting a real emergency to call 999.

**Three guards before any real call.** A numbers file (`~/.config/insiyab/voice-numbers.txt`, five roles) exists with consenting people; the environment variable `INSIYAB_CALLS=armed`; and the `--live` flag. Without all three it runs in rehearsal and places no call. The first real call is made only after Amir says "call me". The Marsad phone number is held until Amir and Mustafo agree.

**New (uncommitted, tested): each option is now priced against doing nothing, as Marsad's Decide panel does, with who approves it.** The drill incident: route 310, 18:00, 22 minutes late, next bus in 20 minutes, 640 boardings this hour. Passengers affected = 640 x 20 / 60 = 213. Waiting = passengers x extra minutes each, compared with doing nothing, assuming those passengers arrived for the planned time.

| Option | Effect on waiting | Who it helps / costs | Approver |
|---|---|---|---|
| A. Send the standby bus | **63.6% less** (213 passengers wait 8 min, not 22) | One standby bus and driver, one trip | Depot controller |
| B. Hold the next departure two minutes | **9.1% more** this hour | Helps passengers further along if two buses would have bunched (not priced: no stop-by-stop gaps); the 213 on the next bus wait 2 minutes longer | Station supervisor |
| C. Take no action | baseline, 4,686 passenger-minutes | Nobody helped, nothing added | Duty manager |

**Honesty notes.** Everything here is SIMULATED. The "8 minutes away" for the standby bus is **invented** for the drill, and the call says it is not confirmed. Option B comes out worse and the slide says so. We have **not** measured how many minutes this saves a real control centre; do not claim a time saving. The tool advises; a named person decides. Nothing is sent to RTA.

**How the call uses it.** The manager hears each option with its figure, its cost and who must approve it, and is told once that the figures are a simulation. After the choice, only the person who must approve it (for A, the depot controller) is told "this needs your approval, please confirm you will carry it out"; the others are only informed. **The ElevenLabs agents hold the old prompt until Amir re-runs the armed setup step**, so the spoken wording is not yet live. The pitch page has a new slide "Three options. Each one priced, each with a name on it", placed after the on-the-day section; it is written but not deployed.

**Tests.** The voice suite (`bash live/voice/tests/run.sh`) ended `Tests run: 8 Passed: 8 Failed: 0 ALL PASS`, including a test that the slide's figures equal the module's. The full repo gates (`bash scripts/gates.sh`) have not been run on these changes.

## 10. The ten-minute pitch (current plan)

0:00 film, no speaking (60 s). 1:00 the problem, with the pitch page and tab 1 "The day": the 19:23 and 19:36 sentence, then the same-crowd proof. 2:15 the cause, tab 2: route 310, 67 against 96, the 16-minute break, 870 of 936 (and the stricter 589 of 945). 3:45 the question and the answer, tab 2: press Accept on the first row; 244 bus hours. 5:00 the model, tab 6: timetable 8.25 against model 6.97, 15% closer between 16:00 and 19:00, range 12 to 19%; where it stops helping after 21:00. 6:30 how it is built: the Dataiku Flow, five zones, 18 steps. 7:45 why RTA can use it: timetable changes every one to two months; no new hardware. 8:30 what we do not claim: one day; a little better than a simple rule; it does not say why traffic is slow. 9:00 the extra: the phone drill if ready and rehearsed, with the priced options; otherwise one sentence. 9:40 close.

**Proposed softer close** (not yet made): "Dubai's buses hold up in the morning and fall behind in the evening. RTA cannot change the road this month. It can change the timetable. This tells the planner where to start." The current close says "and the timetable is why", which blames the timetable for a cause we cannot prove.

## 11. Hard questions, and the honest answers

- **"Why does the evening take longer? What is the root cause?"** We do not know. We have no road, traffic or weather data. We can show the trips take longer than the timetable allows, that it is not more passengers (same boardings at both peaks), and that the break cannot absorb it. Our data could split each trip's extra minutes into standing at stops (`Act_Dep` minus `Act_Arr`) and driving between stops, which would show road against boarding. **Nobody has run that split.** Do not say "traffic" or "congestion" as the cause.
- **"So you are telling RTA its timetable is wrong."** No. The timetable is a promise about time; one day cannot call it wrong, and planners already adjust it every one to two months. We give them a ranked list of where the promise is shortest. The road cannot be changed this month; the promise can.
- **"It is only one day."** Yes. The test holds out the whole evening; the flow retrains nightly as days are added.
- **"15 per cent is not much."** Against the timetable it is real and the range excludes zero. Against a simple rule it is 6%; stricter tests give 8 to 10%; we show all of that. The value is the list of minutes per route.
- **"RTA already does this."** RTA announced machine learning on nol data in 2020. We forecast trip time against the timetable and turn it into the timetable change.
- **"Who uses it and how often?"** The timetable planner, at each timetable change; each night adds a day of records.
- **"How do you know it is not the crowd?"** The two peaks carry the same boardings within about 2%, and lateness more than doubles.
- **"Is the phone drill real?"** It is a drill: calls go only to consenting team members' own phones, every figure is simulated, and no RTA system is contacted.

## 12. Rules that never bend

1. Never say "done" without the command and its real output, and say which rung was reached: written, committed, pushed, gates green, deployed, checked on the public address. An exit code is a claim, not evidence.
2. Stand-in data is labelled on every screen it appears on. Measured and simulated are never mixed.
3. Raw data and keys never enter git, a chat or a zip. Nothing about one card, device or driver is ever shown. Totals worked out from the data may be shown publicly (Amir's recorded yes on 17 November; the person who said it is not named).
4. British English, plain words, no em-dashes, no emojis. A number carries its unit, source and date. A number with no source is deleted.
5. Commits carry no co-author line or trailer; named files only; pull with rebase before every push; never force-push; only gates-green commits are deployed.
6. A real call is placed only with all three guards, and the first only after Amir says "call me".
7. The tool advises; a named person decides. We claim no money saved and nothing about roads.

## 13. Open items, in order

| # | Item | Owner | Blocking? |
|---|---|---|---|
| 1 | Ask an organiser exactly what is submitted before 10:00, and where | Amir | yes |
| 2 | Name the presenter and rehearse once against the ten-minute plan | Amir | yes |
| 3 | Listen to the new film; if it is good, deploy it, otherwise play it from the laptop or skip it | Amir | yes |
| 4 | Commit and deploy the options slide and the options code (gates about eleven minutes) | Claude Code session, on Amir's word | only if the slide must be public |
| 5 | Re-run the armed agent setup so calls speak the new options | Amir | only for the spoken drill |
| 6 | Decide whether the drill is shown, and whether the soft close is used | Amir | no |
| 7 | The Marsad number and two extra drill phones (Mustafo sends contacts; Amir types them into the numbers file) | Amir, Mustafo | no |
| 8 | Name who said yes on showing totals, and record it in `docs/team/MENTOR-ANSWERS.md` | Amir | no |
| 9 | Lane 3's GitHub Actions workflow ended `startup_failure`: only the repo owner can see why (https://github.com/Kazemkhani/insiyab/actions/runs/44016227060). Red mark only; blocks nothing | Amir | no |
| 10 | The standing-versus-driving split of the evening delay, if anyone has spare minutes in Dataiku | Cobuild or John | no |

## 14. What to ask this chat to do first

Ask Amir which of these he wants, then do it:
- **Rehearsal:** play the judges. Ask him the five hard questions in section 11 one at a time, mark each answer against the numbers in section 5, and tell him what he got wrong.
- **Script polish:** rewrite any spoken line to be shorter and plainer, checking each number against section 5.
- **A timed run-sheet:** a minute-by-minute card for the presenter's screen with exact words and what to click, built from section 10.
- **Fallbacks:** a plan for each thing that can fail in the room (the film, the Dataiku login, the phones, the projector).
- **Judge views:** score the product from the Dataiku judge's, RTA AI department's and business development centre's seats, strictly, on the 100-point sheet in section 3, with evidence.
