// beat.js (v4e) — timing constants for Insiyab film v4e
// Changes from v4d:
//   A) lar2 moved 45.20→45.30 to fix lar1→lar2 gap (was 0.506s, need ≥0.60s)
//   B) l09/ACT2_START moved 48.60→48.70 to maintain lar2→l09 gap ≥0.60s
//   C) l12 moved 65.10→65.30 to fix l11→l12 gap (l11 is 6.19s, ends 64.791)
//   D) l13 moved 71.35→71.50 (+0.15s cascade from l12)
//   E) Scene boundaries updated: MAP_PRECISE ends 65.30, CALL_CHAIN 65.30→76.10,
//      CHART 76.10→83.40, RESOLUTION 83.40→87.00
//   F) GAP TABLE: all 17 inter-line gaps ≥0.45s (≥0.60s for Arabic), no violations
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

  // Turn — Arabic voice (lar2 moved +0.10s to fix gap; l09 moved +0.10s to keep lar2→l09 ≥0.60s)
  lar1: { start: s(42.5), dur: s(2.19)  },   // "انسياب"              end=44.690
  lar2: { start: s(45.3), dur: s(2.769) },   // "المدينة تشوف اللي جاي"  end=48.069  gap_to_l09=0.631 ✓

  // Act 2 — ACT2_START=48.70 (+0.10 from v4d)
  l09: { start: s(48.7),  dur: s(1.881) },   // "What if the control room saw it coming?"
  l10: { start: s(53.6),  dur: s(3.056) },   // phonetic "Insiyaab watches…"
  l11: { start: s(58.6),  dur: s(6.191) },   // "Which buses will run late…" end=64.791
  l12: { start: s(65.3),  dur: s(5.721) },   // gap_from_l11=0.509 ✓  end=71.021
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

  // Turn (38–48.70s, +0.10s from v4d)
  TURN_START:  s(38),
  TURN_END:    s(48.7),    // was s(48.6)

  // Act 2 — ACT2_START=48.70 (music gate, chime cascade)
  ACT2_START:  s(48.7),   // was s(48.6)
  QUESTION:    s(48.7),
  MAP_PRECISE: s(53.6),   // s(53.6) to s(65.3): covers l11 end (64.791) + 0.509s ≥ 0.5s ✓
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
