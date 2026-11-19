// AlertTile.jsx — multiplying red alert tiles for control room sequence
import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../colors.js';

const ALERT_TYPES = [
  'BUS 303  8 MIN LATE',
  'BUS 55  BREAKDOWN',
  'STOP 1446  OVERLOAD',
  'BUS 71X  12 MIN LATE',
  'STOP 2219  WAIT >20 MIN',
  'BUS 203  NO SHOW',
  'ROUTE F70  BUNCHING',
  'BUS 410  15 MIN LATE',
  'STOP 1891  CAPACITY',
  'BUS 88E  6 MIN LATE',
  'ROUTE C01  GAP',
  'BUS 505  DETOUR',
];

/**
 * AlertWall — builds a grid of red alert tiles that multiply over time.
 * @param {number} frame
 * @param {number} startFrame — first tile appears here
 * @param {number} endFrame   — all tiles visible by here
 * @param {number} totalTiles — max number of tiles to show
 */
export function AlertWall({ frame, startFrame, endFrame, totalTiles = 12 }) {
  const progress = interpolate(
    frame, [startFrame, endFrame], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const visibleCount = Math.ceil(progress * totalTiles);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      flexWrap: 'wrap',
      alignContent: 'flex-start',
      gap: 8,
      padding: 16,
      pointerEvents: 'none',
    }}>
      {ALERT_TYPES.slice(0, visibleCount).map((text, i) => {
        const tileProgress = interpolate(
          frame,
          [startFrame + i * 15, startFrame + i * 15 + 20],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        return (
          <div key={i} style={{
            background: C.red,
            color: C.ivory,
            fontFamily: '"IBM Plex Sans"',
            fontSize: 18,
            fontWeight: 500,
            padding: '8px 14px',
            borderRadius: 3,
            opacity: tileProgress,
            transform: `scale(${interpolate(tileProgress, [0, 0.5, 1], [0.7, 1.05, 1])})`,
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
          }}>
            {text}
          </div>
        );
      })}
    </div>
  );
}

/**
 * PhoneRingIcons — multiplying phone ring icons
 */
export function PhoneRingIcons({ frame, startFrame, count = 6 }) {
  const icons = Array.from({ length: count }, (_, i) => {
    const appear = startFrame + i * 12;
    const opacity = interpolate(frame, [appear, appear + 10], [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    // Pulsing animation
    const pulse = 0.9 + 0.1 * Math.sin((frame - appear) * 0.3);
    return { opacity, pulse };
  });
  return (
    <div style={{
      position: 'absolute',
      bottom: 160,
      right: 60,
      display: 'flex',
      gap: 16,
      alignItems: 'center',
    }}>
      {icons.map(({ opacity, pulse }, i) => (
        <div key={i} style={{
          opacity,
          transform: `scale(${pulse})`,
          fontSize: 48,
          filter: 'drop-shadow(0 0 8px rgba(196,43,43,0.8))',
        }}>
          📞
        </div>
      ))}
    </div>
  );
}
