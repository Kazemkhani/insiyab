# Insiyab motion specification

## Motion restores order

Insiyab moves as a capable controller works: with purpose, then with stillness. An architectural form appears around a clear passage. Information converges into one briefing. A selected decision travels back to the people responsible for carrying it out. The viewer should understand who acts and what has changed before noticing the animation itself.

All timings below are proposed brand timings, not measurements of phone response, model inference, decision speed or bus recovery. Use the full sequence in an explicitly illustrative presentation. In a live control room, motion follows actual events and never advances the story on a timer.

## Timing and easing

| Behaviour | Duration | Motion rule | Why |
| --- | --- | --- | --- |
| Architectural emblem reveals | 800 ms | A travelling mask reveals the filled masses while preserving the open passage | Still architecture gives movement a clear route |
| Decorative delay knot resolves | 900 ms | Control points settle into the approved calm path with no overshoot | Calm is a deliberate end state |
| Three calls converge into a briefing | 700 ms | Three equal paths move together toward one card; no implied priority | Parallel legwork becomes one usable summary |
| Briefing card settles | 600 ms | Translate no more than 12 px at 1080p; finish exactly on the grid | The message feels stable enough to read |
| Human selection acknowledgement | 600 ms | A restrained border change and selected label | Authority belongs to an explicit human action |
| Decision relays outwards | 800 ms | One route-following sweep from the card toward the three recipients | The decision has a clear origin and destination |
| Wordmarks appear | 600 ms | Latin and Arabic fade together; no stagger between scripts | Both names have equal standing |
| Reduced-motion state change | Up to 200 ms | Static replacement or opacity-only fade; no travel, morph or draw | Meaning remains available without spatial motion |

Use `cubic-bezier(0.4, 0, 0.2, 1)` as the reference easing for position, reveal and path settling. It gives a controlled departure and a gentle arrival. Translate the curve by eye into application keyframes; preserve its lack of bounce and its exact resting position. Small opacity-only changes may be linear. The visual durations are 600–900 ms; do not extend operational waiting by delaying access to information.

At 30 fps, 600, 700, 800 and 900 ms correspond to 18, 21, 24 and 27 frames. Use one frame rate throughout each export. Do not loop the symbol or animate a background heartbeat while the interface is idle.

## Four signature movements

### 1 The architectural form reveals

The final emblem consists of filled vector masses and an open passage. It is not a single stroked line. Reveal the masses with a travelling mask over 800 ms, keeping their geometry stationary throughout. Let the mask follow the passage's direction and arrive at the calm horizontal exit. At the resting frame, the artwork must match the complete static SVG exactly.

The separate open guide path may drive the reveal or act as a temporary route accent. It is production guidance, not an additional printed component of the trademark. Do not apply Trim Paths to the perimeter of the filled emblem: that traces its outline rather than revealing the intended solid form. Do not animate width, distort the chamfer, close the passage or pull the masses apart.

For a standalone logo entrance, begin the Latin and Arabic wordmark opacity together after the first 200 ms, ending at 800 ms. Both scripts remain stationary and appear with equal confidence. After the reveal, hold the finished lockup for at least 1.2 seconds where the presentation allows. Use the reverse monochrome lockup on Ink rather than changing the animation style for dark backgrounds.

### 2 The delay knot resolves

A knot is an illustrative bend in a separate route motif, not a damaged version of the approved logo or a measured delay graph. Match the number and order of path vertices between the uneven and settled states, then interpolate the handles over 900 ms. Preserve the line's entry and exit position. Reduce the disturbance once and stop; do not oscillate, simulate elastic physics or form tangled loops.

In live product UI, a service is not visually marked recovered because this motion has finished. Recovery needs the defined operational evidence. Where only a decision has been issued, show that exact state. A chart must continue to display the observed or predicted delay until its source data changes.

### 3 Three calls become one briefing

Represent Driver, Depot and Station as three equal, labeled endpoints. Their connecting routes converge on a single briefing card in 700 ms. In a presentation, the card may say “Illustrative briefing” and expose three options. Keep the card stationary once it can be read.

In live use, begin each call indicator only when that call has actually been initiated. Do not animate equal progress bars: phone conversations do not have predictable completion percentages. “Calling,” “Connected,” “No answer” and “Response received” must reflect real events. A finished briefing can contain missing information; preserve a visible “Awaiting station response” label if that is the current evidence. Never convert silence into acknowledgement because the choreography has reached its end.

### 4 A human decision travels back

The outward sweep begins only after the controller has explicitly chosen an option and confirmed the command. Selection alone, hover, an AI recommendation or an elapsed countdown must not trigger it. The sweep takes 800 ms and represents relay or dispatch, not acknowledgement or completion.

