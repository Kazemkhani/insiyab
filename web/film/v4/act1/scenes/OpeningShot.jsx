// OpeningShot.jsx — 0-5s: Dubai aerial + "18:00" departures-board flip
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../colors.js';
import { FPS, s, BEAT } from '../../beat.js';
import { FlipClock } from '../../components/KineticType.jsx';
import { CreditTag } from '../../components/Caption.jsx';

export function OpeningShot({ frame }) {
  // Slow zoom in: scale from 1.08 to 1.0
  const scale = interpolate(frame, [0, s(5)], [1.08, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Fade in from black
  const fadeIn = interpolate(frame, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // "18:00" text: appears at beat 2 (frame 40), slam in
  const textOpacity = interpolate(frame, [s(1.5), s(2.0)], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink, opacity: fadeIn }}>
      {/* Dubai aerial footage */}
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

      {/* Departures board time counter */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        opacity: textOpacity,
      }}>
        <FlipClock
          frame={frame}
          startFrame={s(0)}
          startTime="17:59:52"
          targetTime="18:00"
          flipFrames={2}
          fontSize={200}
        />
        <div style={{
          fontFamily: '"IBM Plex Sans"',
          fontSize: 28,
          fontWeight: 500,
          color: 'rgba(247,245,240,0.6)',
          textAlign: 'center',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: 12,
        }}>
          Departure Time
        </div>
      </div>

      {/* Voice caption L01 */}
      {frame >= s(2.0) && frame < s(5) && (
        <div style={{
          position: 'absolute',
          bottom: 80, left: 80, right: 80,
        }}>
          <div style={{
            background: 'rgba(21,24,29,0.78)',
            padding: '10px 20px',
            borderRadius: 4,
            fontFamily: '"IBM Plex Sans"',
            fontSize: 36,
            color: C.ivory,
            display: 'inline-block',
            opacity: interpolate(frame, [s(2.0), s(2.3), s(4.5), s(5)], [0,1,1,0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            Six in the evening.
          </div>
        </div>
      )}

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
