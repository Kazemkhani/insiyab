// MapDots.jsx — renders bus-stop dots on a simplified Dubai map
// Uses pre-processed bus-stops.json (array of [lon, lat] pairs)
import React, { useEffect, useRef } from 'react';
import { delayRender, continueRender, cancelRender, interpolate, staticFile } from 'remotion';
import { C } from '../colors.js';

// Dubai approximate bounding box
const DXB_BBOX = { minLon: 54.9, maxLon: 55.65, minLat: 24.9, maxLat: 25.5 };

function lonlatToXY(lon, lat, w, h) {
  const x = ((lon - DXB_BBOX.minLon) / (DXB_BBOX.maxLon - DXB_BBOX.minLon)) * w;
  const y = h - ((lat - DXB_BBOX.minLat) / (DXB_BBOX.maxLat - DXB_BBOX.minLat)) * h;
  return [x, y];
}

/**
 * MapDotsChaos — Act 1 map: dots appearing, then half turning red on the beat.
 * @param {object} props
 * @param {number} props.frame          — current frame
 * @param {number} props.startFrame     — when dots start appearing
 * @param {number} props.redBeatFrame   — when half turn red (the downbeat)
 * @param {number[]} props.width
 * @param {number[]} props.height
 * @param {Array}  props.stops          — array of [lon, lat]
 */
export function MapDotsChaos({ frame, startFrame, redBeatFrame, width, height, stops }) {
  if (!stops || stops.length === 0) return null;

  const dotsAppearProgress = interpolate(
    frame, [startFrame, startFrame + 60], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const redProgress = interpolate(
    frame, [redBeatFrame, redBeatFrame + 40], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const visibleCount = Math.floor(dotsAppearProgress * stops.length);
  const redCount = Math.floor(redProgress * Math.floor(stops.length * 0.45));

  return (
    <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      {stops.slice(0, visibleCount).map(([lon, lat], i) => {
        const [x, y] = lonlatToXY(lon, lat, width, height);
        const isRed = i < redCount;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={2.2}
            fill={isRed ? C.redDark : 'rgba(247,245,240,0.5)'}
            opacity={isRed ? 0.9 : 0.6}
          />
        );
      })}
    </svg>
  );
}

/**
 * MapDotsCalm — Act 2 map: clean map with 3 prediction markers appearing one per beat.
 */
export function MapDotsCalm({ frame, startFrame, beatFrames, width, height, stops }) {
  if (!stops || stops.length === 0) return null;

  const predictions = [
    { lon: 55.19, lat: 25.11, label: 'likely late', color: C.redDark },
    { lon: 55.28, lat: 25.19, label: 'more riders than seats', color: '#E0962B' },
    { lon: 55.14, lat: 25.07, label: '41°C, long wait', color: C.redDark },
  ];

  return (
    <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* All stops as faint dots */}
      {stops.map(([lon, lat], i) => {
        const [x, y] = lonlatToXY(lon, lat, width, height);
        return (
          <circle key={i} cx={x} cy={y} r={1.5}
            fill="rgba(247,245,240,0.25)" opacity={0.6} />
        );
      })}
      {/* Prediction markers */}
      {predictions.map(({ lon, lat, label, color }, i) => {
        const beatFrame = startFrame + i * beatFrames;
        const progress = interpolate(
          frame, [beatFrame, beatFrame + 20], [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        if (progress <= 0) return null;
        const [x, y] = lonlatToXY(lon, lat, width, height);
        return (
          <g key={i} opacity={progress}>
            {/* Pulsing ring */}
            <circle cx={x} cy={y}
              r={12 + 6 * Math.sin((frame - beatFrame) * 0.08 + i * 2.1)}
              fill="none" stroke={color} strokeWidth={1}
              opacity={0.4 + 0.3 * Math.abs(Math.sin((frame - beatFrame) * 0.08 + i * 2.1))}
            />
            <circle cx={x} cy={y} r={12} fill="none"
              stroke={color} strokeWidth={2} />
            <circle cx={x} cy={y} r={4} fill={color} />
            {/* Leader line */}
            <line x1={x + 15} y1={y - 15} x2={x + 80} y2={y - 50}
              stroke={color} strokeWidth={1.5} opacity={0.8} />
            <text x={x + 85} y={y - 55}
              fill={color} fontSize={22} fontFamily="IBM Plex Sans"
              fontWeight={500} letterSpacing="-0.01em">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
