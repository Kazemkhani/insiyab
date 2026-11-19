// AlertTile.jsx (v4b) — non-specific alert text; no invented route/stop numbers
import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../../v4/colors.js';

// Generic, non-specific alert types (no invented bus/stop numbers)
const ALERT_TYPES = [
  'ROUTE  LIKELY LATE',
  'BUS  BREAKDOWN',
  'STOP  OVERLOAD',
  'ROUTE  12 MIN LATE',
  'STOP  WAIT >20 MIN',
  'BUS  NO SHOW',
  'ROUTE  BUNCHING',
  'BUS  15 MIN LATE',
  'STOP  CAPACITY',
  'BUS  6 MIN LATE',
  'ROUTE  SERVICE GAP',
  'BUS  DETOUR',
];

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

// Phone ring icons using SVG telephone symbol instead of emoji
export function PhoneRingIcons({ frame, startFrame, count = 6 }) {
  const icons = Array.from({ length: count }, (_, i) => {
    const appear = startFrame + i * 12;
    const opacity = interpolate(frame, [appear, appear + 10], [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
          filter: 'drop-shadow(0 0 8px rgba(196,43,43,0.8))',
        }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none"
            stroke={C.red} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </div>
      ))}
    </div>
  );
}
