// MapChaos.jsx — 20-26s: city map with bus dots turning red + "45%" slam
import React, { useState, useEffect } from 'react';
import { AbsoluteFill, staticFile, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { C } from '../../colors.js';
import { FPS, s, BEAT } from '../../beat.js';
import { SlammingText } from '../../components/KineticType.jsx';
import { MapDotsChaos } from '../../components/MapDots.jsx';

export function MapChaos({ frame, localFrame }) {
  const [handle] = useState(() => delayRender('bus-stops-data'));
  const [stops, setStops] = useState(null);

  useEffect(() => {
    fetch(staticFile('data/bus-stops.json'))
      .then(r => r.json())
      .then(data => { setStops(data); continueRender(handle); })
      .catch(e => { console.error(e); cancelRender(e); });
  }, [handle]);

  const lf = localFrame; // 0 to s(6)
  const W = 1920, H = 1080;

  // Red beat: at beat 2 of this scene = lf 40 (frame s(21.33))
  const redBeatLF = BEAT * 2;

  // "45%" slams in on the downbeat (at lf = redBeatLF)
  const pct45Opacity = interpolate(lf, [redBeatLF - 2, redBeatLF + 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Map overlay — dark ink background
  const mapBg = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Map background */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: mapBg,
        background: '#0d1117',
      }} />

      {/* Bus stop dots */}
      {stops && (
        <MapDotsChaos
          frame={lf}
          startFrame={0}
          redBeatFrame={redBeatLF}
          width={W}
          height={H}
          stops={stops}
        />
      )}

      {/* "45%" slam + "late" label */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        opacity: pct45Opacity,
      }}>
        <SlammingText
          frame={lf}
          startFrame={redBeatLF}
          text="45%"
          fontSize={260}
          color={C.redDark}
          fontWeight={800}
          durationFrames={15}
        />
        <div style={{
          fontFamily: '"IBM Plex Sans"',
          fontSize: 48,
          fontWeight: 500,
          color: C.redDark,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginTop: -20,
          opacity: pct45Opacity,
        }}>
          of evening buses leave late
        </div>
      </div>

      {/* Voice caption L06 */}
      <div style={{
        position: 'absolute',
        bottom: 80, left: 80, right: 80,
        opacity: interpolate(lf, [0, 8, s(5.5), s(6)], [0,1,1,0],
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
          Nearly half of their buses will leave late.
        </div>
      </div>

      {/* Data label */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 14,
        color: 'rgba(247,245,240,0.4)',
        letterSpacing: '0.03em',
      }}>
        Real GTFS network · Illustrative
      </div>
    </AbsoluteFill>
  );
}
