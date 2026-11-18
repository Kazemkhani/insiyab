#!/usr/bin/env python3
"""Apply brand kit rebrand to story/index.html in small targeted replacements."""
import sys, re
from pathlib import Path

src = Path('/Users/amirhosseinkazemkhani/work/insiyab-wt-pitch/story/index.html')
html = src.read_text()

# ── 1. Font imports after theme-color meta ───────────────────────────────────
OLD_THEMEMETA = '<meta name="theme-color" content="#0E5A73">'
NEW_THEMEMETA = '''<meta name="theme-color" content="#15181D">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Overpass:wght@600;800&display=swap" rel="stylesheet">'''
assert OLD_THEMEMETA in html, "theme-color meta not found"
html = html.replace(OLD_THEMEMETA, NEW_THEMEMETA, 1)

# ── 2. Update :root CSS variables + add font-face declarations ───────────────
OLD_ROOT = ':root{--sea:#0E5A73;--red:#E21F26;--gold:#C8A24A;--goldtext:#7E5F17;--sand:#F5EFE3;--card:#FFFCF6;--line:#E4D9C4;--ink:#1E1A16;--muted:#6F6350}'
NEW_ROOT = '''@font-face{font-family:"IBM Plex Sans";src:url(deck/brand/fonts/IBMPlexSans-Regular.ttf);font-weight:400}
@font-face{font-family:"IBM Plex Sans";src:url(deck/brand/fonts/IBMPlexSans-Medium.ttf);font-weight:500}
@font-face{font-family:"IBM Plex Sans";src:url(deck/brand/fonts/IBMPlexSans-SemiBold.ttf);font-weight:600}
:root{
--ivory:#F7F5F0;--ink:#15181D;--gold:#9C7B3E;--red:#C42B2B;--teal:#2E7D6B;
--muted:#5A6068;--mute-on-ink:#A9AEB5;
--sea:#2E7D6B;--goldtext:#7E5F17;--sand:#F7F5F0;--card:#F7F5F0;--line:#E0DFDB;
--head:"Overpass","Helvetica Neue",Arial,sans-serif;
--text:"IBM Plex Sans","Helvetica Neue",Arial,sans-serif;
--arabic:"Noto Kufi Arabic",sans-serif;
--ease:cubic-bezier(0.4,0,0.2,1);
}'''
assert OLD_ROOT in html, ":root block not found"
html = html.replace(OLD_ROOT, NEW_ROOT, 1)

# ── 3. Update body font-family ───────────────────────────────────────────────
OLD_BODY = 'body{background:var(--sand);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5}'
NEW_BODY = 'body{background:var(--sand);color:var(--ink);font-family:var(--text);-webkit-font-smoothing:antialiased;line-height:1.5}'
assert OLD_BODY in html, "body rule not found"
html = html.replace(OLD_BODY, NEW_BODY, 1)

# ── 4. Add heading font-family to .big, h1, h2, h3 ──────────────────────────
OLD_EY = '.ey{font-size:14px;color:var(--sea);font-weight:600;margin-bottom:14px}'
NEW_EY = '''.ey{font-size:14px;color:var(--teal);font-weight:600;margin-bottom:14px}
.big,.cap h2,.cap .num{font-family:var(--head)}
h1,h2,h3{font-family:var(--head)}
#film h1{font-family:var(--head)}'''
assert OLD_EY in html, ".ey rule not found"
html = html.replace(OLD_EY, NEW_EY, 1)

# ── 5. Update nav background to ink (from sea) ───────────────────────────────
OLD_NAV = 'nav{position:fixed;top:0;left:0;right:0;z-index:50;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:var(--sea);color:#CFE1E6;font-size:13px;border-bottom:3px solid var(--gold)}'
NEW_NAV = 'nav{position:fixed;top:0;left:0;right:0;z-index:50;height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:var(--ink);color:var(--mute-on-ink);font-size:13px;border-bottom:2px solid var(--gold)}'
assert OLD_NAV in html, "nav rule not found"
html = html.replace(OLD_NAV, NEW_NAV, 1)

