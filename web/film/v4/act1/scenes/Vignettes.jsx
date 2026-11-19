// Vignettes.jsx — 11-20s: nurse/worker/student quick cuts + thermometer
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate, Sequence } from 'remotion';
import { C } from '../../colors.js';
import { FPS, s, BEAT, BAR } from '../../beat.js';
import { CreditTag } from '../../components/Caption.jsx';

// Each vignette is 2 bars = s(5.33s) but we keep them at ~3s each = 90 frames
const VIGNETTE_DUR = BAR * 2; // 160 frames ~5.3s... too long

// Actually 11-20s = 9s / 3 vignettes = 3s each = 90 frames
const VIG_DUR = 90;

function Thermometer({ localFrame, startFrame, targetTemp = 41 }) {
  const progress = interpolate(
    localFrame, [startFrame, startFrame + 60], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const height = 120;
  const fillHeight = progress * height;
  const displayTemp = Math.round(progress * targetTemp);

  return (
    <div style={{
      position: 'absolute',
      right: 120,
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Thermometer body */}
      <div style={{
        width: 20,
        height,
        background: 'rgba(247,245,240,0.2)',
        borderRadius: 10,
        position: 'relative',
        overflow: 'hidden',
        border: `2px solid rgba(247,245,240,0.4)`,
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: fillHeight,
          background: C.red,
          borderRadius: 8,
          transition: 'height 0.1s',
        }} />
      </div>
      {/* Temperature label */}
      <div style={{
        fontFamily: 'Overpass',
        fontWeight: 800,
        fontSize: 72,
        color: C.red,
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        {displayTemp}°C
      </div>
      <div style={{
        fontFamily: '"IBM Plex Sans"',
        fontSize: 20,
        fontWeight: 500,
        color: 'rgba(247,245,240,0.6)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        July
      </div>
    </div>
  );
}

export function Vignettes({ frame, localFrame }) {
  // localFrame = frame - s(11)
  const lf = localFrame;

  // Vignette 1: Bus stop silhouette (nurse) → 0-90 lf
  // Vignette 2: Desert heat (worker) → 90-180 lf
  // Vignette 3: Metro passing (student) → 180-270 lf
  const vig = Math.min(2, Math.floor(lf / VIG_DUR));
  const vigLocalFrame = lf - vig * VIG_DUR;

  // Cut opacity: flash to black for 4 frames on each cut
  const cutFlash = vigLocalFrame < 4 ? interpolate(vigLocalFrame, [0, 4], [1, 0]) : 0;

  const vignettes = [
    {
      src: 'footage/3-bus-stop-night-2.mp4',
      credit: 'Pexels',
      label: 'A nurse, after a twelve-hour shift.',
      color: C.ivory,
      captionVO: 'A nurse after a twelve-hour shift.',
      voiceStart: s(11),
      filter: 'brightness(0.8)',
    },
    {
      src: 'footage/7-dubai-desert-1.mp4',
      credit: 'Pexels',
      label: 'A worker, in forty-one degrees.',
      color: C.ivory,
      captionVO: 'A worker, in forty-one degrees.',
      voiceStart: s(14),
      filter: 'brightness(0.75) contrast(1.1)',
      showThermometer: true,
    },
    {
      src: 'footage/8-dubai-metro-traffic-1.mp4',
      credit: 'Pexels',
      label: 'A student who cannot miss the last metro.',
      color: C.ivory,
      captionVO: 'A student who cannot miss the last metro.',
      voiceStart: s(17),
      filter: 'brightness(0.7) saturate(0.85)',
    },
  ];

  const v = vignettes[vig];
  const videoStart = vig * 30; // start from different points in each video

  // Scale for speed-ramp feel
  const scale = interpolate(vigLocalFrame, [0, VIG_DUR], [1.02, 1.07],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const captionVO_opacity = interpolate(
    vigLocalFrame, [4, 12, VIG_DUR - 10, VIG_DUR],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Cut flash */}
      {cutFlash > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: C.ink,
          opacity: cutFlash,
          zIndex: 10,
        }} />
      )}

      <div style={{
        width: '100%', height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        overflow: 'hidden',
      }}>
        <OffthreadVideo
          key={vig}
          src={staticFile(v.src)}
          startFrom={videoStart}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: v.filter,
          }}
          muted
        />
      </div>

      {/* Thermometer for heat vignette */}
      {v.showThermometer && (
        <Thermometer localFrame={vigLocalFrame} startFrame={10} targetTemp={41} />
      )}

      {/* Person label — illustrative */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: 80,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 22,
        fontWeight: 400,
        color: 'rgba(247,245,240,0.5)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: captionVO_opacity,
      }}>
        Illustrative
      </div>

      {/* Voice caption */}
      <div style={{
        position: 'absolute',
        bottom: 80, left: 80, right: 80,
        opacity: captionVO_opacity,
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
          {v.captionVO}
        </div>
      </div>

      <CreditTag text={`${v.credit} · Illustrative`} />
    </AbsoluteFill>
  );
}
