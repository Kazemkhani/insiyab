// beat.js (v4d) — timing constants for Insiyab film v4d
// Changes from v4c:
//   A) lar2 moved from 44.0 → 45.2 (clears lar1 end + 0.5s gap)
//   B) Act 2 shifts +2.6s as ONE block (ACT2_START 46→48.6)
//   C) l15 spoken by Yousuf (Emirati narrator, eleven_v3), English
//   D) l14 new text ("On MORE THAN two thousand…"), bar chart in Chart
//   E) Word-level sync via alignment JSON
//   Total film: 87s = 2610 frames
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

// Voice lines — Act 1 unchanged (l01–l08)
// Turn: lar1 unchanged, lar2 +1.2s
// Act 2: entire block +2.6s
export const VO = {
  // Act 1 (unchanged from v4/v4b/v4c)
  l01: { start: s(2.0),   dur: s(1.567) },   // "Six in the evening."
  l02: { start: s(5.0),   dur: s(3.082) },   // "Fifty thousand people board a bus in a single hour."
  l03: { start: s(11.0),  dur: s(2.038) },   // "A nurse after a twelve-hour shift."
  l04: { start: s(14.0),  dur: s(2.116) },   // "A worker, in forty-one degrees."
  l05: { start: s(17.0),  dur: s(2.847) },   // "A student who cannot miss the last metro."
  l06: { start: s(21.0),  dur: s(2.273) },   // "Nearly half of their buses will leave late."
  l07: { start: s(27.0),  dur: s(3.631) },   // "In the control room, six people. Fourteen hundred buses."
  l08: { start: s(32.0),  dur: s(2.429) },   // "And every problem starts with a phone call."

  // Turn — Arabic voice
  lar1: { start: s(42.5), dur: s(2.19)  },   // "انسياب" — emblem completes
  lar2: { start: s(45.2), dur: s(2.77)  },   // "المدينة تشوف اللي جاي" — +1.2s from v4c

  // Act 2 — +2.6s from v4c (whole block)
  l09: { start: s(48.6),  dur: s(1.881) },   // "What if the control room saw it coming?"
  l10: { start: s(53.6),  dur: s(3.056) },   // "Insiyaab watches the whole evening…" (phonetic respelling, 3.056s)
  l11: { start: s(58.6),  dur: s(6.191) },   // "Which buses will run late. Which will overflow. Which stops are in the heat."
  l12: { start: s(65.1),  dur: s(5.721) },   // "It suggests a fix, and calls everyone who makes it happen. At once."
  l13: { start: s(71.35), dur: s(4.049) },   // "One briefing. The controller decides. Everyone confirms."
  l14: { start: s(76.0),  dur: s(6.818) },   // "On more than two thousand evening trips…" (NEW TEXT, measured 6.818s)
  l15: { start: s(83.5),  dur: s(1.567) },   // "Insiyab sees it coming." (Yousuf Emirati, measured 1.567s)
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

  // Turn (38–48.6s = 10.6s, extended +2.6s from v4c)
  TURN_START:  s(38),
  TURN_END:    s(48.6),  // was s(46) in v4c

  // Act 2 — starts at 48.6s (+2.6s shift)
  ACT2_START:  s(48.6),  // ← replaces all hard-coded s(46) in root.jsx
  QUESTION:    s(48.6),
  MAP_PRECISE: s(53.6),  // was s(51) in v4c
  CALL_CHAIN:  s(64.6),  // was s(62) in v4c
  CHART:       s(72.6),  // was s(70) in v4c
  RESOLUTION:  s(78.6),  // was s(76) in v4c
  ACT2_END:    s(87),    // was s(84) in v4c
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
  if (frame < SCENE.ACT2_START) return 0;  // ← was s(46), now uses constant
  return 0.6;
}
