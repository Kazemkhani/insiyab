// scenes-3.jsx  — Scene 5 (emblem / "Insiyab looks ahead.") + Scene 6 (proactive + calls)
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, Audio, staticFile, Sequence } from 'remotion';
import { C, SCENE, cbEase, makeCI } from './tokens.js';

const ci = makeCI(interpolate);

// ── Scene 5: Emblem reveal (1200–1320, 40–44s) ───────────────────────────────
function InsiyabSymbolRevealed({ f, size = 280, fill }) {
  const revealPct = ci(f, 0, 24, 0, 100);
  const revealLower = ci(f, 4, 28, 0, 100);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <defs>
        <clipPath id="cine-upper">
          <rect x="0" y="0" width={revealPct * 1.2} height="90" />
        </clipPath>
        <clipPath id="cine-lower">
          <rect x="0" y="40" width={revealLower * 1.2} height="80" />
        </clipPath>
      </defs>
      <g clipPath="url(#cine-upper)">
        <path d="M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z" fill={fill}/>
      </g>
      <g clipPath="url(#cine-lower)">
        <path d="M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z" fill={fill}/>
      </g>
    </svg>
  );
}

export function Scene5() {
  const f = useCurrentFrame();
  const symbolOffset = 24; // 0.8s silence
  const symbolF = Math.max(0, f - symbolOffset);
  const revealAlpha = ci(f, symbolOffset, symbolOffset + 6, 0, 1);
  // VO l5 at local frame 45 (film 1245)
  const capAlpha = ci(f, 45, 65, 0, 1);

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {f >= symbolOffset && f < symbolOffset + 27 && (
        <Sequence from={symbolOffset} durationInFrames={27}>
          <Audio src={staticFile('soft-tone.mp3')} startFrom={0} volume={0.5} />
        </Sequence>
      )}
      <Sequence from={45} durationInFrames={70}>
        <Audio src={staticFile('vo/l5.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -60%)', opacity: revealAlpha,
      }}>
        <InsiyabSymbolRevealed f={symbolF} size={280} fill={C.ivory} />
      </div>
      <div style={{ opacity: capAlpha }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(247,245,240,0.08)', padding: '14px 60px',
          fontFamily: 'Plex', fontSize: 36, color: C.ivory,
          lineHeight: 1.4, textAlign: 'center',
        }}>Insiyab looks ahead.</div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 6: Proactive + Calls (1320–1980, 44–66s, 660 frames) ───────────────
// Phase 1 (0–180f / 6s): proactive predictions on ivory
//   - Row 1 appears at frame 24 (0.8s)
//   - Row 2 appears at frame 54 (1.8s)
//   - Row 3 appears at frame 84 (2.8s)
//   - Gold "Suggested:" appears at frame 120 (4s)
//   - Brief hold, fade transition at frame 165
// Phase 2 (165–660f / 16.5s): four calls + card + selection + relay
//   - l6b VO at local 267f, l6c at 414f, l6d at 511f

const RISKS = [
  { text: 'Route 310, 19:23:', risk: 'likely 13 min late',   icon: 'driver.svg'   },
  { text: 'Route 8, 18:40:',   risk: 'more riders than seats', icon: 'station.svg' },
  { text: 'Al Ghubaiba, 17:30:', risk: '41°C, long wait',     icon: 'planning.svg' },
];

// Horizontal row layout for the diagram
const NODE_Y = 190, NODE_R = 52;
const CARD_X = 410, CARD_Y = 390, CARD_W = 1100, CARD_H = 400;
const HORIZ_NODES = [
  { id: 'driver',   label: 'Driver',   x: 192  },
  { id: 'depot',    label: 'Depot',    x: 640  },
  { id: 'station',  label: 'Station',  x: 1280 },
  { id: 'planning', label: 'Planning', x: 1728 },
];

const OPTIONS = [
  { label: 'Send the standby bus',          effect: 'next departure close to on time' },
  { label: 'Hold the next departure 2 min', effect: 'gap evens out' },
  { label: 'Monitor and request an update', effect: 'delay passes to the next trip' },
];

