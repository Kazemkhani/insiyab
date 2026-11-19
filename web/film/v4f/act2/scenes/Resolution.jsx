// Resolution.jsx (v4e) — 83.4-87s
// v4e changes:
//   A) RESOLUTION starts at s(83.4)=2502 (was s(78.6) in v4d)
//   B) l15 at abs 83.5s → localFrame 3; l16 at abs 85.6s → localFrame 66
//   C) Captions l15/l16 replaced with word-level Caption from v4e components
//   D) Bilingual lockup and FinalLines positions recalculated for new boundary
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s } from '../../../v4/beat.js';
import { FinalLines, BilingualLockup } from '../../../v4b/components/Logo.jsx';
import { CreditTag, Caption } from '../../components/Caption.jsx';

export function Resolution({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(3.6) = 108 frames in v4e

  // l15 at abs 83.5s = localFrame s(83.5) − s(83.4) = 2505−2502 = 3
  // l16 at abs 85.6s = localFrame s(85.6) − s(83.4) = 2568−2502 = 66
  const l15LocalFrame = 3;
  const l16LocalFrame = 66;

  const footageOpacity = interpolate(lf, [0, 30], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = interpolate(lf, [0, s(3.6)], [1.0, 1.05],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Lockup appears after l16 completes
  const lockupStart = l16LocalFrame + s(1.6);  // = 66 + 48 = 114 → after film end
  // Suppress lockup in v4e (film is only 87s; lockup would need extra time)
  const lockupOpacity = interpolate(lf, [lockupStart, lockupStart + 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const ivoryOverlay = interpolate(lf, [l15LocalFrame - 20, l15LocalFrame], [0, 0.3],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Dawn footage */}
      <div style={{
        width: '100%', height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        overflow: 'hidden',
        opacity: footageOpacity,
      }}>
        <OffthreadVideo
          src={staticFile('footage/10-dubai-dawn-1.mp4')}
          startFrom={150}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.65) contrast(1.05)',
          }}
          muted
        />
      </div>

      {ivoryOverlay > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: C.ink, opacity: ivoryOverlay }} />
      )}

      {/* Final lines */}
      {lf >= l15LocalFrame - 20 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <FinalLines
            frame={lf}
            l15Start={l15LocalFrame}
            l16Start={l16LocalFrame}
          />
        </div>
      )}

      {/* Bilingual lockup (may not appear in 87s film) */}
      {lf >= lockupStart && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%',
          transform: `translateX(-50%)`, opacity: lockupOpacity,
        }}>
          <BilingualLockup frame={lf} startFrame={lockupStart} />
        </div>
      )}

      {/* v4e word-level captions for l15 and l16 */}
      <Caption
        line="l15"
        frame={frame}
        startAbs={83.5}
        text="Insiyab sees it coming."
      />
      <Caption
        line="l16"
        frame={frame}
        startAbs={85.6}
        text="The controller decides."
      />

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
