// Vignettes.jsx (v4e) — 11-20s: nurse/worker/student quick cuts + thermometer
// v4e change: Captions l03/l04/l05 replaced with word-level Caption from v4e components
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s, BEAT, BAR } from '../../../v4/beat.js';
import { CreditTag, Caption } from '../../components/Caption.jsx';

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
      position: 'absolute', right: 120, top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 20, height,
        background: 'rgba(247,245,240,0.2)', borderRadius: 10,
        position: 'relative', overflow: 'hidden',
        border: `2px solid rgba(247,245,240,0.4)`,
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: fillHeight, background: C.red, borderRadius: 8,
        }} />
      </div>
      <div style={{
        fontFamily: 'Overpass', fontWeight: 800, fontSize: 72,
        color: C.red, letterSpacing: '-0.03em', lineHeight: 1,
      }}>
        {displayTemp}°C
      </div>
      <div style={{
        fontFamily: '"IBM Plex Sans"', fontSize: 20, fontWeight: 500,
        color: 'rgba(247,245,240,0.6)', letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        July
      </div>
    </div>
  );
}

export function Vignettes({ frame, localFrame }) {
  const lf = localFrame;
  const vig = Math.min(2, Math.floor(lf / VIG_DUR));
  const vigLocalFrame = lf - vig * VIG_DUR;

  const cutFlash = vigLocalFrame < 4
    ? interpolate(vigLocalFrame, [0, 4], [1, 0]) : 0;

  const vignettes = [
    {
      src: 'footage/3-bus-stop-night-2.mp4', credit: 'Pexels',
      captionLine: 'l03', captionText: 'A nurse after a twelve-hour shift.',
      captionStartAbs: 11.0,
      filter: 'brightness(0.8)',
    },
    {
      src: 'footage/7-dubai-desert-1.mp4', credit: 'Pexels',
      captionLine: 'l04', captionText: 'A worker, in forty-one degrees.',
      captionStartAbs: 14.0,
      filter: 'brightness(0.75) contrast(1.1)',
      showThermometer: true,
    },
    {
      src: 'footage/8-dubai-metro-traffic-1.mp4', credit: 'Pexels',
      captionLine: 'l05', captionText: 'A student who cannot miss the last metro.',
      captionStartAbs: 17.0,
      filter: 'brightness(0.7) saturate(0.85)',
    },
  ];

  const v = vignettes[vig];
  const videoStart = vig * 30;

  const scale = interpolate(vigLocalFrame, [0, VIG_DUR], [1.02, 1.07],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const captionVO_opacity = interpolate(
    vigLocalFrame, [4, 12, VIG_DUR - 10, VIG_DUR], [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {cutFlash > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: C.ink, opacity: cutFlash, zIndex: 10,
        }} />
      )}

      <div style={{
        width: '100%', height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'center center', overflow: 'hidden',
      }}>
        <OffthreadVideo
          key={vig}
          src={staticFile(v.src)}
          startFrom={videoStart}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', filter: v.filter,
          }}
          muted
        />
      </div>

      {v.showThermometer && (
        <Thermometer localFrame={vigLocalFrame} startFrame={10} targetTemp={41} />
      )}

      <div style={{
        position: 'absolute', top: 80, left: 80,
        fontFamily: '"IBM Plex Sans"', fontSize: 22, fontWeight: 400,
        color: 'rgba(247,245,240,0.5)', letterSpacing: '0.08em',
        textTransform: 'uppercase', opacity: captionVO_opacity,
      }}>
        Illustrative
      </div>

      {/* v4e word-level caption — one per vignette line, all three mounted in tree */}
      <Caption line="l03" frame={frame} startAbs={11.0}
        text="A nurse after a twelve-hour shift." />
      <Caption line="l04" frame={frame} startAbs={14.0}
        text="A worker, in forty-one degrees." />
      <Caption line="l05" frame={frame} startAbs={17.0}
        text="A student who cannot miss the last metro." />

      <CreditTag text={`${v.credit} · Illustrative`} />
    </AbsoluteFill>
  );
}
