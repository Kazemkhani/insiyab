from pathlib import Path
from html import escape

ROOT = Path('/workspace/scratch/ccb5634d60a0/insiyab')
ICONS = ROOT / 'assets/icons'
GRAPHICS = ROOT / 'assets/graphics'
ICONS.mkdir(parents=True, exist_ok=True)
GRAPHICS.mkdir(parents=True, exist_ok=True)

C = {'ivory':'#F7F5F0','ink':'#15181D','gold':'#9C7B3E','red':'#C42B2B','teal':'#2E7D6B'}

# Every icon uses the same 24-unit canvas, 1.5-unit stroke and rounded geometry.
# All marks are original paths, not imported library icons.
icons = {
    'driver': ('Driver', 'A person above a three-spoke steering wheel.', '''
<circle cx="12" cy="5.5" r="2.25"/>
<path d="M6.5 11.5C7.5 9.5 16.5 9.5 17.5 11.5"/>
<circle cx="12" cy="16" r="5"/>
<path d="M7.5 14H16.5M12 14V21"/>'''),
    'depot': ('Depot', 'A pitched depot building with two garage bays.', '''
<path d="M3 21V7.5L12 3L21 7.5V21Z"/>
<path d="M6.5 21V12H10V21M14 21V12H17.5V21M7 8.5H17"/>'''),
    'station': ('Station', 'A transit shelter with a bench and open platform.', '''
<path d="M3 9L6 4.5H18L21 9ZM5 9V21M19 9V21"/>
<path d="M8 14H16M8 17H16M9 14V20M15 14V20M3 21H21"/>'''),
    'planning': ('Planning', 'A calendar with a route segment.', '''
<rect x="3" y="5" width="18" height="16" rx="2"/>
<path d="M7 3V7M17 3V7M3 9H21M7 17H10C13 17 11 13 14 13H17"/>
<path d="M7 15.5V18.5M17 11.5V14.5"/>'''),
    'controller': ('Controller', 'A human operator at a control desk.', '''
<circle cx="12" cy="5.5" r="2.25"/>
<path d="M7.5 12V11C7.5 8.5 16.5 8.5 16.5 11V12"/>
<path d="M3 14H21L19.5 19H4.5ZM6 19V21M18 19V21M8 16.5H10.5M14 16.5H16"/>'''),
    'phone-call': ('Phone call', 'A handset with two restrained connection arcs.', '''
<path d="M7 3L10 7.5L7.8 9.8C9.2 12.7 11.3 14.8 14.2 16.2L16.5 14L21 17C20.5 19.5 19 21 17 21C10 20 4 14 3 7C3 5 4.5 3.5 7 3Z"/>
<path d="M14 3C18 3 21 6 21 10M14 7C15.8 7 17 8.2 17 10"/>'''),
    'briefing': ('Briefing', 'One summary sheet with three concise lines.', '''
<path d="M6 3H15L19 7V21H6ZM15 3V7H19M9 11H16M9 14.5H16M9 18H13"/>'''),
    'decision': ('Decision', 'A deliberate branch with one approved option.', '''
<path d="M3 12H8C10 12 10 6 12 6H14M8 12C10 12 10 18 12 18H19"/>
<path d="M16 5.5L18 7.5L21 3.5M17 16L19 18L17 20"/>'''),
    'message-received': ('Message received', 'A message bubble carrying an acknowledgement tick.', '''
<path d="M5 4H19C20.1 4 21 4.9 21 6V16C21 17.1 20.1 18 19 18H9L4 21V18C3.4 17.7 3 16.9 3 16V6C3 4.9 3.9 4 5 4Z"/>
<path d="M8 11L11 14L16 8.5"/>'''),
}

