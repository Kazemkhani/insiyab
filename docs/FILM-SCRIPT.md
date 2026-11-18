# The one-minute film: script, picture and sound

This describes the new film built for the RTA Future Move Hackathon pitch on Wednesday 18 November 2026. It replaces the earlier comic cut. Lane 2 owns the picture (`web/film/story.jsx`, Remotion). Lane 1 owns this document and the sound (`tools/make_film_sound.py`).

The script below is taken directly from `story/script.json` at `~/work/insiyab-run/film/story/script.json`. Do not change the words in this document: change `script.json`, rebuild, and copy the result here.

## Three rules it keeps

1. **It opens the pitch and hands over to the live product. It never replaces it.** The last frame is the wordmark, the address and a QR code. The presenter speaks again at 1:00.
2. **Every number comes from `story/film-facts.json`.** No number is typed into the film twice. `prepare-story.mjs` reads the file at build time. A number with no source in that file is refused.
3. **Nobody is a villain, and nothing is claimed that the records do not hold.** 19:23 and 19:36 are arithmetic on measured figures, and are labelled ILLUSTRATION wherever they appear. The word "one day" appears wherever a forecast figure appears. No money saved, no road traffic, no claim about another day.

## The script

Sixty seconds, 1920x1080, 30 fps. The voice leads; the picture cuts to `cues.json`. Times below are from `script.json` and are targets; the actual cues are in the generated `cues.json`.

| Scene | Start | End | Voice line |
|---|---|---|---|
| open | 0:00 | 0:01.5 | (none) |
| board | 0:01.5 | 0:06.5 | The timetable said seven twenty-three, and the bus left at seven thirty-six. |
| tripbar | 0:07 | 0:15.5 | Every trip is given the same time all day, but at six in the evening route three-ten needs ninety-six minutes, not sixty-seven. |
| break | 0:16 | 0:21.5 | The break before the next trip is only sixteen minutes, so the bus starts that trip late. |
| cascade | 0:22 | 0:25.5 | The delay is handed on, trip after trip. |
| proof | 0:26 | 0:30 | (none — the voice rests; the picture and sound carry the build) |
| release | 0:30 | 0:31 | (none — the dip, then the wordmark) |
| forecast | 0:31 | 0:36.5 | Insiyab forecasts how long each trip will really take, thirty minutes before it leaves. |
| worklist | 0:37 | 0:43 | It turns that into a list for the timetable planner: each route, each hour, and the minutes to add. |
| error | 0:43.5 | 0:50 | In the evening rush it is fifteen per cent closer than the timetable, tested on trips it never saw. |
| accept | 0:50.5 | 0:55 | The planner accepts a row, or sets it aside. Nothing changes by itself. |
| close | 0:55.5 | 0:57 | So the timetable can promise a time the bus will keep. |
| endcard | 0:57 | 1:00 | Insiyab. |

## What each scene shows

**open (0:00 to 0:01.5).** Paper, `#F6F5F1`. A single thin ink rule appears. Quiet. No caption.

**board (0:01.5 to 0:06.5).** A flat departure board, ink on paper: one row, **310 / 19:23**. A plain clock beside it runs from 19:23 to 19:36 at real pace. A red bar grows between the two times on a time axis; a mono counter reads 13 MIN. The word ILLUSTRATION sits beside the clock. Caption: "The timetable said 19:23, and the bus left at 19:36. ILLUSTRATION". Source line: "Route 310, typical evening trip. Illustration."

**tripbar (0:07 to 0:15.5).** The time axis rebuilds as a trip bar. A grey outlined bar grows to 67 min (label: TIMETABLE ALLOWS 67). A solid ink bar grows beneath it to 67, then carries on in red to 96 (label: IT TOOK 96). The red part is the focal point. Caption: "Route 310, 18:00. Timetable: 67 min. It took: 96 min. 15 Dec 2025. Measured." Source line: "Route 310, 18:00, 15 Dec 2025. Measured."

**break (0:16 to 0:21.5).** A 16 MIN grey break block appears after the grey planned bar. The red bar overruns it. The next trip block, waiting after the break, slides right by the overrun and stops. Caption: "The break before the next trip is only 16 minutes." Source line: "Planned break about 16 min at every hour. Measured."

**cascade (0:22 to 0:25.5).** The view widens to one bus's evening: five trip blocks in a row. Each one slides right a little further than the one before; the red offset accumulates beneath them. Each slide is 20 per cent quicker than the last. Caption: "The delay is handed on, trip after trip." No source line.

