# Insiyab identity kit, version 2.0

Insiyab / انسياب means flow. The final identity combines a compact architectural exterior with a generous flowing passage. The bilingual name shares equal optical width, and Gold remains a restrained formal accent.

## Open first

1. `guidelines/Insiyab_Logo_Variations.pdf` - the final logo and its variations.
2. `guidelines/Insiyab_Brand_Guidelines.pdf` - the complete 36-page brand guidelines.
3. `presentation/Insiyab_Executive_Slide_Master.potx` - reusable 16:9 PowerPoint template.
4. `assets/logo/insiyab-lockup-layered.svg` - the four-part vector master.

## Which logo to use

- Default: all-Ink horizontal bilingual lockup on Ivory.
- Formal: Champagne Gold emblem with Ink wordmarks on Ivory.
- Dark backgrounds: the complete Ivory reverse.
- Narrow or centred compositions: the stacked bilingual lockup.
- App icons and compact spaces: the standalone emblem, with native small sizes supplied.
- Single-colour production: the Black, Ink, Ivory or Gold artwork suited to the surface.

Every variation uses the same emblem. Keep the outer form, open passage and bilingual spacing intact.

## Included

- The final bilingual identity, standalone symbol, native small sizes, monochrome and formal versions, surface specimens, a variations board and PNG exports.
- Nine original SVG icons and a sprite; route, timetable and flow assets.
- Exact colour/tint/typographic/motion tokens in JSON and CSS.
- Editable control-room, mobile, business-card and facade SVGs; application specimen PDF.
- Business-card print template with 85 x 55 mm trim and 3 mm bleed. Replace contact placeholders before printing.
- Seven editable PowerPoint layouts and example slides, with two native light masters, plus a PDF visual reference.
- Six complete photographic image prompts and detailed After Effects/Blender motion instructions.
- Static font files with OFL notices and reproducible authoring source.

## Production rules

Install the fonts before editing the PowerPoint and application SVGs. The outlined logo does not require installed fonts. Typography sizes in the guide are size / recommended line height; tailor line height to the actual text without changing its hierarchy.

The emblem uses two filled masses. Animate masks over those forms using the separate hidden guide if needed, and keep the guide invisible in the finished mark. The primary layered file has four visible parts. The animation file adds the guide as a fifth, hidden part. Use the filled production artwork for fabrication.

Screen colour is sRGB. Convert print artwork through the printer's chosen profile and proof the chosen stock or metal sample. The hex palette does not claim a universal CMYK or Pantone equivalent.

All scenario route IDs, times, reports, delays and performance examples are fictional. They demonstrate the identity and layout. Replace them with verified, cited evidence before presenting any operational claim. The controller always chooses and authorizes the action; receipt and recovery remain different states.

This is an original identity proposal, not an assertion of official RTA affiliation or trademark clearance. Photographic prompts produce concept imagery, not evidence of a deployed system.

## Reproduction

Python builders use the bundled Python runtime with ReportLab, fontTools, pypdf and HarfBuzz. `design_core.py` creates the filled emblem and shaped outlined wordmarks. `build_logo_variations.py` creates the logo variations. `build_icons.py` creates the icon/graphic family. `build_applications.py` creates the application SVG/PDF files, and `build_guidelines.py` creates the brand book. `build_slides.mjs` uses the Artifact Tool presentation runtime; `build_slides_finish.py` cleans the OOXML package and creates the POTX and visual-reference PDF.

The supplied outputs are ready to use; rebuilding is optional. Internal render checks, temporary files and environment-specific helper scripts are excluded from this handoff.
