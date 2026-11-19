// CallChain.jsx (v4e) — 65.3-76.1s
// Design rules: same as v4d (medallions, cubic curves, paper bg, sentence-case)
//
// v4e KEY CHANGES:
//   A) `decisionProgress` now triggers at the EXACT frame of word "decides" in l13:
//      WORD_FRAMES.l13_decides = s(71.5) + s(1.720) = 2145 + 52 = 2197
//      CALL_CHAIN starts at s(65.3) = 1959
//      decides localFrame = 2197 − 1959 = 238
//   B) `receivedFrames[i]` now start at word "confirms" in l13:
//      WORD_FRAMES.l13_confirms = s(71.5) + s(3.280) = 2145 + 98 = 2243
//      confirms localFrame = 2243 − 1959 = 284
//      Received cascade: 284, 288, 292, 296 (step=4 frames)
//      Step=4 ensures all four complete their 6-frame ramps by proof frame F2262.
//   C) CALL_CHAIN scene is 10.8s (was 8s in v4d) — extended to cover l13 end + 0.5s
//   D) Captions l12/l13 replaced with word-level Caption components
//
// PROOF (from beat.js WORD_FRAMES):
//   "decides"  → abs frame 2197, localFrame 238, turns ivory at frame 2197
//   "confirms" → abs frame 2243, localFrame 284, turns ivory at frame 2243
//   Received[0] flips at localFrame 284 (frame 2243) → 1.0 by lf 290 (abs 2249)
//   Received[1] flips at localFrame 288 (frame 2247) → 1.0 by lf 294 (abs 2253)
//   Received[2] flips at localFrame 292 (frame 2251) → 1.0 by lf 298 (abs 2257)
//   Received[3] flips at localFrame 296 (frame 2255) → 1.0 by lf 302 (abs 2261)
//   At proof frame F2262 (lf 303): all four at opacity 1.0

import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { SCENE, WORD_FRAMES, s, BEAT, FPS } from '../../beat.js';
import { Caption } from '../../components/Caption.jsx';

const W = 1920;
const H = 1080;

// localFrame 0 = abs frame s(65.3)
const CALL_CHAIN_START_ABS = SCENE.CALL_CHAIN;

// decides: localFrame where "decides" word begins
const DECIDES_LF = WORD_FRAMES.l13_decides - CALL_CHAIN_START_ABS;  // = 238

// confirms: localFrame where "confirms" word begins
const CONFIRMS_LF = WORD_FRAMES.l13_confirms - CALL_CHAIN_START_ABS; // = 284

// ---- Procedural paper background -------------------------------------------
function PaperBg() {
  return (
    <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>
      <defs>
        <filter id="cc-paper-v4e" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise" baseFrequency="0.65 0.70"
            numOctaves="4" seed="42" result="noise"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.968
                    0 0 0 0 0.957
                    0 0 0 0 0.937
                    0 0 0 0.04 0"
            result="tinted"
          />
          <feComposite in="tinted" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={C.ivory} />
      <rect width={W} height={H} fill={C.ivory} filter="url(#cc-paper-v4e)" />
    </svg>
  );
}

// ---- SVG icon paths --------------------------------------------------------
function DriverPath({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5.5" r="2.25" />
      <path d="M6.5 11.5C7.5 9.5 16.5 9.5 17.5 11.5" />
      <circle cx="12" cy="16" r="5" />
      <path d="M7.5 14H16.5M12 14V21" />
    </svg>
  );
}
function DepotPath({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V7.5L12 3L21 7.5V21Z" />
      <path d="M6.5 21V12H10V21M14 21V12H17.5V21M7 8.5H17" />
    </svg>
  );
}
function StationPath({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L6 4.5H18L21 9ZM5 9V21M19 9V21" />
      <path d="M8 14H16M8 17H16M9 14V20M15 14V20M3 21H21" />
    </svg>
  );
}
function PlanningPath({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3V7M17 3V7M3 9H21M7 17H10C13 17 11 13 14 13H17" />
      <path d="M7 15.5V18.5M17 11.5V14.5" />
    </svg>
  );
}

