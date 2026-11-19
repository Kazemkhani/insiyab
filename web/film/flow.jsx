import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill,
  useCurrentFrame, interpolate, Img, staticFile,
} from 'remotion';

// ---- palette (matches story.jsx) ----
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

// ---- screenshot dimensions ----
const IMG_W = 1568;
const IMG_H = 587;

// Scale to fill width at base view
const BASE_SCALE = W / IMG_W; // 1.224
const BASE_H     = IMG_H * BASE_SCALE; // ~718 px
const BASE_OY    = (H - BASE_H) / 2;   // ~181 px top offset

// ---- zones: [centerX, centerY] in screenshot pixels, zoom scale, color ----
// Approximate zone centres from the captured screenshot
const ZONES = [
  // id, name, centerX, centerY, zoomScale, color, caption
  {
    id: 'whole',
    name: null,
    cx: IMG_W / 2, cy: IMG_H / 2,
    zoom: 1.0,
    color: C.flow,
    caption: 'Insiyab in Dataiku: RTA\'s files go in; a planner\'s list and a forecast come out.',
  },
  {
    id: 'default',
    name: 'Default',
    cx: 137, cy: 285,
    zoom: 3.0,
    color: C.g4,
    caption: 'RTA\'s tables: trip times, the fleet, 1,056,343 card taps from one day. Beside them, Dubai\'s open data: stops, routes, metro, monthly ridership, population, weather.',
  },
  {
    id: 'reliability',
    name: 'Service reliability + Passenger demand',
    cx: 322, cy: 310,
    zoom: 3.2,
    color: C.over,
    caption: 'Service reliability measures late departures. Passenger demand counts boardings by route, stop and hour.',
  },
  {
    id: 'supply',
    name: 'Supply and capacity',
    cx: 532, cy: 138,
    zoom: 3.2,
    color: C.spare,
    caption: 'Supply and capacity compares boardings with seats, as a planning check. Standing room is not verified.',
  },
  {
    id: 'priorities',
    name: 'Priorities',
    cx: 522, cy: 278,
    zoom: 3.4,
    color: C.sim,
    caption: 'Priorities combines demand and lateness, and keeps the 25 route-hours that need attention most.',
  },
  {
    id: 'forecast',
    name: 'Forecast',
    cx: 519, cy: 450,
    zoom: 2.8,
    color: '#8A5A00',
    caption: 'Forecast: trip time 30 minutes ahead, tested on 2,043 evening trips it never saw: 15% closer than the timetable, one day. A nightly run rebuilds it all.',
  },
];

// ---- beat timing (frames) ----
// 6 beats over 1800 frames (60 s), last 60 frames = end card
const BEAT_FRAMES = [0, 300, 660, 1020, 1320, 1620, 1740]; // zone start frames
// Beat 0: 0-300 (10s) whole
// Beat 1: 300-660 (12s) Default
// Beat 2: 660-1020 (12s) Reliability+Demand
// Beat 3: 1020-1320 (10s) Supply
// Beat 4: 1320-1620 (10s) Priorities
// Beat 5: 1620-1740 (4s) Forecast
// End:    1740-1800 (2s) end card

function getCamera(frame) {
  // Find which beat we're in and interpolate
  let beatIdx = 0;
  for (let i = BEAT_FRAMES.length - 1; i >= 0; i--) {
    if (frame >= BEAT_FRAMES[i]) { beatIdx = Math.min(i, ZONES.length - 1); break; }
  }

  const isLast = beatIdx >= ZONES.length - 1;
  const beatStart = BEAT_FRAMES[Math.min(beatIdx, BEAT_FRAMES.length - 1)];
  const beatEnd = beatIdx < BEAT_FRAMES.length - 1
    ? BEAT_FRAMES[beatIdx + 1]
    : BEAT_FRAMES[BEAT_FRAMES.length - 1];
  const nextIdx = Math.min(beatIdx + 1, ZONES.length - 1);

  const from = ZONES[beatIdx];
  const to   = ZONES[nextIdx];

  // Transition easing: first 20% of beat
  const transitionDur = Math.round((beatEnd - beatStart) * 0.3);
  const tRaw = Math.min(1, (frame - beatStart) / Math.max(1, transitionDur));
  const t = easeInOut(Math.max(0, tRaw));

  const cx    = from.cx + (to.cx - from.cx) * t;
  const cy    = from.cy + (to.cy - from.cy) * t;
  const zoom  = from.zoom + (to.zoom - from.zoom) * t;

  return { cx, cy, zoom, zone: from, beatIdx };
}

// Convert screenshot-space (cx,cy) to CSS transform for the composition.
// The image is 1:1 (IMG_W × IMG_H). We want pixel (cx,cy) of the image at
// screen centre (W/2, H/2) with the base fit scaled further by `zoom`.
//
// With `transform: translate(tx,ty) scale(totalScale)` the mapping is:
//   screen_x = px * totalScale + tx
//   screen_y = py * totalScale + ty
//
// Setting (cx,cy) → (W/2, H/2):
//   tx = W/2 - cx * totalScale
//   ty = H/2 - cy * totalScale

function cameraTransform(cx, cy, zoom) {
  const totalScale = BASE_SCALE * zoom;
  const tx = W / 2 - cx * totalScale;
  const ty = H / 2 - cy * totalScale;
  return { scale: totalScale, tx, ty };
}

// ---- Caption band ----
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

// ---- Zone label ----
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

// ---- End card ----
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

// ---- Flow accent arrow overlay ----
// Draws animated dashes along a bezier path when transitioning between zones
function FlowArrow({ frame, fromZone, toZone, progress }) {
  if (progress <= 0 || progress >= 1) return null;
  // Simple dashed line hint — a thin accent bar fading in/out
  const op = Math.min(1, Math.min(progress, 1 - progress) * 4);
  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
    }}>
      <svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }}>
        <line
          x1={W * 0.3} y1={H * 0.5} x2={W * 0.7} y2={H * 0.5}
          stroke={C.flow}
          strokeWidth={3}
          strokeDasharray="12 8"
          opacity={op * 0.6}
          strokeDashoffset={-progress * 80}
        />
      </svg>
    </div>
  );
}

// ---- Main composition ----
function InsiyabFlow() {
  const frame = useCurrentFrame();

  // End card
  const endCardFrame = 1740;
  if (frame >= TOTAL) return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />
      <EndCard opacity={1} />
    </AbsoluteFill>
  );

  const { cx, cy, zoom, zone, beatIdx } = getCamera(frame);
  const { scale, tx, ty } = cameraTransform(cx, cy, zoom);

  // End card fade in
  const endCardOp = frame >= endCardFrame
    ? interpolate(frame, [endCardFrame, endCardFrame + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  // Caption opacity: fade in at start of beat, out near end
  const beatStart = BEAT_FRAMES[Math.min(beatIdx, BEAT_FRAMES.length - 1)];
  const beatEnd = beatIdx < BEAT_FRAMES.length - 1
    ? BEAT_FRAMES[beatIdx + 1]
    : BEAT_FRAMES[BEAT_FRAMES.length - 1];
  const captionOp = interpolate(frame,
    [beatStart, beatStart + 15, beatEnd - 15, beatEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fonts />

      {/* Screenshot with camera transform */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#e8e8e8',
      }}>
        <div style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        }}>
          <Img
            src={staticFile('flow-whole.jpg')}
            style={{
              width: IMG_W,
              height: IMG_H,
              display: 'block',
            }}
          />
        </div>
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
