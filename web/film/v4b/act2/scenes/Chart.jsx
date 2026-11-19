// Chart.jsx (v4b) — 66-72s: ivory background, no teal, ink/gold palette
// Timetable = ink 40%. Insiyab = gold. "15% closer" = ink Overpass 800.
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { FPS, s, BEAT } from '../../../v4/beat.js';

function ChartLine({ frame, startFrame, endFrame,
  x1, y1, x2, y2, color, label, labelX, labelY }) {
  const progress = interpolate(frame, [startFrame, endFrame], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const currentX2 = x1 + progress * (x2 - x1);
  const currentY2 = y1 + progress * (y2 - y1);

  const labelOpacity = interpolate(progress, [0.85, 1], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <g>
      <line x1={x1} y1={y1} x2={currentX2} y2={currentY2}
        stroke={color} strokeWidth={4} strokeLinecap="round" />
      <text x={labelX} y={labelY}
        fill={color} fontSize={28} fontFamily="IBM Plex Sans"
        fontWeight={600} letterSpacing="-0.01em"
        opacity={labelOpacity}>
        {label}
      </text>
    </g>
  );
}

export function Chart({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(6)

  const W = 1920, H = 1080;
  const chartLeft = 260;
  const chartRight = W - 480;
  const chartTop = 180;
  const chartBottom = H - 260;
  const chartW = chartRight - chartLeft;
  const chartH = chartBottom - chartTop;

  const maxVal = 10;
  const toY = (val) => chartBottom - (val / maxVal) * chartH;

  const timetableY = toY(8.25);
  const insiyabY = toY(6.97);

  const timetableDur = BEAT * 2;
  const insiyabDur = BEAT * 2;
  const insiyabStart = BEAT;

  const pctBeat = BEAT * 4;
  const pctOpacity = interpolate(lf, [pctBeat, pctBeat + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const gapProgress = interpolate(lf, [BEAT * 2, BEAT * 3 + 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const fadeIn = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cap14 = interpolate(lf, [0, 6, s(5.5), s(6)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const yMarkers = [0, 2, 4, 6, 8, 10];

  // Colors: timetable = ink 40%, Insiyab = gold, no teal
  const timetableColor = 'rgba(21,24,29,0.40)';
  const insiyabColor = C.gold;

  return (
    // Ivory background — the visual lift
    <AbsoluteFill style={{ background: C.ivory, opacity: fadeIn }}>
      {/* Chart title */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: chartLeft,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 24,
        fontWeight: 600,
        color: C.gold,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: 0.9,
      }}>
        Forecast Accuracy · Evening Peak
      </div>

      <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>
        {/* Grid — ink at low opacity on ivory */}
        {yMarkers.map(val => {
          const y = toY(val);
          return (
            <g key={val}>
              <line x1={chartLeft} y1={y} x2={chartRight} y2={y}
                stroke="rgba(21,24,29,0.10)" strokeWidth={1} />
              <text x={chartLeft - 16} y={y + 6}
                fill="rgba(21,24,29,0.45)" fontSize={18}
                fontFamily="IBM Plex Sans" textAnchor="end">
                {val}
              </text>
            </g>
          );
        })}
        {/* Y-axis label */}
        <text x={chartLeft - 60} y={chartTop + chartH / 2}
          fill="rgba(21,24,29,0.45)" fontSize={18}
          fontFamily="IBM Plex Sans" textAnchor="middle"
          transform={`rotate(-90, ${chartLeft - 60}, ${chartTop + chartH / 2})`}>
          minutes off
        </text>
        {/* Axes */}
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom}
          stroke="rgba(21,24,29,0.3)" strokeWidth={2} />
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom}
          stroke="rgba(21,24,29,0.3)" strokeWidth={2} />

        {/* Gap fill — gold tint (not red) */}
        {gapProgress > 0 && (
          <rect
            x={chartLeft}
            y={insiyabY}
            width={gapProgress * chartW}
            height={timetableY - insiyabY}
            fill="rgba(156,123,62,0.12)"
          />
        )}

        {/* Timetable line — ink 40% */}
        <ChartLine
          frame={lf}
          startFrame={0}
          endFrame={timetableDur}
          x1={chartLeft} y1={timetableY}
          x2={chartRight} y2={timetableY}
          color={timetableColor}
          label="Timetable: 8.25 min off"
          labelX={chartRight + 20}
          labelY={timetableY + 6}
        />

        {/* Insiyab forecast line — gold */}
        <ChartLine
          frame={lf}
          startFrame={insiyabStart}
          endFrame={insiyabStart + insiyabDur}
          x1={chartLeft} y1={insiyabY}
          x2={chartRight} y2={insiyabY}
          color={insiyabColor}
          label="Insiyab forecast: 6.97 min off"
          labelX={chartRight + 20}
          labelY={insiyabY + 6}
        />

        {/* Improvement bracket */}
        {gapProgress > 0 && (
          <line x1={chartRight + 15} y1={timetableY}
            x2={chartRight + 15} y2={insiyabY}
            stroke={C.gold} strokeWidth={2}
            strokeDasharray="4 3"
            opacity={gapProgress * 0.8} />
        )}
      </svg>

      {/* "15% closer" — ink Overpass 800 (not teal) */}
      {pctOpacity > 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${
            interpolate(lf, [pctBeat, pctBeat + 15], [1.3, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
            })
          })`,
          textAlign: 'center',
          opacity: pctOpacity,
        }}>
          <div style={{
            fontFamily: 'Overpass',
            fontWeight: 800,
            fontSize: 160,
            color: C.ink,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            15% closer
          </div>
        </div>
      )}

      {/* Data provenance label — ink */}
      <div style={{
        position: 'absolute',
        bottom: 36,
        left: chartLeft,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 16,
        fontWeight: 400,
        color: 'rgba(21,24,29,0.45)',
        letterSpacing: '0.02em',
      }}>
        2,043 evening trips held out · RTA records, 15 Dec 2025 · Dataiku
      </div>

      {/* Voice caption L14 */}
      {cap14 > 0 && (
        <div style={{ position: 'absolute', bottom: 80, left: 80, right: 80, opacity: cap14 }}>
          <div style={{
            background: 'rgba(21,24,29,0.82)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            On two thousand evening trips it had never seen, the forecast was fifteen percent closer than the timetable.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
