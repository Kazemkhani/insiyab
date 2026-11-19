// Highway.jsx (v4e) — 5-11s
// v4e change: Caption l02 replaced with word-level Caption from v4e components
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s } from '../../../v4/beat.js';
import { Counter } from '../../../v4/components/Counter.jsx';
import { CreditTag, Caption } from '../../components/Caption.jsx';

export function Highway({ frame, localFrame }) {
  const lf = localFrame;
  const duration = s(6);

  const scale = interpolate(lf, [0, duration], [1.0, 1.06],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const counterOpacity = interpolate(lf, [0, 10], [0, 1],
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

      <div style={{
        position: 'absolute',
        top: '50%', left: 0,
        background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(21,24,29,0.55) 0%, rgba(21,24,29,0.0) 100%)',
        inset: 0,
      }} />

      <div style={{
        position: 'absolute',
        top: '50%', left: 100,
        transform: 'translateY(-50%)',
        opacity: counterOpacity,
      }}>
        <Counter
          startFrame={0} durationFrames={s(2)}
          target={50000} fontSize={160} color={C.ivory} fontWeight={800}
        />
        <div style={{
          fontFamily: '"IBM Plex Sans"', fontSize: 28, fontWeight: 500,
          color: 'rgba(247,245,240,0.7)', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginTop: 8,
        }}>
          Passengers per hour
        </div>
      </div>

      {/* v4e word-level caption for l02 */}
      <Caption
        line="l02"
        frame={frame}
        startAbs={5.0}
        text="Fifty thousand people board a bus in a single hour."
      />

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
