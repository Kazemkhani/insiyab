// Logo.jsx (v4b) — "The controller decides." in ivory, not gold
// Gold = Insiyab only rule
import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../../v4/colors.js';

const SYMBOL_UPPER = "M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z";
const SYMBOL_LOWER = "M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z";

export function EmblemReveal({ frame, startFrame }) {
  const DURATION = 24;
  const progress = interpolate(
    frame, [startFrame, startFrame + DURATION], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) }
  );
  const upperY = interpolate(progress, [0, 1], [-60, 0]);
  const lowerY = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 1]);
  const SIZE = 200;

  return (
    <svg width={SIZE} height={SIZE}
      viewBox="0 0 120 120"
      style={{ overflow: 'visible', opacity }}>
      <g transform={`translate(0, ${upperY})`}>
        <path d={SYMBOL_UPPER} fill={C.gold} />
      </g>
      <g transform={`translate(0, ${lowerY})`}>
        <path d={SYMBOL_LOWER} fill={C.gold} />
      </g>
    </svg>
  );
}

export function BilingualLockup({ frame, startFrame }) {
  const DURATION = 20;
  const opacity = interpolate(
    frame, [startFrame, startFrame + DURATION], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      opacity,
    }}>
      <svg width={80} height={80} viewBox="0 0 120 120">
        <path d={SYMBOL_UPPER} fill={C.gold} />
        <path d={SYMBOL_LOWER} fill={C.gold} />
      </svg>
      <div style={{
        fontFamily: 'Overpass',
        fontWeight: 800,
        fontSize: 72,
        color: C.ivory,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        Insiyab
      </div>
      <div style={{
        fontFamily: '"Noto Kufi Arabic"',
        fontWeight: 400,
        fontSize: 48,
        color: C.ivory,
        letterSpacing: '0.01em',
        lineHeight: 1,
        direction: 'rtl',
      }}>
        انسياب
      </div>
    </div>
  );
}

/**
 * FinalLines (v4b) — both final lines in ivory.
 * "The controller decides." is ivory, not gold.
 * Gold = Insiyab brand only.
 */
export function FinalLines({ frame, l15Start, l16Start }) {
  const op15 = interpolate(frame, [l15Start, l15Start + 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const op16 = interpolate(frame, [l16Start, l16Start + 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
    }}>
      <div style={{
        fontFamily: 'Overpass',
        fontWeight: 800,
        fontSize: 90,
        color: C.ivory,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        opacity: op15,
        textAlign: 'center',
      }}>
        Insiyab sees it coming.
      </div>
      {/* ivory, not gold — gold is for Insiyab brand identity only */}
      <div style={{
        fontFamily: 'Overpass',
        fontWeight: 800,
        fontSize: 90,
        color: C.ivory,
        letterSpacing: '-0.03em',
        lineHeight: 1.1,
        opacity: op16,
        textAlign: 'center',
      }}>
        The controller decides.
      </div>
    </div>
  );
}
