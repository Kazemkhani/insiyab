"""Create clean handoff files and a distributable Insiyab identity kit."""
from pathlib import Path
import json,zipfile,hashlib,shutil
from design_core import ROOT,INK,IVORY,GOLD,RED,TEAL

def build():
 out=ROOT/'deliverables';out.mkdir(exist_ok=True)
 color=json.loads((ROOT/'research/contrast.json').read_text())
 geometry=json.loads((ROOT/'assets/logo/geometry.json').read_text())
 tokens={'name':'Insiyab','arabic_name':'انسياب','version':'2.0','color_space':'sRGB',
  'color':color['colors'],'tints':color['tints_over_ivory'],
  'tint_rule':'Mix the named base into Ivory in encoded sRGB; round each channel to nearest 8-bit integer.',
  'typography':{'display':'Instrument Serif','text':'IBM Plex Sans','arabic_display':'Noto Kufi Arabic','logo_latin':geometry['fonts']['latin'],'logo_arabic':geometry['fonts']['arabic'],'ui_text_px':18,'ui_label_px':16,'ui_source_px':14,'slide_cover_pt':61.5,'slide_title_pt':39,'slide_body_pt':18,'slide_source_pt':12},
  'spacing':{'base':8,'slide_margin_reference_px':80},
  'icon':{'grid':24,'stroke':1.5,'cap':'round','join':'round','ui_min_px':24,'control_room_px':32},
  'symbol':{'master_viewbox':geometry['master_viewbox'],'visible_bounds':geometry['visible_symbol_bounds'],'construction':geometry['construction'],'minimum_px':16,'native_screen_sizes_px':geometry['small_sizes'],'clear_space_master_units':geometry['clear_space']},
  'lockup':{'master_viewbox':[0,0,geometry['lockup_width'],geometry['lockup_height']],'minimum_width_px':240,'minimum_width_mm':55,'wordmark_optical_width':geometry['wordmark_optical_width'],'wordmark_gap':geometry['wordmark_gap'],'layers':geometry['layers'],'primary_colour':'ink','formal_variant':'champagne symbol with ink wordmarks'},
  'motion':{'easing':'cubic-bezier(0.4, 0, 0.2, 1)','symbol_reveal_ms':800,'symbol_reveal_method':'Masks reveal the two filled masses; the separate hidden line-path guide is not visible logo artwork.','optional_guide_layer':geometry['optional_animation_layer'],'knot_settle_ms':900,'calls_converge_ms':700,'briefing_settle_ms':600,'decision_relay_ms':800,'wordmark_fade_ms':600,'reduced_motion_max_ms':200}}
 (ROOT/'assets/tokens.json').write_text(json.dumps(tokens,ensure_ascii=False,indent=2))
 css=['/* Insiyab v2.0 - exact sRGB brand tokens. */',':root {']
 for key,val in color['colors'].items():css.append(f'  --insiyab-{key}: {val};')
 for key,vals in color['tints_over_ivory'].items():
  if key!='ivory':
   for p,val in vals.items():css.append(f'  --insiyab-{key}-{p}: {val};')
 css+=['  --insiyab-font-display: "Instrument Serif", serif;','  --insiyab-font-text: "IBM Plex Sans", sans-serif;','  --insiyab-font-arabic: "Noto Kufi Arabic", sans-serif;','  --insiyab-ease: cubic-bezier(0.4, 0, 0.2, 1);','}',
 '/* The emblem uses filled paths. Preserve its geometry at every size; do not apply an icon stroke rule. */',
 '.insiyab-arabic { font-family: var(--insiyab-font-arabic); letter-spacing: 0; line-height: 1.6; }',
 '/* Set dir="rtl" on Arabic containers. Isolate route IDs and timestamps with bdi/dir="ltr". */',
 '@media (prefers-reduced-motion: reduce) {',
 '  .insiyab-brand-motion { animation: none !important; transition: opacity 200ms linear; }',
 '}','']
 (ROOT/'assets/tokens.css').write_text('\n'.join(css))
 (ROOT/'assets/fonts/README.md').write_text('''# Fonts

Install the static TTF files in this folder before editing the PowerPoint template or SVG application artwork. The bilingual logo wordmarks are already outlined and do not depend on font installation.

- Instrument Serif Regular and Italic: editorial display and brand voice.
- IBM Plex Sans Regular, Medium and SemiBold: text, labels and operational numbers. Medium is the Latin logo face.
- Noto Kufi Arabic Regular, Medium and Bold: Arabic display and generous short labels. Medium is the Arabic logo face.

The logo balances both scripts by optical width. Use the supplied outlines instead of retyping the name or substituting font weights.

Font software is supplied under the SIL Open Font License. Retain each included OFL notice when redistributing the fonts. The licences apply to the font software; no endorsement of Insiyab by the font designers is implied.

Official sources: https://github.com/Instrument/instrument-serif ; https://github.com/IBM/plex/ ; https://github.com/notofonts/arabic ; https://fonts.google.com/noto/specimen/Noto+Kufi+Arabic .
''')
 (ROOT/'assets/logo/README.md').write_text('''# Insiyab logo artwork, version 2.0

The architectural emblem combines two filled masses and one continuous open passage. Its outer form stays still while the negative space carries the sense of flow. The passage is transparent and takes the colour of its background.

## Start here

- `insiyab-lockup-layered.svg`: primary all-Ink bilingual master on a transparent background. Four visible groups: `symbol-upper`, `symbol-lower`, `arabic-wordmark` and `latin-wordmark`.
- `insiyab-lockup-ink.svg`: the default horizontal lockup for light backgrounds.
- `insiyab-lockup-ivory.svg`: reverse version for Ink surfaces.
- `insiyab-lockup-champagne.svg`: formal variation with a Champagne Gold symbol and Ink wordmarks.
- `insiyab-lockup-gold.svg`: complete one-colour Gold artwork for appropriate large-format or material applications.
- `insiyab-lockup-black.svg`: solid black reproduction.
- `insiyab-lockup-on-ivory.svg`, `-on-ink.svg`, `-on-gold.svg`: background specimens.
- `insiyab-lockup-stacked.svg`: secondary stacked bilingual composition. Colour variants use the same arrangement.
- `insiyab-symbol-ink.svg`: the standalone emblem. Ivory, Gold and Black versions are also supplied.
- `insiyab-lockup-production-outlined.svg`: complete filled artwork for production and fabrication.
- `insiyab-lockup-animation.svg`: the four visible groups plus a hidden `line-path` guide for motion construction.
- `insiyab-motion-guide.svg`: the separate open guide path. It is an animation aid, not a standalone logo.
- `insiyab-variations-board.svg`: editable overview of the final variations. The matching PDF is in `guidelines/Insiyab_Logo_Variations.pdf`.
- `png/`: exported raster versions for applications that do not accept SVG.

## Sizes and registration

The primary horizontal lockup has a 620 by 240 viewBox. Its minimum width is 240 px or 55 mm. The standalone symbol has a 120 by 120 viewBox, with visible artwork from (10, 10) to (110, 110). Clear space is 20 symbol units outside the visible artwork, scaled with the whole identity. Canvas padding is not the clear-space allowance.

For small standalone symbols, use the supplied native 16, 24, 32 or 40 px SVG files at their intended dimensions. The minimum is 16 px. These remain filled shapes, with the internal passage preserved. They have no fixed pixel stroke. Use the master for larger applications, scale proportionally and inspect the actual output before production.

The Latin wordmark uses IBM Plex Sans Medium, and the Arabic wordmark uses Noto Kufi Arabic Medium. Both are shaped and outlined. Keep each as a complete part; do not retype, add tracking, reverse Arabic or animate its joined characters separately. The primary lockup gives both wordmarks the same 325-unit optical width, with a 22-unit vertical gap. Do not force equal heights or mirror the symbol in RTL layouts.

## Motion and fabrication

The emblem consists of two closed filled forms. Reveal those forms with masks while keeping the negative-space passage clear. Trim Paths or a curve draw-on may animate the separate guide to construct a reveal, but must not trace the logo perimeter as the finished effect. Hide the guide in the final frame and reveal the Arabic and Latin wordmarks together. See `guidelines/motion-spec.md` for After Effects and Blender instructions.

For fabrication, use the supplied filled production artwork with the same proportions and spacing. Proof the chosen stock, metal or signage finish before manufacture. The monochrome versions keep the complete silhouette without depending on the Gold accent.
''')
 (ROOT/'README.md').write_text('''# Insiyab identity kit, version 2.0

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
''')
 # Clean final copy and ordered inclusion list.
 shutil.copy2(ROOT/'guidelines/Insiyab_Brand_Guidelines.pdf',out/'Insiyab_Brand_Guidelines.pdf')
 shutil.copy2(ROOT/'guidelines/Insiyab_Logo_Variations.pdf',out/'Insiyab_Logo_Variations.pdf')
 for fn in ['Insiyab_Executive_Slide_Master.pptx','Insiyab_Executive_Slide_Master.potx']:
  shutil.copy2(ROOT/'presentation'/fn,out/fn)
 shutil.copy2(ROOT/'preview/identity-overview.png',out/'Insiyab_Identity_Overview.png')
 shutil.copy2(ROOT/'preview/final-variations-board.png',out/'Insiyab_Logo_Variations.png')
 shutil.copy2(ROOT/'preview/final-variations-board.png',ROOT/'assets/logo/png/insiyab-variations-board.png')
 shutil.copy2(ROOT/'assets/logo/insiyab-lockup-layered.svg',out/'Insiyab_Logo_Layered.svg')
 files=[ROOT/'README.md']
 files += [p for p in (ROOT/'assets').rglob('*') if p.is_file() and p.name!='IBMPlexSans-Variable.ttf']
 files += [ROOT/'guidelines'/n for n in ['Insiyab_Brand_Guidelines.pdf','Insiyab_Logo_Variations.pdf','imagery-prompts.md','motion-spec.md']]
 files += [ROOT/'presentation'/n for n in ['Insiyab_Executive_Slide_Master.pptx','Insiyab_Executive_Slide_Master.potx','Insiyab_Executive_Slide_Master_Preview.pdf','README.md']]
 files += [ROOT/'source'/n for n in ['design_core.py','layout.py','build_logo_variations.py','build_icons.py','build_applications.py','build_guidelines.py','build_slides.mjs','build_slides_finish.py','package_identity.py']]
 files += [ROOT/'research'/n for n in ['contrast.json','sources.json','evidence.md']]
 with zipfile.ZipFile(out/'Insiyab_Brand_Kit.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for p in files:z.write(p,'Insiyab/'+str(p.relative_to(ROOT)))
  z.writestr('Insiyab/asset-manifest.json',json.dumps([{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in files],indent=2))
 print(json.dumps({'kit_files':len(files),'deliverables':[{'name':p.name,'bytes':p.stat().st_size} for p in out.iterdir()]},indent=2))
if __name__=='__main__':build()
