# The one-minute film: script, panels and sound

Amir asked on 17 November for a one-minute problem-and-solution film: told as a story, drawn like a comic, with motion graphics, the 3D scenes, a voice and sound effects. He then set its shape: the problem fast, packed and tense; then our answer arrives and the tension goes out of it, as if the stress were lifted off the viewer. This is the script, the timings and the sound. Lane 2 owns the picture (`web/film/`, Remotion). Lane 1 wrote this and made the sound.

The words and their timings below are a copy. The source is `LINES` in `tools/make_film_sound.py`: change a word there, rebuild, and copy it here.

## Three rules it keeps

1. **It opens the pitch and hands over to the live product. It never replaces it.** Marsad lost fourteen points the day a film stood in for the product. The last panel is the QR code and the address.
2. **The voice says no number.** Every number is drawn on the panel, read from the bundle when the film is built, exactly as the site does. So one recording serves the stand-in day tonight and RTA's real day on Tuesday, and no invented number is ever spoken as a result. While the bundle is stand-in data, every panel that shows a number carries STAND-IN DATA, NOT A RESULT.
3. **Nobody is a villain, and nothing is claimed that the records do not hold.** The driver, the planner and the timetable did nothing wrong. Lane 2 caught three overclaims in the first draft, all removed: the full bus and the empty one are not at the same minute (the pairs start within half an hour, so the voice says "in that same half hour"); the forecast is of boardings up to two hours ahead and of lateness by stops ahead, not of fullness two hours ahead; and a door that stayed shut does not prove nobody was waiting, so request stops are left out of the voice and stay on the site as a marked assumption.

## The shape: tension, a cut, and release

| | 0:00 to 0:29, the problem | 0:29, the cut | 0:29 to 1:00, the answer |
|---|---|---|---|
| Picture | Panels arrive faster and faster. Close crops. The over colour spreads. Two and three panels on screen at once by 0:22. | Every panel but one drops away. Paper. | One panel at a time, wide, held. The flow colour. Room around everything. |
| Sound | A pulse that quickens from 56 beats a minute to 150. A drone a semitone out of tune with itself. A clock ticking faster. A rising noise. A crowded bus, then traffic. | One short low blow, then true silence for a third of a second. | A chord in tune. One soft tick a second. The voice with air around it. |
| Voice | The same calm man throughout. He does not hurry when the picture does: that is what makes the first half tense, and it is why the second half feels like relief and not like a second film. | | |

## The film, second by second

| Time | Panel | What moves | Voice |
|---|---|---|---|
| 0:00 | One wide panel. Before dawn. The site worker from behind, at his real stop; its name on the flag. | Almost nothing. The light comes up a little. | "Five in the morning. He is already awake." |
| 0:04 | The same panel, closer. | He looks down the road. | "The bus is his way to work." |
| 0:08 | The bus pulls in. The roof lifts: every seat taken, and the passengers with no seat in the over colour, counted off. | The bus brakes. The roof lifts. The count ticks up. | "It comes. And it is full." |
| 0:13 | A close crop inside the bus: standing figures, a hand on a rail. | A hard cut in. | "No seat." |
| 0:15 | The page splits. Left: his bus. Right: another route, a bigger bus, rows of empty seats in the spare colour. | The right panel slams in. | "Across the city, in that same half hour, a bigger bus runs almost empty." |
| 0:22 | Three, then five panels: more full buses, more empty ones, the clock. The map of Dubai under them, red spreading and blue spreading. | Panels arrive on the pulse, each faster than the last. The camera pulls up from the street to the city. | "Too many people here. Too few there. And nobody can see it." |
| 0:29 | The cut. Everything drops away to paper. One line of text. | Stillness. | "Nobody did anything wrong. The timetable was written before the day happened." |
| 0:35 | The name, in Latin and Arabic, over the map. Buses moving, the clock running at an even pace. | The map breathes. Slow. | "Insiyab reads the day while it is still happening." |
| 0:39 | Two calm panels: the forecast line running ahead of the clock with its range; one bus's lateness, stops ahead. | The forecast draws itself ahead; what happened fills in behind. | "It sees how many will be waiting, up to two hours ahead. And how late each bus is running, stops before it arrives." |
| 0:46 | The two buses from 0:15 change places. The word simulated, and the count from the bundle. | One slow, clean move. | "So a planner can put the bigger bus where the people are." |
| 0:50 | The office worker's phone, large. A bus with room, a few minutes away. Khutwa points. | The offer slides up. A thumb takes it. | "And a passenger can choose the bus with room, and be thanked for it." |
| 0:54 | Back to the first panel, in daylight. The bigger bus pulls in. He steps on and sits. | He sits. Hold. | "Same buses. Same drivers. A seat for the journey." |
| 0:58 | The name, the address, the QR code. Under it, from the bundle's flag: "Shown on stand-in data. Scan to try it." or, when RTA's day has run and may be shown, "Built on RTA's own day. Scan to try it." | Hold to the end. | "Insiyab." |

## The sound, as built

Made by `tools/make_film_sound.py`. Everything is in `~/work/insiyab-run/film/audio/`, outside git.

| File | What it is |
|---|---|
| `soundtrack.wav` | the whole 60 seconds, mixed: lay it under the picture and nothing else is needed |
| `stem-voice.wav`, `stem-effects.wav` | the same, apart, if the picture needs the voice or the effects alone |
| `cues.json` | the start and end of every line and the time of every effect, for cutting the picture to the sound |
| `vo-01.mp3` to `vo-13.mp3` | the lines, one a file, so one can be redone alone |
| `fx-*.mp3` | five recorded effects: the street at dawn, the bus arriving, the crowded bus, the city at rush hour, the bus leaving |
| the `.wav` effects | made on this laptop from tones and noise: no licence involved |

How it was made, and what it cost: the voice is ElevenLabs' "Frederick Surrey", a calm British man, 656 characters; the five recorded effects are ElevenLabs sound generation, 38 seconds in all; both on the account Amir named (the one kept for the Marsad film), on 17 November 2026. The pulse, the drone, the clock, the rise, the cut, the chord and the steady tick are made by the tool itself.

Measured on the mix, not judged by ear: every line ends before the next begins; the build (0:20 to 0:29) is about twice as loud as the dawn and as the answer; the quarter of a second before the voice returns after the cut is silent; nothing clips.

**Not checked, because it needs ears:** how the voice says "Insiyab" (it appears twice: lines 8 and 13); whether the recorded effects sound like what was asked for; whether the balance between voice and effects is right. A person must listen before this is shown. To redo one line, change its words in `LINES`, delete its file, and run `voice` then `mix`.

## Who does what

| Part | Who |
|---|---|
| The panels, the motion, the 3D shots, the build (`web/film/`) | Lane 2 |
| This script; the sound; a check that the film says nothing the bundle does not | Lane 1 |
| Listening to it; where it sits in the pitch | A person, and lane 4 |
