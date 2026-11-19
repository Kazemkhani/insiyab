// Turn.jsx (v4e) — 38-48.7s (lar2 moved +0.10s, ACT2_START +0.10s vs v4d)
// v4e changes:
//   A) lar1 "انسياب" gets its own word-level Caption (startAbs=42.5)
//   B) lar2 Arabic caption replaced with word-level Caption (startAbs=45.3)
//   C) English translation shown as a static companion below lar2 Caption
//      (no forced alignment for the translation; shown from lar2 start to its clearance)
//   D) All visual logic (emblem, hairline, lockup, shimmer) unchanged from v4d
//
// PROOF: lar2 word "تشوف" starts at lar2.start(45.3s) + 1.840s = 47.140s = frame 1414
//        TURN localFrame = 1414 − 1140 = 274  ← shown in proof table

import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../../v4/colors.js';
import { EmblemReveal } from '../../v4/components/Logo.jsx';
import { Caption } from '../components/Caption.jsx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeStandard(t) {
  return t === 0 ? 0 : t === 1 ? 1 : t < 0.6
    ? (5 / 3) * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 8;
}

export function Turn({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(10.7) = 321 in v4e

  const EMBLEM_START = 75;
  const EMBLEM_END   = 99;
  const HAIR_START   = 99;
  const HAIR_DONE    = 135;
  const HAIR_FADE_IN = 155;
  const HAIR_FADE_OUT= 183;
  const WORD_START   = 108;
  const WORD_DONE    = 135;
  const SHIMMER_IN   = 140;
  const SHIMMER_OUT  = 162;
  const LOCKUP_HOLD_END = 210;

  // v4e: Turn now 321 frames (48.7-38=10.7s). CAP_IN/OUT updated for lar2 at lf=219.
  // lar1: starts at abs 42.5s = frame 1275, lf = 135. Caption auto-managed by Caption.jsx.
  // lar2: starts at abs 45.3s = frame 1359, lf = 219.
  // lar2 last word "جاي" ends at abs 47.98s = frame 1439, lf = 299. Clears +0.3s = lf 308.
  // English translation: show from lar2.start to same clearance.
  const lar2AbsStart = 45.3; // seconds
  const lar2AbsEnd   = 47.98 + 0.3; // 48.28s = frame 1448
  const transOp = interpolate(frame,
    [lar2AbsStart * 30 - 3, lar2AbsStart * 30 + 6, lar2AbsEnd * 30 - 6, lar2AbsEnd * 30],
    [0, 1, 1, 0], clamp);

  const bgR = Math.round(interpolate(lf, [75, 165, 240], [0, 30, 46], clamp));
  const bgG = Math.round(interpolate(lf, [75, 165, 240], [0, 22, 33], clamp));
  const bgB = Math.round(interpolate(lf, [75, 165, 240], [0,  8, 12], clamp));
  const bgColor = `rgb(${bgR},${bgG},${bgB})`;

  const bloomOp = interpolate(lf, [EMBLEM_START, EMBLEM_END + 20], [0, 0.14], clamp);
  const hairRaw = interpolate(lf, [HAIR_START, HAIR_DONE], [0, 1], clamp);
  const hairProgress = easeStandard(hairRaw);
  const hairOpacity  = interpolate(lf, [HAIR_FADE_IN, HAIR_FADE_OUT], [1, 0], clamp);
  const wordRaw  = interpolate(lf, [WORD_START, WORD_DONE], [0, 1], clamp);
  const wordProg = easeInOutQuad(wordRaw);
  const arabicClip = `inset(0 0 0 ${(1 - wordProg) * 100}%)`;
  const latinClip  = `inset(0 ${(1 - wordProg) * 100}% 0 0)`;
  const shimmerX  = interpolate(lf, [SHIMMER_IN, SHIMMER_OUT], [-18, 118], clamp);
  const shimmerOp = interpolate(lf,
    [SHIMMER_IN, SHIMMER_IN + 5, SHIMMER_OUT - 5, SHIMMER_OUT],
    [0, 0.22, 0.22, 0], clamp);
  const lockupOp = interpolate(lf, [LOCKUP_HOLD_END, 230], [1, 0.92], clamp);

  const LOCK_W    = 980;
  const EMBLEM_SZ = 200;
  const GAP       = 36;
  const W_WORD    = (LOCK_W - EMBLEM_SZ - GAP * 2) / 2; // 354
  const LOCK_LEFT = (1920 - LOCK_W) / 2;
  const LOCK_TOP  = (1080 - EMBLEM_SZ) / 2 - 20;

  const embL = LOCK_LEFT + W_WORD + GAP;
  const embR = embL + EMBLEM_SZ;
  const hairY = LOCK_TOP + EMBLEM_SZ / 2;
  const leftHairEnd  = LOCK_LEFT + 8;
  const rightHairEnd = LOCK_LEFT + LOCK_W - 8;
  const leftHairLen  = embL - GAP / 2 - leftHairEnd;
  const rightHairLen = rightHairEnd - (embR + GAP / 2);

  const bloomCenter = `${((LOCK_TOP + EMBLEM_SZ / 2) / 1080) * 100}%`;
  const bgWithBloom = bloomOp > 0
    ? `radial-gradient(ellipse 110% 90% at 50% ${bloomCenter}, rgb(${bgR + 8},${bgG + 4},${bgB + 1}) 0%, rgb(${bgR},${bgG},${bgB}) 65%)`
    : bgColor;

  return (
    <AbsoluteFill style={{ background: bgWithBloom, overflow: 'hidden' }}>

      {/* Hairline */}
      {lf >= HAIR_START && (
        <svg style={{
          position: 'absolute', left: 0, top: 0,
          width: 1920, height: 1080,
          overflow: 'visible', pointerEvents: 'none',
        }}>
          <line
            x1={embL - 6} y1={hairY + 2} x2={leftHairEnd} y2={hairY + 2}
            stroke={C.gold} strokeWidth={0.75} strokeLinecap="round"
            opacity={hairOpacity}
            strokeDasharray={leftHairLen + 10}
            strokeDashoffset={(1 - hairProgress) * (leftHairLen + 10)}
          />
          <line
            x1={embR + 6} y1={hairY + 2} x2={rightHairEnd} y2={hairY + 2}
            stroke={C.gold} strokeWidth={0.75} strokeLinecap="round"
            opacity={hairOpacity}
            strokeDasharray={rightHairLen + 10}
            strokeDashoffset={(1 - hairProgress) * (rightHairLen + 10)}
          />
        </svg>
      )}

      {/* Lockup */}
      <div style={{
        position: 'absolute', top: LOCK_TOP, left: LOCK_LEFT,
        width: LOCK_W, display: 'flex', flexDirection: 'row',
        alignItems: 'center', gap: GAP, opacity: lockupOp,
      }}>
        <div style={{
          width: W_WORD, display: 'flex',
          justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: '"Noto Kufi Arabic"', fontSize: 76, fontWeight: 400,
            color: C.ivory, direction: 'rtl', letterSpacing: '0.03em',
            lineHeight: 1, whiteSpace: 'nowrap', clipPath: arabicClip,
          }}>
            انسياب
          </div>
        </div>
        <div style={{
          position: 'relative', width: EMBLEM_SZ, height: EMBLEM_SZ, flexShrink: 0,
          filter: lf >= EMBLEM_END
            ? `drop-shadow(0 0 18px rgba(156,123,62,${bloomOp * 2}))` : 'none',
        }}>
          {lf >= EMBLEM_START && (
            <EmblemReveal frame={lf} startFrame={EMBLEM_START} />
          )}
        </div>
        <div style={{
          width: W_WORD, display: 'flex',
          justifyContent: 'flex-start', alignItems: 'center', overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: 'Overpass', fontSize: 76, fontWeight: 800,
            color: C.ivory, letterSpacing: '-0.02em',
            lineHeight: 1, whiteSpace: 'nowrap', clipPath: latinClip,
          }}>
            Insiyab
          </div>
        </div>
      </div>

      {/* Shimmer */}
      {lf >= SHIMMER_IN && shimmerOp > 0 && (
        <div style={{
          position: 'absolute', top: LOCK_TOP - 20, left: LOCK_LEFT,
          width: LOCK_W, height: EMBLEM_SZ + 40, overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: '-20%', left: `${shimmerX}%`,
            width: '18%', height: '140%',
            background: 'rgba(247,245,240,0.07)',
            transform: 'skewX(-16deg)', opacity: shimmerOp,
          }} />
        </div>
      )}

      {/* v4e: word-level caption for lar1 "انسياب" (single word, appears briefly) */}
      <Caption
        line="lar1"
        frame={frame}
        startAbs={42.5}
        text="انسياب"
        rtl
      />

      {/* v4e: word-level Arabic caption for lar2 */}
      <Caption
        line="lar2"
        frame={frame}
        startAbs={45.3}
        text="المدينة تشوف اللي جاي"
        rtl
      />

      {/* English translation (static companion — no forced alignment) */}
      {transOp > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 36,         // below the lar2 Caption band (which is at bottom 80)
          left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          opacity: transOp, pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: '"IBM Plex Sans"', fontSize: 28, fontWeight: 400,
            color: 'rgba(247,245,240,0.75)',
            letterSpacing: '-0.01em', lineHeight: 1.4,
            fontStyle: 'italic',
          }}>
            Insiyab. The city sees what&#39;s coming.
          </div>
        </div>
      )}

      {/* NEEDS NATIVE-SPEAKER CHECK: Arabic voice is Yousuf - Cinematic Emirati Narrator */}
    </AbsoluteFill>
  );
}