# ── 6. Update nav .brand ──────────────────────────────────────────────────────
OLD_BRAND = 'nav .brand{color:#fff;font-weight:600;font-size:17px}\nnav .brand span{color:var(--gold)}'
NEW_BRAND = 'nav .brand{display:inline-flex;align-items:center;line-height:1}'
assert OLD_BRAND in html, "nav .brand rule not found"
html = html.replace(OLD_BRAND, NEW_BRAND, 1)

# ── 7. Add splash overlay CSS before .reveal ─────────────────────────────────
OLD_REVEAL = '.reveal{opacity:0;transform:translateY(32px);transition:opacity 1s ease,transform 1s ease}'
NEW_REVEAL = '''/* loading splash */
#splash{position:fixed;inset:0;z-index:9999;background:var(--ink);display:flex;align-items:center;justify-content:center;transition:opacity 500ms var(--ease)}
#splash.out{opacity:0;pointer-events:none}
#splash svg{height:160px;width:auto;display:block}
#splash #sp-upper,#splash #sp-lower{clip-path:inset(0 100% 0 0)}
#splash #sp-aw,#splash #sp-lw{opacity:0}
#splash.ready #sp-upper{animation:sp-reveal 800ms var(--ease) 0ms forwards}
#splash.ready #sp-lower{animation:sp-reveal 800ms var(--ease) 120ms forwards}
#splash.ready #sp-aw,#splash.ready #sp-lw{animation:sp-fade 600ms var(--ease) 200ms forwards}
@keyframes sp-reveal{to{clip-path:inset(0 0 0 0)}}
@keyframes sp-fade{to{opacity:1}}
@media(prefers-reduced-motion:reduce){
#splash #sp-upper,#splash #sp-lower{clip-path:none;opacity:0}
#splash.ready #sp-upper,#splash.ready #sp-lower,#splash.ready #sp-aw,#splash.ready #sp-lw{animation:none;clip-path:none;opacity:1}
}
/* photo hero */
.photo-hero{position:relative;min-height:min(55vh,500px);overflow:hidden;display:flex;align-items:flex-end}
.photo-hero .ph-img{position:absolute;inset:0;background-size:cover;background-position:center}
.photo-hero .ph-scrim{position:absolute;inset:0;background:linear-gradient(to top,rgba(21,24,29,.88) 0%,rgba(21,24,29,.55) 40%,rgba(21,24,29,0) 70%)}
.photo-hero .ph-credit{position:absolute;right:16px;bottom:10px;font-size:11px;color:rgba(247,245,240,.6);text-align:right;line-height:1.4;z-index:1}
.reveal{opacity:0;transform:translateY(32px);transition:opacity 1s ease,transform 1s ease}'''
assert OLD_REVEAL in html, ".reveal rule not found"
html = html.replace(OLD_REVEAL, NEW_REVEAL, 1)

# ── 8. Update #film CSS to include position:relative ─────────────────────────
OLD_FILM_CSS = '#film{min-height:100vh;background:#0A4558;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:84px 24px 36px;gap:22px;text-align:center}'
NEW_FILM_CSS = '#film{min-height:100vh;background:var(--ink);color:var(--ivory);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:84px 24px 36px;gap:22px;text-align:center;position:relative}'
assert OLD_FILM_CSS in html, "#film CSS not found"
html = html.replace(OLD_FILM_CSS, NEW_FILM_CSS, 1)

OLD_FILM_EY2 = '#film .ey2{font-size:13px;font-weight:600;color:var(--gold);letter-spacing:.02em}'
NEW_FILM_EY2 = '#film .ey2{font-size:13px;font-weight:600;color:var(--gold);position:relative;z-index:1}'
assert OLD_FILM_EY2 in html, "#film .ey2 rule not found"
html = html.replace(OLD_FILM_EY2, NEW_FILM_EY2, 1)

