# Insiyab executive slide master

The PowerPoint file and template provide seven examples built on seven named layouts and two light masters. Text, options, timetable bars and the coordinated-call diagram remain editable. The final architectural emblem and outlined bilingual wordmark appear as vector artwork so the Arabic shaping and spacing stay intact.

## Files

- `Insiyab_Executive_Slide_Master.pptx` — seven editable example slides.
- `Insiyab_Executive_Slide_Master.potx` — the reusable PowerPoint template, including the examples.
- `Insiyab_Executive_Slide_Master_Preview.pdf` — a fixed visual reference.

## Start a presentation

Install the supplied Instrument Serif, IBM Plex Sans and Noto Kufi Arabic font files before editing. The fonts are supplied separately in the identity kit, with their licences; they are not embedded in the PowerPoint file.

Open the POTX to create a new presentation. Duplicate the relevant example slide when you need its editable diagram or timetable. Choose one of the named layouts to start with its text placeholders. The seven layouts are:

1. Cover
2. Decision brief
3. One metric and evidence
4. Timetable comparison
5. Coordinated call flow
6. Pilot evidence and next steps
7. Closing

The timetable bars and coordinated-call diagram are native slide shapes in their example slides. Their layout retains the title, caption and source placeholders. Duplicate those examples to retain and edit their visual structure.

## Layout and typography

The canvas is 16:9, 1280 × 720 reference pixels, corresponding to 13⅓ × 7½ inches in PowerPoint. Outer content margins are 80 px. The background is ivory `#F7F5F0`. Main copy is ink `#15181D`; thin structural rules use champagne gold `#9C7B3E`. Authority red `#C42B2B` identifies the fictional delay. The authorized return path remains ink. Deep teal `#2E7D6B` is reserved for a verified acknowledgement and is not used in this example diagram.

Instrument Serif carries display text. Cover headings are 82 px / 61.5 pt; section titles are 52 px / 39 pt. IBM Plex Sans body text normally uses 24 px / 18 pt. Supporting option text is 21 px / 15.75 pt, and visible sources are 16 px / 12 pt. The logo pairs an outlined IBM Plex Sans Latin wordmark with an outlined Noto Kufi Arabic wordmark. The PowerPoint theme defines Noto Kufi Arabic for complex-script text; right-align Arabic body copy and apply RTL paragraph direction when creating Arabic slides.

Keep a single decision or measurable idea on each slide. Use the supplied lockup without retyping, distorting, recoloring individual letters, or reversing the symbol. Use the separate SVG assets when artwork changes are needed.

## Example data and human authority

Route EX-01, the six-minute delay, arrival times and the 48-second briefing metric are fictional demonstration values. Replace them with verified information before using them as evidence. Every scenario slide visibly states “Illustrative scenario — not live operations data.” The speaker notes preserve the source and qualifications.

No response is preselected. The controller selects and authorizes the action. The return path begins only after that authorization. Keep acknowledgement status distinct from operational recovery.

Add the dataset, period, metric definition, event boundaries and retrieval time to the source field for a real metric. Include sample size and uncertainty where they affect the conclusion. Do not convert this identity demonstration into a measured performance claim.

## Template maintenance

Use Slide Master view to edit the shared logo placement, footer rule or reusable layouts. Local example content remains editable in normal slide view. The two masters are `Insiyab Light` and `Insiyab Light Cover`; no default theme layouts are retained.

The editable authoring source is `source/build_slides.mjs`, with package cleanup and template export in `source/build_slides_finish.py`. It uses the bundled Artifact Tool runtime. The PDF is a visual reference rather than the editable master.
