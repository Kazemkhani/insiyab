// MapPrecise.jsx (v4f) — 53.6-65.3s (l11 rewritten; labels updated per board decision)
// v4f changes:
//   A) l11 text: "Which buses will run late. Which stops will wait longest." (3.944s)
//   B) Labels: "More riders than seats"→"Bus still out on its last trip" (ink, not orange)
//              "41°C, long wait"→"Long wait at the stop" (redDark, unchanged)
//              "Likely late" kept (redDark, unchanged)
//   C) Orange removed per brand rule: red = attention only, gold = Insiyab only
import React, { useState, useEffect } from 'react';
import { AbsoluteFill, staticFile, interpolate, delayRender, continueRender, cancelRender } from 'remotion';
import { C } from '../../../v4/colors.js';
import { s, BEAT } from '../../../v4/beat.js';
import { Caption } from '../../components/Caption.jsx';

const W = 1920, H = 1080;
const DXB_BBOX = { minLon: 54.9, maxLon: 55.65, minLat: 24.9, maxLat: 25.5 };

function lonlatToXY(lon, lat, w, h) {
  const x = ((lon - DXB_BBOX.minLon) / (DXB_BBOX.maxLon - DXB_BBOX.minLon)) * w;
  const y = h - ((lat - DXB_BBOX.minLat) / (DXB_BBOX.maxLat - DXB_BBOX.minLat)) * h;
  return [x, y];
}

export function MapPrecise({ frame, localFrame }) {
  const [handle] = useState(() => delayRender('bus-stops-map-precise-v4e'));
  const [stops, setStops] = useState(null);

  useEffect(() => {
    fetch(staticFile('data/bus-stops.json'))
      .then(r => r.json())
      .then(data => { setStops(data); continueRender(handle); })
      .catch(e => { console.error(e); cancelRender(e); });
  }, [handle]);

  const lf = localFrame; // 0 to s(11.7) in v4e

  const fadeIn = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panX = interpolate(lf, [0, s(11.7)], [0, -60],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panY = interpolate(lf, [0, s(11.7)], [0, 30],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const mapScale = interpolate(lf, [0, s(11.7)], [1.0, 1.08],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const markerBeat = BEAT;

  const predictions = [
    { lon: 55.19, lat: 25.11, label: 'Likely late',                    color: C.redDark },
    { lon: 55.28, lat: 25.19, label: 'Bus still out on its last trip',  color: C.ink     },
    { lon: 55.14, lat: 25.07, label: 'Long wait at the stop',           color: C.redDark },
  ];

  return (
    <AbsoluteFill style={{ background: C.ivory, opacity: fadeIn }}>
      {/* Map grid lines */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.12 }} width={W} height={H}>
        {Array.from({ length: 24 }, (_, i) => (
          <line key={`v${i}`} x1={i * W/24} y1={0} x2={i * W/24} y2={H}
            stroke={C.ink} strokeWidth={0.5} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * H/14} x2={W} y2={i * H/14}
            stroke={C.ink} strokeWidth={0.5} />
        ))}
      </svg>

      {stops && (
        <div style={{
          transform: `translate(${panX}px, ${panY}px) scale(${mapScale})`,
          transformOrigin: '50% 50%',
          width: '100%', height: '100%',
          position: 'absolute', inset: 0,
        }}>
          <svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }}>
            {stops.map(([lon, lat], i) => {
              const [x, y] = lonlatToXY(lon, lat, W, H);
              return <circle key={i} cx={x} cy={y} r={1.5} fill={C.ink} opacity={0.18} />;
            })}
            {predictions.map(({ lon, lat, label, color }, i) => {
              const beatFrame = BEAT + i * markerBeat;
              const progress = interpolate(lf, [beatFrame, beatFrame + 20], [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              if (progress <= 0) return null;
              const [x, y] = lonlatToXY(lon, lat, W, H);
              const pulseR = 24 + 8 * Math.sin((lf - beatFrame) * 0.08 + i * 2.1);
              const pulseOp = 0.3 + 0.2 * Math.abs(Math.sin((lf - beatFrame) * 0.08 + i * 2.1));
              return (
                <g key={i} opacity={progress}>
                  <circle cx={x} cy={y} r={pulseR} fill="none" stroke={color}
                    strokeWidth={1.5} opacity={pulseOp} />
                  <circle cx={x} cy={y} r={24} fill="none" stroke={color} strokeWidth={2.5} />
                  <circle cx={x} cy={y} r={8} fill={color} />
                  <line x1={x + 28} y1={y - 28} x2={x + 110} y2={y - 80}
                    stroke={color} strokeWidth={1.5} opacity={0.8} />
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

      <div style={{
        position: 'absolute', top: 24, left: 24,
        fontFamily: '"IBM Plex Sans"', fontSize: 22, fontWeight: 600,
        color: C.gold, letterSpacing: '0.08em', textTransform: 'uppercase',
        opacity: 0.9,
      }}>
        Insiyab · Evening Forecast
      </div>

      {/* v4e word-level captions for l10 and l11 */}
      <Caption
        line="l10"
        frame={frame}
        startAbs={53.6}
        text="Insiyab watches the whole evening, before it happens."
      />
      <Caption
        line="l11"
        frame={frame}
        startAbs={58.6}
        text="Which buses will run late. Which stops will wait longest."
      />
    </AbsoluteFill>
  );
}