# Make #film h1 and content use position:relative so they sit above the photo
OLD_FILM_H1_CSS = '#film h1{font-size:clamp(40px,5vw,72px);line-height:1.05;max-width:900px}'
NEW_FILM_H1_CSS = '#film h1{font-size:clamp(40px,5vw,72px);line-height:1.05;max-width:900px;position:relative;z-index:1;color:var(--ivory)}'
assert OLD_FILM_H1_CSS in html, "#film h1 rule not found"
html = html.replace(OLD_FILM_H1_CSS, NEW_FILM_H1_CSS, 1)

OLD_FILM_OPENING = '#film .opening{max-width:780px;font-size:20px;line-height:1.5;text-align:left}'
NEW_FILM_OPENING = '#film .opening{max-width:780px;font-size:20px;line-height:1.5;text-align:left;position:relative;z-index:1}'
assert OLD_FILM_OPENING in html, "#film .opening rule not found"
html = html.replace(OLD_FILM_OPENING, NEW_FILM_OPENING, 1)

OLD_FILM_PLAYER_CSS = '#film .film-player{max-width:1120px;width:100%;text-align:left;font-size:14px;scroll-margin-top:90px}'
NEW_FILM_PLAYER_CSS = '#film .film-player{max-width:1120px;width:100%;text-align:left;font-size:14px;scroll-margin-top:90px;position:relative;z-index:1}'
assert OLD_FILM_PLAYER_CSS in html, "#film .film-player rule not found"
html = html.replace(OLD_FILM_PLAYER_CSS, NEW_FILM_PLAYER_CSS, 1)

OLD_FILM_ROW_CSS = '#film .row{display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:14px;color:#CFE1E6}'
NEW_FILM_ROW_CSS = '#film .row{display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap;font-size:14px;color:var(--mute-on-ink);position:relative;z-index:1}'
assert OLD_FILM_ROW_CSS in html, "#film .row rule not found"
html = html.replace(OLD_FILM_ROW_CSS, NEW_FILM_ROW_CSS, 1)

OLD_FILM_GONE = '#film .gone{max-width:560px;font-size:17px;color:#CFE1E6}'
NEW_FILM_GONE = '#film .gone{max-width:560px;font-size:17px;color:var(--mute-on-ink);position:relative;z-index:1}'
assert OLD_FILM_GONE in html, "#film .gone rule not found"
html = html.replace(OLD_FILM_GONE, NEW_FILM_GONE, 1)

# ── 9. Update the ask section to use teal ────────────────────────────────────
OLD_ASK = '.ask{background:var(--sea);color:#fff;text-align:center}'
NEW_ASK = '.ask{background:var(--ink);color:var(--ivory);text-align:center}'
assert OLD_ASK in html, ".ask rule not found"
html = html.replace(OLD_ASK, NEW_ASK, 1)

OLD_ASK_LEDE = '.ask .lede{color:#CFE1E6;margin-left:auto;margin-right:auto}'
NEW_ASK_LEDE = '.ask .lede{color:var(--mute-on-ink);margin-left:auto;margin-right:auto}'
assert OLD_ASK_LEDE in html, ".ask .lede rule not found"
html = html.replace(OLD_ASK_LEDE, NEW_ASK_LEDE, 1)

