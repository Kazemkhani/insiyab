// beat.js (v4f) — timing constants for Insiyab film v4f
// Changes from v4e:
//   A) lar1/lar2 changed to Moteb voice (s8AtpE08HrPmTUNmxgfQ):
//      lar1 dur: 2.19→1.489s (REVEAL-D-moteb-2); lar2 start: 45.3→44.6, dur: 2.769→2.038
//   B) l09/ACT2_START/TURN_END moved 48.70→47.30 to close gap left by shorter lar2
//      (lar2 ends 46.638; gap to l09 = 47.3−46.638 = 0.662s ≥ 0.60s ✓)
//   C) l11 rewritten: "Which buses will run late. Which stops will wait longest."
//      dur: 6.191→3.944s; last word "longest." ends at 62.544 (new alignment JSON)
//   D) l12 kept at 65.3 (gap from l11 = 2.756s ✓; MAP_PRECISE visual holds the gap)
//   E) l13→l16 unchanged (all gaps already ≥0.45s)
//   F) GAP TABLE: all inter-line gaps ≥0.45s (≥0.60s for Arabic), no violations
//   G) Word-level timing used by Caption.jsx and CallChain (from alignment JSONs)
//   H) TOTAL_FRAMES = 87s = 2610 (unchanged)
//
// 90 BPM at 30 fps: 1 beat = 20 frames, 1 bar = 80 frames
export const FPS = 30;
export const BEAT = 20;
export const BAR = 80;
export const W = 1920;
export const H = 1080;
export const TOTAL_FRAMES = 87 * FPS; // 2610

export const s = (sec) => Math.round(sec * FPS);
export const snap = (frames) => Math.round(frames / BEAT) * BEAT;

// Voice lines — all durations measured from ElevenLabs TTS (unchanged)
export const VO = {
  // Act 1 (unchanged)
  l01: { start: s(2.0),   dur: s(1.567) },   // "Six in the evening."
  l02: { start: s(5.0),   dur: s(3.082) },   // "Fifty thousand people board a bus in a single hour."
  l03: { start: s(11.0),  dur: s(2.038) },   // "A nurse after a twelve-hour shift."
  l04: { start: s(14.0),  dur: s(2.116) },   // "A worker, in forty-one degrees."
  l05: { start: s(17.0),  dur: s(2.847) },   // "A student who cannot miss the last metro."
  l06: { start: s(21.0),  dur: s(2.273) },   // "Nearly half of their buses will leave late."
  l07: { start: s(27.0),  dur: s(3.631) },   // "In the control room, six people. Fourteen hundred buses."
  l08: { start: s(32.0),  dur: s(2.429) },   // "And every problem starts with a phone call."

  // Turn — Arabic voice (v4f: both Moteb s8AtpE08HrPmTUNmxgfQ)
  lar1: { start: s(42.5), dur: s(1.489) },   // "انسياب"              end=43.989  (Moteb REVEAL take2)
  lar2: { start: s(44.6), dur: s(2.038) },   // "المدينة تشوف اللي جاي"  end=46.638  gap_lar1→lar2=0.611 ✓  gap_to_l09=0.662 ✓

  // Act 2 — ACT2_START=47.30 (moved from 48.70 to close gap after shorter lar2)
  l09: { start: s(47.3),  dur: s(1.881) },   // "What if the control room saw it coming?"  end=49.181
  l10: { start: s(53.6),  dur: s(3.056) },   // phonetic "Insiyaab watches…"               gap_from_l09=4.419 ✓
  l11: { start: s(58.6),  dur: s(3.944) },   // "Which buses will run late. Which stops will wait longest."  end=62.544
  l12: { start: s(65.3),  dur: s(5.721) },   // gap_from_l11=2.756 ✓  end=71.021
  l13: { start: s(71.5),  dur: s(4.049) },   // gap_from_l12=0.479 ✓  end=75.549
  l14: { start: s(76.0),  dur: s(6.818) },   // gap_from_l13=0.451 ✓  end=82.818
  l15: { start: s(83.5),  dur: s(1.567) },   // "Insiyab sees it coming." (Yousuf Emirati)
  l16: { start: s(85.6),  dur: s(1.411) },   // "The controller decides."
};

// Scene boundary frames
export const SCENE = {
  // Act 1 (unchanged)
  ACT1_START:  0,
  OPENING:     0,
  HIGHWAY:     s(5),
  VIGNETTES:   s(11),
  MAP_CHAOS:   s(20),
  CTRL_ROOM:   s(26),
  ACT1_END:    s(38),

  // Turn (38–47.30s; shortened from 48.70 to close gap after shorter lar2)
  TURN_START:  s(38),
  TURN_END:    s(47.3),    // was s(48.7)

  // Act 2 — ACT2_START=47.30 (music gate, chime cascade)
  ACT2_START:  s(47.3),   // was s(48.7)
  QUESTION:    s(47.3),
  MAP_PRECISE: s(53.6),   // s(53.6) to s(65.3): covers l11 end (62.544) + 2.756s ≥ 0.5s ✓
  CALL_CHAIN:  s(65.3),   // s(65.3) to s(76.1): covers l13 end (75.549) + 0.551s ≥ 0.5s ✓
  CHART:       s(76.1),   // s(76.1) to s(83.4): covers l14 end (82.818) + 0.582s ≥ 0.5s ✓
  RESOLUTION:  s(83.4),   // s(83.4) to s(87): l16 ends at 87.011 (film boundary, exception noted)
  ACT2_END:    s(87),
};

// Key word frames (absolute) derived from forced-alignment JSONs + VO start times
// Used by CallChain.jsx to drive "decides" and "confirms" state
export const WORD_FRAMES = {
  // l13: "One briefing. The controller decides. Everyone confirms."
  // l13 starts at s(71.5)=2145; word offsets from l13-align.json
  l13_decides:  s(71.5) + s(1.720),  // abs 73.220s = frame 2197
  l13_confirms: s(71.5) + s(3.280),  // abs 74.780s = frame 2244
};

export function isVoiceActive(frame) {
  for (const { start, dur } of Object.values(VO)) {
    if (frame >= start - 2 && frame <= start + dur + 2) return true;
  }
  return false;
}

export function musicVolume(frame) {
  for (const { start, dur } of Object.values(VO)) {
    const margin = 15;
    if (frame >= start - margin && frame <= start + dur + margin) {
      return 0.3;
    }
  }
  if (frame < s(38)) return 0.65;
  if (frame < SCENE.ACT2_START) return 0;
  return 0.6;
}
