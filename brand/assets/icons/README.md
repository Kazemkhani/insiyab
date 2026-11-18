# Insiyab icon system

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