# ── 10. Nav: replace text brand link with inline SVG lockup ──────────────────
OLD_NAV_HTML = '<nav>\n  <a class="brand" href="#film">Insiyab<span>.</span></a>\n  <div class="links">\n    <a href="#film-player">Film</a>\n    <a href="#descent">Bus journey</a>\n    <a href="#problem">The problem</a>\n    <a href="#answer">Our answer</a>\n    <a href="#built">How it\'s built</a>\n    <a class="live" href="https://dss-8a0eac1b-a0da2b15-dku.eu-west-2.app.dataiku.io/projects/INSIYAB/webapps/kvDViy2_insiyab/view" target="_blank" rel="noopener">Live in Dataiku</a>\n  </div>\n</nav>'
# The nav SVG: symbol + wordmarks at nav height 28px (viewBox 620x240)
NAV_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="28" viewBox="0 0 620 240" role="img" aria-label="Insiyab" style="display:block"><g transform="translate(-12 -12) scale(2.2)"><path d="M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z" fill="#F7F5F0"/><path d="M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z" fill="#F7F5F0"/></g><path fill="#F7F5F0" d="M405 192Q377 192 361.0 175.0Q345 158 345 128Q345 97 361.0 80.5Q377 64 405 64Q433 64 448.5 81.0Q464 98 464 128Q464 157 448.5 174.5Q433 192 405 192ZM256 0Q168 0 116.5 -52.5Q65 -105 65 -196Q65 -220 68.5 -247.5Q72 -275 78.5 -301.0Q85 -327 92 -347H190Q183 -313 179.0 -278.0Q175 -243 175 -208Q175 -156 201.0 -124.0Q227 -92 269 -92H616V-488H723V0ZM1147 -92Q1152 -92 1152 -88V-5Q1152 0 1147 0H908V-760H1017V-92ZM1251 211Q1225 211 1208.0 195.0Q1191 179 1191 147Q1191 114 1208.0 98.5Q1225 83 1251 83Q1278 83 1294.0 99.5Q1310 116 1310 147Q1310 177 1294.0 194.0Q1278 211 1251 211ZM1423 211Q1395 211 1379.0 194.0Q1363 177 1363 147Q1363 116 1379.0 99.5Q1395 83 1423 83Q1451 83 1466.5 100.5Q1482 118 1482 147Q1482 176 1466.5 193.5Q1451 211 1423 211ZM1137 0Q1132 0 1132 -5V-88Q1132 -92 1137 -92H1297V-488H1406V-92H1556Q1561 -92 1561 -88V-5Q1561 0 1556 0ZM2219 0Q2175 0 2136.5 -16.5Q2098 -33 2060 -72Q2036 -39 1997.5 -19.5Q1959 0 1907 0H1546Q1541 0 1541 -5V-88Q1541 -92 1546 -92H1683V-410H1789V-92H1890Q1938 -92 1964.0 -122.5Q1990 -153 1990 -208V-410H2096V-201Q2096 -191 2096.0 -182.0Q2096 -173 2094 -164Q2119 -124 2147.0 -108.0Q2175 -92 2218 -92H2280V-488H2386V-92H2519Q2524 -92 2524 -88V-5Q2524 0 2519 0ZM2663 -587Q2636 -587 2620.0 -604.0Q2604 -621 2604 -651Q2604 -682 2619.5 -698.5Q2635 -715 2663 -715Q2692 -715 2707.5 -698.0Q2723 -681 2723 -651Q2723 -622 2707.0 -604.5Q2691 -587 2663 -587ZM2509 0Q2504 0 2504 -5V-88Q2504 -92 2509 -92H2639V-488H2748V0ZM2933 -760H3042V0H2933Z" transform="matrix(0.10917031 0 0 0.10917031 277.90393013 92.38358659)"/><path fill="#F7F5F0" d="M56 0V-92H151V-606H56V-698H360V-606H264V-92H360V0ZM494 0V-520H603V-434H608Q625 -476 659.5 -504.0Q694 -532 754 -532Q834 -532 878.5 -479.5Q923 -427 923 -330V0H814V-316Q814 -438 716 -438Q695 -438 674.5 -432.5Q654 -427 638.0 -416.0Q622 -405 612.5 -388.0Q603 -371 603 -348V0ZM1239 12Q1165 12 1115.0 -14.0Q1065 -40 1028 -86L1098 -150Q1127 -115 1162.5 -95.5Q1198 -76 1245 -76Q1293 -76 1316.5 -94.5Q1340 -113 1340 -146Q1340 -171 1323.5 -188.5Q1307 -206 1266 -211L1218 -217Q1138 -227 1092.5 -263.5Q1047 -300 1047 -372Q1047 -410 1061.0 -439.5Q1075 -469 1100.5 -489.5Q1126 -510 1161.5 -521.0Q1197 -532 1240 -532Q1310 -532 1354.5 -510.0Q1399 -488 1434 -449L1367 -385Q1347 -409 1314.5 -426.5Q1282 -444 1240 -444Q1195 -444 1173.5 -426.0Q1152 -408 1152 -379Q1152 -349 1171.0 -334.0Q1190 -319 1232 -312L1280 -306Q1366 -293 1405.5 -255.5Q1445 -218 1445 -155Q1445 -117 1430.5 -86.5Q1416 -56 1389.0 -34.0Q1362 -12 1324.0 0.0Q1286 12 1239 12ZM1623 -613Q1589 -613 1573.5 -629.0Q1558 -645 1558 -670V-687Q1558 -712 1573.5 -728.0Q1589 -744 1623 -744Q1657 -744 1672.0 -728.0Q1687 -712 1687 -687V-670Q1687 -645 1672.0 -629.0Q1657 -613 1623 -613ZM1568 -520H1677V0H1568ZM2152 -520H2257L2038 103Q2029 129 2017.5 147.5Q2006 166 1990.5 177.5Q1975 189 1953.0 194.5Q1931 200 1901 200H1838V111H1926L1956 23L1767 -520H1876L1980 -214L2010 -101H2015L2048 -214ZM2714 0Q2671 0 2648.0 -24.5Q2625 -49 2620 -87H2615Q2600 -38 2560.0 -13.0Q2520 12 2463 12Q2382 12 2338.5 -30.0Q2295 -72 2295 -143Q2295 -221 2351.5 -260.0Q2408 -299 2517 -299H2611V-343Q2611 -391 2585.0 -417.0Q2559 -443 2504 -443Q2458 -443 2429.0 -423.0Q2400 -403 2380 -372L2315 -431Q2341 -475 2388.0 -503.5Q2435 -532 2511 -532Q2612 -532 2666.0 -485.0Q2720 -438 2720 -350V-89H2775V0ZM2494 -71Q2545 -71 2578.0 -93.5Q2611 -116 2611 -154V-229H2519Q2406 -229 2406 -159V-141Q2406 -106 2429.5 -88.5Q2453 -71 2494 -71ZM2882 -740H2991V-434H2996Q3013 -481 3051.5 -506.5Q3090 -532 3142 -532Q3241 -532 3295.0 -460.5Q3349 -389 3349 -260Q3349 -131 3295.0 -59.5Q3241 12 3142 12Q3090 12 3051.5 -14.0Q3013 -40 2996 -86H2991V0H2882ZM3109 -82Q3166 -82 3200.0 -118.5Q3234 -155 3234 -215V-305Q3234 -365 3200.0 -401.5Q3166 -438 3109 -438Q3059 -438 3025.0 -413.5Q2991 -389 2991 -349V-171Q2991 -131 3025.0 -106.5Q3059 -82 3109 -82Z" transform="matrix(0.09869420 0 0 0.09869420 279.47312481 210.84700576)"/></svg>'
NEW_NAV_HTML = '''<nav>
  <a class="brand" href="#film" aria-label="Insiyab">''' + NAV_SVG + '''</a>
  <div class="links">
    <a href="#film-player">Film</a>
    <a href="#descent">Bus journey</a>
    <a href="#problem">The problem</a>
    <a href="#answer">Our answer</a>
    <a href="#built">How it's built</a>
    <a href="deck/">Executive deck</a>
    <a class="live" href="https://dss-8a0eac1b-a0da2b15-dku.eu-west-2.app.dataiku.io/projects/INSIYAB/webapps/kvDViy2_insiyab/view" target="_blank" rel="noopener">Live in Dataiku</a>
  </div>
</nav>'''
assert OLD_NAV_HTML in html, "nav HTML not found"
html = html.replace(OLD_NAV_HTML, NEW_NAV_HTML, 1)

