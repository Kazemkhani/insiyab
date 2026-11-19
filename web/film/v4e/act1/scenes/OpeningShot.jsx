// OpeningShot.jsx (v4e) — 0-5s
// v4e change: Caption l01 replaced with word-level Caption from v4e components
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s } from '../../../v4/beat.js';
import { FlipClock } from '../../../v4/components/KineticType.jsx';
import { CreditTag, Caption } from '../../components/Caption.jsx';

export function OpeningShot({ frame }) {
  const scale = interpolate(frame, [0, s(5)], [1.08, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeIn = interpolate(frame, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textOpacity = interpolate(frame, [s(1.5), s(2.0)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink, opacity: fadeIn }}>
      <div style={{
        width: '100%', height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        overflow: 'hidden',
      }}>
        <OffthreadVideo
          src={staticFile('footage/9-aerial-dubai-1.mp4')}
          startFrom={0}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.75) contrast(1.1)',
          }}
          muted
        />
      </div>

      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -60%)',
        opacity: textOpacity,
      }}>
        <FlipClock
          frame={frame} startFrame={s(0)}
          startTime="17:59:52" targetTime="18:00"
          flipFrames={2} fontSize={200}
        />
        <div style={{
          fontFamily: '"IBM Plex Sans"', fontSize: 28, fontWeight: 500,
          color: 'rgba(247,245,240,0.6)', textAlign: 'center',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 12,
        }}>
          Departure Time
        </div>
      </div>

      {/* v4e word-level caption for l01 */}
      <Caption
        line="l01"
        frame={frame}
        startAbs={2.0}
        text="Six in the evening."
      />

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
