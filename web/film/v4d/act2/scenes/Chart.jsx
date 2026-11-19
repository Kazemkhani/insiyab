// Chart.jsx (v4d) — 72.6–78.6s
// Design rules (v4d):
//   - Two horizontal bars growing from zero, in sync with words
//   - Timetable bar: 8.25 min, ink 35% opacity
//   - Insiyab bar: 6.97 min, gold
//   - "2,043 evening trips it had never seen" appears on "two thousand"
//   - "15% closer" label lands on word "fifteen"
//   - Source: "RTA records, 15 Dec 2025 · tested in Dataiku"
//   - No y-axis gridlines, no "minutes off" axis label
//   - Background: ivory
//
// Word alignment: estimated from l14 text until alignment JSON available.
// l14 text: "On more than two thousand evening trips it had never seen,
//            the forecast was fifteen percent closer than the timetable."
// Duration estimate: ~7.1s
//
// Word positions (character offset / total chars → fraction of line):
//   "two"       at ~37/120 = 0.308 → s(2.19) into line
//   "fifteen"   at ~88/120 = 0.733 → s(5.21) into line
//
// These are ESTIMATES. If l14-align.json exists alongside this file's static
// location, that data takes precedence. Alignment file path relative to
// public/: audio/voice/l14-align.json
//
// Scene timing: l14 starts at 76.0s (absolute), this scene starts at 72.6s.
// localFrame 0 = 72.6s. l14 starts at localFrame s(3.4) = frame 102.
import React, { useState, useEffect } from 'react';
import { AbsoluteFill, interpolate, staticFile, delayRender, continueRender } from 'remotion';
import { C } from '../../../v4/colors.js';
import { FPS, s, BEAT } from '../../../v4/beat.js';

const W = 1920;
const H = 1080;

// l14 alignment (REAL word times from ElevenLabs forced-alignment, 2026-11-19)
// Source: l14-align.json from make_v4d_voice.py
// l14 text: "On more than two thousand evening trips it had never seen,
//            the forecast was fifteen percent closer than the timetable."
// l14 duration: 6.818s (Frederick Surrey, eleven_multilingual_v2)
const L14_WORD_EST = {
  'two':      0.640,  // "two" at 0.640–0.780s from line start
  'fifteen':  4.440,  // "fifteen" at 4.440–4.740s from line start
};
// NOTE: "fifteen" at 76.0+4.44=80.44s absolute, which is OUTSIDE Chart scene (72.6-78.6s).
// "15% closer" bracket therefore appears at bar-completion time (lf ~100) instead,
// which is a visual cue before the spoken word.