**proof (0:26 to 0:30).** Two columns: 08:00 and 18:00. Boarding bars of equal height in ink, with mono counters **48,724** and **49,707**. Beneath each, a late-departure share in red: **19%** and **45%**. Caption: "Same crowd. 48,724 boardings at 08:00. 49,707 at 18:00. Late (5 min+): 19% at 08:00, 45% at 18:00. 15 Dec 2025." Source line: "Boardings and late departures by hour, 15 Dec 2025. Late = 5 min or more. RTA data, worked out in Dataiku."

**release (0:30 to 0:31).** Everything leaves to empty paper in 400 ms. The 300 ms dip in the sound. Then the wordmark Insiyab and انسياب appears quietly at top left and stays. No caption.

**forecast (0:31 to 0:36.5).** A "now" marker on a time axis at 17:30. A forecast bar for the 18:00 trip draws in flow colour ahead of the clock, beside a ghost of the timetable's 67. Caption: "Insiyab forecasts how long each trip will really take, 30 minutes before it leaves." Source line: "Forecast made 30 minutes before departure."

**worklist (0:37 to 0:43).** The planner's worklist: Route | Hour | Planned | Needed | Add. Real rows from the bundle (first row: 310, 18:00). The Add column is in flow colour. A footer counter lands on **244 BUS HOURS**, 16:00 to 18:59. Caption: "A list for the planner: each route, each hour, the minutes to add. 244 bus hours in the evening peak. 15 Dec 2025. Measured." Source line: "Planner's worklist, 15 Dec 2025. Measured, not predicted."

**error (0:43.5 to 0:50).** Two horizontal error bars: TIMETABLE **8.25 MIN**, INSIYAB **6.97 MIN**. A bracket between them reads **15% CLOSER**. A small line below: RANGE **12% TO 19%**. Caption: "Timetable: 8.25 min. Insiyab: 6.97 min. 15% closer. Range 12% to 19%. 2,043 trips the model never saw. One day." Source line: "Evening peak 16:00 to 19:00. 2,043 trips the model never saw. One day."

**accept (0:50.5 to 0:55).** The first worklist row gets an ACCEPT control; a cursor-less state change turns the row from "Proposed" to "Accepted by planner". The words NOTHING CHANGES BY ITSELF sit below it, small. Caption: "The planner accepts a row, or sets it aside. Nothing changes by itself." No source line.

**close (0:55.5 to 0:57).** Back to the opening departure board. The planner's added minutes change the row to **310 / 19:36**. The clock reaches 19:36 as the bar closes to zero. The word ILLUSTRATION again. Caption: "So the timetable can promise a time the bus will keep. ILLUSTRATION". Source line: "Illustration. The planner decides."

**endcard (0:57 to 1:00).** The wordmark Insiyab, انسياب, the address insiyab.amirkazemkhani.com, a QR code to it. One line: "A student prototype for the RTA Future Move Hackathon. Built on RTA's real day, 15 December 2025." No source line.

## Numbers on screen and their sources

All from section 5 of `handoff/Insiyab-5-Final-Push/01-CONTEXT.md`. Each is in `story/film-facts.json` with its source. A number with no entry in that file is refused at build time.

| Fact | Value | Source |
|---|---|---|
| Departure board (illustration) | 19:23 and 19:36 | Arithmetic on 18:00 + 67 + 16 and 18:00 + 96; labelled ILLUSTRATION |
| Timetable allows | 67 min | Route 310, 18:00, Flow; lane 1 |
| It took | 96 min | Route 310, 18:00, Flow; lane 1 |
| Break between trips | 16 min | Flow; lane 1 |
| Boardings at 08:00 | 48,724 | `demand_by_hour`; lane 1 |
| Boardings at 18:00 | 49,707 | `demand_by_hour`; lane 1 |
| Late at 08:00 | 19% | `punctuality_by_hour`; lane 1 |
| Late at 18:00 | 45% | `punctuality_by_hour`; lane 1 |
| Bus hours in worklist | 244 | Evening peak 16:00 to 18:59; lane 1 |
| Timetable error | 8.25 min | Evening peak, 2,043 held-out trips; lane 1 |
| Model error | 6.97 min | Evening peak, 2,043 held-out trips; lane 1 |
| Gain | 15% (range 12% to 19%) | Evening peak, 2,043 held-out trips; lane 1 |
| Held-out trips | 2,043 | Evening peak; lane 1 |

## The sound plan

Made by `tools/make_film_sound.py`. All files land in `~/work/insiyab-run/film/audio/`, outside git.

| File | What it is |
|---|---|
| `soundtrack.wav` | the whole 60 seconds, mixed; lay it under the picture and nothing else is needed |
| `stem-voice.wav` | the spoken voice alone |
| `stem-effects.wav` | recorded effects alone |
| `stem-tones.wav` | all tonal elements alone |
| `stem-room.wav` | room tone alone |
| `cues.json` | start and end of every spoken line; time of every effect |
| `vo-01.mp3` to `vo-09.mp3` | the nine spoken lines, one per file; redo one by changing its words and re-running |

