# Claude production prompt: Insiyab, the moment before

Copy the prompt below into the Claude session that owns the film. This is a production brief, not a claim that a new film has been rendered. Researched 19 November 2026.

## Prompt

You are the director, editor, motion designer and sound designer for Team Visionary's Insiyab opening film. Execute the work and deliver a playable film. Do not stop at a script, treatment, storyboard, contact sheet or render command.

The current film communicates information but does not create enough emotional connection or suspense. Rebuild its opening as a 40-second cinematic sequence: a human waiting, the hidden chain of delay, rising pressure, a moment of recognition, then the possibility of acting earlier. The audience is senior RTA leadership and technical judges at the RTA Future Move final during Dubai Future Week. Respect their intelligence, their operational expertise and the people who use the buses. Aim for public-service dignity, anticipation and earned confidence. The question the viewer should feel is: “Could the control room see this before someone waits?”

### 1. Inspect the actual work first

Read the machine's COUNCIL.md and the film workspace instructions. In the Insiyab repo read docs/REQUIREMENTS.md, docs/v2/PITCH.md, docs/RULES.md, brand/guidelines/motion-spec.md, brand/assets/tokens.css and story/film-facts.json. Check current source rather than assuming the strategy's claims are correct.

Inspect the currently served /pitch/film.mp4 and identify its hash, duration, source project and exact local master. The 19 November audit found the public player at 136.621 seconds and the deploy default pointing to ~/work/insiyab-run/film/Insiyab-pitch-film-v3.mp4. A local v4 also exists. Inspect both before deciding what to reuse; do not overwrite either. Sampled v3 opening frames show mostly charts, bars, captions and a worklist. Watch the entire source at normal speed with sound if your environment supports it. If it does not, report that limit and use frame sampling, waveform and source-timeline evidence; do not claim you listened.

Inventory the existing footage, source timelines, licenses, narration, audio stems and actual available tools. Prefer the authoritative existing film project; make a new version there. Use Remotion/After Effects/DaVinci/FFmpeg or the existing renderer as supported. Use real source footage or generated moving footage when authorized, and actual motion design. A still image with a slow zoom is not enough to satisfy this brief. Do not initialize a second unrelated app or modify the deployer's workspace. Claude's deployment session owns deployment.

### 2. Lock truth before emotion

- story/film-facts.json explicitly says 19:23 to 19:36 is an arithmetic illustration, NOT a measured departure pair. Label that vignette “Illustrated journey”; never invent a passenger testimony.
- docs/MODEL-CARD.md currently labels its 43–46% lateness gains and coverage figures “STAND-IN DATA, NOT A RESULT.” Do not use them as RTA results. The strategy/facts sheet conflict with that source. Use a real replacement only after checking its provenance.
- Do not imply actual traffic feeds, operational dispatch, autonomous decisions, a DSS integration, deployed passenger benefits or measured time saved. Any depicted console action is a labelled prototype simulation.
- Do not turn one December service day into a claim about every evening, or portray the July heat scenario as that measured day.
- This opening does not need a stack of statistics. The technical presenter owns the accuracy evidence. Keep one human question and one product idea.

### 3. Build this 40-second editorial structure

Treat these times as the first cut's exact frame budget, not vague mood notes. Use 30 fps: 1,200 frames. Refine individual shot lengths within the blocks after seeing and hearing the edit.