export function Chart({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(6)

  // --- Alignment data loading (best-effort, falls back to estimates) -------
  const [handle] = useState(() => delayRender('chart-align-v4d'));
  const [wordTimes, setWordTimes] = useState(L14_WORD_EST);

  useEffect(() => {
    // l14 scene starts at 72.6s, l14 VO starts at 76.0s → offset = 3.4s
    const L14_SCENE_OFFSET = 3.4;

    fetch(staticFile('audio/voice/l14-align.json'))
      .then(r => r.json())
      .then(data => {
        // Parse alignment: look for "two" and "fifteen" word starts
        // ElevenLabs alignment format:
        //   { characters: ["O","n",...], character_start_times_seconds: [...], ... }
        // or forced-align format may differ — handle both
        const chars  = data.characters || data.chars || [];
        const starts = data.character_start_times_seconds
                    || data.char_starts
                    || data.start_times || [];
        const ends   = data.character_end_times_seconds
                    || data.char_ends
                    || data.end_times || [];

        if (!chars.length || !starts.length) {
          continueRender(handle);
          return;
        }

        // Reconstruct words from character data
        let word = '', wordStart = 0, wordIdx = 0;
        const wordMap = {};

        for (let i = 0; i < chars.length; i++) {
          const ch = chars[i];
          if (ch === ' ' || ch === ',' || ch === '.') {
            if (word.length > 0) {
              const lw = word.toLowerCase();
              if (!wordMap[lw]) wordMap[lw] = wordStart;
              word = ''; wordIdx++;
            }
          } else {
            if (word.length === 0) wordStart = starts[i] || 0;
            word += ch;
          }
        }
        // last word
        if (word.length > 0) {
          const lw = word.toLowerCase();
          if (!wordMap[lw]) wordMap[lw] = wordStart;
        }

        const updated = {
          two:     (wordMap['two']     != null ? wordMap['two']     : L14_WORD_EST['two'])     + L14_SCENE_OFFSET,
          fifteen: (wordMap['fifteen'] != null ? wordMap['fifteen'] : L14_WORD_EST['fifteen']) + L14_SCENE_OFFSET,
        };
        setWordTimes(updated);
        continueRender(handle);
      })
      .catch(() => {
        // Alignment file not available, use estimates
        continueRender(handle);
      });
  }, [handle]);

  // --- l14 starts at 76.0s, scene at 72.6s → offset in localFrames --------
  const L14_OFFSET = s(3.4);  // 102 frames

  // "two thousand" word time → localFrame when count label appears
  // Real alignment: "two" at 0.640s from l14 start = scene lf s(3.4+0.64) = s(4.04)
  const twoFrame     = L14_OFFSET + s(wordTimes['two']     || L14_WORD_EST['two']);
  // "fifteen" at 4.44s from l14 start = scene lf s(7.84) → OUTSIDE 6s scene.
  // Fall back to bar-completion frame (capped at scene end - 20 frames).
  const fifteenRaw   = L14_OFFSET + s(wordTimes['fifteen'] || L14_WORD_EST['fifteen']);
  const fifteenFrame = Math.min(fifteenRaw, s(5.5)); // cap inside scene

  // --- Bar geometry --------------------------------------------------------
  const barLeft    = 280;
  const maxBarW    = W - barLeft - 460;   // leaves room for labels
  const barTopTimetable = 460;
  const barTopInsiyab   = 580;
  const barH = 56;

  const maxVal   = 10;    // minutes scale
  const toW = (val) => (val / maxVal) * maxBarW;

  // Bars grow from zero, anchored to when l14 starts speaking (lf = L14_OFFSET).
  // Timetable bar: grows over 1.5 beats starting from l14 start
  // Insiyab bar: starts 0.5 beats later, slightly faster
  // This puts bars growing during "On more than two thousand…" words
  const timetableProg = interpolate(lf,
    [L14_OFFSET, L14_OFFSET + BEAT + 10], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const insiyabProg = interpolate(lf,
    [L14_OFFSET + 10, L14_OFFSET + BEAT * 2], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const timetableW = toW(8.25) * timetableProg;
  const insiyabW   = toW(6.97) * insiyabProg;

  // --- Count label "2,043 evening trips it had never seen" ----------------
  const countOpacity = interpolate(lf,
    [twoFrame, twoFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // --- "15% closer" bracket label -----------------------------------------
  const pctOpacity = interpolate(lf,
    [fifteenFrame, fifteenFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // --- Overall scene fade in ----------------------------------------------
  const fadeIn = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // --- Caption l14 --------------------------------------------------------
  const cap14 = interpolate(lf,
    [0, 6, s(5.5), s(6)], [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const timetableEndX = barLeft + toW(8.25);
  const insiyabEndX   = barLeft + toW(6.97);

  return (
    <AbsoluteFill style={{ background: C.ivory, opacity: fadeIn }}>
      {/* ---- Count label above bars ---- */}
      <div style={{
        position: 'absolute',
        top: 300,
        left: barLeft,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 60,
        fontWeight: 400,
        color: C.ink,
        opacity: countOpacity,
        letterSpacing: '-0.02em',
      }}>
        2,043 evening trips it had never seen
      </div>

      {/* ---- Bars SVG ---- */}
      <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>

        {/* Timetable bar */}
        <rect
          x={barLeft} y={barTopTimetable}
          width={timetableW} height={barH}
          fill={`rgba(21,24,29,0.35)`}
          rx={2}
        />
        {/* Timetable label */}
        {timetableProg > 0.1 && (
          <>
            <text x={barLeft - 12} y={barTopTimetable + barH / 2 + 6}
              textAnchor="end"
              fill={C.ink} fontSize={34} fontFamily="IBM Plex Sans"
              fontWeight={400} opacity={0.7}>
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
        <rect
          x={barLeft} y={barTopInsiyab}
          width={insiyabW} height={barH}
          fill={C.gold}
          rx={2}
        />
        {/* Insiyab label */}
        {insiyabProg > 0.1 && (
          <>
            <text x={barLeft - 12} y={barTopInsiyab + barH / 2 + 6}
              textAnchor="end"
              fill={C.ink} fontSize={34} fontFamily="IBM Plex Sans"
              fontWeight={400}>
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

        {/* "15% closer" bracket — appears on word "fifteen" */}
        {pctOpacity > 0 && (
          <g opacity={pctOpacity}>
            {/* Bracket lines */}
            <line
              x1={insiyabEndX + 20} y1={barTopTimetable + barH / 2}
              x2={insiyabEndX + 50} y2={barTopTimetable + barH / 2}
              stroke={C.ink} strokeWidth={1.5}
            />
            <line
              x1={insiyabEndX + 50} y1={barTopTimetable + barH / 2}
              x2={insiyabEndX + 50} y2={barTopInsiyab + barH / 2}
              stroke={C.ink} strokeWidth={1.5}
            />
            <line
              x1={insiyabEndX + 20} y1={barTopInsiyab + barH / 2}
              x2={insiyabEndX + 50} y2={barTopInsiyab + barH / 2}
              stroke={C.ink} strokeWidth={1.5}
            />
            {/* "15% closer" label */}
            <text x={insiyabEndX + 64}
              y={(barTopTimetable + barTopInsiyab + barH) / 2 + 7}
              fill={C.ink} fontSize={40}
              fontFamily="Overpass" fontWeight={800}>
              15% closer
            </text>
          </g>
        )}

        {/* Source line */}
        <text x={barLeft} y={H - 80}
          fill={`rgba(21,24,29,0.40)`} fontSize={22}
          fontFamily="IBM Plex Sans" fontWeight={400}
          opacity={Math.min(timetableProg, 1)}>
          RTA records, 15 Dec 2025 · tested in Dataiku
        </text>
      </svg>

      {/* Voice caption l14 */}
      {cap14 > 0 && (
        <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80, opacity: cap14 }}>
          <div style={{
            background: 'rgba(21,24,29,0.86)', padding: '12px 22px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            On more than two thousand evening trips it had never seen, the forecast was fifteen percent closer than the timetable.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
