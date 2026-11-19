// Chart.jsx (v4e) — 76.1-83.4s
// v4e changes:
//   A) Scene now 7.3s (was 6s in v4d); CHART starts at s(76.1), l14 starts at s(76.0)
//   B) l14 starts at abs 76.0s = localFrame −3 (3 frames before scene, negligible)
//   C) "fifteen" word at abs 80.44s = localFrame 130 — NOW WITHIN SCENE ✓ (was outside in v4d)
//   D) Caption l14 replaced with word-level Caption from v4e components
//
// PROOF: l14 word "two" starts at 76.0+0.640=76.640s = frame 2299
//        CHART localFrame = 2299 − s(76.1) = 2299 − 2283 = 16  ← shown in proof table

import React, { useState, useEffect } from 'react';
import { AbsoluteFill, interpolate, staticFile, delayRender, continueRender } from 'remotion';
import { C } from '../../../v4/colors.js';
import { SCENE, s, BEAT, FPS } from '../../beat.js';
import { Caption } from '../../components/Caption.jsx';

const W = 1920;
const H = 1080;

// l14 word times from alignment JSON (seconds from l14 start)
const L14_WORD_EST = {
  two:     0.640,
  fifteen: 4.440,
};

export function Chart({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(7.3) = 219 frames in v4e

  // --- Alignment loading (best-effort) ---
  const [handle] = useState(() => delayRender('chart-align-v4e'));
  const [wordTimes, setWordTimes] = useState(L14_WORD_EST);

  useEffect(() => {
    // l14 scene starts at s(76.1), l14 VO at s(76.0) → offset = -0.1s ≈ 0 (3 frames)
    // For alignment purposes, treat l14 as starting at localFrame 0 (error ≤3 frames)
    const L14_SCENE_OFFSET = -0.1; // seconds: l14 starts 0.1s before scene

    fetch(staticFile('audio/voice/l14-align.json'))
      .then(r => r.json())
      .then(data => {
        // Parse words array (ElevenLabs word-level format)
        const words = (data.words || []).filter(w => w.text && w.text.trim() && w.text !== ' ');
        const wordMap = {};
        for (const w of words) {
          const lw = w.text.toLowerCase().replace(/[^a-z]/g, '');
          if (!wordMap[lw]) wordMap[lw] = w.start;
        }
        setWordTimes({
          two:     wordMap['two']     ?? L14_WORD_EST['two'],
          fifteen: wordMap['fifteen'] ?? L14_WORD_EST['fifteen'],
        });
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);

  // l14 abs start = s(76.0) = 2280; CHART abs start = s(76.1) = 2283
  // So l14 is at localFrame 2280-2283 = -3 (treat as 0)
  const L14_OFFSET_S = -0.1;  // l14 is 0.1s before scene start

  const twoFrame     = s(wordTimes.two     + L14_OFFSET_S);
  const fifteenFrame = s(wordTimes.fifteen + L14_OFFSET_S);  // = s(4.34) = 130 in v4e

  const barLeft    = 280;
  const maxBarW    = W - barLeft - 460;
  const barTopTimetable = 460;
  const barTopInsiyab   = 580;
  const barH = 56;
  const maxVal = 10;
  const toW = (val) => (val / maxVal) * maxBarW;

  // Bars start growing at scene start (l14 starts at ~lf -3 ≈ 0)
  const timetableProg = interpolate(lf, [0, BEAT + 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const insiyabProg = interpolate(lf, [10, BEAT * 2], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const timetableW = toW(8.25) * timetableProg;
  const insiyabW   = toW(6.97) * insiyabProg;

  const countOpacity = interpolate(lf, [twoFrame, twoFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // "fifteen" at localFrame 130 — within 219-frame scene ✓
  const pctOpacity = interpolate(lf, [fifteenFrame, fifteenFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const fadeIn = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const timetableEndX = barLeft + toW(8.25);
  const insiyabEndX   = barLeft + toW(6.97);

  return (
    <AbsoluteFill style={{ background: C.ivory, opacity: fadeIn }}>
      {/* Count label above bars */}
      <div style={{
        position: 'absolute', top: 300, left: barLeft,
        fontFamily: '"IBM Plex Sans"', fontSize: 60, fontWeight: 400,
        color: C.ink, opacity: countOpacity, letterSpacing: '-0.02em',
      }}>
        2,043 evening trips it had never seen
      </div>

      <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>
        {/* Timetable bar */}
        <rect x={barLeft} y={barTopTimetable} width={timetableW} height={barH}
          fill={`rgba(21,24,29,0.35)`} rx={2} />
        {timetableProg > 0.1 && (
          <>
            <text x={barLeft - 12} y={barTopTimetable + barH / 2 + 6}
              textAnchor="end" fill={C.ink} fontSize={34}
              fontFamily="IBM Plex Sans" fontWeight={400} opacity={0.7}>
              Timetable
            </text>
            {timetableProg > 0.95 && (
              <text x={barLeft + timetableEndX - barLeft + 14}
                y={barTopTimetable + barH / 2 + 6}
                fill={`rgba(21,24,29,0.6)`} fontSize={30}
                fontFamily="IBM Plex Sans" fontWeight={400}>
                8.25 min avg miss
              </text>
            )}
          </>
        )}

        {/* Insiyab bar */}
        <rect x={barLeft} y={barTopInsiyab} width={insiyabW} height={barH}
          fill={C.gold} rx={2} />
        {insiyabProg > 0.1 && (
          <>
            <text x={barLeft - 12} y={barTopInsiyab + barH / 2 + 6}
              textAnchor="end" fill={C.ink} fontSize={34}
              fontFamily="IBM Plex Sans" fontWeight={400}>
              Insiyab forecast
            </text>
            {insiyabProg > 0.95 && (
              <text x={barLeft + insiyabEndX - barLeft + 14}
                y={barTopInsiyab + barH / 2 + 6}
                fill={C.gold} fontSize={30}
                fontFamily="IBM Plex Sans" fontWeight={500}>
                6.97 min
              </text>
            )}
          </>
        )}

        {/* "15% closer" bracket — appears on word "fifteen" at lf 130 */}
        {pctOpacity > 0 && (
          <g opacity={pctOpacity}>
            <line x1={insiyabEndX + 20} y1={barTopTimetable + barH / 2}
              x2={insiyabEndX + 50} y2={barTopTimetable + barH / 2}
              stroke={C.ink} strokeWidth={1.5} />
            <line x1={insiyabEndX + 50} y1={barTopTimetable + barH / 2}
              x2={insiyabEndX + 50} y2={barTopInsiyab + barH / 2}
              stroke={C.ink} strokeWidth={1.5} />
            <line x1={insiyabEndX + 20} y1={barTopInsiyab + barH / 2}
              x2={insiyabEndX + 50} y2={barTopInsiyab + barH / 2}
              stroke={C.ink} strokeWidth={1.5} />
            <text x={insiyabEndX + 64}
              y={(barTopTimetable + barTopInsiyab + barH) / 2 + 7}
              fill={C.ink} fontSize={40}
              fontFamily="Overpass" fontWeight={800}>
              15% closer
            </text>
          </g>
        )}

        <text x={barLeft} y={H - 80}
          fill={`rgba(21,24,29,0.40)`} fontSize={22}
          fontFamily="IBM Plex Sans" fontWeight={400}
          opacity={Math.min(timetableProg, 1)}>
          RTA records, 15 Dec 2025 · tested in Dataiku
        </text>
      </svg>

      {/* v4e word-level caption for l14 */}
      <Caption
        line="l14"
        frame={frame}
        startAbs={76.0}
        text="On more than two thousand evening trips it had never seen, the forecast was fifteen percent closer than the timetable."
      />
    </AbsoluteFill>
  );
}