# ── 11. Add photo background to #film (before ey2 paragraph) ─────────────────
OLD_FILM_HEADER = '<header id="film">\n  <p class="ey2">Student prototype'
NEW_FILM_HEADER = '''<header id="film">
  <div style="position:absolute;inset:0;background-image:url(deck/photos/title-3.jpg);background-size:cover;background-position:center;z-index:0" aria-hidden="true"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(21,24,29,.92) 0%,rgba(21,24,29,.60) 40%,rgba(21,24,29,.30) 100%);z-index:0" aria-hidden="true"></div>
  <p style="position:absolute;right:16px;bottom:10px;font-size:11px;color:rgba(247,245,240,.55);z-index:1;text-align:right" aria-label="Photo credit">Sheikh Zayed Road at night. Photo: Irshad Ahmad, Pexels</p>
  <p class="ey2">Student prototype'''
assert OLD_FILM_HEADER in html, "#film header not found"
html = html.replace(OLD_FILM_HEADER, NEW_FILM_HEADER, 1)

# ── 12. Add problem section photo opener ──────────────────────────────────────
OLD_PROBLEM = '<section id="problem" class="alt">\n  <div class="wrap">'
NEW_PROBLEM = '''<section id="problem" class="alt">
  <div class="photo-hero">
    <div class="ph-img" style="background-image:url(deck/photos/scale-2.jpg)" aria-hidden="true"></div>
    <div class="ph-scrim" aria-hidden="true"></div>
    <p class="ph-credit">RTA records, 15 December 2025. Photo: Nihongraphy, Pexels</p>
  </div>
  <div class="wrap">'''
