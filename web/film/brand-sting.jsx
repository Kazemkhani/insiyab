import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence,
  useCurrentFrame, interpolate, staticFile
} from 'remotion';

// ── brand tokens ──────────────────────────────────────────────────────────────
const ivory  = '#F7F5F0';
const ink    = '#15181D';
const gold   = '#9C7B3E';
const teal   = '#2E7D6B';
const ink10  = '#E0DFDB';
const ink25  = '#BFBEBB';
const ink50  = '#868787';
const teal50 = '#93B9AE';

const FPS   = 30;
const W     = 1920;
const H     = 1080;
const TOTAL = 180; // 6 s exactly

// ── cubic-bezier(0.4, 0, 0.2, 1) ─────────────────────────────────────────────
function cbEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const x1 = 0.4, y1 = 0, x2 = 0.2, y2 = 1;
  const bx = s => 3*s*(1-s)*(1-s)*x1 + 3*s*s*(1-s)*x2 + s*s*s;
  const by = s => 3*s*(1-s)*(1-s)*y1 + 3*s*s*(1-s)*y2 + s*s*s;
  let s = t;
  for (let i = 0; i < 10; i++) {
    const dx = bx(s) - t;
    const dBxDs = 3*(1-s)*(1-s)*x1 + 6*s*(1-s)*(x2-x1) + 3*s*s*(1-x2);
    s = Math.max(0, Math.min(1, s - dx / (Math.abs(dBxDs) < 1e-6 ? 1e-6 : dBxDs)));
  }
  return by(s);
}

function ci(frame, a, b, va, vb) {
  return interpolate(frame, [a, b], [va, vb], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: cbEase,
  });
}

// ── Fonts ─────────────────────────────────────────────────────────────────────
function Fonts() {
  return (
    <style>{`
      @font-face { font-family: Plex; font-weight: 400;
        src: url('${staticFile('fonts/ibm-plex-sans-400.woff2')}') format('woff2'); }
      @font-face { font-family: Plex; font-weight: 500;
        src: url('${staticFile('fonts/ibm-plex-sans-500.woff2')}') format('woff2'); }
    `}</style>
  );
}