def wrap_svg(content, w, h, title, desc=''):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>
{content}\n</svg>\n'''

for key, (title, desc, paths) in icons.items():
    group = f'<g fill="none" stroke="{C["ink"]}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{paths}</g>'
    (ICONS / f'{key}.svg').write_text(wrap_svg(group,24,24,title,desc))

symbols=[]
for key,(title,desc,paths) in icons.items():
    symbols.append(f'<symbol id="{key}" viewBox="0 0 24 24"><title>{escape(title)}</title><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{paths}</g></symbol>')
(ICONS / 'icons-sprite.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg">\n'+'\n'.join(symbols)+'\n</svg>\n')

sheet=[f'<rect width="1080" height="730" fill="{C["ivory"]}"/>']
sheet += [f'<text x="60" y="65" font-family="IBM Plex Sans, sans-serif" font-size="14" letter-spacing="2" fill="{C["ink"]}">INSIYAB / ICONOGRAPHY</text>',
          f'<text x="60" y="110" font-family="Instrument Serif, serif" font-size="40" fill="{C["ink"]}">A clear role for every mark.</text>',
          f'<text x="60" y="143" font-family="IBM Plex Sans, sans-serif" font-size="16" fill="{C["ink"]}">24 × 24 grid · 1.5 unit stroke · rounded caps and joins</text>']
for i,(key,(title,desc,paths)) in enumerate(icons.items()):
    x=60+(i%3)*330; y=190+(i//3)*160
    sheet.append(f'<g transform="translate({x} {y}) scale(2.5)" fill="none" stroke="{C["ink"]}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{paths}</g>')
    sheet.append(f'<text x="{x+84}" y="{y+26}" font-family="IBM Plex Sans, sans-serif" font-size="18" fill="{C["ink"]}">{title}</text>')
    sheet.append(f'<g transform="translate({x+84} {y+46})" fill="none" stroke="{C["ink"]}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{paths}</g>')
    sheet.append(f'<text x="{x+121}" y="{y+63}" font-family="IBM Plex Sans, sans-serif" font-size="12" fill="{C["ink"]}">24 px reference</text>')
sheet.append(f'<text x="60" y="700" font-family="IBM Plex Sans, sans-serif" font-size="13" fill="{C["ink"]}">Use visible text labels in operational screens. Meaning never depends on colour alone.</text>')
(ICONS / 'icon-contact-sheet.svg').write_text(wrap_svg('\n'.join(sheet),1080,730,'Insiyab iconography','Nine original operational icons shown enlarged and at their 24 pixel reference size.'))

# Schematic route visual: not a map and never presented as operational data.
g=[f'<rect width="960" height="360" fill="{C["ivory"]}"/>',
   f'<text x="40" y="45" font-family="IBM Plex Sans, sans-serif" font-size="15" letter-spacing="1.8" fill="{C["ink"]}">ROUTE LINES</text>',
   f'<g fill="none" stroke="{C["ink"]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M40 140H250Q280 140 280 170V220Q280 250 310 250H650Q680 250 680 220V170Q680 140 710 140H920"/></g>',
   f'<g fill="none" stroke="{C["gold"]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M40 250H175Q205 250 205 220V170Q205 140 235 140H510Q540 140 540 170V220Q540 250 570 250H920"/></g>']
for x,y in [(100,140),(250,140),(390,250),(570,250),(760,140),(860,140)]:
    g.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{C["ivory"]}" stroke="{C["ink"]}" stroke-width="2"/>')
for x,y in [(100,250),(360,140),(480,140),(760,250),(860,250)]:
    g.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{C["ivory"]}" stroke="{C["gold"]}" stroke-width="2"/>')
g.append(f'<circle cx="570" cy="250" r="9" fill="{C["ivory"]}" stroke="{C["ink"]}" stroke-width="2"/><circle cx="570" cy="250" r="4" fill="{C["ivory"]}" stroke="{C["ink"]}" stroke-width="2"/>')
g += [f'<text x="40" y="327" font-family="IBM Plex Sans, sans-serif" font-size="14" fill="{C["ink"]}">Schematic network · illustrative · not Dubai route geography</text>']
(GRAPHICS/'route-lines.svg').write_text(wrap_svg('\n'.join(g),960,360,'Schematic route lines','Two illustrative route lines with rounded turns and station dots. This is not a map of Dubai.'))

# Timetable: common origin and time scale make delay legible without distortion.
g=[f'<rect width="960" height="400" fill="{C["ivory"]}"/>',
   f'<text x="40" y="45" font-family="IBM Plex Sans, sans-serif" font-size="15" letter-spacing="1.8" fill="{C["ink"]}">PLANNED AND ACTUAL</text>',
   f'<text x="40" y="94" font-family="Instrument Serif, serif" font-size="38" fill="{C["ink"]}">The delay stays visible.</text>']
for x,label in [(230,'09:00'),(380,'09:05'),(530,'09:10'),(680,'09:15'),(830,'09:20')]:
    g.append(f'<path d="M{x} 135V295" fill="none" stroke="{C["ink"]}" stroke-opacity="0.14" stroke-width="1"/>')
    g.append(f'<text x="{x}" y="325" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="14" fill="{C["ink"]}">{label}</text>')
g += [f'<text x="40" y="180" font-family="IBM Plex Sans, sans-serif" font-size="18" fill="{C["ink"]}">Planned</text>',
      f'<rect x="230" y="160" width="300" height="26" fill="none" stroke="{C["ink"]}" stroke-width="2"/>',
      f'<text x="40" y="257" font-family="IBM Plex Sans, sans-serif" font-size="18" fill="{C["ink"]}">Actual</text>',
      f'<rect x="230" y="237" width="300" height="26" fill="{C["ink"]}"/>',
      f'<rect x="530" y="237" width="180" height="26" fill="{C["red"]}"/>',
      f'<path d="M530 218V209H710V218" stroke="{C["red"]}" stroke-width="1.5" fill="none"/>',
      f'<text x="620" y="197" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="18" font-weight="500" fill="{C["red"]}">+6 min</text>',
      f'<text x="40" y="375" font-family="IBM Plex Sans, sans-serif" font-size="14" fill="{C["ink"]}">Source: illustrative fictional service · common time origin and scale · no performance claim</text>']
(GRAPHICS/'timetable-planned-actual.svg').write_text(wrap_svg('\n'.join(g),960,400,'Illustrative planned and actual timetable','A fictional scheduled ten minute segment takes sixteen minutes. The additional six minutes is explicitly labeled as delay.'))

g=[f'<rect width="960" height="320" fill="{C["ivory"]}"/>',
   f'<text x="40" y="45" font-family="IBM Plex Sans, sans-serif" font-size="15" letter-spacing="1.8" fill="{C["ink"]}">THE FLOW MOTIF</text>',
   f'<path d="M40 165H105C130 165 130 85 160 85C190 85 190 245 220 245C250 245 250 115 280 115C310 115 310 210 340 210C370 210 370 145 400 145C430 145 430 175 460 175C490 175 490 165 520 165H920" fill="none" stroke="{C["gold"]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
   f'<text x="40" y="290" font-family="IBM Plex Sans, sans-serif" font-size="14" fill="{C["ink"]}">A visual metaphor for coordination · not a measured recovery curve · keep out of operational plots</text>']
(GRAPHICS/'flow-motif.svg').write_text(wrap_svg('\n'.join(g),960,320,'Insiyab flow motif','An illustrative continuous line moves through decreasing disturbances and resolves to a calm horizontal. This decorative motif is not a graph.'))

(ICONS/'README.md').write_text('''# Insiyab icon system

