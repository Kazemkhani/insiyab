# The one-minute film: script, panels and sound

Amir asked on 17 November for a one-minute problem-and-solution film: told as a story, drawn like a comic, with motion graphics, the 3D scenes, a voice and sound effects. This is the script and the plan. Lane 2 owns the picture (`web/film/`, where the 38-second silent opening is already built with Remotion); lane 1 wrote this, and makes the sound once Amir has said which voice account to use.

## Three rules it keeps

1. **It opens the pitch and hands over to the live product. It never replaces it.** Marsad lost fourteen points the day a film stood in for the product. The last panel is the QR code and the address.
2. **The voice says no number.** Every number is drawn on the panel, read from the bundle when the film is built, exactly as the site does. So one recording serves the stand-in day tonight and RTA's real day on Tuesday, and no invented number is ever spoken as a result. While the bundle is stand-in data, every panel that shows a number carries STAND-IN DATA, NOT A RESULT.
3. **People have no faces, and nobody is a villain.** The driver, the planner and the timetable did nothing wrong. The story is that the day moved and the plan could not.

## The look: a comic, in the site's own hand

- A page of panels with paper gutters and ink frames. One panel is live at a time: it fills, holds, and the next slides or snaps in. Two or three panels can share the screen when two things happen at once (the full bus and the empty one).
- Flat colour in the site's tokens: paper, ink, flow for a bus with room, over for a passenger without a seat, spare for an empty seat, simulated for anything that has not happened. No gradients, no glow.
- Caption boxes in Overpass, top-left of a panel, as a comic narrates. Sound drawn as lettering where it helps: the hiss of the doors, the tap of a card.
- The 3D scenes are the art: the stop, the bus with its roof cut away, the cab, the planner's wall. The map of Dubai and the charts are motion graphics between them.
- 1920 by 1080, 30 frames a second, 60 seconds. A second cut at 1080 by 1920 for a phone only if time allows.

## The film, second by second

The voice is one calm person, British English, unhurried. About 115 words: at an easy pace that is 52 seconds, which leaves air.

| Time | Panel | What moves | Voice | Sound |
|---|---|---|---|---|
| 0:00 to 0:06 | One wide panel. Dawn. The site worker at his stop, seen from behind. The stop's real name on the flag. A caption box: the time, from the bundle. | The light comes up. He shifts his weight. | "He has been up since five. The bus is his way to work." | Quiet street. A bird. Distant traffic. |
| 0:06 to 0:13 | The bus pulls into the same panel. The roof lifts away: every seat taken, people standing, drawn in the over colour. The counts appear: passengers, seats. | The bus eases in and stops. A beat. The roof lifts. The standing figures are counted off one by one. | "It comes. And it is already full." | The bus approaching, air brakes, the doors. Lettered: the hiss. |
| 0:13 to 0:19 | The page splits in two panels. Left: his bus, full. Right: another route, the same minute, a larger bus with rows of empty seats in the spare colour. | The right panel slides in. Its empty seats light up in turn. | "Across the city, at the same minute, a bigger bus runs almost empty." | A soft whoosh as the panel arrives. The second bus's engine, far off. |
| 0:19 to 0:25 | The two panels shrink into two marks on the map of Dubai. The whole day's map: red where passengers were short of seats, blue where seats ran empty. | The camera pulls up from the street to the city. The day's marks appear across it. | "Nobody did anything wrong. The timetable was written before the day happened." | One low note. The street sounds fall away. |
| 0:25 to 0:31 | Title panel over the map: Insiyab, in Latin and Arabic. Buses moving through the day, the clock running. | The clock runs. Buses move along the real routes. | "Insiyab reads the day while it is still happening." | A clock tick that becomes the pulse of the film. |
| 0:31 to 0:38 | Two panels. The forecast line running ahead of the clock with its range. The lateness of one bus, stops ahead. | The forecast draws itself ahead of the moving clock. What happened fills in behind it. | "It sees how full each bus will be, and how late, up to two hours ahead." | A rising tone under the tick. |
| 0:38 to 0:46 | Three quick panels, one after another, each a decision card as a comic frame: the two buses swapping; a stop passed where nobody waits; the planner at the wall. Each carries the word simulated and its count from the bundle. | Each panel snaps in on the beat. In the first, the two buses change places. | "So a planner can put the bigger bus where the people are. And stop only where someone is waiting." | Three soft beats, one a panel. A page turning. |
| 0:46 to 0:53 | The office worker's phone, large. The offer: a bus with room, a few minutes earlier, and Khutwa points. Her thumb takes it. | The offer slides up. The points count. | "And a passenger can choose the bus with room, and be thanked for it." | A phone chime. A card tap. |
| 0:53 to 1:00 | Back to the first panel. The bigger bus pulls in. He steps on and sits. Then the last panel: the name, the address, the QR code, and the line under it. | He sits. Hold. Cut to the QR code. | "Same buses. Same drivers. A seat for the journey." (a beat) "Insiyab." | The doors. The engine pulling away. Then silence under the name. |

The line under the QR code, read from the bundle's flag: while the data is stand-in, "Shown on stand-in data. Scan to try it." When RTA's day has run and totals may be shown, "Built on RTA's own day. Scan to try it."

## The words alone, for the recording

> He has been up since five. The bus is his way to work.
>
> It comes. And it is already full.
>
> Across the city, at the same minute, a bigger bus runs almost empty.
>
> Nobody did anything wrong. The timetable was written before the day happened.
>
> Insiyab reads the day while it is still happening.
>
> It sees how full each bus will be, and how late, up to two hours ahead.
>
> So a planner can put the bigger bus where the people are. And stop only where someone is waiting.
>
> And a passenger can choose the bus with room, and be thanked for it.
>
> Same buses. Same drivers. A seat for the journey.
>
> Insiyab.

Direction for the voice: warm, plain, close to the microphone, as if telling one person. No announcer's lift, no excitement. A half-second of air after "already full" and after "before the day happened". The name at the end is said once, quietly.

## Sound

| Sound | Where | How it is made |
|---|---|---|
| The voice | throughout | ElevenLabs, one voice, one take a line, so a line can be redone alone |
| Street at dawn, the bus arriving, air brakes, doors, engine pulling away | 0:00 to 0:13, 0:53 to 0:58 | ElevenLabs sound effects, or a free recording with its licence written down |
| Panel whoosh, page turn, three beats | 0:13, 0:38 to 0:46 | made here with ffmpeg: no licence to track |
| Clock tick and the low note | 0:19 to 0:38 | made here with ffmpeg |
| Phone chime, card tap | 0:46 to 0:53 | made here with ffmpeg |

No music bed with a melody: a licensed track is a risk two days before a pitch, and the tick carries the pace. Every sound file is kept outside git with a note of how it was made or where it came from.

## What it needs from a person

- **Amir: the voice.** Which ElevenLabs account pays, where its key is on this laptop, and the ceiling. The whole script is about 620 characters, so a handful of takes is small; sound effects are a dozen short clips. Nothing is sent to ElevenLabs until this is answered. If the answer is no, the film ships with captions and the sounds made here, and it still works.
- **Amir: the voice itself.** A man or a woman, and the accent. The script is written to work in either.

## Who does what

| Part | Who |
|---|---|
| The panels, the motion, the 3D shots, the build (`web/film/`) | Lane 2 |
| This script; the sound files; a check that the film says nothing the bundle does not | Lane 1 |
| Where the film sits in the pitch | Lane 4 |