const ROLES = [
  { key: 'driver',   label: 'Driver',   Icon: DriverPath },
  { key: 'depot',    label: 'Depot',     Icon: DepotPath },
  { key: 'station',  label: 'Station',   Icon: StationPath },
  { key: 'planning', label: 'Planning',  Icon: PlanningPath },
];

// ---- Medallion -------------------------------------------------------------
function Medallion({ Icon, label, frame, appearFrame, receivedFrame }) {
  const appear = interpolate(frame, [appearFrame, appearFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const received = receivedFrame ? interpolate(
    frame, [receivedFrame, receivedFrame + 6], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) : 0;

  const outerRing  = received > 0.5 ? C.teal : C.gold;
  const outerWidth = received > 0.5 ? 2.5 : 1.5;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      opacity: appear,
      transform: `translateY(${interpolate(appear, [0, 1], [24, 0])}px)`,
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: '50%',
        background: C.ink, border: `${outerWidth}px solid ${outerRing}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box', transition: 'border-color 0.3s',
      }}>
        <Icon size={42} color={C.ivory} />
      </div>
      <div style={{
        fontFamily: '"IBM Plex Sans"', fontSize: 34, fontWeight: 600,
        color: received > 0.5 ? C.teal : C.ink,
        letterSpacing: 0, textTransform: 'none',
      }}>
        {label}
      </div>
      {received > 0 && (
        <div style={{
          fontFamily: '"IBM Plex Sans"', fontSize: 24, fontWeight: 600,
          color: '#2E7D6B', opacity: received, letterSpacing: 0,
        }}>
          Received
        </div>
      )}
    </div>
  );
}

// ---- Cubic Bézier connectors -----------------------------------------------
function Connectors({ frame, callingStart, receivedFrames, medalPositions }) {
  // Anchor source points at the BOTTOM EDGE of the briefing card, spread across
  // its width at 20 / 40 / 60 / 80 percent so connectors originate beneath the
  // card and never cross its text or the "Controller's decision" bar.
  const CARD_LEFT   = W / 2 - 400;  // 560 — card left edge (width 800, centred)
  const CARD_WIDTH  = 800;
  const CARD_BOTTOM = 414;           // top:100 + ~314px content height
  const sourceXs = [0.20, 0.40, 0.60, 0.80].map(p => CARD_LEFT + CARD_WIDTH * p);
  const sourceY  = CARD_BOTTOM;
  const medalY  = H - 300 - 96 / 2;

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={W} height={H}>
      {ROLES.map((role, i) => {
        const sourceX = sourceXs[i];
        const targetX = medalPositions[i];
        const targetY = medalY - 48 + 10;
        const dx = targetX - sourceX;
        const cp1x = sourceX + dx * 0.15;
        const cp1y = sourceY + 80;
        const cp2x = targetX - dx * 0.1;
        const cp2y = targetY - 80;
        const path = `M ${sourceX},${sourceY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;
        const pathLen = Math.sqrt(dx * dx + (targetY - sourceY) ** 2) * 1.2;

        const callProg = interpolate(frame,
          [callingStart + i * 8, callingStart + i * 8 + 25], [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (callProg <= 0) return null;

        const receivedProg = receivedFrames[i] ? interpolate(frame,
          [receivedFrames[i], receivedFrames[i] + 6], [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

        const lineColor = receivedProg > 0
          ? `rgba(46,125,107,${0.5 + receivedProg * 0.3})`
          : 'rgba(156,123,62,0.70)';

        return (
          <path key={role.key}
            d={path} fill="none"
            stroke={lineColor} strokeWidth={1.5} strokeLinecap="round"
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen * (1 - callProg)}
            opacity={callProg}
          />
        );
      })}
    </svg>
  );
}

// ---- Main component --------------------------------------------------------
export function CallChain({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(10.8) = 324 frames in v4e

  const briefingOpacity = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // v4e: decision state flips on word "decides" in l13 (localFrame 238)
  // 4-frame fade so "Controller's decision" is fully visible by F2201 (abs)
  const decisionProgress = interpolate(lf, [DECIDES_LF, DECIDES_LF + 4], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Connectors start drawing from BEAT*3 = 60 (2s into scene, before l12 ends)
  const callingStart = BEAT * 3;

  // v4e: Received[i] cascade starting at "confirms" (lf 284), step=4 frames.
  // Step=4 (not 6) ensures all four complete their 6-frame ramps by abs F2262:
  //   Received[3] fires at lf 296 (abs 2255); ramp [296,302] completes at lf 302 (abs 2261).
  //   At F2262 (lf 303) all four are at opacity 1.0, so the proof frame passes.
  const receivedFrames = ROLES.map((_, i) => CONFIRMS_LF + i * 4);

  const rolesAppearStart = BEAT * 2 - 10;
  const spacing = 300;
  const totalW = spacing * (ROLES.length - 1);
  const medalPositions = ROLES.map((_, i) => W / 2 - totalW / 2 + i * spacing);

  return (
    <AbsoluteFill>
      <PaperBg />

      {/* Connectors rendered BEFORE the briefing card so the card div sits
          on top (later DOM = higher z-order). Lines originate from the card's
          bottom edge and are never painted over the card's text. */}
      {lf >= callingStart && (
        <Connectors
          frame={lf}
          callingStart={callingStart}
          receivedFrames={receivedFrames}
          medalPositions={medalPositions}
        />
      )}

      {/* Briefing card */}
      <div style={{
        position: 'absolute', top: 100, left: '50%',
        transform: 'translateX(-50%)', width: 800,
        opacity: briefingOpacity,
      }}>
        <div style={{
          background: C.ivory, borderTop: `1px solid ${C.gold}`,
          padding: '32px 44px 36px',
          boxShadow: '0 20px 60px rgba(21,24,29,0.08)',
        }}>
          <div style={{
            fontFamily: 'Overpass', fontSize: 18, fontWeight: 600,
            color: C.gold, letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: 22,
          }}>
            Briefing
          </div>
          <div style={{
            fontFamily: '"IBM Plex Sans"', fontWeight: 400,
            fontSize: 40, color: C.ink, lineHeight: 1.5,
          }}>
            Route 310, 19:23: likely 13 min late<br />
            Its bus is still out on the previous trip<br />
            Standby bus ready at the depot
          </div>
          <div style={{
            marginTop: 10, fontFamily: '"IBM Plex Sans"', fontSize: 14,
            fontWeight: 400, color: `rgba(21,24,29,0.60)`,
            fontStyle: 'italic', letterSpacing: '0.02em',
          }}>
            Illustrative
          </div>

          {/* Controller's decision — word "decides" triggers 4-frame fade */}
          {decisionProgress > 0 && (
            <div style={{
              marginTop: 24, padding: '14px 22px',
              border: `1px solid ${C.ink}`,
              fontFamily: '"IBM Plex Sans"', fontWeight: 500, fontSize: 36,
              color: decisionProgress > 0.5 ? C.ivory : C.ink,
              background: decisionProgress > 0.5 ? C.ink : C.ivory,
              opacity: decisionProgress,
              letterSpacing: 0, transition: 'background 0.3s, color 0.3s',
            }}>
              Controller's decision
            </div>
          )}
        </div>
      </div>

      {/* Medallions */}
      <div style={{
        position: 'absolute', bottom: 180, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: `${spacing - 96}px`, alignItems: 'flex-start',
      }}>
        {ROLES.map((role, i) => (
          <Medallion
            key={role.key}
            Icon={role.Icon}
            label={role.label}
            frame={lf}
            appearFrame={rolesAppearStart + i * 8}
            receivedFrame={receivedFrames[i]}
          />
        ))}
      </div>

      {/* v4e word-level captions for l12 and l13 */}
      {/* Note: Caption component reads alignment JSON and renders word-by-word */}
      <Caption
        line="l12"
        frame={frame}
        startAbs={65.3}
        text="It suggests a fix, and calls everyone who makes it happen. At once."
      />
      <Caption
        line="l13"
        frame={frame}
        startAbs={71.5}
        text="One briefing. The controller decides. Everyone confirms."
      />
    </AbsoluteFill>
  );
}