Nine original SVG icons, each using a 24 × 24 viewBox, a 1.5 unit monoline stroke, rounded line caps and joins, and no filled pictograms. The stroke bounds stay inside the canvas. Default colour is Ink `#15181D`.

## Assets

`driver.svg`, `depot.svg`, `station.svg`, `planning.svg`, `controller.svg`, `phone-call.svg`, `briefing.svg`, `decision.svg`, `message-received.svg`.

`icons-sprite.svg` contains reusable symbols with those IDs and uses `currentColor`. `icon-contact-sheet.svg` shows the full family at enlarged and 24 px reference sizes.

## Usage

- Standard size: 24 px. Use 32 px or larger on control-room displays. Use one size per information level.
- At 16 px the stroke scales to 1 px; pair with text and inspect the rendered result. Operational meanings must remain clear without relying on tiny pictograms. Prefer 24 px for this icon family.
- The logo symbol has its own 16 px variant; do not confuse that requirement with the full operational icon set.
- Preserve the viewBox and scale proportionally. Do not vary stroke weight among icons at the same size.
- Place a text label next to every operational icon. Colour supplements that label; colour never carries the full meaning.
- Ink on Ivory is the default. Authority Red indicates attention needed. Deep Teal indicates acknowledged or confirmed status only. Champagne Gold is a brand accent, not a universal operational status.
- Message received means acknowledgement has been received; it does not mean the service has recovered or the decision was completed.
- Decision represents the human controller's selection. Do not use it to imply automatic approval.
- Keep an optical gap of at least 6 px from adjacent text at the 24 px size.
- Do not add fills, 3D effects, animated pulses, multicolour strokes, or background badges that compete with the route information.

## Graphic assets

The neighbouring `graphics` directory contains route lines, a planned-versus-actual timetable, and a decorative flow motif. The route network is schematic, the timetable numbers are fictional, and the flow motif is a metaphor, not measured data. These qualifications are printed inside the examples.

All SVG assets retain editable vector geometry.
''')

print('Created', len(icons), 'icons, sprite, contact sheet, three graphic assets and README.')