Use a single route-following highlight, without a circular radar pulse. Keep the route visible underneath. Each recipient changes to Deep Teal `#2E7D6B` and “Received” only when the corresponding acknowledgement arrives. An unacknowledged recipient retains its neutral or attention state. Distinguish “Sent,” “Delivered,” “Received” and “Completed” according to available system evidence; never collapse all four into a checkmark.

## Six-second executive sequence

This is a silent brand storyboard. The short reading holds are suitable for a visual introduction, not for explaining operational detail. The presenter pauses the slide or follows it with a static briefing.

| Time | On screen | Action and meaning |
| --- | --- | --- |
| 0.00–0.80 s | The symbol, Latin and Arabic names | Filled form reveals through a mask; names fade together from 0.20 s |
| 0.80–1.70 s | A separate route motif | One delay bend settles over 900 ms; the logo remains intact |
| 1.70–2.40 s | Driver, Depot, Station and one card | Three paths converge over 700 ms |
| 2.40–3.50 s | One concise briefing and three choices | Hold; label the scene “Illustrative sequence” |
| 3.50–4.10 s | A controller-selected option | A clearly staged human selection changes the border and label over 600 ms |
| 4.10–4.90 s | Routes from the card back to recipients | One outward 800 ms relay sweep; no automatic “Received” ticks |
| 4.90–5.40 s | The resulting static coordination view | Hold; keep unacknowledged states unacknowledged |
| 5.40–6.00 s | Finished bilingual identity | 600 ms crossfade to the final lockup; stop on the resting frame |

In a live demo, the controller step is a genuine interaction. The animation pauses at 3.50 seconds for as long as the person needs. Its total runtime then exceeds six seconds. The brand never takes control of the decision to preserve a film's timing.

## Vector layer contract

The static master, `insiyab-lockup-layered.svg`, has four visible groups: two symbol masses and two wordmarks. The animation master, `insiyab-lockup-animation.svg`, adds a fifth, hidden open guide. Treat the spellings and their relative positions as approved artwork, not live text to recompose during animation. The guide is hidden at rest and is never printed as an extra stroke.

| SVG group ID | Content | Animation behaviour |
| --- | --- | --- |
| `symbol-upper` | The upper filled architectural mass, with its single chamfer | Stationary artwork revealed by a separate mask |
| `symbol-lower` | The lower filled architectural mass | Stationary artwork revealed by the same coordinated mask |
| `line-path` | An open guide through the internal passage | Optional reveal guide or temporary route accent; hidden at rest |
| `latin-wordmark` | Outlined Latin “Insiyab” | Opacity as one complete wordmark |
| `arabic-wordmark` | Outlined Arabic “انسياب” with joining preserved | Opacity as one complete wordmark |

The emblem's master viewBox is `0 0 120 120`; visible artwork occupies `10–110` on each axis. The primary lockup viewBox is `0 0 620 240`. Both wordmarks have a 325-unit optical width with a 22-unit vertical gap; do not force them to equal heights. Keep all groups in the same lockup artboard coordinate system. Use a common `logo-root` transform or parent for placement, so layer centering does not alter their optical relationship. After import, verify the registration against a static SVG render before setting local anchor points. The centre of the composition is the placement origin; the guide keeps its authored start and end. If the application flattens group names, restore the supplied names explicitly.

Do not break the Arabic into individually arriving characters, rejoin its shapes, reverse its path, add letterspacing or morph the lettering. Keep the filled symbol shapes intact. Retain the guide as an open path in the animation source and exclude it from fabrication artwork. The final logo must remain recognisable in one colour without any animation or accent.

## After Effects implementation

In versions supporting editable SVG composition import, use **File → Import → File**, then **Composition – Retain Layer Sizes**. Adobe documents this as the route to editable SVG shape layers. Check the imported hierarchy and restore the supplied group names if the importer splits subpaths. [1]

If direct SVG shape import is unavailable, open the SVG in Illustrator, retain the top-level parts, save an AI working copy, import it as a composition, then use **Create → Create Shapes from Vector Layer**. Compare the resulting glyph outlines with the supplied master before proceeding. [2]

Keep the symbol's filled masses in a stationary precomposition. Use a separate shape or mask as the reveal matte, travelling from the entry side to the horizontal exit. The matte may expand beyond the outer silhouette, because it clips visibility rather than changing the approved geometry. At frame 24 of a 30 fps composition, the complete symbol must be visible. A simple directional mask is preferable to a complex effect that disturbs the internal passage. [2]

For an optional guide-path draw, retain an open Path and one Stroke; remove any imported Fill. Add **Trim Paths**, hold Start at 0 and animate End from 0 to 100 percent over 24 frames. Start and End are the documented Trim Paths controls for a write-on reveal. Apply the reference easing without overshoot. Hide the guide by the resting frame, and do not use it as a replacement for the filled emblem. [3]