assert OLD_PROBLEM in html, "#problem section not found"
html = html.replace(OLD_PROBLEM, NEW_PROBLEM, 1)

# ── 13. Update footer background ─────────────────────────────────────────────
OLD_FOOTER_CSS = 'footer{background:var(--ink);color:#B9AE9A;font-size:13px;padding:40px 24px}'
NEW_FOOTER_CSS = 'footer{background:var(--ink);color:var(--mute-on-ink);font-size:13px;padding:40px 24px}'
assert OLD_FOOTER_CSS in html, "footer rule not found"
html = html.replace(OLD_FOOTER_CSS, NEW_FOOTER_CSS, 1)

# ── 14. Add splash HTML at start of body ──────────────────────────────────────
# The splash SVG uses IDs sp-upper, sp-lower, sp-aw, sp-lw to avoid collisions
SPLASH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="465" height="180" viewBox="0 0 620 240" role="img" aria-label="Insiyab" style="display:block"><g transform="translate(-12 -12) scale(2.2)"><g id="sp-upper"><path d="M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z" fill="#F7F5F0"/></g><g id="sp-lower"><path d="M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z" fill="#F7F5F0"/></g></g><g id="sp-aw" aria-label="انسياب"><path fill="#F7F5F0" d="M405 192Q377 192 361.0 175.0Q345 158 345 128Q345 97 361.0 80.5Q377 64 405 64Q433 64 448.5 81.0Q464 98 464 128Q464 157 448.5 174.5Q433 192 405 192ZM256 0Q168 0 116.5 -52.5Q65 -105 65 -196Q65 -220 68.5 -247.5Q72 -275 78.5 -301.0Q85 -327 92 -347H190Q183 -313 179.0 -278.0Q175 -243 175 -208Q175 -156 201.0 -124.0Q227 -92 269 -92H616V-488H723V0ZM1147 -92Q1152 -92 1152 -88V-5Q1152 0 1147 0H908V-760H1017V-92ZM1251 211Q1225 211 1208.0 195.0Q1191 179 1191 147Q1191 114 1208.0 98.5Q1225 83 1251 83Q1278 83 1294.0 99.5Q1310 116 1310 147Q1310 177 1294.0 194.0Q1278 211 1251 211ZM1423 211Q1395 211 1379.0 194.0Q1363 177 1363 147Q1363 116 1379.0 99.5Q1395 83 1423 83Q1451 83 1466.5 100.5Q1482 118 1482 147Q1482 176 1466.5 193.5Q1451 211 1423 211ZM1137 0Q1132 0 1132 -5V-88Q1132 -92 1137 -92H1297V-488H1406V-92H1556Q1561 -92 1561 -88V-5Q1561 0 1556 0ZM2219 0Q2175 0 2136.5 -16.5Q2098 -33 2060 -72Q2036 -39 1997.5 -19.5Q1959 0 1907 0H1546Q1541 0 1541 -5V-88Q1541 -92 1546 -92H1683V-410H1789V-92H1890Q1938 -92 1964.0 -122.5Q1990 -153 1990 -208V-410H2096V-201Q2096 -191 2096.0 -182.0Q2096 -173 2094 -164Q2119 -124 2147.0 -108.0Q2175 -92 2218 -92H2280V-488H2386V-92H2519Q2524 -92 2524 -88V-5Q2524 0 2519 0ZM2663 -587Q2636 -587 2620.0 -604.0Q2604 -621 2604 -651Q2604 -682 2619.5 -698.5Q2635 -715 2663 -715Q2692 -715 2707.5 -698.0Q2723 -681 2723 -651Q2723 -622 2707.0 -604.5Q2691 -587 2663 -587ZM2509 0Q2504 0 2504 -5V-88Q2504 -92 2509 -92H2639V-488H2748V0ZM2933 -760H3042V0H2933Z" transform="matrix(0.10917031 0 0 0.10917031 277.90393013 92.38358659)"/></g><g id="sp-lw" aria-label="Insiyab"><path fill="#F7F5F0" d="M56 0V-92H151V-606H56V-698H360V-606H264V-92H360V0ZM494 0V-520H603V-434H608Q625 -476 659.5 -504.0Q694 -532 754 -532Q834 -532 878.5 -479.5Q923 -427 923 -330V0H814V-316Q814 -438 716 -438Q695 -438 674.5 -432.5Q654 -427 638.0 -416.0Q622 -405 612.5 -388.0Q603 -371 603 -348V0ZM1239 12Q1165 12 1115.0 -14.0Q1065 -40 1028 -86L1098 -150Q1127 -115 1162.5 -95.5Q1198 -76 1245 -76Q1293 -76 1316.5 -94.5Q1340 -113 1340 -146Q1340 -171 1323.5 -188.5Q1307 -206 1266 -211L1218 -217Q1138 -227 1092.5 -263.5Q1047 -300 1047 -372Q1047 -410 1061.0 -439.5Q1075 -469 1100.5 -489.5Q1126 -510 1161.5 -521.0Q1197 -532 1240 -532Q1310 -532 1354.5 -510.0Q1399 -488 1434 -449L1367 -385Q1347 -409 1314.5 -426.5Q1282 -444 1240 -444Q1195 -444 1173.5 -426.0Q1152 -408 1152 -379Q1152 -349 1171.0 -334.0Q1190 -319 1232 -312L1280 -306Q1366 -293 1405.5 -255.5Q1445 -218 1445 -155Q1445 -117 1430.5 -86.5Q1416 -56 1389.0 -34.0Q1362 -12 1324.0 0.0Q1286 12 1239 12ZM1623 -613Q1589 -613 1573.5 -629.0Q1558 -645 1558 -670V-687Q1558 -712 1573.5 -728.0Q1589 -744 1623 -744Q1657 -744 1672.0 -728.0Q1687 -712 1687 -687V-670Q1687 -645 1672.0 -629.0Q1657 -613 1623 -613ZM1568 -520H1677V0H1568ZM2152 -520H2257L2038 103Q2029 129 2017.5 147.5Q2006 166 1990.5 177.5Q1975 189 1953.0 194.5Q1931 200 1901 200H1838V111H1926L1956 23L1767 -520H1876L1980 -214L2010 -101H2015L2048 -214ZM2714 0Q2671 0 2648.0 -24.5Q2625 -49 2620 -87H2615Q2600 -38 2560.0 -13.0Q2520 12 2463 12Q2382 12 2338.5 -30.0Q2295 -72 2295 -143Q2295 -221 2351.5 -260.0Q2408 -299 2517 -299H2611V-343Q2611 -391 2585.0 -417.0Q2559 -443 2504 -443Q2458 -443 2429.0 -423.0Q2400 -403 2380 -372L2315 -431Q2341 -475 2388.0 -503.5Q2435 -532 2511 -532Q2612 -532 2666.0 -485.0Q2720 -438 2720 -350V-89H2775V0ZM2494 -71Q2545 -71 2578.0 -93.5Q2611 -116 2611 -154V-229H2519Q2406 -229 2406 -159V-141Q2406 -106 2429.5 -88.5Q2453 -71 2494 -71ZM2882 -740H2991V-434H2996Q3013 -481 3051.5 -506.5Q3090 -532 3142 -532Q3241 -532 3295.0 -460.5Q3349 -389 3349 -260Q3349 -131 3295.0 -59.5Q3241 12 3142 12Q3090 12 3051.5 -14.0Q3013 -40 2996 -86H2991V0H2882ZM3109 -82Q3166 -82 3200.0 -118.5Q3234 -155 3234 -215V-305Q3234 -365 3200.0 -401.5Q3166 -438 3109 -438Q3059 -438 3025.0 -413.5Q2991 -389 2991 -349V-171Q2991 -131 3025.0 -106.5Q3059 -82 3109 -82Z" transform="matrix(0.09869420 0 0 0.09869420 279.47312481 210.84700576)"/></g></svg>'

