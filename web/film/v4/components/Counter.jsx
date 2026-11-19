// Counter.jsx — animated number counter racing to a target
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../colors.js';

/**
 * Counter — animates from 0 to target over durationFrames frames starting at startFrame.
 * Uses easeOut curve.
 */
export function Counter({ startFrame, durationFrames, target, suffix = '', prefix = '',
  fontSize = 160, color = C.ivory, fontWeight = 800 }) {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3) }
  );
  const value = Math.round(progress * target);
  const formatted = value.toLocaleString('en-US');
  return (
    <span style={{
      fontFamily: 'Overpass',
      fontWeight,
      fontSize,
      color,
      lineHeight: 1,
      letterSpacing: '-0.03em',
    }}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
