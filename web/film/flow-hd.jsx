import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill,
  useCurrentFrame, interpolate, Img, staticFile,
} from 'remotion';

// ---- palette (matches flow.jsx) ----
const C = {
  paper: '#F6F5F1',
  ink:   '#12263A',
  flow:  '#0E5A5A',
  over:  '#B23A2E',
  spare: '#2F6690',
  sim:   '#8A5A00',
  g1:    '#E6E8EA',
  g2:    '#C3C9CF',
  g3:    '#8C96A0',
  g4:    '#5A6672',
};

const FPS   = 30;
const W     = 1920;
const H     = 1080;
const TOTAL = 1800; // 60 s

// ---- easing ----
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(f, a, b, va, vb) {
  return interpolate(f, [a, b], [va, vb], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeInOut,
  });
}

// ---- fonts ----
function Fonts() {
  return (
    <style>{`
      @font-face { font-family: Overpass; font-weight: 600;
        src: url('${staticFile('fonts/overpass-600.woff2')}') format('woff2'); }
      @font-face { font-family: Overpass; font-weight: 400;
        src: url('${staticFile('fonts/overpass-400.woff2')}') format('woff2'); }
      @font-face { font-family: Plex; font-weight: 400;
        src: url('${staticFile('fonts/ibm-plex-sans-400.woff2')}') format('woff2'); }
    `}</style>
  );
}

// ---- per-zone image display math ----
// All zone shots are 1568×587 CSS pixels.
// Rule: scale = min(W/img_w, H/img_h) for fit, then cap at 1.05 — never exceed native pixels.
const IMG_W = 1568;
const IMG_H = 587;
const FIT_SCALE  = Math.min(W / IMG_W, H / IMG_H); // 1.224
const DISP_SCALE = Math.min(FIT_SCALE, 1.05);       // 1.05  (cap)

// Displayed size at DISP_SCALE (1646×616) — leaves ~137 px dark margins on L/R, ~232 px top/bottom
const BASE_DISP_W = IMG_W * DISP_SCALE;
const BASE_DISP_H = IMG_H * DISP_SCALE;

// ---- zones (same captions, timing, labels as flow.jsx) ----
const ZONES = [
  {
    id: 'whole',
    img: 'whole.png',
    name: null,
    color: C.flow,
    caption: "Insiyab in Dataiku: RTA's files go in; a planner's list and a forecast come out.",
  },
  {
    id: 'default',
    img: 'z1-default.png',
    name: 'Default',
    color: C.g4,
    caption: "RTA's tables: trip times, the fleet, 1,056,343 card taps from one day. Beside them, Dubai's open data: stops, routes, metro, monthly ridership, population, weather.",
  },
  {
    id: 'reliability',
    img: 'z2-reliability.png',
    name: 'Service reliability + Passenger demand',
    color: C.over,
    caption: 'Service reliability measures late departures. Passenger demand counts boardings by route, stop and hour.',
  },
  {
    id: 'supply',
    img: 'z3-supply.png',
    name: 'Supply and capacity',
    color: C.spare,
    caption: 'Supply and capacity compares boardings with seats, as a planning check. Standing room is not verified.',
  },
  {
    id: 'priorities',
    img: 'z4-priorities.png',
    name: 'Priorities',
    color: C.sim,
    caption: 'Priorities combines demand and lateness, and keeps the 25 route-hours that need attention most.',
  },
  {
    id: 'forecast',
    img: 'z5-forecast.png',
    name: 'Forecast',
    color: '#8A5A00',
    caption: 'Forecast: trip time 30 minutes ahead, tested on 2,043 evening trips it never saw: 15% closer than the timetable, one day. A nightly run rebuilds it all.',
  },
];

// ---- beat timing (frames) — identical to flow.jsx ----
// Beat 0: 0–300  (10 s) whole
// Beat 1: 300–660 (12 s) Default
// Beat 2: 660–1020 (12 s) Reliability+Demand
// Beat 3: 1020–1320 (10 s) Supply
// Beat 4: 1320–1620 (10 s) Priorities
// Beat 5: 1620–1740 (4 s)  Forecast
// End:    1740–1800 (2 s)  end card
const BEAT_FRAMES = [0, 240, 587, 815, 1067, 1295, 1678]; // each beat sized to its caption: 2.6 words a second plus 2 s