OLD_BODY_OPEN = '<body>\n\n<nav>'
NEW_BODY_OPEN = '''<body>
<div id="splash" role="presentation" aria-hidden="true">''' + SPLASH_SVG + '''</div>

<nav>'''
assert OLD_BODY_OPEN in html, "<body> open not found"
html = html.replace(OLD_BODY_OPEN, NEW_BODY_OPEN, 1)

# ── 15. Add splash JS before closing </script> ────────────────────────────────
OLD_SCRIPT_END = '})();\n</script>\n</body>'
# Note: check that this pattern matches; there may be minor whitespace issues
if OLD_SCRIPT_END not in html:
    # Try alternate
    OLD_SCRIPT_END = '})();\n</script>'
    assert OLD_SCRIPT_END in html, "script end not found"
    NEW_SCRIPT_END = '''})();
// Splash: brand kit loading moment, skipped if already seen or reduced-motion
(function(){
  var s=document.getElementById('splash');
  if(!s)return;
  try{if(sessionStorage.getItem('insiyab-splash'))return void s.remove()}catch(e){}
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){s.remove();return}
  requestAnimationFrame(function(){
    s.classList.add('ready');
    setTimeout(function(){
      s.classList.add('out');
      s.addEventListener('transitionend',function(){
        s.remove();
        try{sessionStorage.setItem('insiyab-splash','1')}catch(e){}
      },{once:true});
    },1200);
  });
})();
</script>'''
else:
    NEW_SCRIPT_END = '''})();
// Splash: brand kit loading moment, skipped if already seen or reduced-motion
(function(){
  var s=document.getElementById('splash');
  if(!s)return;
  try{if(sessionStorage.getItem('insiyab-splash'))return void s.remove()}catch(e){}
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){s.remove();return}
  requestAnimationFrame(function(){
    s.classList.add('ready');
    setTimeout(function(){
      s.classList.add('out');
      s.addEventListener('transitionend',function(){
        s.remove();
        try{sessionStorage.setItem('insiyab-splash','1')}catch(e){}
      },{once:true});
    },1200);
  });
})();
</script>
</body>'''
html = html.replace(OLD_SCRIPT_END, NEW_SCRIPT_END, 1)

src.write_text(html)
print(f"Written {len(html)} chars to {src}")
