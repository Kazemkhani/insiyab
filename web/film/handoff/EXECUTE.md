# Copy-ready execution prompt

You are the film director, motion designer, audio engineer and release engineer for Insiyab, a student prototype at the RTA Future Move Hackathon. Read this entire package and the current repository instructions before changing anything. Deliver the requested artifacts, not a proposal. Work in the specified checkout; pull with rebase, inspect status and newest coordination notes, preserve other workers' changes, use named-file commits, run tests, push main and verify the served version. Never claim deployment from an upload exit code alone.

## The communication task

A non-technical judge must be able to answer four questions after one viewing: what is wrong, what evidence revealed it, what Insiyab does, and who makes the decision. The film must use complete spoken English. Avoid slogan fragments and unsupported claims of causation. Lead with the evening timetable problem, not rewards, passenger behaviour, a brand reveal or a big total without meaning.

Use these four sentences as the conceptual backbone:

“Dubai’s bus records show much more lateness in the evening. When one trip overruns its timetable and the break before the next trip, the delay carries forward. Insiyab tests a forecast of trip time and gives planners a measured list of routes and hours that need attention. In a separate drill, AI gathers staff reports and relays a human manager’s decision.”

Make a 70–80 second film and a shorter 45-second edit. Use the exact narration and shot intentions in FILM.md unless timing requires a documented edit. Prefer carefully composed 2D/2.5D motion graphics and a small number of consistent, hand-drawn-looking editorial comic scenes. Do not generate text, charts or numbers inside images. Render those deterministically in code or the motion tool. No official likeness, cloned real voice, Dataiku/RTA/nol logo, official uniforms or implied endorsement.

## Production sequence

1. Resolve the fact ledger. Every on-screen number must name its source, date and denominator. Keep the main Flow's 6.97/15% distinct from the independent retest's 6.96/16%. Never average them. Do not use the newer 6.95/7% until its exact committed analysis is available.
2. Make a timed animatic with narration subtitles and plain blocks. Listen to the whole script aloud. If the mechanism of a late return delaying the next trip is unclear, fix the animatic before polishing.
3. Use one licensed ElevenLabs voice with a clear, warm, conversational delivery. Get pronunciation of “Insiyab” reviewed; use an approved pronunciation dictionary or a phonetic alias only in TTS input. Do not read stage directions or source notes aloud.
4. Generate each sentence or short paragraph separately. Keep original voice stems. Select the best take for clarity, not theatrical intensity. Avoid music until speech pacing works.
5. Build the visuals in reusable source. Use timing from actual voice clips, not guessed word durations. A measured fact is presented as a measurement; a future effect or fictional scene stays labelled.
6. Mix voice, music and effects as separate stems. Use the loudness and peak limits in FILM.md. Loudness-normalise the finished mix in two passes and verify the result. Do not simply raise every clip to maximum volume.
7. Run all acceptance checks. Open the film, examine chapter boundaries, listen on laptop speakers and headphones, and ask a person unfamiliar with the project to explain it back. An AI review is not a substitute for that listening check.
8. Produce the handoff artifacts and verify the final file hashes. Only replace the deployed film after passing the checks. Keep the previous file as a rollback outside git.

## Deliverables

- `Insiyab-evening-master.mp4`: 1920×1080, constant 30 fps, H.264, yuv420p, AAC 48 kHz, fast-start, 70–80 seconds.
- `Insiyab-evening-45s.mp4`: concise edit preserving the problem, mechanism, solution and limitation.
- `Insiyab-evening.srt`, `narration.txt`, `shot-list.csv`, `claims.csv`.
- Editable project/source, licensed/generated asset inventory and per-asset provenance.
- Separate WAV stems: narration, music, effects; final stereo mix.
- `QA.md`: commands and real output for duration, resolution, loudness, peaks, black/silent gaps, exact source checks, three persona reviews, human listening status and public parity.
- A poster frame and stills for the opening, delay mechanism, forecast comparison, worklist and drill.

## Scoring discipline

The five criteria are each worth 20 points: Practical Application; Documentation and Presentation; Innovativeness and Creativity; AI Model; Forecast Accuracy. Sixty points concern the model and its evidence. Do not let a spectacular phone call displace the forecast test and comparison methods. The film is a concise introduction, not the complete accuracy presentation. The live pitch must still show MAE/RMSE/MAPE, train/test separation, the stronger simple-rule comparison, strict-next-hour limitations, one-day scope, and a concrete planner decision.

## Non-negotiable boundaries

No raw RTA rows leave Dataiku. No individual card/device/driver is exposed. No waiting-person count is derived from boardings. No money-saving claim. Seats only; standing is unverified. No unverified spare capacity or automatic dispatch. Rewards and partner surveys are an optional final idea, never the opening or solution's proof. Use one canonical public address. All real phone calls are explicitly labelled drills and target the authorised private roster only.