// ---- Caption band (identical to flow.jsx) ----
function Caption({ text }) {
  if (!text) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      background: C.ink,
      padding: '20px 80px',
      minHeight: 100,
      display: 'flex', alignItems: 'center',
    }}>
      <span style={{
        fontSize: 38,
        color: C.paper,
        fontFamily: 'Plex',
        lineHeight: 1.4,
        whiteSpace: 'normal',
      }}>{text}</span>
    </div>
  );
}

// ---- Zone label (identical to flow.jsx) ----
function ZoneLabel({ name, color }) {
  if (!name) return null;
  return (
    <div style={{
      position: 'absolute',
      top: 40, left: 60,
      background: color,
      color: C.paper,
      fontFamily: 'Overpass',
      fontWeight: 600,
      fontSize: 36,
      padding: '8px 24px',
      borderRadius: 4,
      whiteSpace: 'nowrap',
    }}>{name}</div>
  );
}

// ---- End card (identical to flow.jsx) ----
function EndCard({ opacity }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: C.ink,
      opacity,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <span style={{
        fontFamily: 'Overpass',
        fontWeight: 600,
        fontSize: 72,
        color: C.paper,
        letterSpacing: 2,
      }}>Insiyab &middot; built in Dataiku</span>
    </div>
  );
}

// ---- Main composition ----
function InsiyabFlow() {
  const frame = useCurrentFrame();

  if (frame >= TOTAL) return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />
      <EndCard opacity={1} />
    </AbsoluteFill>
  );

  // Find current beat
  let beatIdx = 0;
  for (let i = BEAT_FRAMES.length - 1; i >= 0; i--) {
    if (frame >= BEAT_FRAMES[i]) { beatIdx = Math.min(i, ZONES.length - 1); break; }
  }

  const zone     = ZONES[beatIdx];
  const beatStart = BEAT_FRAMES[Math.min(beatIdx, BEAT_FRAMES.length - 1)];
  const beatEnd   = beatIdx < BEAT_FRAMES.length - 1
    ? BEAT_FRAMES[beatIdx + 1]
    : BEAT_FRAMES[BEAT_FRAMES.length - 1];

  // Gentle push-in: DISP_SCALE×1.00 → DISP_SCALE×1.03 (3% push over the beat).
  // Total scale never exceeds 1.05 × 1.03 = 1.08 — below perceptible blur threshold.
  const pushT     = lerp(frame, beatStart, beatEnd, 0, 1);
  const pushScale = 1.0 + 0.03 * easeInOut(pushT);
  const totalScale = DISP_SCALE * pushScale;

  // Centre the image in the frame
  const dispW = IMG_W * totalScale;
  const dispH = IMG_H * totalScale;
  const imgLeft = (W - dispW) / 2;
  const imgTop  = (H - dispH) / 2;

  // End card fade
  const endCardFrame = 1678;
  const endCardOp = frame >= endCardFrame
    ? interpolate(frame, [endCardFrame, endCardFrame + 30], [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  // Caption opacity: fade in at beat start, fade out at beat end
  const captionOp = interpolate(frame,
    [beatStart, beatStart + 15, beatEnd - 15, beatEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />

      {/* Zone image — centred, no upscaling beyond 1.05× native */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}>
        <Img
          src={staticFile(zone.img)}
          style={{
            position: 'absolute',
            left:   imgLeft,
            top:    imgTop,
            width:  dispW,
            height: dispH,
            display: 'block',
          }}
        />
      </div>

      {/* Caption band */}
      <div style={{ opacity: captionOp }}>
        <Caption text={zone.caption} />
      </div>

      {/* Zone label */}
      <div style={{ opacity: captionOp }}>
        <ZoneLabel name={zone.name} color={zone.color} />
      </div>

      {/* End card overlay */}
      {endCardOp > 0 && <EndCard opacity={endCardOp} />}
    </AbsoluteFill>
  );
}

// ---- register ----
export const RemotionRoot = () => (
  <Composition
    id="InsiyabFlow"
    component={InsiyabFlow}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
  />
);

registerRoot(RemotionRoot);
