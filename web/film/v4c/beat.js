// beat.js (v4c) — timing constants for Insiyab film v4c
// Turn extended to 8s (38-46s): dream sequence with Arabic voice
// Act 2 starts at 46s instead of 42s. Total film: ~84s = 2520 frames.
// 90 BPM at 30 fps: 1 beat = 20 frames, 1 bar = 80 frames
export const FPS = 30;
export const BEAT = 20;
export const BAR = 80;
export const W = 1920;
export const H = 1080;
export const TOTAL_FRAMES = 84 * FPS; // 2520

export const s = (sec) => Math.round(sec * FPS);
export const snap = (frames) => Math.round(frames / BEAT) * BEAT;

// Voice lines — Act 1 unchanged (l01-l08), Act 2 shifted +4s (l09-l16),
// plus two new Arabic lines (lar1, lar2) in the Turn.
export const VO = {
  // Act 1 (unchanged)
  l01: { start: s(2.0),   dur: s(1.567) },
  l02: { start: s(5.0),   dur: s(3.082) },
  l03: { start: s(11.0),  dur: s(2.038) },
  l04: { start: s(14.0),  dur: s(2.116) },
  l05: { start: s(17.0),  dur: s(2.847) },
  l06: { start: s(21.0),  dur: s(2.273) },
  l07: { start: s(27.0),  dur: s(3.631) },
  l08: { start: s(32.0),  dur: s(2.429) },

  // Turn — Arabic voice (new in v4c)
  lar1: { start: s(42.5), dur: s(2.19)  },  // "انسياب" — as emblem completes
  lar2: { start: s(44.0), dur: s(2.77)  },  // "المدينة تشوف اللي جاي"

  // Act 2 — shifted +4s from v4 (Act 2 now starts at 46s)
  l09: { start: s(46.0),  dur: s(1.881) },  // "What if the control room saw it coming?"
  l10: { start: s(51.0),  dur: s(3.161) },
  l11: { start: s(56.0),  dur: s(6.191) },
  l12: { start: s(62.5),  dur: s(5.721) },
  l13: { start: s(68.5),  dur: s(4.049) },
  l14: { start: s(73.0),  dur: s(6.922) },
  l15: { start: s(80.5),  dur: s(1.646) },
  l16: { start: s(82.5),  dur: s(1.411) },
};

// Scene boundary frames
export const SCENE = {
  // Act 1 (unchanged)
  ACT1_START: 0,
  OPENING: 0,
  HIGHWAY: s(5),
  VIGNETTES: s(11),
  MAP_CHAOS: s(20),
  CTRL_ROOM: s(26),
  ACT1_END: s(38),

  // Turn (v4c: 38-46s = 8s)
  TURN_START: s(38),
  TURN_END: s(46),

  // Act 2 — starts at 46s (shifted +4s)
  ACT2_START: s(46),
  QUESTION: s(46),
  MAP_PRECISE: s(51),
  CALL_CHAIN: s(62),
  CHART: s(70),
  RESOLUTION: s(76),
  ACT2_END: s(84),
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
  if (frame < s(46)) return 0;
  return 0.6;
}