export function Scene6() {
  const f = useCurrentFrame();

  // Phase 1: proactive (0–180f)
  const inPhase1 = f < 180;
  const phase2F  = Math.max(0, f - 165); // phase2 starts at f=165, overlap with phase1

  // Phase 1 elements
  const row1A = ci(f, 24, 42, 0, 1);
  const row2A = ci(f, 54, 72, 0, 1);
  const row3A = ci(f, 84, 102, 0, 1);
  const goldA = ci(f, 120, 144, 0, 1);
  const seenA = ci(f, 128, 146, 0, 1);
  const phase1FadeOut = ci(f, 175, 200, 1, 0);

  // Phase 2 (scene-local 165-660 = 495 frames)
  // Sub-phases within phase2 (p2f = f - 165, so when f=165, p2f=0)
  const p2f = phase2F;

  // Diagram fades in
  const diagramA = ci(f, 165, 195, 0, 1);

  // Convergence lines to card (p2f 0–60)
  const convergePct = ci(p2f, 0, 60, 0, 1);

  // Card appears (p2f 50–75)
  const cardA = ci(p2f, 50, 75, 0, 1);
  const cardTextA = ci(p2f, 75, 100, 0, 1);

  // Phase D: selection at p2f≈345 (l6d starts at local 511 → p2f = 511-165=346)
  const p2d_start = 340;
  const selectA = ci(p2f, p2d_start, p2d_start + 18, 0, 1);

  // Phase E: relay at p2f≈370
  const p2e_start = 370;
  const sentA = ci(p2f, p2e_start, p2e_start + 24, 0, 1);
  const recvA = [
    ci(p2f, p2e_start + 10, p2e_start + 28, 0, 1),
    ci(p2f, p2e_start + 20, p2e_start + 38, 0, 1),
    ci(p2f, p2e_start + 30, p2e_start + 48, 0, 1),
    ci(p2f, p2e_start + 40, p2e_start + 58, 0, 1),
  ];

  const isSelected = p2f >= p2d_start + 15;

  // Caption: which VO line is active
  const l6a_local = 0;   const l6b_local = 267; const l6c_local = 414; const l6d_local = 511;
  let caption = '';
  if (f < l6b_local)      caption = 'It watches the evening before it happens. Which buses will run late. Where a bus will overflow. Which stops are in the heat.';
  else if (f < l6c_local) caption = 'It suggests a fix early, and calls the people who make it happen. All at once.';
  else if (f < l6d_local) caption = 'One briefing, beside the pick from RTA\'s own system.';
  else                    caption = 'The controller decides. Each person confirms.';

  const capA = ci(f, l6a_local, l6a_local + 24, 0, 1);

  // Tick sounds
  const ticks = [p2d_start + 15, p2e_start + 10, p2e_start + 20, p2e_start + 30, p2e_start + 40]
    .map(pt => pt + 165); // convert to scene-local

  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      {/* VO audio */}
      <Sequence from={l6a_local} durationInFrames={270}><Audio src={staticFile('vo/l6a.mp3')} startFrom={0} volume={1.0} /></Sequence>
      <Sequence from={l6b_local} durationInFrames={148}><Audio src={staticFile('vo/l6b.mp3')} startFrom={0} volume={1.0} /></Sequence>
      <Sequence from={l6c_local} durationInFrames={98}><Audio src={staticFile('vo/l6c.mp3')} startFrom={0} volume={1.0} /></Sequence>
      <Sequence from={l6d_local} durationInFrames={95}><Audio src={staticFile('vo/l6d.mp3')} startFrom={0} volume={1.0} /></Sequence>

      {/* Tick sounds (scene-local frames) */}
      {ticks.map((tf, i) => f >= tf && f < tf + 3 && (
        <Sequence key={i} from={tf} durationInFrames={3}>
          <Audio src={staticFile('tick.mp3')} startFrom={0} volume={0.4} />
        </Sequence>
      ))}

      {/* ── Phase 1: Proactive risks ────────────────────────────────────────── */}
      <div style={{ opacity: phase1FadeOut }}>
        {/* Header */}
        <div style={{
          position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center',
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 38, color: C.ink50,
          letterSpacing: 2,
        }}>Illustrative predictions</div>

        {/* Three risk rows */}
        {RISKS.map((risk, i) => {
          const alpha = [row1A, row2A, row3A][i];
          return (
            <div key={i} style={{
              position: 'absolute',
              top: 220 + i * 160,
              left: 80,
              display: 'flex', alignItems: 'center', gap: 24,
              opacity: alpha,
            }}>
              <img
                src={staticFile(`icons/${risk.icon}`)}
                style={{ width: 48, height: 48, opacity: 0.6 }}
                alt=""
              />
              <span style={{ fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.ink }}>
                {risk.text}
              </span>
              <span style={{ fontFamily: 'Overpass', fontWeight: 800, fontSize: 48, color: C.red }}>
                {risk.risk}
              </span>
            </div>
          );
        })}

        {/* Gold suggestion line */}
        <div style={{
          position: 'absolute', bottom: 120, left: 80,
          opacity: goldA,
        }}>
          <span style={{
            fontFamily: 'Overpass', fontWeight: 800, fontSize: 48, color: C.gold,
          }}>Suggested: send the standby bus at 18:55</span>
        </div>

        {/* Quiet closing line — ~1.5 s read window before phase1 fades */}
        <div style={{
          position: 'absolute', top: 695, left: 80,
          opacity: seenA,
        }}>
          <span style={{
            fontFamily: 'Overpass', fontWeight: 400, fontSize: 40, color: C.ink50,
          }}>Seen before anyone is waiting.</span>
        </div>
      </div>

      {/* ── Phase 2: Coordination diagram ───────────────────────────────────── */}
      <div style={{ opacity: diagramA }}>
        {/* Illustrative label — top left, 24px, ink 50% — does not collide with captions */}
        <div style={{
          position: 'absolute', top: 16, left: 24,
          fontFamily: 'Plex', fontSize: 24, color: C.ink50,
          pointerEvents: 'none',
        }}>Illustrative sequence. The link to RTA's Decision Support System is a proposal.</div>

        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          viewBox="0 0 1920 1080"
        >
          {/* Four role nodes — one row across the top */}
          {HORIZ_NODES.map((node, i) => {
            const isRecv = recvA[i] > 0.5;
            // Lines angle toward the nearest point on the card's top edge
            const lineX2 = Math.min(Math.max(node.x, CARD_X + 20), CARD_X + CARD_W - 20);
            return (
              <g key={node.id}>
                {/* Relay line from node bottom to card top */}
                <line
                  x1={node.x} y1={NODE_Y + NODE_R + 16}
                  x2={lineX2}  y2={CARD_Y}
                  stroke={isRecv ? C.teal : C.ink25}
                  strokeWidth={2.5}
                  strokeDasharray={isRecv ? '' : '10 7'}
                  opacity={0.65}
                />
                {/* Node circle */}
                <circle cx={node.x} cy={NODE_Y} r={NODE_R}
                  fill={isRecv ? C.teal : C.ink} />
                {/* Kit icon inside circle — inverted so strokes read as white/ivory */}
                <image
                  href={staticFile(`icons/${node.id}.svg`)}
                  x={node.x - 22} y={NODE_Y - 22}
                  width={44} height={44}
                  style={{ filter: 'invert(1) brightness(1.4)' }}
                />
                {/* Label — 40px, below circle */}
                <text x={node.x} y={NODE_Y + NODE_R + 56}
                  textAnchor="middle" fontFamily="Plex" fontSize="40" fill={C.ink} fontWeight="600">
                  {node.label}
                </text>
                {/* Status text */}
                {sentA > 0.1 && recvA[i] < 0.5 && (
                  <text x={node.x} y={NODE_Y + NODE_R + 94}
                    textAnchor="middle" fontFamily="Plex" fontSize="30" fill={C.ink50} opacity={sentA}>Sent</text>
                )}
                {recvA[i] > 0.1 && (
                  <text x={node.x} y={NODE_Y + NODE_R + 94}
                    textAnchor="middle" fontFamily="Plex" fontSize="30" fill={C.teal} opacity={recvA[i]}>Received</text>
                )}
              </g>
            );
          })}

          {/* Briefing card — 1100px wide, centred below the node row */}
          {p2f >= 50 && (
            <g opacity={cardA}>
              <rect x={CARD_X} y={CARD_Y} width={CARD_W} height={CARD_H} rx={14}
                fill={C.ivory}
                stroke={isSelected ? C.ink : 'rgba(21,24,29,0.22)'}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {/* Card header */}
              <text x={CARD_X + CARD_W / 2} y={CARD_Y + 50}
                textAnchor="middle" fontFamily="Overpass" fontSize="28"
                fill={C.ink50} fontWeight="600">Simulated RTA system pick</text>

              {/* Three options — option text ≥40px, estimate ≥28px */}
              {OPTIONS.map((opt, i) => {
                const oy = CARD_Y + 70 + i * 110;
                const isSel = i === 0 && isSelected;
                return (
                  <g key={i} opacity={cardTextA}>
                    <rect x={CARD_X + 20} y={oy} width={CARD_W - 40} height={102} rx={8}
                      fill={isSel ? 'rgba(21,24,29,0.06)' : 'transparent'}
                      stroke={isSel ? C.ink : C.ink10}
                      strokeWidth={isSel ? 2.5 : 1}
                    />
                    <text x={CARD_X + 40} y={oy + 46} fontFamily="Plex" fontSize="40"
                      fill={C.ink} fontWeight={isSel ? '600' : '400'}>{opt.label}</text>
                    <text x={CARD_X + 40} y={oy + 84} fontFamily="Plex" fontSize="28"
                      fill={C.ink50}>estimate: {opt.effect}</text>
                    {isSel && (
                      <text x={CARD_X + CARD_W - 30} y={oy + 46} textAnchor="end"
                        fontFamily="Plex" fontSize="27" fill={C.ink} fontWeight="600">
                        Controller's decision
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Caption band */}
      <div style={{ opacity: capA }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(21,24,29,0.09)', padding: '12px 60px',
          fontFamily: 'Plex', fontSize: 32, color: C.ink,
          lineHeight: 1.4, textAlign: 'center',
        }}>{caption}</div>
      </div>
    </AbsoluteFill>
  );
}
