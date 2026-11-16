# The moments that make a judge sit up

Amir's instruction, 16 November: meeting every scoring line is not enough to stand out. Marsad won with moments nobody expected: the team's phones rang on stage when an emergency was declared, and a double tap on an aircraft raised a work order. Insiyab needs its own.

The rule from Marsad, which is why those moments worked and did not backfire: **one moment where the system does something real that nobody expects. It is risky only for the presenter, never for the audience, and the story never depends on it.** Each moment below is tied to the forecast, has a fallback, and says on the screen what is real and what is simulated.

They are in order of value. Build them in this order, after the walk-through they sit on is finished.

## 1. "Pick any stop. We will call it." (the model performs in front of the judge)

The judge chooses any stop on the map and any time in the afternoon. The screen shows what Insiyab forecast for that stop an hour before, and hides what happened. One tap: what happened drops in beside it, with the miss in passengers.

The judge chose it, so it cannot have been picked to flatter us. It works only on the hours the model never learned from, and the screen says so. If the forecast was poor at that stop, it shows that it was poor.

Lane 2. No extra service. This is part of "the forecast meeting reality" and is built with it.

## 2. The room closes the gap (the signature moment)

The sentence of the product, acted out by the judges.

1. The first slide and the first screen carry a QR code. Each judge scans it and their phone becomes one passenger at a full stop at 07:20 on the day. Nothing is asked of them: no name, no number.
2. The presenter shows the gap on the big screen and presses "Close the gaps".
3. In the same second, every phone in the room buzzes with the same offer: "Your 07:25 bus will be full. The 07:31 from the next stop has seats. Take it and earn 20 Khutwa points."
4. As judges tap "I'll take it", the count on the big screen climbs ("In this room: 6 of 9 took the offer") and the red stretch of route fades as each seat is freed.
5. The screen then says the honest thing: "A room of judges is not a morning commute. Trials elsewhere found 7 to 10 in 100. The planner sets the number."

The phones do the persuading. The judges were told nothing and did it themselves.

What it needs: a very small relay so the phones and the big screen share one state (who has joined, the phase, who accepted). Lane 1 owns it (`live/`, served from the same address under `/api/room/`). Lane 3's Khutwa page is the phone side. Lane 2 draws the count and the fading gap. The keys are in `docs/CONTRACT.md` under "The live room".

Fallback, always present: if the relay does not answer, the phone page shows the offer when the visitor taps "Show me the offer", and the presenter's screen has a control that plays the same sequence with the label "Played back, nobody is connected". The walk-through never waits on the relay.

## 3. The depot's phone rings (the planner's decision reaches a person)

When the presenter confirms the right-bus decision, a teammate's phone rings on the table. A voice reads the order: "Insiyab. Swap the double-deck bus onto route 8 from 06:30. Press 1 to confirm." They press 1, and the decision card on the big screen changes from "Proposed" to "Confirmed by the depot" with the time.

This is the rule "the tool advises, a person decides" made audible, and it is the move that won the room on Marsad, for judges who have not seen it.

What it needs: Twilio, with the account already on Amir's laptop, and the calling code from Marsad (`~/dev/TeamVisionary/marsad/live/voice-live.js` and its two tests). Lane 1. It uses the same relay as moment 2.

Limits that are not negotiable: it calls only numbers that Amir has typed in himself, on this laptop. It is closed to visitors: the route that starts a call needs the presenter's code, and a test proves a visitor gets a refusal. The first real call is made only after Amir says "call me". The card says "A real call to a team member's phone. No RTA system was contacted."

## 4. An order you can hold

Tap a decision card and choose "Print the order": one sheet, laid out like a depot instruction, with the buses, the trips, the times, the evidence and a QR code back to the card. Across it: SIMULATION. NOTHING WAS SENT. A team member hands it to a judge.

Marsad raised a work order on a double tap. Bayyina handed visitors a printed card, and it was what they kept. Lane 2. No extra service.

## 5. The four mornings, filmed in three dimensions

The four points of view are rendered in Blender as short clips, a few seconds each: the stop at dawn, the bus pulling in full, the larger bus pulling in with room. The page draws the day's real numbers over the clip. Rendered ahead, so nothing depends on the hall's graphics chip, and it looks like a film and not a game.

The same clips, with screen recordings of the live site, make an opening film of 30 to 45 seconds in Remotion, with a voice from ElevenLabs. It ends on the QR code and hands over to the live product. It never replaces it: on Marsad a three-minute film in place of the product cost fourteen points, and a film of under two minutes that handed over to the live product won.

Lane 2, after its first four cut lines. Blender runs from scripts with no window, so every clip can be rebuilt.

## 6. The stop on the table

A printed stop flag stands on the team's table with a QR code. Scanning it opens that stop's forecast: the next buses and how full each will be. On a phone that supports it, one more tap stands a small model of the stop on the table through the camera, with the waiting crowd at the forecast size.

Lane 3 makes the stop page (the Khutwa page opened for one stop). The camera view is the last thing to build and the first to cut.

## What we still do not build

A chatbot or a voice assistant that answers from a language model: nothing on the scoring sheet rewards it, the one account that could power it was refused by its provider, and an answer with a number the records do not hold would cost more trust than it earns.
