# Insiyab logo artwork, version 2.0

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
