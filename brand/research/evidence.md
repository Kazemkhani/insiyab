# Insiyab technical evidence

Research date: 18 November 2026. All external evidence below comes from primary publishers or the W3C. Brand decisions remain design recommendations, not externally established facts.

## Typeface evidence

**Instrument Serif** is a condensed display serif; its publisher explicitly describes it as intended for large sizes. Use it for cover statements and spacious executive headings, not dense operational text. The official repository identifies SIL Open Font License 1.1. Source: https://github.com/Instrument/instrument-serif — refs `turn383351353view0`, `turn585835475view3`.

**IBM Plex Sans** is part of IBM's open-source Plex family and was designed to work in user interfaces. The repository states that Plex uses the Open Font License and lists a separate IBM Plex Sans Arabic package. Sources: https://github.com/IBM/plex/ — refs `turn383351353view1`, `turn585835475view5`; https://www.ibm.com/design/language/typography/typeface/ — ref `turn399849291search1`.

**Noto Kufi Arabic** is described by Noto as an unmodulated Kufi design mainly for larger-size Arabic text. It is appropriate for the logo and generous headings. Do not assume its nominal point size has the same perceived size or line-height needs as a Latin face. Source: https://github.com/notofonts/noto-docs/blob/main/docs/descriptions/NotoKufiArabic.md — refs `turn383351353view2`, `turn585835475view6`. Noto Arabic is licensed under SIL OFL 1.1: https://github.com/notofonts/arabic/blob/main/OFL.txt — ref `turn996378875view1`.

If the identity uses Noto Kufi for every Arabic UI label, give it enough vertical room and test at actual size. A more text-efficient optional alternative is IBM Plex Sans Arabic for operational body content, while retaining Noto Kufi in the identity. This is a design recommendation inferred from the families' documented roles.

Bundled environment already has these valid font files:

- `/usr/share/fonts/truetype/noto/NotoKufiArabic-Regular.ttf`
- `/usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf`
- `/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf`
- `/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf`

Keep the copyright and license notice alongside redistributed font binaries. The Noto license expressly permits embedding and bundling under its conditions. Brand art generated with a font is not itself required to become OFL licensed.

## Accessibility requirements and limits

WCAG 2.2 SC 1.4.3 (AA) requires 4.5:1 for normal text and 3:1 for large text. Its definition of large-scale text is at least 18 pt regular or 14 pt bold, or equivalent size for CJK fonts; for CSS, 18 pt equals 24 CSS px and 14 pt equals approximately 18.67 CSS px. Because high-contrast fine-serif strokes can remain fragile on projectors, use ink on ivory for Instrument Serif even when a large-text color pair technically passes. Source: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html — ref `turn585835475view0`.

SC 1.4.11 (AA) requires 3:1 against adjacent colors for visual information needed to identify active UI controls/states and essential graphical objects. Thresholds use unrounded values. Source: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html — ref `turn585835475view1`.

SC 1.4.1 (A) prohibits color as the only means of conveying information. Pair red/teal with a word and a distinct icon or pattern. Source: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html — ref `turn585835475view2`.

SC 2.3.3 is **AAA**, not AA: interaction-triggered motion animation can be disabled unless essential. W3C recommends honoring reduced-motion preferences or offering a control to suppress unnecessary motion. For Insiyab, reduced motion should reveal final states directly or use a brief opacity fade. Source: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions — ref `turn383351353view3`.

Do not describe the brand guide or static prototype as fully WCAG conformant from contrast checks alone. Keyboard operation, focus, semantics, screen-reader behavior, error prevention and more must be verified in the implemented product.

## Exact contrast pairs

Computed from the supplied unmodified hex values using the WCAG sRGB relative-luminance equation. Values are symmetric. Pass/fail below uses the unrounded number; display values are rounded to two decimals.

| Pair | Ratio | Normal text AA | Large text and essential graphics |
|---|---:|---|---|
| Ink / Ivory | 16.33:1 | Pass | Pass |
| Red / Ivory | 5.17:1 | Pass | Pass |
| Teal / Ivory | 4.52:1 | Pass, small margin | Pass |
| Ink / Gold | 4.50:1 | Pass, very small margin | Pass |
| Gold / Ivory | 3.63:1 | Fail | Pass |
| Ink / Teal | 3.61:1 | Fail | Pass |
| Ink / Red | 3.16:1 | Fail | Pass |
| Gold / Red | 1.43:1 | Fail | Fail |
| Gold / Teal | 1.25:1 | Fail | Fail |
| Red / Teal | 1.14:1 | Fail | Fail |

Ink/Gold is 4.504289166792187:1 and Teal/Ivory is 4.522384121949517:1. Do not apply transparency or lighten these values and assume the pass survives. Gold/Ivory must not be used for small body labels or sources. A logo has a WCAG contrast exemption, but readability is still a brand requirement.

## Tint tokens

Each tint is the stated percentage of the base color blended with the remainder Ivory in sRGB channels, rounded half up to integers. These are opaque hex tokens; avoid runtime transparency that changes the result over other surfaces. Ivory tints remain Ivory.

| Base | 10% | 25% | 50% |
|---|---|---|---|
| Ink #15181D | #E0DFDB | #BFBEBB | #868787 |
| Gold #9C7B3E | #EEE9DE | #E0D7C4 | #CAB897 |
| Red #C42B2B | #F2E1DC | #EAC3BF | #DE908E |
| Teal #2E7D6B | #E3E9E3 | #C5D7CF | #93B9AE |

Use ink text on tinted surfaces. Red on Red 10% is only 4.447648448329087:1, failing normal text AA. Teal on Teal 10% is only 3.9960736274148143:1, also failing. A colored status icon plus an ink label preserves the semantic color without sacrificing text contrast. On a 50% tint the corresponding base-colored icon also fails 3:1, so use ink graphics there. All supplied tint tokens pass normal-text AA with Ink.

## Arabic and bidirectional guidance

Arabic reads right to left; numerals read left to right. Arabic-led layouts should have an RTL page structure, not merely right-aligned words in an LTR structure. Source: https://www.w3.org/TR/alreq/ — ref `turn383351353search0`.

Arabic is cursive and contextual shaping matters. Never reverse character order manually or insert Latin-style tracking between Arabic letters. W3C explains that Arabic stretch behavior is not equivalent to uniform non-cursive letter-spacing and notes that Arabic ascenders/descenders require appropriate mixed-script alignment and line height. Source: https://www.w3.org/International/alreq/ — ref `turn383351353search1`.

For HTML, use `lang="ar" dir="rtl"` for Arabic blocks, preserve Latin route codes/time strings with bidi isolation such as `<bdi dir="ltr">R12</bdi>`, and use logical layout properties (`margin-inline-start`, `text-align: start`). Do not set base direction only with CSS. Sources: https://www.w3.org/International/questions/qa-html-dir.en — ref `turn383351353search4`; https://www.w3.org/International/articles/inline-bidi-markup/uba-basics.en.html — ref `turn383351353search2`.

For the vector wordmark, shape the exact Unicode string `انسياب` with an Arabic shaping engine before converting to outlines. Keep the original Unicode text in the editable source. Give the Latin and Arabic marks equal perceived prominence, not mechanically equal point sizes. These last production choices are Insiyab design recommendations.

## Root citation reminder

The root agent must open the cited source URL or search/find it itself before using the subagent's web ref in a user-facing citation. This research markdown is a temporary handoff, not a user-facing deliverable.
