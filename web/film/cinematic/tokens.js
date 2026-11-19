// Shared tokens for the Insiyab cinematic film (revised script)
// Brand: ivory=calm/space, ink=authority/night, gold=Insiyab identity only
//        red=lateness/attention only, teal=verified receipt only

export const C = {
  ivory:  '#F7F5F0',
  ink:    '#15181D',
  gold:   '#9C7B3E',
  teal:   '#2E7D6B',
  red:    '#E5544B',   // slightly lighter for legibility over dark photos
  redDeep:'#C42B2B',
  ink10:  '#E0DFDB',
  ink25:  '#BFBEBB',
  ink50:  '#868787',
  teal50: '#93B9AE',
};

export const FPS   = 30;
export const W     = 1920;
export const H     = 1080;
// 80 s = 2400 frames
export const TOTAL = 2400;

// Scene boundary frames (film-absolute)
export const SCENE = {
  s1: { in: 0,    out: 240  }, // 0–8 s
  s2: { in: 240,  out: 540  }, // 8–18 s
  s3: { in: 540,  out: 900  }, // 18–30 s
  s4: { in: 900,  out: 1200 }, // 30–40 s
  s5: { in: 1200, out: 1320 }, // 40–44 s
  s6: { in: 1320, out: 1980 }, // 44–66 s (660 f = 22 s)
  s7: { in: 1980, out: 2220 }, // 66–74 s
  s8: { in: 2220, out: 2400 }, // 74–80 s
};

// VO cue points (film-absolute frames)
// Durations: l1=3.76, l2=5.33, l3=10.63, l4=6.53, l5=1.44,
//            l6a=8.91, l6b=4.91, l6c=3.24, l6d=3.16,
//            l7=6.27, l8a=1.52, l8b=1.49
export const VO = {
  l1:   45,     // 1.5 s
  l2:   240,    // 8.0 s
  l3:   540,    // 18.0 s
  l4:   900,    // 30.0 s
  l5:   1245,   // 41.5 s, local 45 within s5
  l6a:  1320,   // 44.0 s, local 0 within s6
  l6b:  1587,   // 53.1 s, local 267 (after l6a 267f)
  l6c:  1734,   // 57.8 s, local 414 (after l6b 147f)
  l6d:  1831,   // 61.0 s, local 511 (after l6c 97f)
  l7:   1980,   // 66.0 s
  l8a:  2220,   // 74.0 s
  l8b:  2266,   // 75.5 s (l8a 46f + 2220)
};

// SFX cue points (film-absolute frames)
export const SFX = {
  phoneRing:  930,  // 31.0 s
  softTone:   1224, // 40.8 s
  tick1:      1840, // 61.3 s — controller selection
  tick2:      1865, // 62.2 s — received 1
  tick3:      1880, // 62.7 s — received 2
  tick4:      1895, // 63.2 s — received 3
  tick5:      1910, // 63.7 s — received 4
};

// cubic-bezier(0.4,0,0.2,1) easing
export function cbEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const x1 = 0.4, y1 = 0, x2 = 0.2, y2 = 1;
  const bx = s => 3*s*(1-s)*(1-s)*x1 + 3*s*s*(1-s)*x2 + s*s*s;
  const by = s => 3*s*(1-s)*(1-s)*y1 + 3*s*s*(1-s)*y2 + s*s*s;
  let s = t;
  for (let i = 0; i < 10; i++) {
    const dx = bx(s) - t;
    const dBxDs = 3*(1-s)*(1-s)*x1 + 6*s*(1-s)*(x2-x1) + 3*s*s*(1-x2);
    s = Math.max(0, Math.min(1, s - dx / (Math.abs(dBxDs) < 1e-6 ? 1e-6 : dBxDs)));
  }
  return by(s);
}

export function makeCI(interpolateFn) {
  return (frame, a, b, va, vb) => interpolateFn(frame, [a, b], [va, vb], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: cbEase,
  });
}
