// Turn.jsx — 38-42s: silence, emblem reveal, soft tone
import React from 'react';
import { AbsoluteFill, interpolate, Audio, staticFile } from 'remotion';
import { C } from '../colors.js';
import { FPS, s } from '../beat.js';
import { EmblemReveal } from '../components/Logo.jsx';

export function Turn({ frame, localFrame }) {
  // localFrame = frame - s(38); range 0 to s(4)
  const lf = localFrame;

  // Pure black at start
  // At lf=s(2.5) = 75 frames, emblem begins to reveal (800ms = 24 frames)
  const EMBLEM_START = s(2.5); // 75 frames

  // Colour lifts slowly in background from black toward dark ink
  const bgLightness = interpolate(lf, [EMBLEM_START, s(4)], [0, 0.03],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bgColor = `rgb(${Math.round(bgLightness * 255)},${Math.round(bgLightness * 255)},${Math.round(bgLightness * 255)})`;

  return (
    <AbsoluteFill style={{ background: bgColor }}>
      {/* Centered emblem reveal */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        {lf >= EMBLEM_START && (
          <EmblemReveal frame={lf} startFrame={EMBLEM_START} />
        )}
      </div>
    </AbsoluteFill>
  );
}