// ── Logo SVG (symbol + wordmarks, no clipPath — reveals via wipe overlay) ────
// viewBox 0 0 620 240.
// Symbol: transform translate(-12,-12) scale(2.2), paths in x: 10-110 → screen x: 10-230
// Wordmarks: outlined paths at their authored positions, x ≈ 278-620.
function LogoSVG({ wordmarkOpacity = 1, scale = 1 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 620 240"
      style={{ width: 620 * scale, height: 240 * scale, display: 'block' }}
    >
      {/* Symbol masses — always rendered at full opacity; wipe overlay controls reveal */}
      <g transform="translate(-12 -12) scale(2.2)">
        <path d="M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z" fill={ink}/>
        <path d="M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z" fill={ink}/>
      </g>
      {/* Wordmarks — controlled via opacity */}
      <g opacity={wordmarkOpacity}>
        <path fill={ink}
          d="M405 192Q377 192 361.0 175.0Q345 158 345 128Q345 97 361.0 80.5Q377 64 405 64Q433 64 448.5 81.0Q464 98 464 128Q464 157 448.5 174.5Q433 192 405 192ZM256 0Q168 0 116.5 -52.5Q65 -105 65 -196Q65 -220 68.5 -247.5Q72 -275 78.5 -301.0Q85 -327 92 -347H190Q183 -313 179.0 -278.0Q175 -243 175 -208Q175 -156 201.0 -124.0Q227 -92 269 -92H616V-488H723V0ZM1147 -92Q1152 -92 1152 -88V-5Q1152 0 1147 0H908V-760H1017V-92ZM1251 211Q1225 211 1208.0 195.0Q1191 179 1191 147Q1191 114 1208.0 98.5Q1225 83 1251 83Q1278 83 1294.0 99.5Q1310 116 1310 147Q1310 177 1294.0 194.0Q1278 211 1251 211ZM1423 211Q1395 211 1379.0 194.0Q1363 177 1363 147Q1363 116 1379.0 99.5Q1395 83 1423 83Q1451 83 1466.5 100.5Q1482 118 1482 147Q1482 176 1466.5 193.5Q1451 211 1423 211ZM1137 0Q1132 0 1132 -5V-88Q1132 -92 1137 -92H1297V-488H1406V-92H1556Q1561 -92 1561 -88V-5Q1561 0 1556 0ZM2219 0Q2175 0 2136.5 -16.5Q2098 -33 2060 -72Q2036 -39 1997.5 -19.5Q1959 0 1907 0H1546Q1541 0 1541 -5V-88Q1541 -92 1546 -92H1683V-410H1789V-92H1890Q1938 -92 1964.0 -122.5Q1990 -153 1990 -208V-410H2096V-201Q2096 -191 2096.0 -182.0Q2096 -173 2094 -164Q2119 -124 2147.0 -108.0Q2175 -92 2218 -92H2280V-488H2386V-92H2519Q2524 -92 2524 -88V-5Q2524 0 2519 0ZM2663 -587Q2636 -587 2620.0 -604.0Q2604 -621 2604 -651Q2604 -682 2619.5 -698.5Q2635 -715 2663 -715Q2692 -715 2707.5 -698.0Q2723 -681 2723 -651Q2723 -622 2707.0 -604.5Q2691 -587 2663 -587ZM2509 0Q2504 0 2504 -5V-88Q2504 -92 2509 -92H2639V-488H2748V0ZM2933 -760H3042V0H2933Z"
          transform="matrix(0.10917031 0 0 0.10917031 277.90393013 92.38358659)"
          aria-label="انسياب"
        />
        <path fill={ink}
          d="M56 0V-92H151V-606H56V-698H360V-606H264V-92H360V0ZM494 0V-520H603V-434H608Q625 -476 659.5 -504.0Q694 -532 754 -532Q834 -532 878.5 -479.5Q923 -427 923 -330V0H814V-316Q814 -438 716 -438Q695 -438 674.5 -432.5Q654 -427 638.0 -416.0Q622 -405 612.5 -388.0Q603 -371 603 -348V0ZM1239 12Q1165 12 1115.0 -14.0Q1065 -40 1028 -86L1098 -150Q1127 -115 1162.5 -95.5Q1198 -76 1245 -76Q1293 -76 1316.5 -94.5Q1340 -113 1340 -146Q1340 -171 1323.5 -188.5Q1307 -206 1266 -211L1218 -217Q1138 -227 1092.5 -263.5Q1047 -300 1047 -372Q1047 -410 1061.0 -439.5Q1075 -469 1100.5 -489.5Q1126 -510 1161.5 -521.0Q1197 -532 1240 -532Q1310 -532 1354.5 -510.0Q1399 -488 1434 -449L1367 -385Q1347 -409 1314.5 -426.5Q1282 -444 1240 -444Q1195 -444 1173.5 -426.0Q1152 -408 1152 -379Q1152 -349 1171.0 -334.0Q1190 -319 1232 -312L1280 -306Q1366 -293 1405.5 -255.5Q1445 -218 1445 -155Q1445 -117 1430.5 -86.5Q1416 -56 1389.0 -34.0Q1362 -12 1324.0 0.0Q1286 12 1239 12ZM1623 -613Q1589 -613 1573.5 -629.0Q1558 -645 1558 -670V-687Q1558 -712 1573.5 -728.0Q1589 -744 1623 -744Q1657 -744 1672.0 -728.0Q1687 -712 1687 -687V-670Q1687 -645 1672.0 -629.0Q1657 -613 1623 -613ZM1568 -520H1677V0H1568ZM2152 -520H2257L2038 103Q2029 129 2017.5 147.5Q2006 166 1990.5 177.5Q1975 189 1953.0 194.5Q1931 200 1901 200H1838V111H1926L1956 23L1767 -520H1876L1980 -214L2010 -101H2015L2048 -214ZM2714 0Q2671 0 2648.0 -24.5Q2625 -49 2620 -87H2615Q2600 -38 2560.0 -13.0Q2520 12 2463 12Q2382 12 2338.5 -30.0Q2295 -72 2295 -143Q2295 -221 2351.5 -260.0Q2408 -299 2517 -299H2611V-343Q2611 -391 2585.0 -417.0Q2559 -443 2504 -443Q2458 -443 2429.0 -423.0Q2400 -403 2380 -372L2315 -431Q2341 -475 2388.0 -503.5Q2435 -532 2511 -532Q2612 -532 2666.0 -485.0Q2720 -438 2720 -350V-89H2775V0ZM2494 -71Q2545 -71 2578.0 -93.5Q2611 -116 2611 -154V-229H2519Q2406 -229 2406 -159V-141Q2406 -106 2429.5 -88.5Q2453 -71 2494 -71ZM2882 -740H2991V-434H2996Q3013 -481 3051.5 -506.5Q3090 -532 3142 -532Q3241 -532 3295.0 -460.5Q3349 -389 3349 -260Q3349 -131 3295.0 -59.5Q3241 12 3142 12Q3090 12 3051.5 -14.0Q3013 -40 2996 -86H2991V0H2882ZM3109 -82Q3166 -82 3200.0 -118.5Q3234 -155 3234 -215V-305Q3234 -365 3200.0 -401.5Q3166 -438 3109 -438Q3059 -438 3025.0 -413.5Q2991 -389 2991 -349V-171Q2991 -131 3025.0 -106.5Q3059 -82 3109 -82Z"
          transform="matrix(0.09869420 0 0 0.09869420 279.47312481 210.84700576)"
          aria-label="Insiyab"
        />
      </g>
    </svg>
  );
}

