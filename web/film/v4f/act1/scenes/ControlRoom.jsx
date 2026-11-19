// ControlRoom.jsx (v4e) — 26-38s
// v4e change: Captions l07/l08 replaced with word-level Caption from v4e components
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s, BEAT, BAR } from '../../../v4/beat.js';
import { AlertWall, PhoneRingIcons } from '../../../v4b/components/AlertTile.jsx';
import { BottomCreditTag, Caption } from '../../components/Caption.jsx';

function ClockHand({ localFrame }) {
  const rotations = interpolate(localFrame, [0, s(12)], [0, 6],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: (t) => t * t });
  const deg = rotations * 360;
  return (
    <div style={{ position: 'absolute', bottom: 120, left: 80, width: 100, height: 100 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={48}
          fill="none" stroke="rgba(247,245,240,0.3)" strokeWidth={2} />
        <line x1={50} y1={50} x2={50} y2={8}
          stroke={C.ivory} strokeWidth={3} strokeLinecap="round"
          transform={`rotate(${deg}, 50, 50)`} />
        <circle cx={50} cy={50} r={4} fill={C.ivory} />
      </svg>
    </div>
  );
}

export function ControlRoom({ frame, localFrame }) {
  const lf = localFrame;
  const totalDur = s(12);

  const cutPeriod = BEAT * 2;
  const shotIndex = Math.floor(lf / cutPeriod) % 2;
  const shotLocalFrame = lf % cutPeriod;

  const shakeIntensity = interpolate(lf, [0, totalDur * 0.8, totalDur], [0, 3, 4],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shakeX = shakeIntensity * Math.sin(lf * 1.7);
  const shakeY = shakeIntensity * Math.cos(lf * 2.1);

  const cutFlash = shotLocalFrame < 3
    ? interpolate(shotLocalFrame, [0, 3], [0.4, 0]) : 0;

  const darken = interpolate(lf, [totalDur * 0.7, totalDur * 0.95], [0, 0.7],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const footage = shotIndex === 0
    ? 'footage/6-control-room-3.mp4'
    : 'footage/6-control-room-1.mp4';

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
        overflow: 'hidden',
      }}>
        <OffthreadVideo
          key={shotIndex}
          src={staticFile(footage)}
          startFrom={shotIndex * 15}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: `brightness(0.7) contrast(1.15) saturate(0.85)`,
          }}
          muted
        />
      </div>

      <AlertWall
        frame={lf} startFrame={BEAT * 2}
        endFrame={totalDur - BEAT} totalTiles={12}
      />
      <PhoneRingIcons frame={lf} startFrame={s(6)} count={5} />
      <ClockHand localFrame={lf} />

      {darken > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: C.ink, opacity: darken }} />
      )}
      {cutFlash > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(21,24,29,0.4)',
          opacity: cutFlash, zIndex: 5,
        }} />
      )}

      {/* v4e word-level captions for l07 and l08 */}
      <Caption
        line="l07"
        frame={frame}
        startAbs={27.0}
        text="In the control room, six people. Fourteen hundred buses."
      />
      <Caption
        line="l08"
        frame={frame}
        startAbs={32.0}
        text="And every problem starts with a phone call."
      />

      <BottomCreditTag text="Pexels · Representative: a traffic operations centre, not RTA's" />
    </AbsoluteFill>
  );
}
