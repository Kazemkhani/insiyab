// MapPrecise.jsx — 47-58s: console-style map with 3 prediction markers
import React, { useState, useEffect } from 'react';
import { AbsoluteFill, staticFile, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { C } from '../../colors.js';
import { FPS, s, BEAT } from '../../beat.js';
import { MapDotsCalm } from '../../components/MapDots.jsx';

export function MapPrecise({ frame, localFrame }) {
  const [handle] = useState(() => delayRender('bus-stops-map-precise'));
  const [stops, setStops] = useState(null);

  useEffect(() => {
    fetch(staticFile('data/bus-stops.json'))
      .then(r => r.json())
      .then(data => { setStops(data); continueRender(handle); })
      .catch(e => { console.error(e); cancelRender(e); });
  }, [handle]);

  const lf = localFrame; // 0 to s(11)
  const W = 1920, H = 1080;

  // Calm fade in
  const fadeIn = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Continuous slow pan + zoom: map drifts gently for the whole scene
  const panX = interpolate(lf, [0, s(11)], [0, -60],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panY = interpolate(lf, [0, s(11)], [0, 30],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const mapScale = interpolate(lf, [0, s(11)], [1.0, 1.08],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Markers appear one per beat (every 20 frames)
  const markerBeat = BEAT;

  // Caption opacity for different voice lines
  const cap10 = interpolate(lf, [0, 6, s(4), s(5)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cap11 = interpolate(lf, [s(5), s(5.3), s(10), s(11)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#0d1117', opacity: fadeIn }}>
      {/* Map grid lines (console aesthetic) */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.15 }}
        width={W} height={H}>
        {Array.from({ length: 24 }, (_, i) => (
          <line key={`v${i}`} x1={i * W/24} y1={0} x2={i * W/24} y2={H}
            stroke={C.ivory} strokeWidth={0.5} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * H/14} x2={W} y2={i * H/14}
            stroke={C.ivory} strokeWidth={0.5} />
        ))}
      </svg>

      {/* Bus stop dots with slow pan */}
      {stops && (
        <div style={{
          transform: `translate(${panX}px, ${panY}px) scale(${mapScale})`,
          transformOrigin: '50% 50%',
          width: '100%', height: '100%',
          position: 'absolute',
          inset: 0,
        }}>
          <MapDotsCalm
            frame={lf}
            startFrame={BEAT}
            beatFrames={markerBeat}
            width={W}
            height={H}
            stops={stops}
          />
        </div>
      )}

      {/* Insiyab label */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 20,
        fontWeight: 500,
        color: C.gold,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: 0.9,
      }}>
        Insiyab · Evening Forecast
      </div>

      {/* Voice captions */}
      {cap10 > 0 && (
        <div style={{
          position: 'absolute', bottom: 80, left: 80, right: 80,
          opacity: cap10,
        }}>
          <div style={{
            background: 'rgba(13,17,23,0.85)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            Insiyab watches the whole evening, before it happens.
          </div>
        </div>
      )}
      {cap11 > 0 && (
        <div style={{
          position: 'absolute', bottom: 80, left: 80, right: 80,
          opacity: cap11,
        }}>
          <div style={{
            background: 'rgba(13,17,23,0.85)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            Which buses will run late. Which will overflow. Which stops are in the heat.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