Keep the two wordmarks as separate complete outline groups parented to the same root. Animate only their opacity for the logo entrance. Build calls and briefing elements in a different precomposition so the static identity remains reusable. For knot settling, use matched path topology and explicit start/end shapes; avoid automated turbulence or wiggle modifiers.

If more than one open line is trimmed in a scene, isolate each role's path in its own group so completion order is deliberate. Do not apply one Trim Paths effect to the complete bilingual lockup. Store a static end frame beside the animation export and compare its proportions, wordmark joining and palette before delivery.

## Blender implementation

Import the SVG through **File → Import → SVG as Curves**, when available in the installed build. Blender's importer converts SVG paths to curve objects in the XY plane. If the command is missing, enable the supported SVG curve importer for that build. Preserve the source SVG for comparison. [4]

Keep the architectural masses as filled curves or flat meshes, without rounding or beveling their supplied outlines. Animate a separate mask to reveal them, or use a restrained opacity entrance when the compositing setup does not support the intended mask. The mark must remain stationary; the animated reveal changes visibility, not its geometry.

Keep the separate guide as one open curve. If a temporary line draw is used, curve bevel geometry supplies the stroke: set the bevel depth to half the chosen guide width. Animate **Factor End** from 0 to 1 while Factor Start remains 0. Use **Spline** mapping, where available, for progress based on the curve's length rather than its control-point count. Hide the guide at the completed frame. These controls apply to the guide, not to the filled emblem. [5]

Place an orthographic camera perpendicular to the XY plane. Keep the symbol, guide, Latin and Arabic outlines in their own named collections or objects, and parent them to one empty called `logo-root`. Reproduce the SVG's common scale and registration before animation; do not centre each word independently by eye. Use flat, unlit appearance or a carefully controlled emission shader without bloom so Ink, Ivory and Gold remain graphic colours rather than changing under a scene light. Verify rendered swatches against the intended display colours.

At 30 fps, animate the reveal over a 24-frame interval. Use a smooth monotonic easing curve. If an optional guide draw travels backwards, reverse that curve's direction once; do not mirror the logo or either wordmark. The knot morph belongs to a separate route curve with identical point topology in both states. The decision relay travels along separate route curves and stops at recipient nodes; acknowledgement remains a distinct state.

Use the 3D environment for disciplined camera and curve control. Keep extrusion at zero or negligible depth for standard brand motion. Avoid chrome, rotating objects, volumetric light, reflective gold, particle trails or large camera moves. For a facade visualisation, any material treatment belongs to that physical mockup and must not become the default identity animation.

## Motion in the product

Meaningful status text appears as soon as evidence is available. Motion must not hold data back, conceal uncertainty, reorder cards under the controller's pointer or move the confirmation target during selection. Do not repeatedly animate ongoing alerts. A new alert may enter once, then remains stable until the controller acts or the underlying state changes.

Honour the user's reduced-motion preference. Substitute the completed symbol, static route state and stationary briefing card. Use an opacity transition of no more than 200 ms, or an immediate change. Preserve exactly the same labels, decisions and acknowledgement distinctions. The reduction removes motion, not information.

For an exported presentation, supply a static version of every motion slide. Do not put essential facts only inside an autoplay animation. For a control-room screen, decorative motion is off while the system is idle.

## Approval checks

Approve an animation when its final frame exactly matches the approved vector artwork, both scripts receive equal treatment, and the controller's decision is unambiguous. Every visual status must have an explicit text counterpart. All illustrative events must be identified as such. Ensure each transition comes to rest, no routine motion loops, and no animation implies that a call was answered or a service recovered without evidence.

## Technical references

The timing, art direction and operational meaning above are Insiyab design decisions. The following primary sources substantiate the application controls used in the implementation notes.

1. Adobe, **Import SVG files**, updated 10 November 2026: https://helpx.adobe.com/after-effects/desktop/import-files/import-svg-files/import-svg-files.html
2. Adobe, **Create and customize shapes and masks**, conversion of vector layers: https://helpx.adobe.com/after-effects/using/creating-shapes-masks.html
3. Adobe, **Paint and path operations and shape attributes**, Trim Paths: https://helpx.adobe.com/after-effects/desktop/drawing-painting-and-paths/shapes-and-shape-attributes/shape-attributes-paint-operations-path.html
4. Blender Manual, **Import SVG as Curves**: https://docs.blender.org/manual/en/latest/files/import_export/svg_curve.html
5. Blender Manual, **Curve Geometry**, Start and End Mapping: https://docs.blender.org/manual/en/5.1/modeling/curves/properties/geometry.html

References checked 18 November 2026. Menu labels and import capabilities vary by installed release; verify the filled emblem, guide and both wordmarks after import.