| Time | Picture and motion | Sound and purpose |
|---|---|---|
| 0–3 s | Cold open inside a human moment: close view of a hand checking the bus time, then a face looking toward the road. Real motion and a clear eyeline. No logo introduction. | Begin a natural bus/road sound fractionally before the first image. Close, detailed ambience creates presence immediately. |
| 3–9 s | Establish the waiting person and the approaching-departure expectation. Use a wider Dubai stop view, then a specific detail. If using 19:23, label the journey as illustrated. Let one shot breathe. | A subtle repeated mechanical pulse emerges from the environment. First narration is intimate and restrained. No generic trailer boom. |
| 9–17 s | Cross-cut the waiting person with the preceding bus trip. A thin timetable line becomes a route line; the previous trip consumes the break. Use purposeful masking and motion to make cause and consequence visible in one glance. | Carry sound across cuts. Increase density and shorten some shots from roughly 3 seconds toward 1–1.5 seconds. Each sound has a visible or narrative cause. |
| 17–23 s | The delayed chain propagates: previous trip, next departure, people waiting. Brief split-screen or linked timeline shows the relationship. Reach the tension peak without panic or spectacle. | Bring the pulse forward, add a restrained rising texture and cut on selected transients. Keep speech intelligible. Do not use sirens, distress cries or aggressive strobing. |
| 23–25 s | Hold the human reaction or empty arrival space. Ask the central question. This is the intentional contrast beat. | Drop the score for about 0.4–0.7 seconds while retaining a trace of room/road tone. Silence is an editorial cue, not a playback error. |
| 25–33 s | Reveal the early-warning concept. A route trace resolves into the actual prototype console, tightly cropped to the risk and options. Label the simulation. The motion becomes organized and easier to follow. Show a human selecting an option; no self-deciding AI. | The uncertain pulse becomes a clear rhythmic phrase. One clean arrival cue. Narrator becomes assured without becoming triumphant. |
| 33–37 s | Return to the person and the control-room idea. Suggest the opportunity to act earlier without depicting a fabricated verified operational outcome. Resolve the visual line motif. | A short harmonic release, with fewer layers and space around the final sentence. |
| 37–40 s | Insiyab lockup. “Insiyab sees it coming. The controller decides.” Hold long enough to read. End on the deck's opening colour/composition so the speaker can enter naturally. | A restrained sonic signature and complete tail. No abrupt truncation; no narration continuing into the live speaker. |

Starter narration, to improve after timing (about 55 words, not mandatory copy):

“She planned her evening around a bus. But the delay started on the trip before. By the time the next departure is missed, someone is already waiting. What if the control room could see the risk earlier? Insiyab flags the risk. Prepares the options. The controller decides.”

Do not dramatize a missed medical appointment, an abandoned child, a quote or a real passenger story without evidence and authorization. Emotion comes from time, uncertainty and recognition.

### 4. Direct motion precisely

Create a shot/cue table with in/out frame, asset, focal point, camera/subject movement, transition, text, sound cue and source label. Every shot must change the viewer's understanding or feeling.

Use actual subject motion, directional match cuts, a timetable-to-route morph, a brief chain-of-delay diagram, and a purposeful console reveal. Use easing and motion blur selectively. Respect the brand's ink/ivory palette; red indicates risk, gold belongs to the brand/Suggested rule, teal only an actual acknowledgement in a labelled demo. No neon HUD, glitch wallpaper, gratuitous camera shake, spinning logos or template transitions between every shot.

Aim for roughly 12–16 purposeful shots over 40 seconds, with deliberate variation. Treat that count as an editorial starting point, not a scientific rule. Avoid more than three seconds of visually unchanged footage except the intentional tension hold and final lockup. Keep explanatory graphics brief and readable. At 1080p, start principal text around 60–90 px and source labels around 28–32 px; check the actual back-of-room result rather than trusting font size alone.

### 5. Produce a real sound design, using ElevenLabs where available

Read the current official references below. Check supported models, SDK/API fields, account access and existing approved budget before generating. Do not invent an ElevenLabs connection because another session has one. Use approved credentials without printing them. Existing credits are not authorization for unlimited retries. If no generation budget is authorized, finish the timing-locked animatic with licensed/existing sound, provide exact prompts and a bounded generation estimate, and ask only for the missing spending approval. Do not purchase a plan or silently switch paid services.

Deliver separate tracks for narration, ambience, Foley, transition effects and music. Keep every used generation and its prompt/ID in an asset manifest.

