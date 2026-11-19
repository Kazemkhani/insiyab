#!/usr/bin/env python3
"""Build story/deck/index.html from scratch.
Run from the repo root or any directory; uses absolute paths.
"""
import os, sys

script_dir = os.path.dirname(os.path.abspath(__file__))
deck_dir   = os.path.normpath(os.path.join(script_dir, '..'))
out_path   = os.path.join(deck_dir, 'index.html')

# ---------------------------------------------------------------------------
# HEAD + STYLE
# ---------------------------------------------------------------------------
head = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Insiyab</title>
<style>@font-face{font-family:'Overpass';font-style:normal;font-weight:300;font-display:swap;src:url(brand/fonts/overpass-300.woff2) format('woff2')}@font-face{font-family:'Overpass';font-style:normal;font-weight:600;font-display:swap;src:url(brand/fonts/overpass-600.woff2) format('woff2')}@font-face{font-family:'Overpass';font-style:normal;font-weight:800;font-display:swap;src:url(brand/fonts/overpass-800.woff2) format('woff2')}</style>
<style>
@font-face{font-family:"IBM Plex Sans";src:url(brand/fonts/IBMPlexSans-Regular.ttf);font-weight:400}
@font-face{font-family:"IBM Plex Sans";src:url(brand/fonts/IBMPlexSans-Medium.ttf);font-weight:500}
@font-face{font-family:"IBM Plex Sans";src:url(brand/fonts/IBMPlexSans-SemiBold.ttf);font-weight:600}
:root{
  --ivory:#F7F5F0; --ink:#15181D; --gold:#9C7B3E; --red:#C42B2B; --red-on-ink:#E5544B; --teal:#2E7D6B;
  --mute-on-ink:#A9AEB5; --mute:#5A6068;
  --head:"Overpass","Helvetica Neue",Arial,sans-serif;
  --text:"IBM Plex Sans","Helvetica Neue",Arial,sans-serif;
  --ease:cubic-bezier(0.4,0,0.2,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#000;overflow:hidden}
body{font-family:var(--text);color:var(--ivory)}
#stage{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:center;overflow:hidden;background:var(--ink)}
.slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity 700ms var(--ease),visibility 0s 700ms}
.slide.on{opacity:1;visibility:visible;transition:opacity 700ms var(--ease)}
.photo{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.04);transition:transform 9s linear}
.slide.on .photo{transform:scale(1)}
.scrim-b{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,11,14,.88) 0%,rgba(10,11,14,.55) 38%,rgba(10,11,14,0) 70%)}
.scrim-l{position:absolute;inset:0;background:linear-gradient(to right,rgba(10,11,14,.86) 0%,rgba(10,11,14,.55) 45%,rgba(10,11,14,0) 75%)}
.pad{position:absolute;left:140px;right:140px}
h1,h2,.num{font-family:var(--head);font-weight:800;letter-spacing:-0.02em;line-height:1.02}
h2{font-size:96px}
.lede{font-size:40px;line-height:1.3;color:var(--mute-on-ink);font-weight:400;max-width:1200px}
.credit{text-shadow:0 1px 3px rgba(0,0,0,.85);position:absolute;right:48px;bottom:36px;font-size:18px;color:rgba(247,245,240,.62);text-align:right;max-width:900px;line-height:1.4}
.step{opacity:0;transform:translateY(12px);transition:opacity 600ms var(--ease),transform 600ms var(--ease)}
.step.shown{opacity:1;transform:none}
.light{background:var(--ivory);color:var(--ink)}
.light .credit{color:var(--mute);text-shadow:none}
.own{font-size:20px;font-weight:600;color:var(--ink);margin-bottom:10px}
.st{font-family:var(--head);font-weight:800;font-size:32px;line-height:1.1;color:var(--ink)}
.nt{font-size:21px;line-height:1.4;color:var(--mute);margin-top:10px}
#hint{position:fixed;left:16px;bottom:12px;font:13px var(--text);color:#777;transition:opacity 600ms}
#notes{position:fixed;left:0;right:0;bottom:0;background:rgba(0,0,0,.88);color:#eee;font:20px/1.45 var(--text);padding:20px 32px;display:none;max-height:40vh;overflow:auto}
#notes.on{display:block}
.qr{background:#fff;padding:14px;width:176px;height:176px}
.qr img{width:100%;height:100%;display:block}
/* logo reveal */
#logo svg{height:200px;width:auto;display:block;margin-bottom:44px}
#logo #symbol-upper,#logo #symbol-lower{clip-path:inset(0 100% 0 0)}
#logo #arabic-wordmark,#logo #latin-wordmark{opacity:0}
.slide.on #logo #symbol-upper{animation:reveal 800ms var(--ease) 300ms forwards}
.slide.on #logo #symbol-lower{animation:reveal 800ms var(--ease) 420ms forwards}
.slide.on #logo #arabic-wordmark,.slide.on #logo #latin-wordmark{animation:fade 600ms var(--ease) 500ms forwards}
@keyframes reveal{to{clip-path:inset(0 0 0 0)}}
@keyframes fade{to{opacity:1}}
/* watcher rows */
.watcher-row{display:flex;align-items:flex-start;gap:40px;border-top:1px solid rgba(21,24,29,.12);padding:28px 0 20px}
.watcher-row:first-child{border-top:none;padding-top:0}
.w-icon{width:52px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.w-name{font-family:var(--head);font-weight:800;font-size:38px;line-height:1.05;min-width:380px;color:var(--ink)}
.w-line{font-size:26px;line-height:1.3;color:var(--mute);flex:1}
.w-status{font-size:22px;font-weight:600;color:var(--ink);opacity:.6;min-width:220px;text-align:right;padding-top:6px}
/* model chart */
.chart-area{position:absolute;left:140px;right:140px}
/* arc rows */
.arc-row{display:grid;grid-template-columns:220px 1fr;column-gap:40px;row-gap:0;padding:32px 0;border-top:1px solid rgba(21,24,29,.12)}
.arc-row:first-child{border-top:none;padding-top:0}
.arc-year{font-family:var(--head);font-weight:800;font-size:72px;line-height:1;color:var(--ink)}
.arc-text{font-size:28px;line-height:1.5;color:var(--mute)}
@media (prefers-reduced-motion:reduce){
  #logo #symbol-upper,#logo #symbol-lower{clip-path:none;opacity:0}
  .slide.on #logo #symbol-upper,.slide.on #logo #symbol-lower,.slide.on #logo #arabic-wordmark,.slide.on #logo #latin-wordmark{animation:fade 200ms linear forwards}
  .slide,.slide.on{transition:opacity 150ms linear}
  .photo,.slide.on .photo{transform:none;transition:none}
  .step{transform:none;transition:opacity 150ms linear}
}
</style>
</head>
<body>
<div id="stage">
"""

# ---------------------------------------------------------------------------
# LOGO SVG (reused inline)
# ---------------------------------------------------------------------------
LOGO_SVG = r"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="620" height="240" viewBox="0 0 620 240" role="img" aria-label="Insiyab انسياب on-ink"><title>Insiyab انسياب on-ink</title><g transform="translate(-12 -12) scale(2.2)"><g id="symbol-upper" inkscape:groupmode="layer" inkscape:label="01 Upper architectural form"><path d="M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z" fill="#F7F5F0"/></g><g id="symbol-lower" inkscape:groupmode="layer" inkscape:label="02 Lower architectural form"><path d="M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z" fill="#F7F5F0"/></g></g><g id="arabic-wordmark" inkscape:groupmode="layer" inkscape:label="arabic-wordmark" aria-label="انسياب"><path fill="#F7F5F0" d="M405 192Q377 192 361.0 175.0Q345 158 345 128Q345 97 361.0 80.5Q377 64 405 64Q433 64 448.5 81.0Q464 98 464 128Q464 157 448.5 174.5Q433 192 405 192ZM256 0Q168 0 116.5 -52.5Q65 -105 65 -196Q65 -220 68.5 -247.5Q72 -275 78.5 -301.0Q85 -327 92 -347H190Q183 -313 179.0 -278.0Q175 -243 175 -208Q175 -156 201.0 -124.0Q227 -92 269 -92H616V-488H723V0ZM1147 -92Q1152 -92 1152 -88V-5Q1152 0 1147 0H908V-760H1017V-92ZM1251 211Q1225 211 1208.0 195.0Q1191 179 1191 147Q1191 114 1208.0 98.5Q1225 83 1251 83Q1278 83 1294.0 99.5Q1310 116 1310 147Q1310 177 1294.0 194.0Q1278 211 1251 211ZM1423 211Q1395 211 1379.0 194.0Q1363 177 1363 147Q1363 116 1379.0 99.5Q1395 83 1423 83Q1451 83 1466.5 100.5Q1482 118 1482 147Q1482 176 1466.5 193.5Q1451 211 1423 211ZM1137 0Q1132 0 1132 -5V-88Q1132 -92 1137 -92H1297V-488H1406V-92H1556Q1561 -92 1561 -88V-5Q1561 0 1556 0ZM2219 0Q2175 0 2136.5 -16.5Q2098 -33 2060 -72Q2036 -39 1997.5 -19.5Q1959 0 1907 0H1546Q1541 0 1541 -5V-88Q1541 -92 1546 -92H1683V-410H1789V-92H1890Q1938 -92 1964.0 -122.5Q1990 -153 1990 -208V-410H2096V-201Q2096 -191 2096.0 -182.0Q2096 -173 2094 -164Q2119 -124 2147.0 -108.0Q2175 -92 2218 -92H2280V-488H2386V-92H2519Q2524 -92 2524 -88V-5Q2524 0 2519 0ZM2663 -587Q2636 -587 2620.0 -604.0Q2604 -621 2604 -651Q2604 -682 2619.5 -698.5Q2635 -715 2663 -715Q2692 -715 2707.5 -698.0Q2723 -681 2723 -651Q2723 -622 2707.0 -604.5Q2691 -587 2663 -587ZM2509 0Q2504 0 2504 -5V-88Q2504 -92 2509 -92H2639V-488H2748V0ZM2933 -760H3042V0H2933Z" transform="matrix(0.10917031 0 0 0.10917031 277.90393013 92.38358659)"/></g><g id="latin-wordmark" inkscape:groupmode="layer" inkscape:label="latin-wordmark" aria-label="Insiyab"><path fill="#F7F5F0" d="M56 0V-92H151V-606H56V-698H360V-606H264V-92H360V0ZM494 0V-520H603V-434H608Q625 -476 659.5 -504.0Q694 -532 754 -532Q834 -532 878.5 -479.5Q923 -427 923 -330V0H814V-316Q814 -438 716 -438Q695 -438 674.5 -432.5Q654 -427 638.0 -416.0Q622 -405 612.5 -388.0Q603 -371 603 -348V0ZM1239 12Q1165 12 1115.0 -14.0Q1065 -40 1028 -86L1098 -150Q1127 -115 1162.5 -95.5Q1198 -76 1245 -76Q1293 -76 1316.5 -94.5Q1340 -113 1340 -146Q1340 -171 1323.5 -188.5Q1307 -206 1266 -211L1218 -217Q1138 -227 1092.5 -263.5Q1047 -300 1047 -372Q1047 -410 1061.0 -439.5Q1075 -469 1100.5 -489.5Q1126 -510 1161.5 -521.0Q1197 -532 1240 -532Q1310 -532 1354.5 -510.0Q1399 -488 1434 -449L1367 -385Q1347 -409 1314.5 -426.5Q1282 -444 1240 -444Q1195 -444 1173.5 -426.0Q1152 -408 1152 -379Q1152 -349 1171.0 -334.0Q1190 -319 1232 -312L1280 -306Q1366 -293 1405.5 -255.5Q1445 -218 1445 -155Q1445 -117 1430.5 -86.5Q1416 -56 1389.0 -34.0Q1362 -12 1324.0 0.0Q1286 12 1239 12ZM1623 -613Q1589 -613 1573.5 -629.0Q1558 -645 1558 -670V-687Q1558 -712 1573.5 -728.0Q1589 -744 1623 -744Q1657 -744 1672.0 -728.0Q1687 -712 1687 -687V-670Q1687 -645 1672.0 -629.0Q1657 -613 1623 -613ZM1568 -520H1677V0H1568ZM2152 -520H2257L2038 103Q2029 129 2017.5 147.5Q2006 166 1990.5 177.5Q1975 189 1953.0 194.5Q1931 200 1901 200H1838V111H1926L1956 23L1767 -520H1876L1980 -214L2010 -101H2015L2048 -214ZM2714 0Q2671 0 2648.0 -24.5Q2625 -49 2620 -87H2615Q2600 -38 2560.0 -13.0Q2520 12 2463 12Q2382 12 2338.5 -30.0Q2295 -72 2295 -143Q2295 -221 2351.5 -260.0Q2408 -299 2517 -299H2611V-343Q2611 -391 2585.0 -417.0Q2559 -443 2504 -443Q2458 -443 2429.0 -423.0Q2400 -403 2380 -372L2315 -431Q2341 -475 2388.0 -503.5Q2435 -532 2511 -532Q2612 -532 2666.0 -485.0Q2720 -438 2720 -350V-89H2775V0ZM2494 -71Q2545 -71 2578.0 -93.5Q2611 -116 2611 -154V-229H2519Q2406 -229 2406 -159V-141Q2406 -106 2429.5 -88.5Q2453 -71 2494 -71ZM2882 -740H2991V-434H2996Q3013 -481 3051.5 -506.5Q3090 -532 3142 -532Q3241 -532 3295.0 -460.5Q3349 -389 3349 -260Q3349 -131 3295.0 -59.5Q3241 12 3142 12Q3090 12 3051.5 -14.0Q3013 -40 2996 -86H2991V0H2882ZM3109 -82Q3166 -82 3200.0 -118.5Q3234 -155 3234 -215V-305Q3234 -365 3200.0 -401.5Q3166 -438 3109 -438Q3059 -438 3025.0 -413.5Q2991 -389 2991 -349V-171Q2991 -131 3025.0 -106.5Q3059 -82 3109 -82Z" transform="matrix(0.09869420 0 0 0.09869420 279.47312481 210.84700576)"/></g></svg>"""

# ---------------------------------------------------------------------------
# SLIDE 7: inline SVG line chart for lateness by horizon
# Data from MODEL-CARD.md:216-219
# horizon (stops): 1, 5, 10, 20
# model MAE (s):   8.57, 29.55, 64.00, 127.27
# naive MAE (s):   8.72, 54.26, 112.14, 223.03
# ---------------------------------------------------------------------------
def make_model_chart():
    # Chart occupies left ~60% of the 1640px content area → ~984px; use 1100 for crisp rendering
    W, H = 1100, 500
    PL, PR, PT, PB = 90, 60, 50, 90
    horizons = [1, 5, 10, 20]
    model   = [8.57, 29.55, 64.00, 127.27]
    naive   = [8.72, 54.26, 112.14, 223.03]
    naive_labels = [8.72, 54.26, 112.14, 223.03]

    max_v = 240
    min_v = 0

    def cx(i):
        xs = [PL, PL + (W-PL-PR)*1/4, PL + (W-PL-PR)*2/4, W-PR]
        return xs[i]

    def cy(v):
        return PT + (1 - v / max_v) * (H - PT - PB)

    def path_d(vals):
        pts = [(cx(i), cy(v)) for i, v in enumerate(vals)]
        return 'M ' + ' L '.join(f'{x:.1f},{y:.1f}' for x, y in pts)

    FONT = "'IBM Plex Sans','Helvetica Neue',Arial,sans-serif"

    # gridlines — axis labels >= 22px
    grid = []
    for gv in [0, 50, 100, 150, 200]:
        y = cy(gv)
        grid.append(f'<line x1="{PL}" y1="{y:.1f}" x2="{W-PR}" y2="{y:.1f}" stroke="#D5D2CC" stroke-width="1"/>')
        grid.append(f'<text x="{PL-12}" y="{y+6:.1f}" text-anchor="end" font-family="{FONT}" font-size="22" fill="#5A6068">{gv}s</text>')

    # x labels — tick labels >= 22px
    xlabels = []
    for i, h in enumerate(horizons):
        xlabels.append(f'<text x="{cx(i):.1f}" y="{H-12}" text-anchor="middle" font-family="{FONT}" font-size="22" fill="#5A6068">{h} stop{"s" if h>1 else ""}</text>')

    # paths
    model_path = f'<path d="{path_d(model)}" fill="none" stroke="#15181D" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>'
    naive_path = f'<path d="{path_d(naive)}" fill="none" stroke="#15181D" stroke-width="2.5" stroke-opacity="0.35" stroke-dasharray="9 6" stroke-linejoin="round" stroke-linecap="round"/>'

    # dots
    dots = []
    for i in range(4):
        dots.append(f'<circle cx="{cx(i):.1f}" cy="{cy(model[i]):.1f}" r="7" fill="#15181D"/>')
        dots.append(f'<circle cx="{cx(i):.1f}" cy="{cy(naive[i]):.1f}" r="5" fill="#15181D" fill-opacity="0.35"/>')

    # model value labels >= 24px; naive value labels >= 24px (muted)
    vlabels = []
    model_offsets = [(-16, -16), (0, -16), (0, -16), (0, -16)]
    naive_offsets = [( 16,  14), (0,  18), (0,  18), (-46,  10)]
    for i in range(4):
        dx, dy = model_offsets[i]
        vlabels.append(f'<text x="{cx(i)+dx:.1f}" y="{cy(model[i])+dy:.1f}" text-anchor="middle" font-family="{FONT}" font-size="24" fill="#15181D" font-weight="700">{model[i]:.0f}s</text>')
        ndx, ndy = naive_offsets[i]
        vlabels.append(f'<text x="{cx(i)+ndx:.1f}" y="{cy(naive[i])+ndy:.1f}" text-anchor="middle" font-family="{FONT}" font-size="24" fill="#15181D" fill-opacity="0.38">{naive_labels[i]:.0f}s</text>')

    # legend — legend labels >= 22px
    legend = [
        f'<line x1="{PL}" y1="{H-60}" x2="{PL+44}" y2="{H-60}" stroke="#15181D" stroke-width="4.5"/>',
        f'<text x="{PL+56}" y="{H-54}" font-family="{FONT}" font-size="22" fill="#15181D">Insiyab</text>',
        f'<line x1="{PL+174}" y1="{H-60}" x2="{PL+218}" y2="{H-60}" stroke="#15181D" stroke-width="2.5" stroke-opacity="0.35" stroke-dasharray="9 6"/>',
        f'<text x="{PL+230}" y="{H-54}" font-family="{FONT}" font-size="22" fill="#5A6068">The bus stays as late as it is now</text>',
    ]

    parts = (
        [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
        + grid + [naive_path, model_path] + dots + xlabels + vlabels + legend
        + ['</svg>']
    )
    return '\n'.join(parts)

MODEL_CHART = make_model_chart()

# ---------------------------------------------------------------------------
# WATCHER ROW (simple icon: inline SVG icon shapes)
# ---------------------------------------------------------------------------
def w_icon(shape_id):
    # Simple geometric icons, all ink colour
    icons = {
        'clock': '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="26" r="20" stroke="#15181D" stroke-width="3"/><line x1="26" y1="14" x2="26" y2="27" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="26" y1="27" x2="34" y2="32" stroke="#15181D" stroke-width="3" stroke-linecap="round"/></svg>',
        'people': '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="18" r="6" stroke="#15181D" stroke-width="3"/><path d="M8 40 C8 30 32 30 32 40" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><circle cx="36" cy="18" r="6" stroke="#15181D" stroke-width="3"/><path d="M32 40 C32 34 44 34 44 40" stroke="#15181D" stroke-width="3" stroke-linecap="round"/></svg>',
        'sun': '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="26" r="10" stroke="#15181D" stroke-width="3"/><line x1="26" y1="8" x2="26" y2="14" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="26" y1="38" x2="26" y2="44" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="8" y1="26" x2="14" y2="26" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="38" y1="26" x2="44" y2="26" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="13.5" y1="13.5" x2="17.7" y2="17.7" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="34.3" y1="34.3" x2="38.5" y2="38.5" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="38.5" y1="13.5" x2="34.3" y2="17.7" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="17.7" y1="34.3" x2="13.5" y2="38.5" stroke="#15181D" stroke-width="3" stroke-linecap="round"/></svg>',
        'road': '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 44 L18 8 M34 8 L42 44" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="26" y1="14" x2="26" y2="21" stroke="#15181D" stroke-width="2.5" stroke-linecap="round"/><line x1="26" y1="26" x2="26" y2="33" stroke="#15181D" stroke-width="2.5" stroke-linecap="round"/><line x1="26" y1="37" x2="26" y2="44" stroke="#15181D" stroke-width="2.5" stroke-linecap="round"/></svg>',
        'calendar': '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="12" width="36" height="32" rx="3" stroke="#15181D" stroke-width="3"/><line x1="8" y1="22" x2="44" y2="22" stroke="#15181D" stroke-width="2.5"/><line x1="18" y1="8" x2="18" y2="16" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="34" y1="8" x2="34" y2="16" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="32" r="2.5" fill="#15181D"/><circle cx="26" cy="32" r="2.5" fill="#15181D"/><circle cx="32" cy="32" r="2.5" fill="#15181D"/></svg>',
        'link': '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 30 L14 38 C10 42 10 46 14 46 C18 46 22 42 26 38 L34 30" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><path d="M30 22 L38 14 C42 10 42 6 38 6 C34 6 30 10 26 14 L18 22" stroke="#15181D" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="20" x2="32" y2="32" stroke="#15181D" stroke-width="3" stroke-linecap="round"/></svg>',
    }
    return icons.get(shape_id, icons['clock'])

# ---------------------------------------------------------------------------
# BUILD SLIDES
# ---------------------------------------------------------------------------
slides = []

# 1 TITLE
slides.append("""<!-- 1 TITLE -->
<section class="slide" data-notes="Amir · 20 s. Film plays first. When lights come up: we are Insiyab. An AI co-pilot for the people who keep Dubai's buses on time. Insiyab sees it coming. The controller decides.">
  <div class="photo" style="background-image:url(photos/title-3.jpg)"></div>
  <div class="scrim-b"></div>
  <div class="pad" style="top:96px;font-size:22px;color:rgba(247,245,240,.75);letter-spacing:.02em">Team Visionary &nbsp;·&nbsp; University of Birmingham Dubai &nbsp;·&nbsp; RTA Future Move Hackathon</div>
  <div class="pad" style="bottom:150px">
    <div id="logo">""" + LOGO_SVG + """</div>
    <p class="lede" style="color:var(--ivory);font-size:48px">An AI co-pilot for Dubai's bus control centre.</p>
  </div>
  <div style="position:absolute;right:140px;bottom:150px;text-align:right">
    <div class="qr" style="margin-left:auto"><img src="qr-pitch.svg" alt="QR code to the live site"></div>
    <div style="font-size:20px;margin-top:14px;color:rgba(247,245,240,.8)">insiyab.amirkazemkhani.com/pitch</div>
  </div>
  <div class="credit">Sheikh Zayed Road at night. Photo: Irshad Ahmad, Pexels</div>
</section>""")

# 2 HER EVENING
slides.append("""<!-- 2 HER EVENING -->
<section class="slide" data-steps="1" data-notes="Amir · 30 s. She planned her evening around 19:23. [click] The bus left at 19:36. The trip was planned at 67 minutes and took 96; the break was gone, so the next bus started late. Say once: this is an illustration built from route 310's measured times.">
  <div class="photo" style="background-image:url(photos/waiting-1.jpg);background-position:center 40%"></div>
  <div class="scrim-b"></div>
  <div class="pad" style="bottom:150px">
    <h2>She planned her evening<br>around 19:23.</h2>
    <h2 class="step" data-step="1" style="color:var(--red-on-ink);margin-top:28px">The bus left at 19:36.</h2>
  </div>
  <div class="credit">Representative image. Times: route 310 at 18:00, RTA records, 15 December 2025.<br>Photo: Dwi Setyo, Pexels</div>
</section>""")

# 3 SCALE
slides.append("""<!-- 3 SCALE -->
<section class="slide" data-steps="1" data-notes="Sarah · 40 s. Same crowd at both peaks: 48,724 boardings at 08:00, 49,707 at 18:00. In the morning 19 in 100 departures leave five or more minutes late. In the evening, 45. [click] Across the evening rush that is about 244 bus hours of missing trip time, about 80 buses' worth. Never say traffic is the cause.">
  <div class="photo" style="background-image:url(photos/scale-2.jpg)"></div>
  <div class="scrim-l"></div>
  <div class="pad" style="top:200px">
    <div class="num" style="font-size:300px;color:var(--ivory)">45%</div>
    <p class="lede" style="color:var(--ivory);font-size:48px;margin-top:20px;max-width:900px">of evening departures leave five or more minutes late.</p>
    <p class="lede" style="margin-top:22px;max-width:900px">19% in the morning. The same crowd: 48,724 boardings at 08:00, 49,707 at 18:00.</p>
    <p class="lede step" data-step="1" style="color:var(--ivory);margin-top:48px;max-width:900px">About 80 buses' worth of trip time goes missing every evening rush.</p>
  </div>
  <div class="credit">RTA records, 15 December 2025. 80 buses: 244 bus hours ÷ 3. Photo: Nihongraphy, Pexels</div>
</section>""")

# 4 CONTROL ROOM
slides.append("""<!-- 4 CONTROL ROOM -->
<section class="slide" data-steps="1" data-notes="Sarah · 30 s. RTA told us: six controllers per shift, about 1,400 buses. [click] When one bus is late, a controller phones the driver, then the depot, then the station, one by one. Every call is time taken from the decision. Small events of a few hundred people are not planned at all.">
  <div class="photo" style="background-image:url(photos/control-1.jpg)"></div>
  <div class="scrim-b"></div>
  <div class="pad" style="bottom:150px">
    <h2>Six controllers. 1,400 buses.</h2>
    <h2 class="step" data-step="1" style="color:var(--mute-on-ink);margin-top:20px">One phone call at a time.</h2>
  </div>
  <div class="credit">Representative image: a traffic dispatch centre in Nevada, not RTA's. Numbers: RTA staff, 18 November 2026.<br>Photo: Noah Wulf, CC BY-SA 4.0</div>
</section>""")

# 5 INSIYAB SEES IT COMING (black slide, one line only)
slides.append("""<!-- 5 INSIYAB SEES IT COMING -->
<section class="slide" data-notes="Amir · 20 s. Pause. Let it land. That evening was not bad luck. It was visible before it happened. Insiyab reads the signal the controller does not have time to read. Say it once and move on.">
  <div class="pad" style="top:50%;transform:translateY(-50%)">
    <h2 style="font-size:120px;color:var(--ivory)">Insiyab sees it coming.</h2>
  </div>
</section>""")

# 6 THE SIX WATCHERS
# 6 steps: one watcher per click (step 1-6)
# Status words: Measured / Estimate / Priority rule / Rule / Proposal
watchers = [
    ('clock',    'Running late',         'Reads live position, the lateness forecast and the bus-still-out signal.',   'Measured model'),
    ('people',   'Overflow',             'Boarding forecast vs seats on the type in the fleet list.',                   'Estimate'),
    ('sun',      'Heat',                 'Stop kind (pole or shelter), temperature, and forecast wait time.',           'Priority rule'),
    ('road',     'Lanes and roads',      'Dedicated bus lane openings; average speed by route and hour.',              'Rule'),
    ('calendar', 'Events',               'Public event calendar, venue capacity and nearest stops.',                   'Rule'),
    ('link',     'Connections',          'Predicted-late bus, the connection its riders head for, on-demand zones.',   'Proposal'),
]

watcher_rows = []
for i, (icon_id, name, line, status) in enumerate(watchers):
    step_num = i + 1
    watcher_rows.append(f"""  <div class="watcher-row step" data-step="{step_num}">
    <div class="w-icon">{w_icon(icon_id)}</div>
    <div class="w-name">{name}</div>
    <div class="w-line">{line}</div>
    <div class="w-status">{status}</div>
  </div>""")

slides.append("""<!-- 6 THE SIX WATCHERS -->
<section class="slide light" data-steps="6" data-notes="Mustafo · 60 s (10 s each row). Insiyab watches six things. Each watcher reads one kind of signal and raises one kind of alert. Status words: Measured model means tested on data; Estimate shows its range; Priority rule means a decision rule, not a model; Proposal means designed but not yet tested in production. Click through one per line; say the status word aloud.">
  <div class="pad" style="top:80px">
    <h2 style="font-size:72px;color:var(--ink);margin-bottom:36px">The six watchers</h2>
""" + '\n'.join(watcher_rows) + """
  </div>
</section>""")

# 7 THE MODEL: inline SVG chart
slides.append("""<!-- 7 THE MODEL -->
<section class="slide light" data-notes="Mustafo · 60 s. The heart of Insiyab: a lateness forecast. Here is what it shows by horizon: how far ahead we look. At 1 stop there is no real gain; we show it. At 5 stops we are 46 in 100 closer than the best simple rule. At 10 and 20 stops, 43 in 100. The dashed line is the best naive rule: the bus stays as late as it is now. The solid line is Insiyab. The range promised to hold 90 in 100 times; it held 91 to 98. Cross-validated by route and by community. Where we lose, we show it.">
  <div class="pad" style="top:80px">
    <h2 style="font-size:72px;color:var(--ink)">The forecast by horizon</h2>
    <p style="font-size:28px;line-height:1.4;color:var(--mute);margin-top:16px;max-width:1200px">Seconds of error at a stop ahead. Lower is better. Tested on 35,003 rows the model never saw.</p>
  </div>
  <div style="position:absolute;left:140px;top:290px">""" + MODEL_CHART + """</div>
  <div style="position:absolute;right:140px;top:310px;width:580px">
    <div class="num" style="font-size:160px;color:var(--ink)">+46<span style="font-size:72px"> in 100</span></div>
    <p style="font-size:28px;line-height:1.4;margin-top:16px;color:var(--mute)">at 5 stops ahead against the best naive rule<br>(MAE 29.6 s vs 54.3 s, n 10,202)</p>
    <p style="font-size:24px;line-height:1.4;margin-top:28px;color:var(--mute)">Ranges promised 90 in 100; they held 91 to 98.</p>
    <p style="font-size:24px;line-height:1.4;margin-top:16px;color:var(--red)">One stop ahead there is no real gain; we show it.</p>
  </div>
  <div class="credit">Insiyab analysis on RTA records, 15 December 2025. Cross-validated by route and community. docs/MODEL-CARD.md</div>
</section>""")

# 8 INSIYAB LIVE (console)
slides.append("""<!-- 8 INSIYAB LIVE -->
<section class="slide" data-notes="Amir talks, Mustafo clicks · 90 s. Switch to the console tab (insiyab.amirkazemkhani.com/ops/). Say: This is Insiyab Live. Map on the left, decisions on the right. At 18:53 it flags route 310: likely 13 minutes late, its bus is still out. It suggests a fix, with the likely effect of each option. Nobody acknowledges. Insiyab does not wait. It asks the driver, depot, station and planning at once, then phones the duty controller with one briefing. The phone on our table rings: the duty controller decides, by phone. Insiyab relays the decision and each person confirms; Received turns teal one by one. Fallback: Demo mode plays the identical sequence with no calls. If the console tab fails, stay on this slide and narrate it.">
  <div class="pad" style="top:88px">
    <h2 style="font-size:72px;color:var(--ivory)">Insiyab Live</h2>
    <p class="lede" style="margin-top:14px;font-size:30px;color:var(--mute-on-ink)">The control-room console. Map on the left, the decision on the right.</p>
  </div>
  <img src="assets/console-live.jpg" alt="The Insiyab Live console: a bus network map on the left; on the right, route 310 likely 13 minutes late, a suggested fix with three options and their likely effect, and the four calls waiting" style="position:absolute;left:140px;top:300px;width:1640px;height:auto;max-height:690px;object-fit:contain;object-position:left top">
  <div class="credit">Demo mode: stand-in alerts and simulated calls, labelled on screen.</div>
</section>""")

# 9 REAL CALL (drill proof)
slides.append("""<!-- 9 THE DRILL PROOF -->
<section class="slide light" data-notes="Mustafo · 40 s. This is the real screen from our drill on 18 November, on our own phones. These are the words four people said on the call: the driver, the depot, the planner, the station. Four reports, one human decision, four confirmations. It is a drill, not an RTA system, and every condition on it is labelled simulated.">
  <div class="pad" style="top:110px">
    <h2 style="font-size:76px;color:var(--ink)">It ran end to end, on real phones.</h2>
    <p class="lede" style="color:var(--mute);font-size:34px;margin-top:20px">18 November 2026 &nbsp;·&nbsp; 4 reports &nbsp;·&nbsp; 1 human decision &nbsp;·&nbsp; 4 confirmations</p>
  </div>
  <img src="assets/call-live.jpg" alt="The rehearsal dashboard showing what the driver, depot, planner and station supervisor reported" style="position:absolute;left:140px;top:360px;max-width:1640px;max-height:600px;width:auto;height:auto;display:block;box-shadow:0 2px 0 rgba(21,24,29,.08),0 24px 60px rgba(21,24,29,.18)">
  <div class="credit">Our rehearsal dashboard during the drill. Conditions simulated and labelled on screen; not an RTA system.</div>
</section>""")

# 10 DUBAI HEAT (stop map)
slides.append("""<!-- 10 DUBAI HEAT -->
<section class="slide light" data-notes="Sara · 30 s. Dubai is not Singapore. Singapore built 200 km of covered walkways. Here, most stops are poles in the sun. Insiyab ranks the same delay higher at a bare pole at 15:00 in July. Each dot is a stop. Ink: air-conditioned shelter. Red: bare pole in the July scenario. Say: 553 air-conditioned shelters, 993 poles, among the stops whose kind RTA published.">
  <div class="pad" style="top:80px">
    <h2 style="font-size:80px;color:var(--ink)">Dubai is not Singapore.</h2>
    <p style="font-size:28px;line-height:1.4;color:var(--mute);margin-top:16px;max-width:1200px">Singapore built 200 km of covered walkways. Here, most stops are poles in the sun. The same delay matters more at a bare pole at 15:00 in July.</p>
  </div>
  <div style="position:absolute;left:140px;top:290px;right:140px;bottom:72px;display:flex;flex-direction:column;gap:0">
    <div style="position:relative;flex:1;min-height:0;overflow:hidden">
      <img src="assets/stops-map.svg" alt="Dubai bus stop dot map: air-conditioned shelters (ink) and bare poles (red), from RTA published data" style="width:100%;height:100%;object-fit:contain;object-position:left top;display:block">
      <div style="position:absolute;top:10px;right:10px;font-size:18px;font-weight:600;color:var(--red);background:rgba(247,245,240,.88);padding:6px 14px;border-radius:3px">Poles in red: July, 15:00 scenario</div>
    </div>
    <p style="font-size:20px;line-height:1.4;color:var(--mute);padding-top:10px;flex-shrink:0">553 air-conditioned shelters · 993 bare poles, among 1,600 stops of known kind</p>
  </div>
  <div class="credit">Stop kinds as published by RTA, 2020 to 2022 reports.</div>
</section>""")

# 11 LANES AND THE LAST MILE
slides.append("""<!-- 11 LANES AND THE LAST MILE -->
<section class="slide light" data-steps="1" data-notes="Sara · 30 s. When RTA opens a bus lane, journeys get up to 59% shorter: Naif Street 59%, Al Satwa 54%, Omar Bin Al Khattab 50%, Al Nahda 38%. A forecast trained before the lane opens is wrong after it. Insiyab flags those routes for retraining. [click] And when a bus is late, Insiyab protects the whole journey: hold the feeder connection, or send a Bus On Demand minibus. 984,929 riders used Bus On Demand in 2025, up 136 per cent.">
  <div class="pad" style="top:120px">
    <h2 style="font-size:72px;color:var(--ink)">When RTA opens a bus lane, journeys get up to 59% shorter.</h2>
    <p style="font-size:26px;line-height:1.4;color:var(--mute);margin-top:24px;max-width:1300px">Naif Street 59%, Al Satwa 54%, Omar Bin Al Khattab 50%, Al Nahda 38%. A forecast trained before the lane opens is wrong after it. Insiyab flags those routes for retraining instead of trusting stale times.</p>
    <div class="step" data-step="1" style="margin-top:56px;padding-top:48px;border-top:2px solid rgba(21,24,29,.12)">
      <h2 style="font-size:64px;color:var(--ink)">When a bus is late, Insiyab protects the whole journey.</h2>
      <p style="font-size:26px;line-height:1.4;color:var(--mute);margin-top:24px;max-width:1300px">Hold the connection, or send a Bus On Demand minibus. Bus On Demand: 984,929 riders in 2025, up 136%, 17 areas, 49 buses.</p>
    </div>
  </div>
  <div class="credit">Bus lanes: Khaleej Times, 21 June 2026. Bus On Demand: Dubai Media Office, 11 May 2026.</div>
</section>""")

# 12 DSS SLIDE
slides.append("""<!-- 12 WITH RTA'S DSS -->
<section class="slide light" data-steps="2" data-notes="Maruf · 30 s. RTA already has a Decision Support System, live since 6 July 2026: it watches more than 1,100 buses, handles 26 scenarios, and picks the right bus in under a minute instead of 30 to 60. [click] Insiyab sits before it and around it: early warning goes in, people come out. Same Dataiku platform. [click] Say clearly: this is a proposal; we have not connected to or tested with RTA's system. If asked about 1,100 versus 1,400 buses: 1,100+ is what the DSS release says it monitors, 1,400 is what control-centre staff told us on 18 November.">
  <div class="pad" style="top:120px">
    <h2 style="font-size:76px;color:var(--ink)">RTA's Decision Support System<br>picks the bus in under a minute.</h2>
    <p style="font-size:30px;line-height:1.45;margin-top:28px;color:var(--mute);max-width:1400px">Live since 6 July 2026: more than 1,100 buses, 26 scenarios, on RTA's Dataiku platform. It used to take 30 to 60 minutes. The calls to staff are still made by hand.</p>
  </div>
  <div class="pad step" data-step="1" style="top:520px;display:grid;grid-template-columns:repeat(6,1fr);column-gap:36px;border-top:2px solid rgba(21,24,29,.14);padding-top:30px">
    <div><p class="own" style="color:#7A5F28">Insiyab</p><p class="st">Predicts early</p><p class="nt">lateness forecast 20 stops ahead</p></div>
    <div><p class="own">RTA DSS</p><p class="st">Picks the bus</p><p class="nt">in under a minute</p></div>
    <div><p class="own" style="color:#7A5F28">Insiyab</p><p class="st">Contacts staff</p><p class="nt">driver, depot, station, planning, at once</p></div>
    <div><p class="own" style="color:#7A5F28">Insiyab</p><p class="st">One briefing</p><p class="nt">the DSS pick and every answer</p></div>
    <div><p class="own" style="color:var(--red)">Controller</p><p class="st">Decides</p><p class="nt">always a person</p></div>
    <div><p class="own" style="color:#7A5F28">Insiyab</p><p class="st">Relays and collects</p><p class="nt">each person confirms</p></div>
  </div>
  <div class="pad step" data-step="2" style="top:800px"><p style="font-family:var(--head);font-weight:800;font-size:56px;color:var(--ink)">The DSS picks the bus. Insiyab handles the people.</p></div>
  <div class="credit">RTA press release, 6 July 2026; RTA control-centre staff, 18 November 2026. A proposal: Insiyab has not been connected to or tested with RTA's system.</div>
</section>""")

# 13 85 IN 100 AND 15% PROOF
slides.append("""<!-- 13 THE PROOF -->
<section class="slide light" data-steps="1" data-notes="Sara · 40 s. Two numbers. First: when a bus is still out on its last trip as its next one is due, that next departure leaves late 85 times in 100. 696 such departures on the day we measured. The signal was visible before anything happened. [click] Second: our trip-time forecast is 15% closer than the timetable, on 2,043 evening trips it had never seen: 6.97 minutes off against 8.25. One day of data; stricter tests give 8 to 10%. Never say delays fell by 15%.">
  <div class="pad" style="top:330px;display:grid;grid-template-columns:1fr 1fr;column-gap:160px">
    <div>
      <div class="num" style="font-size:220px;color:var(--red)">85<span style="font-size:96px"> in 100</span></div>
      <p style="font-size:36px;line-height:1.3;margin-top:34px;font-weight:500">The signal was there.</p>
      <p style="font-size:28px;line-height:1.4;margin-top:16px;color:var(--mute)">When a bus is still out on its last trip as its next one is due, that departure leaves five or more minutes late 85 times in 100.</p>
    </div>
    <div class="step" data-step="1">
      <div class="num" style="font-size:220px;color:var(--ink)">15%</div>
      <p style="font-size:36px;line-height:1.3;margin-top:34px;font-weight:500">Closer than the timetable.</p>
      <p style="font-size:28px;line-height:1.4;margin-top:16px;color:var(--mute)">Trip times forecast on 2,043 evening trips the model never saw: 6.97 minutes off, against 8.25.</p>
    </div>
  </div>
  <div class="credit">Insiyab analysis on RTA records, 15 December 2025. One day of data; stricter tests give 8 to 10%.</div>
</section>""")

# 14 THE ARC 2026/2030/2040
slides.append("""<!-- 14 THE ARC -->
<section class="slide light" data-notes="Sarah · 50 s. Where Insiyab goes. Now: one shift, selected evening routes, eight weeks. We measure controller minutes on calls, departures leaving late, and incidents caught before they happened. 2030: the forecast learns seasons, events, heat and new lanes. Riders get heat-aware arrival times and shaded walking routes. When a bus is late, Insiyab protects the connection and sends an on-demand or autonomous shuttle. Dubai wants 25% of all journeys autonomous by 2030; Insiyab is how they arrive on time. 2040: the city sees tomorrow's problems today.">
  <div class="pad" style="top:80px">
    <h2 style="font-size:72px;color:var(--ink);margin-bottom:48px">The arc</h2>
    <div class="arc-row">
      <div class="arc-year">2026</div>
      <div class="arc-text"><strong>Ask: one control-centre shift, selected evening routes, eight weeks.</strong> Measure controller minutes on calls, departures leaving late, incidents caught early. The forecast is measured. The agent ran end to end.</div>
    </div>
    <div class="arc-row">
      <div class="arc-year">2030</div>
      <div class="arc-text">The forecast learns seasons, events, heat and new lanes. Riders get heat-aware arrival times and shaded walking routes to the stop. When a bus is late, Insiyab protects the connection and sends an on-demand or autonomous shuttle for the last mile. Dubai's target: 25% of all journeys autonomous by 2030.</div>
    </div>
    <div class="arc-row">
      <div class="arc-year">2040</div>
      <div class="arc-text">The Dubai 2040 Urban Master Plan puts people and public transport at the centre. Insiyab is the city's foresight for movement: the control room sees tomorrow's problems today and arranges the fix before anyone waits.</div>
    </div>
  </div>
  <div class="credit">25% autonomous by 2030: Dubai Media Office, 26 September 2025. Dubai 2040 Urban Master Plan: Government of Dubai portal.</div>
</section>""")

# 15 ASK AND CLOSE
slides.append("""<!-- 15 ASK AND CLOSE -->
<section class="slide" data-notes="Amir · 40 s. Silence first. Then: Dubai does not wait for the impossible. It schedules it. Insiyab sees it coming. The controller decides. Hold the QR. Do not explain it.">
  <div class="photo" style="background-image:url(photos/close-1.jpg);left:760px;background-position:30% center"></div>
  <div style="position:absolute;left:0;top:0;bottom:0;width:760px;background:var(--ink)"></div>
  <div style="position:absolute;left:120px;top:110px;width:580px">
    <h2 style="font-size:80px">One shift.<br>Selected routes.<br>Eight weeks.</h2>
    <p style="font-size:24px;line-height:1.5;color:var(--mute-on-ink);margin-top:28px">Measure controller minutes on calls, departures leaving late, incidents caught before they happened.</p>
    <p style="font-family:var(--head);font-weight:800;font-size:38px;line-height:1.15;margin-top:36px">Dubai does not wait for the impossible.<br><span style="color:var(--gold)">It schedules it.</span></p>
    <p style="font-family:var(--head);font-weight:800;font-size:32px;line-height:1.2;margin-top:24px;color:var(--mute-on-ink)">Insiyab sees it coming.<br>The controller decides.</p>
  </div>
  <div style="position:absolute;left:120px;bottom:80px;display:flex;align-items:center;gap:24px">
    <div class="qr" style="width:132px;height:132px;padding:10px"><img src="qr-pitch.svg" alt="QR code to the live site"></div>
    <div style="font-size:20px;color:var(--mute-on-ink)">insiyab.amirkazemkhani.com/pitch</div>
  </div>
  <div class="credit">Route X25 at Al Karama bus station. Photo: Rob Dammers, CC BY-SA 2.0</div>
</section>""")

# BACKUP 1: WHY NOW
slides.append("""<!-- BACKUP 1: WHY NOW -->
<section class="slide light" data-notes="Backup, for Q&amp;A. The UAE Cabinet set a target in April 2026: agentic AI across half of government operations within two years. Insiyab is one small, human-supervised step of that kind.">
  <div class="pad" style="top:120px">
    <p style="font-size:22px;color:var(--mute)">Backup</p>
    <h2 style="font-size:76px;color:var(--ink);margin-top:12px">Why now</h2>
    <p style="font-size:40px;line-height:1.35;margin-top:56px;max-width:1450px">In April 2026 the UAE Cabinet set a goal: agentic AI across 50% of government operations within two years.</p>
    <p style="font-size:30px;line-height:1.5;margin-top:40px;color:var(--mute);max-width:1450px">Insiyab is one bounded step of that kind: an agent that gathers facts and relays a person's decision, for a service half a million people use every day. It also serves We the UAE 2031, the National AI Strategy 2031, the Dubai Economic Agenda D33 and the Dubai 2040 Urban Master Plan.</p>
  </div>
  <div class="credit">Dubai Media Office, 23 April 2026 (UAE Cabinet meeting chaired by His Highness Sheikh Mohammed bin Rashid Al Maktoum). Strategies: u.ae and Government of Dubai portals.</div>
</section>""")

# BACKUP 2: REWARDS
slides.append("""<!-- BACKUP 2: REWARDS -->
<section class="slide light" data-notes="Backup, for Q&amp;A. A proposal only. Always opt-in, nobody asked to wait longer, aggregates only. No partnership with Google or any brand exists.">
  <div class="pad" style="top:120px">
    <p style="font-size:22px;color:var(--mute)">Backup</p>
    <h2 style="font-size:76px;color:var(--ink);margin-top:12px">Next: points for helping others</h2>
    <p style="font-size:36px;line-height:1.4;margin-top:48px;max-width:1450px">Riders could earn nol Plus points for a short, opt-in survey. RTA already runs the points.</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);column-gap:80px;margin-top:72px">
      <div><div class="num" style="font-size:96px">100M+</div><p style="font-size:24px;line-height:1.45;margin-top:14px;color:var(--mute)">Play Store downloads of Google Opinion Rewards (Sept 2024). In the UAE since April 2020.</p></div>
      <div><div class="num" style="font-size:96px">$153bn</div><p style="font-size:24px;line-height:1.45;margin-top:14px;color:var(--mute)">the global insights industry in 2024. Brands pay to learn what customers think.</p></div>
      <div><div class="num" style="font-size:96px">nol Plus</div><p style="font-size:24px;line-height:1.45;margin-top:14px;color:var(--mute)">points on metro, bus, taxi and parking, redeemable as nol credit or partner discounts.</p></div>
    </div>
  </div>
  <div class="credit">9to5Google, 2 Sep 2024; Android Police, 14 Apr 2020; ESOMAR Global Market Research 2025; RTA, 26 Feb 2019. A proposal only: no partnership exists.</div>
</section>""")

# BACKUP 3: SOURCES (updated with new sources)
slides.append("""<!-- BACKUP 3: SOURCES -->
<section class="slide light" data-notes="Backup. Every number traces to one of these.">
  <div class="pad" style="top:80px">
    <h2 style="font-size:64px;color:var(--ink)">Where every number comes from</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:80px;row-gap:22px;margin-top:48px;font-size:20px;line-height:1.45;color:#2a2e35">
      <p><b>RTA records in Dataiku.</b> Running times, fleet list and nol card taps for Monday 15 December 2025: 1,056,343 taps, 544,583 check-ins, 11,201 trips. Not public; rows stay on RTA's platform.</p>
      <p><b>RTA control-centre and planning staff,</b> in conversation with the team, 18 November 2026: six controllers per shift, about 1,400 buses, manual coordination.</p>
      <p><b>RTA, bus passengers by route, monthly.</b> Dubai open data (dataset 459793): 15.28 million bus journeys in December 2025.</p>
      <p><b>Insiyab analysis.</b> Forecast tested on 2,043 evening trips and 35,003 lateness rows not used in training; 244 bus hours 16:00 to 18:59; calling drill 18 November 2026. Code and method in the shared source package.</p>
      <p><b>RTA press release, 6 July 2026:</b> Decision Support System (1,100+ buses, 26 scenarios, under one minute). rta.ae/wps/portal/rta/ae/home/news-and-media/all-news/NewsDetails/enhancing-the-operational-efficiency-of-1100-buses-through-an-ai-powered-system</p>
      <p><b>Bus lanes:</b> Khaleej Times, 21 June 2026. khaleejtimes.com/uae/dubai-new-taxi-bus-lanes. 24% to 59% shorter on routes using dedicated lanes.</p>
      <p><b>Bus On Demand:</b> Dubai Media Office, 11 May 2026. 984,929 riders in 2025, up 136%, 17 areas, 49 buses. mediaoffice.ae/en/news/2026/may/11-05/rta-adds-four-new-areas...</p>
      <p><b>Autonomous journeys 25% by 2030:</b> Dubai Media Office, 26 September 2025. RTA grants first autonomous driving test permits (Apollo Go, WeRide, Pony.ai).</p>
      <p><b>Stop kinds:</b> opendata/public/bus-stops.csv. RTA published kinds from 2020 to 2022 reports: 553 ac_shelter, 993 pole among 4,526 stops (1,600 of known kind).</p>
      <p><b>UAE Cabinet agentic AI goal:</b> Dubai Media Office, 23 April 2026. 50% of government sectors and operations within two years.</p>
      <p><b>Open-Meteo</b> historical weather; <b>UAE public holidays and school terms</b> (Khaleej Times, checked against u.ae).</p>
      <p style="color:var(--mute)"><b>Photographs.</b> Irshad Ahmad, Dwi Setyo, Nihongraphy (Pexels License); Noah Wulf, CC BY-SA 4.0; Rob Dammers, CC BY-SA 2.0 (Wikimedia Commons). Bus stop and control room are representative images, not RTA's.</p>
    </div>
  </div>
</section>""")

# ---------------------------------------------------------------------------
# SCRIPT
# ---------------------------------------------------------------------------
script = r"""
<div id="hint">Arrow keys or click · F full screen · N notes</div>
<div id="notes"></div>
<script>
const stage=document.getElementById('stage');
function fit(){const s=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform=`translate(-50%,-50%) scale(${s})`}
addEventListener('resize',fit);fit();
const slides=[...document.querySelectorAll('.slide')];
let cur=0,step=0;
const notes=document.getElementById('notes');
function render(){
  slides.forEach((s,i)=>s.classList.toggle('on',i===cur));
  slides[cur].querySelectorAll('.step').forEach(e=>e.classList.toggle('shown',+e.dataset.step<=step));
  notes.textContent=`${cur+1}/${slides.length}  ${slides[cur].dataset.notes||''}`;
  try{history.replaceState(null,'','#'+(cur+1))}catch(e){}
}
function steps(){return +(slides[cur].dataset.steps||0)}
function next(){if(step<steps()){step++;render()}else if(cur<slides.length-1){cur++;step=0;render()}}
function prev(){if(step>0){step--;render()}else if(cur>0){cur--;step=steps();render()}}
addEventListener('keydown',e=>{
  hideHint();
  if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(e.key)){e.preventDefault();next()}
  else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){e.preventDefault();prev()}
  else if(e.key==='f'||e.key==='F'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}
  else if(e.key==='n'||e.key==='N'){notes.classList.toggle('on')}
  else if(e.key==='Home'){cur=0;step=0;render()}
});
addEventListener('click',e=>{hideHint();(e.clientX<innerWidth*0.2?prev:next)()});
const hint=document.getElementById('hint');
function hideHint(){hint.style.opacity=0}
setTimeout(hideHint,4000);
const h=parseInt(new URLSearchParams(location.search).get('s')||location.hash.slice(1));
if(h>0&&h<=slides.length){cur=h-1}
const q=new URLSearchParams(location.search);
if(q.has('all')){step=99;document.getElementById('hint').style.display='none'}
render();
</script>
</body>
</html>
"""

# ---------------------------------------------------------------------------
# ASSEMBLE
# ---------------------------------------------------------------------------
parts = [head]
parts.append('\n'.join(slides))
parts.append('\n</div>')  # close #stage
parts.append(script)

html = '\n'.join(parts)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Written {out_path} ({len(html)} chars, ~{len(html.splitlines())} lines)')
print(f'Slides: {len(slides)} main sections')
