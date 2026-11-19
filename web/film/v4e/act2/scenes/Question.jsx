// Question.jsx (v4e) — 48.7-53.6s (ACT2_START moved +0.10s vs v4d)
// v4e change: Caption l09 replaced with word-level Caption; startAbs=48.7
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s } from '../../../v4/beat.js';
import { WordByWord } from '../../../v4/components/KineticType.jsx';
import { CreditTag, Caption } from '../../components/Caption.jsx';

export function Question({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(4.9) in v4e

  const brightness = interpolate(lf, [0, s(3)], [0.75, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(lf, [0, s(5)], [1.0, 1.04],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const questionOpacity = interpolate(lf, [0, 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{
        width: '100%', height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'center center', overflow: 'hidden',
      }}>
        <OffthreadVideo
          src={staticFile('footage/9-aerial-dubai-1.mp4')}
          startFrom={150}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: `brightness(${brightness}) contrast(1.05) saturate(0.8)`,
          }}
          muted
        />
      </div>

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%', textAlign: 'center',
        opacity: questionOpacity,
      }}>
        <WordByWord
          frame={lf} startFrame={0}
          text="What if the control room saw it coming?"
          wordFrames={7} fontSize={96} color={C.ivory}
          fontWeight={800} fontFamily="Overpass" align="center"
        />
      </div>

      {/* v4e word-level caption for l09 */}
      <Caption
        line="l09"
        frame={frame}
        startAbs={48.7}
        text="What if the control room saw it coming?"
      />

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
