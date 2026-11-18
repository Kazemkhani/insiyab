# Film: “Give the evening enough time”

## Visual direction

A restrained editorial transport story: paper background, dark ink, teal for the proposed planning tool, red for late time. Preserve the repository identity tokens and local fonts. Clean line drawings, readable clocks, one bus followed through two trips. Use depth only to explain the sequence, not to create a floating dashboard. A passenger and driver are fictional illustrations, not measured individuals. Source labels remain legible on a projector. Keep safe margins of at least 96 px horizontally and 72 px vertically at 1080p. Use six type sizes: 72, 52, 36, 28, 22 and 18 px; footnotes never carry the only qualification.

The emotional arc is recognition, tension, explanation, agency, and a calm invitation to inspect the evidence. The bus becomes late because the illustrated trip exceeds the available time. Do not imply a careless driver or blame a passenger. The release comes when the planner can see which route and hour need review, not when a fictional AI “fixes Dubai”.

## Narration and shot direction

Time ranges are an animatic target. Conform them to the recorded speech.

| Time | Spoken narration | Picture and motion | Sound |
|---|---|---|---|
| 0–9 s | “Dubai’s bus records tell us something important. At seven in the morning, sixteen per cent of stop departures were late. At seven in the evening, it was forty-seven per cent.” | Two equal, plainly labelled samples of 100 stop departures; late marks become red. Label: 5+ minutes late; 15 December 2025. One comparison only. | Soft bus interior ambience. Two quiet ticks. No impact hit on every number. |
| 9–20 s | “Here is how delay can carry forward. A trip has sixty-seven minutes in the timetable. It takes ninety-six. The sixteen-minute break before the next trip cannot absorb the difference.” | Illustrated route 310 sequence. A single time strip: 67 planned; 96 actual median, rounded; 16 illustrative break. Bus passes planned arrival, uses up the break, crosses the next departure line. Keep “Illustration using measured trip-time figures” visible. | A gentle ticking rhythm grows slightly closer; low tension bed rises under the pause, not over speech. |
| 20–27 s | “The bus starts its next trip late before that journey has even begun.” | Freeze the next departure marker while the bus is still on the earlier trip. The 13-minute illustrative spillover is shown as a bracket, not an alarm. Cut to a fictional passenger reading the departure time. | Tick stops for half a second. Quiet breath of room tone; no dramatic boom. |
| 27–39 s | “Insiyab helps the planner find where the timetable needs attention. On this day, the evening planning shortfall added up to two hundred and forty-four bus-hours across many trips.” | Time strips from several route-hour rows accumulate into a clearly labelled total. Then collapse into a real worklist row: route, hour, planned time, measured percentile, minutes to review. Label measured, not predicted or saved. | Music opens into a steadier rhythm. A single soft transition sound. |
| 39–52 s | “We also tested a forecast of trip time. During the evening peak, its average error was about seven minutes, compared with eight point two five for the timetable. We show the simpler methods and the limits too.” | Four directly labelled bars: 8.25 timetable, 7.42 simple rule, 7.31 independent linear retest, 6.97 Flow trees. On-screen window 16:00–19:00, same day, 2,043 trips. Add source distinction below the linear bar. End with “One day. Not proof about tomorrow.” | Voice remains forward. No cheering sound when the model wins. |
| 52–66 s | “For a separate control-room drill, the AI collects four staff reports, briefs the duty manager, and relays the decision he chooses. Missing answers remain visible. The manager stays in control.” | Four role labels, not real contacts: driver, depot, station, planner. Lines connect reports to manager; only after his recorded choice do callbacks appear. Persistent “DRILL · SIMULATED INCIDENT”. One missing report briefly remains open to demonstrate honest state. | A restrained phone cue only once; quiet acknowledgement tones. No real dialling in a rendered film. |
| 66–76 s | “One day of evidence. A clearer planning decision. Let us show you exactly how we built and tested it.” | Worklist beside simple Dataiku pipeline words, then a button-shaped invitation to inspect the live app. Student prototype label. Hold final frame for two seconds. Rewards are not required in this short film; if included, only after this as an optional next phase. | Resolve gently. Music fades; final speech fully audible. |

## Image-generation prompts for consistent comic scenes

Use only if image generation improves the final film. Generate text-free backgrounds or characters; overlay all text in code.

**Scene A, passenger:** “Editorial transport illustration, wide 16:9 composition, fictional adult passenger at a contemporary Dubai bus stop in early evening, respectful ordinary clothing, no recognisable real person, calm concerned expression, simplified precise linework, flat paper texture, restrained warm neutral background, dark ink outlines, teal bus accent, spare space on the left for separately typeset explanation, no text, no logos, no charts, no official insignia, no dramatic disaster.”

**Scene B, same bus:** “The same fictional teal-and-paper city bus in a clean side profile, clear wheels and windows, neutral off-white background, restrained editorial comic linework, no labels or text, no passenger count, no logos, suitable for deterministic movement along a horizontal time strip. Preserve vehicle shape and palette from Scene A.”

**Scene C, planner:** “Fictional transport planner at a modest workstation, three-quarter view, one hand resting near a plain keyboard, focused and capable, restrained editorial comic linework matching the supplied bus illustration, paper and dark ink with teal accents, screen blank for compositing actual worklist capture, no text, no logos, no sci-fi holograms, no glowing networks, no official likeness.”

Do not use an image model to render the statistical comparison or timetable arithmetic. Those visuals must be reproducible and numerically inspectable.

## Voice direction

Clear conversational English, approximately 145–155 words per minute with short pauses between ideas. Warm and assured, not a trailer announcer. Say “bus-hours across many trips” as one concept. Read percentages naturally. Do not read “MAE”, tool names, route JSON, citations or brackets. Use a licensed stock voice, not an imitation of a real person. Keep pronunciation consistent across clips.

## Audio engineering

Deliver a final integrated loudness target of −16 LUFS, tolerance ±1 LU, and true peak no higher than −1 dBTP. Keep narration comfortably above the bed; start with music 18–24 dB below speech and adjust by listening. Duck music around speech rather than compressing the voice into a flat wall. Effects must not mask consonants or exceed narration peaks. No sudden gain jump between clips. Use 80–200 ms fades on edits; crossfade ambience. Leave no accidental digital silence between sentences; intentional pauses should retain quiet room tone.

Measure the entire final mux, not just the narration stem. Use ffmpeg loudnorm in a measured two-pass workflow, inspect its output, then run an independent ebur128/true-peak readout. Listen to the final MP4 on laptop speakers at normal volume and headphones. Also listen with the picture hidden: a person should still understand the problem and solution. Then watch muted: captions and diagrams should preserve the central message.

## Rejection conditions

Reject a render with clipped words, clipped peaks, one loud effect, unstable generated text, a numerical claim without its definition, flickering lines, unreadable source labels, footage implying real dispatch, mixed measured/simulated labels, or a story that requires a presenter to explain what the film meant. Revise the relevant shot, not the entire film without cause.