// ── LogoReveal: logo + ivory wipe overlay for symbol mask ─────────────────────
// revealP 0→1: 0 = symbol fully hidden, 1 = symbol fully visible.
// Symbol occupies SVG x: 10–232 out of 620. At scale s, those are
// display pixels: (10/620)*620s = 10s and (232/620)*620s = 232s.
// The wipe rect covers left=10s+(232-10)s*revealP, width=(232-10)s*(1-revealP).
function LogoReveal({ revealP = 1, wordmarkOpacity = 1, scale = 1 }) {
  const logoW = 620 * scale;
  const logoH = 240 * scale;
  const symLeft  = (10  / 620) * logoW;   // ~14 px at scale=1.4
  const symRight = (232 / 620) * logoW;   // ~326 px at scale=1.4
  const symW     = symRight - symLeft;
  const maskLeft  = symLeft  + symW * revealP;
  const maskWidth = symW * (1 - revealP);
  return (
    <div style={{ position: 'relative', width: logoW, height: logoH }}>
      <LogoSVG wordmarkOpacity={wordmarkOpacity} scale={scale} />
      {maskWidth > 0.5 && (
        <div style={{
          position: 'absolute', top: 0, left: maskLeft,
          width: maskWidth, height: logoH,
          background: ivory, pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

// ── small corner logo (phases 2-7, fully revealed) ────────────────────────────
function CornerLogo() {
  return (
    <div style={{ position: 'absolute', top: 56, left: 72 }}>
      <LogoReveal revealP={1} wordmarkOpacity={1} scale={0.28} />
    </div>
  );
}

// ── "Illustrative sequence" label ─────────────────────────────────────────────
function IllustrativeLabel() {
  return (
    <div style={{
      position: 'absolute', bottom: 72, left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: 'Plex', fontWeight: 400, fontSize: 40,
      color: ink50, letterSpacing: 1,
      borderBottom: `1px solid ${ink25}`,
      paddingBottom: 6, whiteSpace: 'nowrap',
    }}>
      Illustrative sequence
    </div>
  );
}

// ── Phase 1: 0–24f (0.00–0.80 s) — logo reveal ───────────────────────────────
function Phase1() {
  const f = useCurrentFrame();
  // Mask reveal over 24 frames (0–0.8 s)
  const revealP    = ci(f, 0, 24, 0, 1);
  // Wordmarks fade in from frame 6 (0.2 s) to frame 24 (0.8 s)
  const wmOpacity  = ci(f, 6, 24, 0, 1);
  return (
    <AbsoluteFill style={{ background: ivory, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Fonts />
      <LogoReveal revealP={revealP} wordmarkOpacity={wmOpacity} scale={1.4} />
    </AbsoluteFill>
  );
}

// ── Phase 2: 24–51f (0.80–1.70 s) — route motif, delay bend settles ──────────
function Phase2() {
  const f = useCurrentFrame(); // 0–26
  const bendY = ci(f, 0, 27, 160, 0);
  const routeY = H / 2;
  const x0 = 220, x2 = 980, x4 = 1700;
  const cp1x = (x0 + x2) / 2, cp2x = (x2 + x4) / 2;
  const path = `M ${x0} ${routeY}
    C ${cp1x} ${routeY} ${x2} ${routeY + bendY} ${x2} ${routeY + bendY}
    C ${cp2x} ${routeY + bendY} ${x4} ${routeY} ${x4} ${routeY}`;
  return (
    <AbsoluteFill style={{ background: ivory }}>
      <Fonts />
      <CornerLogo />
      <div style={{
        position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center',
        fontFamily: 'Plex', fontWeight: 400, fontSize: 44, color: ink50, letterSpacing: 1,
      }}>
        Route motif: delay bend settles
      </div>
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}>
        <path d={path} stroke={ink10} strokeWidth={6} fill="none" />
        <path d={path} stroke={gold}  strokeWidth={4} fill="none" />
        <circle cx={x0} cy={routeY} r={12} fill={ink} />
        <circle cx={x4} cy={routeY} r={12} fill={ink} />
        <circle cx={x2} cy={routeY + bendY} r={12} fill={gold} />
        {bendY > 6 && (
          <>
            <line x1={x2} y1={routeY} x2={x2} y2={routeY + bendY - 14}
              stroke={ink25} strokeWidth={2} strokeDasharray="8 5" />
            <text x={x2 + 20} y={routeY + bendY / 2 + 6}
              fontFamily="Plex, sans-serif" fontSize={40} fill={gold} fontWeight={400}>
              delay
            </text>
          </>
        )}
        <text x={x0} y={routeY - 32} textAnchor="middle"
          fontFamily="Plex, sans-serif" fontSize={40} fill={ink} fontWeight={500}>
          Depot
        </text>
        <text x={x4} y={routeY - 32} textAnchor="middle"
          fontFamily="Plex, sans-serif" fontSize={40} fill={ink} fontWeight={500}>
          Terminal
        </text>
      </svg>
      <IllustrativeLabel />
    </AbsoluteFill>
  );
}

// ── Three-node row above card ─────────────────────────────────────────────────
// Used in phases 3–5. nodeP: 0 = spread out, 1 = converged above card.
const NODE_SPREAD = [{ x: 300, y: 200 }, { x: 960, y: 200 }, { x: 1620, y: 200 }];
const NODE_TARGET = [{ x: 650, y: 210 }, { x: 960, y: 210 }, { x: 1270, y: 210 }];
const NODE_LABELS = ['Driver', 'Depot', 'Station'];

function SourceNodes({ nodeP = 1 }) {
  return (
    <>
      {NODE_LABELS.map((label, i) => {
        const nx = NODE_SPREAD[i].x + (NODE_TARGET[i].x - NODE_SPREAD[i].x) * nodeP;
        const ny = NODE_SPREAD[i].y + (NODE_TARGET[i].y - NODE_SPREAD[i].y) * nodeP;
        return (
          <g key={i}>
            <circle cx={nx} cy={ny} r={34} fill={gold} />
            <text x={nx} y={ny + 11} textAnchor="middle"
              fontFamily="Plex, sans-serif" fontSize={28} fill={ivory} fontWeight={500}>
              {label[0]}
            </text>
            <text x={nx} y={ny + 70} textAnchor="middle"
              fontFamily="Plex, sans-serif" fontSize={40} fill={ink} fontWeight={500}>
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

// ── Briefing card HTML (phases 4–8) ──────────────────────────────────────────
// Options per spec; selectedIndex picks "Send the standby bus" (index 0).
const OPTIONS = [
  'Send the standby bus',
  'Hold the next departure',
  'Monitor and request an update',
];

function BriefingCard({ selectedIndex = -1, selectionP = 0 }) {
  return (
    <div style={{
      position: 'absolute',
      top: 360, left: '50%', transform: 'translateX(-50%)',
      width: 1040,
    }}>
      <div style={{
        background: ivory, border: `2px solid ${ink25}`,
        borderRadius: 10, padding: '36px 48px',
      }}>
        <div style={{
          fontFamily: 'Plex', fontWeight: 500, fontSize: 52, color: ink, marginBottom: 16,
        }}>
          Briefing
        </div>
        <div style={{
          fontFamily: 'Plex', fontSize: 40, color: ink50, marginBottom: 28,
        }}>
          Delay on Route 310. Three options:
        </div>
        {OPTIONS.map((text, i) => {
          const isSelected   = i === selectedIndex;
          const showLabel    = isSelected && selectionP > 0.5;
          const borderCol    = isSelected && selectionP > 0.3 ? teal : ink25;
          const labelCol     = isSelected && selectionP > 0.3 ? teal : ink50;
          const bgAlpha      = isSelected ? 0.06 * selectionP : 0;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '16px 24px', marginBottom: 10,
              border: `2px solid ${borderCol}`,
              borderRadius: 8,
              background: `rgba(46,125,107,${bgAlpha})`,
            }}>
              <div style={{
                fontFamily: 'Plex', fontWeight: 600, fontSize: 42, color: labelCol, width: 36,
              }}>{String.fromCharCode(65 + i)}</div>
              <div style={{
                fontFamily: 'Plex', fontSize: 42, color: ink, flex: 1,
              }}>{text}</div>
              {showLabel && (
                <div style={{
                  fontFamily: 'Plex', fontSize: 36, color: teal, fontWeight: 500,
                }}>Selected</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Phase 3: 51–72f (1.70–2.40 s) — three calls converge into card ───────────
function Phase3() {
  const f = useCurrentFrame(); // 0–21
  const p = ci(f, 0, 21, 0, 1);
  // Card emergence opacity
  const cardAlpha = ci(f, 8, 21, 0, 1);
  // Connecting lines opacity
  const lineAlpha = p;

  const cardTopY = 362; // top edge of card (CSS top:360 + 2px border)

  return (
    <AbsoluteFill style={{ background: ivory }}>
      <Fonts />
      <CornerLogo />
      {/* Card (fading in) */}
      <div style={{ opacity: cardAlpha }}>
        <BriefingCard selectedIndex={-1} selectionP={0} />
      </div>
      {/* Nodes + lines */}
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, pointerEvents: 'none' }}>
        {NODE_LABELS.map((label, i) => {
          const nx = NODE_SPREAD[i].x + (NODE_TARGET[i].x - NODE_SPREAD[i].x) * p;
          const ny = NODE_SPREAD[i].y + (NODE_TARGET[i].y - NODE_SPREAD[i].y) * p;
          // Line from node bottom to card top
          const cardAttachX = 650 + i * 310; // 650, 960, 1270
          return (
            <g key={i}>
              <line
                x1={nx} y1={ny + 34}
                x2={cardAttachX} y2={cardTopY}
                stroke={ink25} strokeWidth={2}
                opacity={lineAlpha * cardAlpha}
              />
              <circle cx={nx} cy={ny} r={34} fill={gold} />
              <text x={nx} y={ny + 11} textAnchor="middle"
                fontFamily="Plex, sans-serif" fontSize={28} fill={ivory} fontWeight={500}>
                {label[0]}
              </text>
              <text x={nx} y={ny + 70} textAnchor="middle"
                fontFamily="Plex, sans-serif" fontSize={40} fill={ink} fontWeight={500}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <IllustrativeLabel />
    </AbsoluteFill>
  );
}

// ── Phase 4: 72–105f (2.40–3.50 s) — hold briefing ──────────────────────────
function Phase4() {
  const cardTopY = 362;
  return (
    <AbsoluteFill style={{ background: ivory }}>
      <Fonts />
      <CornerLogo />
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, pointerEvents: 'none' }}>
        <SourceNodes nodeP={1} />
        {NODE_LABELS.map((_, i) => {
          const nx = NODE_TARGET[i].x, ny = NODE_TARGET[i].y;
          const cardAttachX = 650 + i * 310;
          return (
            <line key={i}
              x1={nx} y1={ny + 34} x2={cardAttachX} y2={cardTopY}
              stroke={ink25} strokeWidth={2} />
          );
        })}
      </svg>
      <BriefingCard selectedIndex={-1} selectionP={0} />
      <IllustrativeLabel />
    </AbsoluteFill>
  );
}

// ── Phase 5: 105–123f (3.50–4.10 s) — selection (600 ms, 18 f) ───────────────
function Phase5() {
  const f = useCurrentFrame(); // 0–17
  const sp = ci(f, 0, 18, 0, 1);
  const cardTopY = 362;
  return (
    <AbsoluteFill style={{ background: ivory }}>
      <Fonts />
      <CornerLogo />
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, pointerEvents: 'none' }}>
        <SourceNodes nodeP={1} />
        {NODE_LABELS.map((_, i) => {
          const nx = NODE_TARGET[i].x, ny = NODE_TARGET[i].y;
          const cardAttachX = 650 + i * 310;
          return (
            <line key={i}
              x1={nx} y1={ny + 34} x2={cardAttachX} y2={cardTopY}
              stroke={ink25} strokeWidth={2} />
          );
        })}
      </svg>
      <BriefingCard selectedIndex={0} selectionP={sp} />
      <IllustrativeLabel />
    </AbsoluteFill>
  );
}

// ── Relay state: static coordination view ─────────────────────────────────────
// Recipients are positioned OUTSIDE the card area to avoid line/text overlap:
//   Driver  → bottom-left  (220, 820)
//   Depot   → top-centre   (960, 160)
//   Station → bottom-right (1700, 820)
// Relay lines from card edges (not through card body):
//   Driver : card left  (460, 620) → (220, 820)
//   Depot  : card top   (960, 360) → (960, 160)
//   Station: card right (1460, 620) → (1700, 820)
// Card occupies CSS: top=360, width=1040, left=50%-520=440, right=1480.
// Card bottom ≈ 360 + 450 = 810.  Relay lines must not cross card body.
// Depot goes UP from card top-centre (960, 362) to Depot node above.
// Driver goes DOWN-LEFT from card bottom-left (440, 812) to Driver node.
// Station goes DOWN-RIGHT from card bottom-right (1480, 812) to Station node.
const RELAY_NODES = [
  { label: 'Driver',  cx: 180,  cy: 940, lineX1: 440,  lineY1: 812 },
  { label: 'Depot',   cx: 960,  cy: 130, lineX1: 960,  lineY1: 362 },
  { label: 'Station', cx: 1740, cy: 940, lineX1: 1480, lineY1: 812 },
];

function RelayOverlay({ sweepP = 1, showSent = true }) {
  return (
    <>
      {RELAY_NODES.map((r, i) => {
        const lp = Math.min(1, sweepP * 1.3);
        const ex = r.lineX1 + (r.cx - r.lineX1) * lp;
        const ey = r.lineY1 + (r.cy - r.lineY1) * lp;
        const arrived = lp > 0.88;
        return (
          <g key={i}>
            {/* Relay sweep line */}
            <line x1={r.lineX1} y1={r.lineY1} x2={ex} y2={ey}
              stroke={teal} strokeWidth={3} opacity={0.9} />
            {arrived && (
              <>
                <circle cx={r.cx} cy={r.cy} r={36} fill={ivory} stroke={teal} strokeWidth={3} />
                <text x={r.cx} y={r.cy + 10} textAnchor="middle"
                  fontFamily="Plex, sans-serif" fontSize={28} fill={teal} fontWeight={500}>
                  {r.label[0]}
                </text>
                <text x={r.cx} y={r.cy + 68} textAnchor="middle"
                  fontFamily="Plex, sans-serif" fontSize={40} fill={ink} fontWeight={500}>
                  {r.label}
                </text>
                {showSent && (
                  <text x={r.cx} y={r.cy + 108} textAnchor="middle"
                    fontFamily="Plex, sans-serif" fontSize={36} fill={teal50}>
                    Sent
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </>
  );
}

// ── Phase 6: 123–147f (4.10–4.90 s) — relay sweep (800 ms, 24 f) ─────────────
function Phase6() {
  const f = useCurrentFrame(); // 0–23
  const sweepP = ci(f, 0, 24, 0, 1);
  return (
    <AbsoluteFill style={{ background: ivory }}>
      <Fonts />
      <CornerLogo />
      <BriefingCard selectedIndex={0} selectionP={1} />
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, pointerEvents: 'none' }}>
        <RelayOverlay sweepP={sweepP} showSent={true} />
      </svg>
      <IllustrativeLabel />
    </AbsoluteFill>
  );
}

// ── Phase 7: 147–162f (4.90–5.40 s) — static hold ────────────────────────────
function Phase7() {
  return (
    <AbsoluteFill style={{ background: ivory }}>
      <Fonts />
      <CornerLogo />
      <BriefingCard selectedIndex={0} selectionP={1} />
      <svg viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, pointerEvents: 'none' }}>
        <RelayOverlay sweepP={1} showSent={true} />
      </svg>
      <IllustrativeLabel />
    </AbsoluteFill>
  );
}

// ── Phase 8: 162–180f (5.40–6.00 s) — sequential crossfade to lockup ─────────
// First 10 frames: fade out the diagram (previous state → transparent)
// Last 10 frames: fade in the lockup (overlap = last 2 frames to avoid gap)
function Phase8() {
  const f = useCurrentFrame(); // 0–17
  const diagramAlpha = ci(f, 0, 10, 1, 0);
  const lockupAlpha  = ci(f, 8, 18, 0, 1);
  return (
    <AbsoluteFill style={{ background: ivory }}>
      <Fonts />
      {/* Diagram fades out */}
      <div style={{ position: 'absolute', inset: 0, opacity: diagramAlpha }}>
        <CornerLogo />
        <BriefingCard selectedIndex={0} selectionP={1} />
        <svg viewBox={`0 0 ${W} ${H}`}
          style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, pointerEvents: 'none' }}>
          <RelayOverlay sweepP={1} showSent={true} />
        </svg>
        <IllustrativeLabel />
      </div>
      {/* Final lockup fades in */}
      <div style={{
        position: 'absolute', inset: 0, opacity: lockupAlpha,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LogoReveal revealP={1} wordmarkOpacity={1} scale={1.4} />
      </div>
    </AbsoluteFill>
  );
}

// ── Root composition ──────────────────────────────────────────────────────────
const PHASES = [
  [Phase1, 0,   24],   //  0.00–0.80 s — logo reveal (mask + wordmarks)
  [Phase2, 24,  27],   //  0.80–1.70 s — route motif, delay bend settles 900 ms
  [Phase3, 51,  21],   //  1.70–2.40 s — three calls converge into one card 700 ms
  [Phase4, 72,  33],   //  2.40–3.50 s — hold briefing with Illustrative sequence
  [Phase5, 105, 18],   //  3.50–4.10 s — staged human selection 600 ms
  [Phase6, 123, 24],   //  4.10–4.90 s — relay sweep outward 800 ms
  [Phase7, 147, 15],   //  4.90–5.40 s — hold static coordination view
  [Phase8, 162, 18],   //  5.40–6.00 s — crossfade to final lockup 600 ms
];

function BrandSting() {
  return (
    <AbsoluteFill style={{ background: ivory }}>
      {PHASES.map(([Comp, from, dur], i) => (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <Comp />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <Composition
    id="BrandSting"
    component={BrandSting}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
  />
));