Voice: ElevenLabs "Frederick Surrey" (`j9jfwdrw7BRfcR43Qohk`), model `eleven_multilingual_v2`, stability 0.6, similarity 0.8, style 0.1.

**The shape.** Tension comes from rhythm, pitch and density. Never from level. Never dramatic.

| Section | What the sound does |
|---|---|
| Problem, 0:00 to 0:30 | A low room tone of an evening street, constant, at about -38 LUFS short-term (felt, not heard). A clock tick at 60 beats a minute rising to 84 beats a minute by 0:30 — the level of the tick does not change, only the spacing. A single sustained low note with a slow beating partner a quarter-tone away, at about -34 dBFS RMS, brightening by filter only. Between 0:21 and 0:30 a thin high tone rises in pitch only (one octave), its level constant and low. Mechanical accents: a quiet split-flap clack when a board number changes; a soft key click for counter ticks; a low mid settle thump when each red bar lands (short, soft, at most 6 dB above the bed). The voice is dry and close. Nothing else competes with it. |
| The dip, 30.0 s | Everything but the room tone drops by 18 dB for 300 ms. Not silence: a dip you can hear as a dip, not a hole. |
| Answer, 0:31 to 0:58 | The tick steadies at 60 beats a minute and stays. The low note resolves to an in-tune perfect fifth, very soft. The room tone lifts a little in quality (more air), not in level. One soft in-tune tone when the Accept state changes. A recorded bus pulling away, very low, under the last line, ending before "Insiyab". The voice has 20 to 40 ms pre-delay room, no more. |
| End, 0:58 to 1:00 | The tick stops. One soft note. Then 300 ms of room tone and out. |

Sourcing for effects: ElevenLabs sound generation or royalty-free files you can name and licence. Prompts for generation: "A city bus pulls up to a stop in the evening, brakes hiss softly, doors open, calm, close, no music"; "A quiet city street in the early evening, distant traffic, no voices, calm room tone, no music"; "A single mechanical split-flap departure board changing one row, soft clack, quiet station". Ask for 6 s, 10 s and 4 s. Reject anything with voices, music or sirens. Everything tonal is made in code (numpy): ticks, notes, risers, chimes.

## Loudness rules

These are gates, not targets. Every one must pass before the film is shown. Source: PROMPT 3 of `handoff/Insiyab-5-Final-Push/02-PROMPTS.md`.

| Measure | Rule |
|---|---|
| Integrated loudness (ITU-R BS.1770, whole film) | -16 LUFS, within 1 LU |
| True peak | no higher than -1.5 dBTP |
| Momentary loudness (400 ms) | never above -11 LUFS |
| Short-term loudness (3 s) range | at most 4 LU between the loudest and quietest voiced windows |
| Voice, short-term | -19 to -16 LUFS in every spoken window |
| Bed (effects and music) during speech | at least 12 dB below the voice in the same window |
| Problem section (0 to 30 s) mean against answer section (31 to 58 s) mean | at most 2 dB louder |
| The 300 ms dip at 30.0 s | at least 18 dB below the surrounding level; a dip you can hear, not a hole |
| Clipping | none; no sample at or above 0.98 |

Measure the finished soundtrack with:

```
ffmpeg -i soundtrack.wav -af ebur128=peak=true -f null -
ffmpeg -i soundtrack.wav -af astats=metadata=1:reset=48000,ametadata=print:key=lavfi.astats.Overall.RMS_level -f null -
```

Also print a per-second table: second, voice short-term LUFS, bed short-term LUFS, difference. Every row in a voiced window must show at least 12 dB.

## Checked and not checked

**Checked before this document was written:**

- The script lines and their timings are taken directly from `~/work/insiyab-run/film/story/script.json`.
- Every number on screen is in section 5 of `handoff/Insiyab-5-Final-Push/01-CONTEXT.md` with a named source.
- 19:23 and 19:36 are arithmetic on measured figures (18:00 + 67 + 16 = 19:23; 18:00 + 96 = 19:36) and are labelled ILLUSTRATION in both the `script.json` captions and the storyboard above.
- The "one day" note appears on every scene that shows a forecast or a measured number from 15 December 2025.

**Not checked — a person must do this before the film is shown:**

The listening check by a human has NOT been done. No measurement tells whether the voice says "Insiyab" in a way that sounds right, whether the effects sound like what was asked for, or whether the balance between voice and effects is comfortable at room volume. Before the film is shown, Amir must play it once on laptop speakers, once on a phone speaker, and once on headphones at one fixed volume, and answer three questions: Can you repeat the problem after one viewing? Did anything make you reach for the volume? Does "Insiyab" sound right?