- **Narration:** one consistent voice. Audition a restrained, human read of the opening and a confident read of the reveal. Give performance directions per phrase; do not shout or apply an emotion tag to every word. Verify “Insiyab,” route numbers and times. Current ElevenLabs v3/v4 guidance uses audio tags and punctuation; do not assume SSML break tags work in those models. Edit pauses and breaths on the timeline. Do not force arbitrary frame accuracy through TTS prompting.
- **Ambience prompt:** “Dubai city bus stop at dusk, close natural road ambience, distant bus engine, light footsteps, airy outdoor space, restrained documentary realism, no speech, no horns, no music.” Ground the geographic label in the image; generated sound is an illustration, not a location recording.
- **Foley prompt:** “Single city bus pneumatic door release, short clean air hiss and muted mechanical latch, close perspective, dry recording, isolated one-shot, no voices, no music, no background traffic.”
- **Tension texture prompt:** “Restrained mechanical pulse with a low textured drone, gradually increasing density, precise and intimate, anticipation without horror, no melody, no vocals, no impact at the end.”
- **Reveal cue prompt:** “One clean soft mechanical click followed by a short warm tonal release, controlled, understated, no explosive bass, no vocals, no long reverb.”
- **Music direction:** 40-second instrumental score; sparse opening, rising rhythmic tension, a deliberate gap before the reveal, then a restrained hopeful resolution. Modern acoustic/electronic textures, midrange detail that survives room speakers, no vocals, no generic corporate uplift, no constant maximum intensity. Use a supported composition plan for distinct sections if available. Confirm the rendered durations and align them in the edit; generative structure is not a guarantee of frame-exact hit points. Construct the silence and exact cue positions in the timeline.

Generate short isolated effects separately and assemble them yourself. Do not ask one SFX generation to deliver the whole perfectly synchronized film. No sound on every cut: retain contrast. Use at least two motivated audio-leading or audio-trailing cuts. Duck music under narration; keep critical words intelligible on laptop speakers and in mono. Target roughly -16 LUFS integrated and a true peak ceiling of -1.5 dBTP as delivery starting points, not as a claimed venue standard. Meter the exported file and audition; retain controlled dynamic contrast.

### 6. Iterate on the actual rendered film

First render a low-resolution full-length animatic with the real timing and temporary sound. Watch at normal speed. Identify the three weakest moments by timestamp, fix them, then render the final. Do not compensate for a weak story by adding louder music.

Acceptance checks:
1. A viewer sees a human stake and an unanswered question within the first three seconds.
2. The first ten seconds work without narration; the sequence is more than moving slides.
3. Tension rises visibly and audibly, followed by a meaningful contrast beat and a clear reveal.
4. Every graphic, cut and major sound has a purpose. Key synchronized hits land within about two frames where intended; audio-leading cuts are intentionally offset.
5. Every spoken word is clear at ordinary listening volume. No clipped peaks, click artifacts, unintended silence or truncated tails.
6. Correct spelling and sources; illustrations, scenarios and prototype actions are labelled. No unsupported accuracy headline.
7. Exactly 40 seconds to within one frame, 1920×1080, progressive constant 30 fps, stereo 48 kHz. Validate actual output with ffprobe and decode the whole file, not just a contact sheet.
8. Test the final MP4 in the browser and offline. Confirm playback advances, seeking works, audio is present and the correct asset is loaded. Playwright can test the player; it cannot certify emotional impact or that someone listened.
9. Review through three explicitly simulated lenses: a passenger, an RTA executive, and a technical judge. Record timestamped objections and fixes. Do not invent feedback from real people.
10. Screen the sound-on final on the intended laptop/speakers if available. If venue or listening verification is unavailable, say so.

Deliver the 40-second MP4, editable authoritative source, separate audio stems, captions, cue sheet, asset/license/source manifest, measured media/audio checks, SHA256, and a short before/after account with timestamps. Preserve old masters. Hand the approved output path to the deployment owner; do not deploy, dial any number, call a relay API or change another session's files. Keep working until the deliverables exist or a specific unavoidable blocker is documented.

## Research behind this brief

These references support the production mechanisms, not a guarantee that a particular edit will evoke an emotion. The shot count, timecodes, mix targets and dramatic arc above are editorial recommendations for this project.

- [Adobe: J cuts and L cuts](https://www.adobe.com/uk/creativecloud/video/discover/j-cut-and-l-cut.html): explains audio preceding or trailing a picture cut, including their use for suspense and continuity.
- [ElevenLabs: sound effects guide](https://elevenlabs.io/docs/eleven-creative/playground/sound-effects): recommends generating individual effects and combining them in an editor for complex sequences.
- [ElevenLabs: music composition plans](https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans): supports structured sections with styles and durations; model-specific schemas must match the selected model.
- [ElevenLabs: speech best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices): voice selection, delivery and model-specific pause/tag behaviour; v3/v4 do not support SSML break tags.
- [Remotion: Sequence](https://www.remotion.dev/docs/sequence) and [Audio](https://www.remotion.dev/docs/media/audio): place visuals/audio on a deterministic frame timeline. Use the APIs supported by the installed version.
