// MapChaos.jsx (v4e) — 20-26s
// v4e change: Caption l06 replaced with word-level Caption from v4e components
import React, { useState, useEffect } from 'react';
import { AbsoluteFill, staticFile, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s, BEAT } from '../../../v4/beat.js';
import { SlammingText } from '../../../v4/components/KineticType.jsx';
import { MapDotsChaos } from '../../../v4/components/MapDots.jsx';
import { Caption } from '../../components/Caption.jsx';

export function MapChaos({ frame, localFrame }) {
  const [handle] = useState(() => delayRender('bus-stops-data-v4e'));
  const [stops, setStops] = useState(null);

  useEffect(() => {
    fetch(staticFile('data/bus-stops.json'))
      .then(r => r.json())
      .then(data => { setStops(data); continueRender(handle); })
      .catch(e => { console.error(e); cancelRender(e); });
  }, [handle]);

  const lf = localFrame;
  const W = 1920, H = 1080;
  const redBeatLF = BEAT * 2;

  const pct45Opacity = interpolate(lf, [redBeatLF - 2, redBeatLF + 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const mapBg = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: 'absolute', inset: 0, opacity: mapBg, background: '#0d1117' }} />

      {stops && (
        <MapDotsChaos
          frame={lf} startFrame={0}
          redBeatFrame={redBeatLF}
          width={W} height={H} stops={stops}
        />
      )}

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', opacity: pct45Opacity,
      }}>
        <SlammingText
          frame={lf} startFrame={redBeatLF}
          text="45%" fontSize={260} color={C.redDark}
          fontWeight={800} durationFrames={15}
        />
        <div style={{
          fontFamily: '"IBM Plex Sans"', fontSize: 48, fontWeight: 500,
          color: C.redDark, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginTop: -20, opacity: pct45Opacity,
        }}>
          of evening buses leave late
        </div>
      </div>

      {/* v4e word-level caption for l06 */}
      <Caption
        line="l06"
        frame={frame}
        startAbs={21.0}
        text="Nearly half of their buses will leave late."
      />

      <div style={{
        position: 'absolute', bottom: 24, right: 24,
        fontFamily: '"IBM Plex Sans"', fontSize: 14,
        color: 'rgba(247,245,240,0.4)', letterSpacing: '0.03em',
      }}>
        Real GTFS network · Illustrative
      </div>
    </AbsoluteFill>
  );
}
