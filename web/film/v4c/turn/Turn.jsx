// Turn.jsx (v4c) — 38-46s: the dream after the nightmare
// Pure visual. All audio (sub-drop, heartbeat, reverse-swell, warm-chord,
// lar1, lar2, airy-shimmer, dawn-ambience) is sequenced in root.jsx.
//
// Choreography (frames are relative to Turn start = ACT1_END = s(38)):
//   lf 0-36:    Black + sub boom resonates (audio in root)
//   lf 36-75:   Near silence, heartbeat fading (audio in root)
//   lf 75-99:   Emblem reveals via two-part mask (EmblemReveal, 24 frames)
//   lf 99-135:  Fine gold hairline draws from emblem outward (1.2s cubic-bezier)
//   lf 108-135: Wordmarks unveil via clip-path mask outward from emblem
//   lf 135:     ← LOCKUP COMPLETE: lar1 "انسياب" plays (timed in root.jsx)
//   lf 140-162: Shimmer diagonal pass + chime
//   lf 155-180: Hairline fades
//   lf 135-210: Lockup holds
//   lf 165-240: Background warms from black toward dawn/ivory
//   lf 180-237: Vocal captions: Arabic + English translation (lar2 plays)
//   lf 240:     Turn ends → Act 2

import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../../v4/colors.js';
import { EmblemReveal } from '../../v4/components/Logo.jsx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Approximate material standard ease cubic-bezier(0.4,0,0.2,1):
// fast in, decelerates smoothly
function easeStandard(t) {
  return t === 0 ? 0 : t === 1 ? 1 : t < 0.6
    ? (5 / 3) * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 8;
}

