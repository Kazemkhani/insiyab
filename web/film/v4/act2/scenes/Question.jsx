// Question.jsx — 42-47s: slow push on city at night + question line word by word
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../colors.js';
import { FPS, s } from '../../beat.js';
import { WordByWord } from '../../components/KineticType.jsx';
import { CreditTag } from '../../components/Caption.jsx';

export function Question({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(5)

  // Colour lift: start in near-darkness, lift to colour over 90 frames
  const brightness = interpolate(lf, [0, s(3)], [0.5, 0.85],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Slow push (calm, steady)
  const scale = interpolate(lf, [0, s(5)], [1.0, 1.04],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Question types on word-by-word with the voice (L09 at 42s)
  // "What if the control room saw it coming?" — 8 words, 1.88s, so about 7 frames per word
  const questionOpacity = interpolate(lf, [0, 10], [0, 1],
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

      {/* Question text — large, centered */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        textAlign: 'center',
        opacity: questionOpacity,
      }}>
        <WordByWord
          frame={lf}
          startFrame={0}
          text="What if the control room saw it coming?"
          wordFrames={7}
          fontSize={96}
          color={C.ivory}
          fontWeight={800}
          fontFamily="Overpass"
          align="center"
        />
      </div>

      {/* Voice caption L09 */}
      <div style={{
        position: 'absolute',
        bottom: 80, left: 80, right: 80,
        opacity: interpolate(lf, [0, 6, s(4.5), s(5)], [0,1,1,0],
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
          What if the control room saw it coming?
        </div>
      </div>

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
