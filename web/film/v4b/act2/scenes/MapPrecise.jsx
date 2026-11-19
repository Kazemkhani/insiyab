// MapPrecise.jsx (v4b) — 47-58s: ivory background, larger markers, calmer palette
import React, { useState, useEffect } from 'react';
import { AbsoluteFill, staticFile, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { C } from '../../../v4/colors.js';
import { FPS, s, BEAT } from '../../../v4/beat.js';

const W = 1920, H = 1080;
const DXB_BBOX = { minLon: 54.9, maxLon: 55.65, minLat: 24.9, maxLat: 25.5 };

function lonlatToXY(lon, lat, w, h) {
  const x = ((lon - DXB_BBOX.minLon) / (DXB_BBOX.maxLon - DXB_BBOX.minLon)) * w;
  const y = h - ((lat - DXB_BBOX.minLat) / (DXB_BBOX.maxLat - DXB_BBOX.minLat)) * h;
  return [x, y];
}

export function MapPrecise({ frame, localFrame }) {
  const [handle] = useState(() => delayRender('bus-stops-map-precise-v4b'));
  const [stops, setStops] = useState(null);

  useEffect(() => {
    fetch(staticFile('data/bus-stops.json'))
      .then(r => r.json())
      .then(data => { setStops(data); continueRender(handle); })
      .catch(e => { console.error(e); cancelRender(e); });
  }, [handle]);

  const lf = localFrame; // 0 to s(11)

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

  const markerBeat = BEAT;

  const predictions = [
    { lon: 55.19, lat: 25.11, label: 'Likely late', color: C.redDark },
    { lon: 55.28, lat: 25.19, label: 'More riders than seats', color: '#E0962B' },
    { lon: 55.14, lat: 25.07, label: '41°C, long wait', color: C.redDark },
  ];

  // Caption opacity
  const cap10 = interpolate(lf, [0, 6, s(4), s(5)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cap11 = interpolate(lf, [s(5), s(5.3), s(10), s(11)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ivory, opacity: fadeIn }}>
      {/* Map grid lines (console aesthetic on ivory) */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.12 }}
        width={W} height={H}>
        {Array.from({ length: 24 }, (_, i) => (
          <line key={`v${i}`} x1={i * W/24} y1={0} x2={i * W/24} y2={H}
            stroke={C.ink} strokeWidth={0.5} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * H/14} x2={W} y2={i * H/14}
            stroke={C.ink} strokeWidth={0.5} />
        ))}
      </svg>

      {/* Bus stop dots with slow pan — ink on ivory */}
      {stops && (
        <div style={{
          transform: `translate(${panX}px, ${panY}px) scale(${mapScale})`,
          transformOrigin: '50% 50%',
          width: '100%', height: '100%',
          position: 'absolute',
          inset: 0,
        }}>
          <svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* All stops as faint ink dots */}
            {stops.map(([lon, lat], i) => {
              const [x, y] = lonlatToXY(lon, lat, W, H);
              return (
                <circle key={i} cx={x} cy={y} r={1.5}
                  fill={C.ink} opacity={0.18} />
              );
            })}
            {/* Prediction markers — 2x larger, labels >= 36px */}
            {predictions.map(({ lon, lat, label, color }, i) => {
              const beatFrame = BEAT + i * markerBeat;
              const progress = interpolate(
                lf, [beatFrame, beatFrame + 20], [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
              );
              if (progress <= 0) return null;
              const [x, y] = lonlatToXY(lon, lat, W, H);
              // Pulsing ring (larger radius)
              const pulseR = 24 + 8 * Math.sin((lf - beatFrame) * 0.08 + i * 2.1);
              const pulseOp = 0.3 + 0.2 * Math.abs(Math.sin((lf - beatFrame) * 0.08 + i * 2.1));
              return (
                <g key={i} opacity={progress}>
                  {/* Outer pulsing ring */}
                  <circle cx={x} cy={y} r={pulseR}
                    fill="none" stroke={color} strokeWidth={1.5}
                    opacity={pulseOp}
                  />
                  {/* Main ring — 2x size (r=24 instead of 12) */}
                  <circle cx={x} cy={y} r={24} fill="none"
                    stroke={color} strokeWidth={2.5} />
                  {/* Inner dot */}
                  <circle cx={x} cy={y} r={8} fill={color} />
                  {/* Leader line */}
                  <line x1={x + 28} y1={y - 28} x2={x + 110} y2={y - 80}
                    stroke={color} strokeWidth={1.5} opacity={0.8} />
                  {/* Label — >= 36px */}
                  <text x={x + 118} y={y - 85}
                    fill={color} fontSize={36} fontFamily="IBM Plex Sans"
                    fontWeight={600} letterSpacing="-0.01em">
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Insiyab label — gold on ivory */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 22,
        fontWeight: 600,
        color: C.gold,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: 0.9,
      }}>
        Insiyab · Evening Forecast
      </div>

      {/* Voice captions — dark bar on ivory bg */}
      {cap10 > 0 && (
        <div style={{
          position: 'absolute', bottom: 80, left: 80, right: 80, opacity: cap10,
        }}>
          <div style={{
            background: 'rgba(21,24,29,0.82)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            Insiyab watches the whole evening, before it happens.
          </div>
        </div>
      )}
      {cap11 > 0 && (
        <div style={{
          position: 'absolute', bottom: 80, left: 80, right: 80, opacity: cap11,
        }}>
          <div style={{
            background: 'rgba(21,24,29,0.82)', padding: '10px 20px',
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