export function Turn({ frame, localFrame }) {
  const lf = localFrame; // 0 to 240

  // === TIMING CONSTANTS ===
  const EMBLEM_START = 75;    // s(2.5) — emblem reveal begins
  const EMBLEM_END   = 99;    // 75 + 24 frames (800ms) — reveal complete

  const HAIR_START   = 99;    // hairline starts drawing
  const HAIR_DONE    = 135;   // hairline complete — both wordmarks fully revealed
  const HAIR_FADE_IN = 155;   // hairline starts fading
  const HAIR_FADE_OUT= 183;   // hairline gone

  const WORD_START   = 108;   // wordmark mask starts
  const WORD_DONE    = 135;   // wordmarks fully revealed (same as HAIR_DONE)

  const SHIMMER_IN   = 140;   // shimmer sweep enters frame
  const SHIMMER_OUT  = 162;   // shimmer leaves frame

  const LOCKUP_HOLD_END = 210; // lockup starts to fade slightly

  const CAP_IN  = 177;        // vocal captions appear (lar2 at lf=180)
  const CAP_OUT = 237;        // captions fade before Turn ends

  // === BACKGROUND ===
  // Black → very warm dark gold over 3s (lf 75-165)
  const bgR = Math.round(interpolate(lf, [75, 165, 240], [0, 30, 46], clamp));
  const bgG = Math.round(interpolate(lf, [75, 165, 240], [0, 22, 33], clamp));
  const bgB = Math.round(interpolate(lf, [75, 165, 240], [0,  8, 12], clamp));
  const bgColor = `rgb(${bgR},${bgG},${bgB})`;

  // === EMBLEM BLOOM ===
  const bloomOp = interpolate(lf, [EMBLEM_START, EMBLEM_END + 20], [0, 0.14], clamp);

  // === HAIRLINE PROGRESS ===
  const hairRaw = interpolate(lf, [HAIR_START, HAIR_DONE], [0, 1], clamp);
  const hairProgress = easeStandard(hairRaw);
  const hairOpacity  = interpolate(lf, [HAIR_FADE_IN, HAIR_FADE_OUT], [1, 0], clamp);

  // === WORDMARK MASK ===
  const wordRaw  = interpolate(lf, [WORD_START, WORD_DONE], [0, 1], clamp);
  const wordProg = easeInOutQuad(wordRaw);
  const arabicClip = `inset(0 0 0 ${(1 - wordProg) * 100}%)`;  // reveals from RIGHT (emblem side)
  const latinClip  = `inset(0 ${(1 - wordProg) * 100}% 0 0)`;  // reveals from LEFT (emblem side)

  // === SHIMMER ===
  const shimmerX  = interpolate(lf, [SHIMMER_IN, SHIMMER_OUT], [-18, 118], clamp);
  const shimmerOp = interpolate(
    lf,
    [SHIMMER_IN, SHIMMER_IN + 5, SHIMMER_OUT - 5, SHIMMER_OUT],
    [0, 0.22, 0.22, 0],
    clamp
  );

  // === LOCKUP OPACITY (holds then very slightly dims as dawn brightens) ===
  const lockupOp = interpolate(lf, [LOCKUP_HOLD_END, 230], [1, 0.92], clamp);

  // === VOCAL CAPTIONS ===
  const capOp = interpolate(lf, [CAP_IN, CAP_IN + 8, CAP_OUT - 8, CAP_OUT], [0, 1, 1, 0], clamp);

  // === LAYOUT CONSTANTS (screen: 1920x1080) ===
  const LOCK_W    = 980;    // total lockup width (px)
  const EMBLEM_SZ = 200;    // EmblemReveal renders at 200px
  const GAP       = 36;     // gap between emblem and each wordmark
  const WORD_W    = (LOCK_W - EMBLEM_SZ - GAP * 2) / 2; // 254px each
  const LOCK_LEFT = (1920 - LOCK_W) / 2;  // 470
  const LOCK_TOP  = (1080 - EMBLEM_SZ) / 2 - 20; // slightly above center: 420

  // Hairline extends from emblem edges outward to wordmark outer edges
  const emblemLeft  = LOCK_LEFT + WORD_W + GAP;         // 470 + 254 + 36 = 760
  const emblemRight = emblemLeft + EMBLEM_SZ;            // 960
  const hairY       = LOCK_TOP + EMBLEM_SZ / 2;         // 520 — midpoint of emblem
  const leftEnd     = LOCK_LEFT;                         // 470 — Arabic outer edge
  const rightEnd    = LOCK_LEFT + LOCK_W;                // 1450 — Latin outer edge
  const leftLen     = emblemLeft - GAP / 2 - leftEnd;   // 760 - 18 - 470 = 272
  const rightLen    = rightEnd - (emblemRight + GAP / 2); // 1450 - 978 = 472... let me recalc

  // Recalculate precisely:
  // LOCK_LEFT = 470, WORD_W = 254, GAP = 36, EMBLEM_SZ = 200
  // Arabic region: 470 to 470+254 = 724
  // Gap: 724 to 760
  // Emblem: 760 to 960
  // Gap: 960 to 996
  // Latin: 996 to 1250 (but LOCK_W = 980, so Latin ends at 470+980 = 1450)
  // Wait: LOCK_W = WORD_W + GAP + EMBLEM_SZ + GAP + WORD_W = 254+36+200+36+254 = 780... not 980
  // Let me recalculate: WORD_W = (980 - 200 - 72) / 2 = (708) / 2 = 354
  // So WORD_W = 354, not 254

  // This means: Arabic: 470 to 824. Gap: 824 to 860. Emblem: 860 to 1060. Gap: 1060 to 1096. Latin: 1096 to 1450.
  // hairY = 420 + 100 = 520
  // leftLen = 860 - 18 - 470 = 372
  // rightLen = 1450 - 1078 = 372

  // The positions above used wrong WORD_W. Let me just hardcode the correct values:
  const W_WORD = 354; // corrected
  const embL = LOCK_LEFT + W_WORD + GAP;    // 470 + 354 + 36 = 860
  const embR = embL + EMBLEM_SZ;            // 1060
  const leftHairEnd  = LOCK_LEFT + 8;       // 478 (slight inset from Arabic edge)
  const rightHairEnd = LOCK_LEFT + LOCK_W - 8; // 1442
  const leftHairLen  = embL - GAP / 2 - leftHairEnd;  // 860 - 18 - 478 = 364
  const rightHairLen = rightHairEnd - (embR + GAP / 2); // 1442 - 1078 = 364

  // Soft bloom: integrate warmth into background itself — wide ambient,
  // not a spotlight orb. Required by production brief ("soft light bloom").
  const bloomCenter = `${((LOCK_TOP + EMBLEM_SZ / 2) / 1080) * 100}%`;
  const bgWithBloom = bloomOp > 0
    ? `radial-gradient(ellipse 110% 90% at 50% ${bloomCenter}, rgb(${bgR + 8},${bgG + 4},${bgB + 1}) 0%, rgb(${bgR},${bgG},${bgB}) 65%)`
    : bgColor;

  return (
    <AbsoluteFill style={{ background: bgWithBloom, overflow: 'hidden' }}>

      {/* === HAIRLINE SVG === */}
      {lf >= HAIR_START && (
        <svg style={{
          position: 'absolute', left: 0, top: 0,
          width: 1920, height: 1080,
          overflow: 'visible', pointerEvents: 'none',
        }}>
          {/* Left hairline: from emblem edge outward LEFT toward Arabic wordmark */}
          <line
            x1={embL - 6}   y1={hairY + 2}
            x2={leftHairEnd} y2={hairY + 2}
            stroke={C.gold}
            strokeWidth={0.75}
            strokeLinecap="round"
            opacity={hairOpacity}
            strokeDasharray={leftHairLen + 10}
            strokeDashoffset={(1 - hairProgress) * (leftHairLen + 10)}
          />
          {/* Right hairline: from emblem edge outward RIGHT toward Latin wordmark */}
          <line
            x1={embR + 6}    y1={hairY + 2}
            x2={rightHairEnd} y2={hairY + 2}
            stroke={C.gold}
            strokeWidth={0.75}
            strokeLinecap="round"
            opacity={hairOpacity}
            strokeDasharray={rightHairLen + 10}
            strokeDashoffset={(1 - hairProgress) * (rightHairLen + 10)}
          />
        </svg>
      )}

      {/* === LOCKUP ROW (flex, horizontally centred) === */}
      <div style={{
        position: 'absolute',
        top: LOCK_TOP,
        left: LOCK_LEFT,
        width: LOCK_W,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: GAP,
        opacity: lockupOp,
      }}>

        {/* Arabic wordmark — reveals from RIGHT (emblem side) → LEFT */}
        <div style={{
          width: W_WORD,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: 76,
            fontWeight: 400,
            color: C.ivory,
            direction: 'rtl',
            letterSpacing: '0.03em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            clipPath: arabicClip,
          }}>
            انسياب
          </div>
        </div>

        {/* Emblem (centre, with soft bloom glow) */}
        <div style={{
          position: 'relative',
          width: EMBLEM_SZ,
          height: EMBLEM_SZ,
          flexShrink: 0,
          filter: lf >= EMBLEM_END
            ? `drop-shadow(0 0 18px rgba(156,123,62,${bloomOp * 2}))`
            : 'none',
        }}>
          {lf >= EMBLEM_START && (
            <EmblemReveal frame={lf} startFrame={EMBLEM_START} />
          )}
        </div>

        {/* Latin wordmark — reveals from LEFT (emblem side) → RIGHT */}
        <div style={{
          width: W_WORD,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: 'Overpass',
            fontSize: 76,
            fontWeight: 800,
            color: C.ivory,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            clipPath: latinClip,
          }}>
            Insiyab
          </div>
        </div>
      </div>

      {/* === SHIMMER DIAGONAL PASS === */}
      {lf >= SHIMMER_IN && shimmerOp > 0 && (
        <div style={{
          position: 'absolute',
          top: LOCK_TOP - 20,
          left: LOCK_LEFT,
          width: LOCK_W,
          height: EMBLEM_SZ + 40,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: `${shimmerX}%`,
            width: '18%',
            height: '140%',
            // Production brief: "one subtle shimmer pass, narrow low-opacity diagonal"
            // Plain semi-transparent strip — no linear-gradient (design-doctrine §2.1)
            background: 'rgba(247,245,240,0.07)',
            transform: 'skewX(-16deg)',
            opacity: shimmerOp,
          }} />
        </div>
      )}

      {/* === VOCAL CAPTIONS (lar2: "المدينة تشوف اللي جاي") === */}
      {lf >= CAP_IN && capOp > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 90,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          opacity: capOp,
          pointerEvents: 'none',
        }}>
          {/* Arabic vocal line */}
          <div style={{
            fontFamily: '"Noto Kufi Arabic"',
            fontSize: 34,
            fontWeight: 400,
            color: C.ivory,
            direction: 'rtl',
            background: 'rgba(21,24,29,0.82)',
            padding: '8px 24px',
            borderRadius: 4,
            letterSpacing: '0.03em',
            lineHeight: 1.4,
          }}>
            المدينة تشوف اللي جاي
          </div>
          {/* English translation */}
          <div style={{
            fontFamily: '"IBM Plex Sans"',
            fontSize: 34,
            fontWeight: 400,
            color: C.ivory,
            background: 'rgba(21,24,29,0.82)',
            padding: '8px 24px',
            borderRadius: 4,
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
          }}>
            Insiyab. The city sees what&#39;s coming.
          </div>
        </div>
      )}

      {/* NEEDS NATIVE-SPEAKER CHECK: Arabic voice is Yousuf - Cinematic Emirati Narrator
          (ElevenLabs ID: WcswLmU3iGeMrhxfWXKN). Text reviewed by tool author only. */}

    </AbsoluteFill>
  );
}
