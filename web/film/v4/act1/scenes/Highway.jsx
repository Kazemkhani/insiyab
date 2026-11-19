// Highway.jsx — 5-11s: highway timelapse + 50,000 counter
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../colors.js';
import { FPS, s } from '../../beat.js';
import { Counter } from '../../components/Counter.jsx';
import { CreditTag } from '../../components/Caption.jsx';

export function Highway({ frame, localFrame }) {
  // localFrame = frame - s(5)
  const lf = localFrame;
  const duration = s(6);

  // Speed ramp: subtle forward zoom
  const scale = interpolate(lf, [0, duration], [1.0, 1.06],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Counter: appears with L02 voice (at 5s), races to 50000 in 2s
  const counterOpacity = interpolate(lf, [0, 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Dots pouring in (simulated with scaling dot)
  const dotScale = interpolate(lf, [s(0), s(2)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{
        width: '100%', height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        overflow: 'hidden',
      }}>
        <OffthreadVideo
          src={staticFile('footage/1-dubai-hyperlapse-1.mp4')}
          startFrom={0}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.65) contrast(1.15) saturate(0.9)',
          }}
          muted
        />
      </div>

      {/* Overlay vignette for text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(21,24,29,0.55) 0%, rgba(21,24,29,0.0) 100%)',
      }} />

      {/* Counter */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 100,
        transform: 'translateY(-50%)',
        opacity: counterOpacity,
      }}>
        <Counter
          startFrame={0}
          durationFrames={s(2)}
          target={50000}
          fontSize={160}
          color={C.ivory}
          fontWeight={800}
        />
        <div style={{
          fontFamily: '"IBM Plex Sans"',
          fontSize: 28,
          fontWeight: 500,
          color: 'rgba(247,245,240,0.7)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginTop: 8,
        }}>
          Passengers per hour
        </div>
      </div>

      {/* Voice caption L02 */}
      <div style={{
        position: 'absolute',
        bottom: 80, left: 80, right: 80,
        opacity: interpolate(lf, [0, 6, s(5.5), s(6)], [0,1,1,0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          background: 'rgba(21,24,29,0.78)',
          padding: '10px 20px',
          borderRadius: 4,
          fontFamily: '"IBM Plex Sans"',
          fontSize: 36,
          color: C.ivory,
          display: 'inline-block',
        }}>
          Fifty thousand people board a bus in a single hour.
        </div>
      </div>

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
