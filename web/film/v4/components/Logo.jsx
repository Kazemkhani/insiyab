// Logo.jsx — Insiyab emblem reveal and bilingual lockup
import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../colors.js';

// Inline the emblem paths from the lockup-animation.svg
// symbol-upper and symbol-lower paths, scaled to fit a target size
const SYMBOL_UPPER = "M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z";
const SYMBOL_LOWER = "M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z";

/**
 * EmblemReveal — the two-part emblem mask reveal over 24 frames (800ms at 30fps).
 * @param {number} frame
 * @param {number} startFrame — when reveal begins
 */
export function EmblemReveal({ frame, startFrame }) {
  const DURATION = 24; // 800ms at 30fps
  const progress = interpolate(
    frame, [startFrame, startFrame + DURATION], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) }
  );
  // Upper part slides down from above, lower part slides up from below
  const upperY = interpolate(progress, [0, 1], [-60, 0]);
  const lowerY = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 1]);

  const SIZE = 200;
  const SCALE = SIZE / 120; // the viewBox is roughly 120x120

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

/**
 * BilingualLockup — final logo with Latin + Arabic wordmark, fades in.
 * @param {number} frame
 * @param {number} startFrame
 */
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
      {/* Emblem (small, gold) */}
      <svg width={80} height={80} viewBox="0 0 120 120">
        <path d={SYMBOL_UPPER} fill={C.gold} />
        <path d={SYMBOL_LOWER} fill={C.gold} />
      </svg>
      {/* Latin wordmark */}
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
      {/* Arabic wordmark approximation */}
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
 * FinalLines — the two final spoken lines in large Overpass 800
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
      <div style={{
        fontFamily: 'Overpass',
        fontWeight: 800,
        fontSize: 90,
        color: C.gold,
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
