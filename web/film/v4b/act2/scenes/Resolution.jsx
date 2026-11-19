// Resolution.jsx (v4b) — 72-80s: dawn footage + final lines (ivory) + bilingual lockup
// Only change from v4: imports Logo from v4b (FinalLines uses ivory, not gold)
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { FPS, s, BEAT, VO } from '../../../v4/beat.js';
// Import from v4b Logo — FinalLines "The controller decides." is ivory, not gold
import { FinalLines, BilingualLockup } from '../../components/Logo.jsx';
import { CreditTag } from '../../../v4/components/Caption.jsx';

export function Resolution({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(8)

  // Dawn footage slow fade in
  const footageOpacity = interpolate(lf, [0, 30], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Slow push (calm, deliberate)
  const scale = interpolate(lf, [0, s(8)], [1.0, 1.05],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Final lines appear: l15 at lf = s(4.5), l16 at lf = s(6.5)
  const l15LocalFrame = s(76.5) - s(72); // = s(4.5) = 135
  const l16LocalFrame = s(78.5) - s(72); // = s(6.5) = 195

  // Lockup appears after a beat of silence (at lf = s(7.5) = 225)
  const lockupStart = s(7.5);
  const lockupOpacity = interpolate(lf, [lockupStart, lockupStart + 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Overlay: ivory wash for final lines
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

      {/* Overlay for text legibility */}
      {ivoryOverlay > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: C.ink,
          opacity: ivoryOverlay,
        }} />
      )}

      {/* Final lines — from v4b Logo (ivory for both lines) */}
      {lf >= l15LocalFrame - 20 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}>
          <FinalLines
            frame={lf}
            l15Start={l15LocalFrame}
            l16Start={l16LocalFrame}
          />
        </div>
      )}

      {/* Bilingual lockup */}
      {lf >= lockupStart && (
        <div style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: `translateX(-50%)`,
          opacity: lockupOpacity,
        }}>
          <BilingualLockup frame={lf} startFrame={lockupStart} />
        </div>
      )}

      {/* Voice captions l15 / l16 */}
      {lf >= l15LocalFrame && lf < l15LocalFrame + s(2) && (
        <div style={{
          position: 'absolute', bottom: 80, left: 80, right: 80,
          opacity: interpolate(lf, [l15LocalFrame, l15LocalFrame + 6, l15LocalFrame + s(1.5), l15LocalFrame + s(2)],
            [0,1,1,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            background: 'rgba(21,24,29,0.78)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            Insiyab sees it coming.
          </div>
        </div>
      )}
      {lf >= l16LocalFrame && (
        <div style={{
          position: 'absolute', bottom: 80, left: 80, right: 80,
          opacity: interpolate(lf, [l16LocalFrame, l16LocalFrame + 6, l16LocalFrame + s(1.3), l16LocalFrame + s(1.6)],
            [0,1,1,0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            background: 'rgba(21,24,29,0.78)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            The controller decides.
          </div>
        </div>
      )}

      <CreditTag text="Pexels" />
    </AbsoluteFill>
  );
}
