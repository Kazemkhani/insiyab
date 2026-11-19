// beat.js — timing constants for Insiyab film v4
// 90 BPM at 30 fps: 1 beat = 20 frames, 1 bar = 80 frames
export const FPS = 30;
export const BEAT = 20;        // frames per beat
export const BAR = 80;         // frames per bar (4 beats)
export const W = 1920;
export const H = 1080;
export const TOTAL_FRAMES = 80 * FPS; // 2400

// Convert seconds to frames (rounded to nearest frame)
export const s = (sec) => Math.round(sec * FPS);

// Beat-snap: snap frames to nearest beat
export const snap = (frames) => Math.round(frames / BEAT) * BEAT;

// Voice start times (measured from gen-voice.py output)
// Format: [startFrame, durationFrames]
export const VO = {
  l01: { start: s(2.0),   dur: s(1.567) },   // "Six in the evening."
  l02: { start: s(5.0),   dur: s(3.082) },   // "Fifty thousand people..."
  l03: { start: s(11.0),  dur: s(2.038) },   // "A nurse..."
  l04: { start: s(14.0),  dur: s(2.116) },   // "A worker..."
  l05: { start: s(17.0),  dur: s(2.847) },   // "A student..."
  l06: { start: s(21.0),  dur: s(2.273) },   // "Nearly half..."
  l07: { start: s(27.0),  dur: s(3.631) },   // "In the control room..."
  l08: { start: s(32.0),  dur: s(2.429) },   // "Every problem..."
  l09: { start: s(42.0),  dur: s(1.881) },   // "What if..."
  l10: { start: s(47.0),  dur: s(3.161) },   // "Insiyab watches..."
  l11: { start: s(52.0),  dur: s(6.191) },   // "Which buses..."
  l12: { start: s(58.5),  dur: s(5.721) },   // "It suggests..."
  l13: { start: s(64.5),  dur: s(4.049) },   // "One briefing..."
  l14: { start: s(69.0),  dur: s(6.922) },   // "On two thousand..."
  l15: { start: s(76.5),  dur: s(1.646) },   // "Insiyab sees it coming."
  l16: { start: s(78.5),  dur: s(1.411) },   // "The controller decides."
};

// Scene boundary frames (approximate, beat-snapped)
export const SCENE = {
  // Act 1
  ACT1_START: 0,
  OPENING: 0,       // 0-5s — Dubai aerial + "18:00"
  HIGHWAY: s(5),    // 5-11s — highway + counter
  VIGNETTES: s(11), // 11-20s — nurse/worker/student
  MAP_CHAOS: s(20), // 20-26s — city map turning red
  CTRL_ROOM: s(26), // 26-38s — control room chaos
  ACT1_END: s(38),  // hard cut

  // Turn
  SILENCE_START: s(38),
  SILENCE_END: s(42),
  EMBLEM_REVEAL: s(40.5),  // 800 ms reveal

  // Act 2
  ACT2_START: s(42),
  QUESTION: s(42),  // 42-47s — slow push + question line
  MAP_PRECISE: s(47), // 47-58s — precise map predictions
  CALL_CHAIN: s(58), // 58-66s — roles/calls/confirmed
  CHART: s(66),     // 66-72s — forecast chart
  RESOLUTION: s(72), // 72-80s — dawn + final lines + lockup
  ACT2_END: s(80),
};

// Compute is-voice-active at a frame (for ducking)
export function isVoiceActive(frame) {
  for (const { start, dur } of Object.values(VO)) {
    if (frame >= start - 2 && frame <= start + dur + 2) return true;
  }
  return false;
}

// Smooth ducking volume for music
export function musicVolume(frame) {
  // Duck 10 dB (factor ~0.316) when voice is within ±15 frames
  for (const { start, dur } of Object.values(VO)) {
    const margin = 15;
    if (frame >= start - margin && frame <= start + dur + margin) {
      return 0.3; // ducked
    }
  }
  // Act 1: 0.65 normally
  if (frame < s(38)) return 0.65;
  // Turn: silence
  if (frame < s(42)) return 0;
  // Act 2: 0.6 normally
  return 0.6;
}
