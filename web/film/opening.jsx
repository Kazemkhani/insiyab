import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence,
  useCurrentFrame, interpolate, staticFile
} from 'remotion';

// ---- palette (docs/RULES.md sections 5 and 10) ----
const C = {
  paper:  '#F6F5F1',
  ink:    '#12263A',
  flow:   '#0E5A5A',
  over:   '#B23A2E',
  spare:  '#2F6690',
  g3:     '#8C96A0',
  g4:     '#5A6672',
};

const FPS   = 30;
const W     = 1920;
const H     = 1080;
const TOTAL = 930; // 31.0 s

// ---- cue times (from audio/cues.json) ----
const CUES = {
  l1: { vs: 1.5,  ve: 5.92, ss: 1.5,  se: 6.5  },
  l2: { vs: 7.0,  ve: 14.49, ss: 7.0, se: 15.5 },
  l3: { vs: 16.0, ve: 20.98, ss: 16.0, se: 21.5 },
  l4: { vs: 22.0, ve: 24.61, ss: 22.0, se: 25.5 },
};

// ---- numbers (film-facts) ----
const F = {
  board0800: '48,724',
  board1800: '49,707',
  late0800:  19,
  late1800:  45,
  tm67:      67,
  actual96:  96,
  break16:   16,
  overrun:   29,
};

// ---- helpers ----
function clamp(v) { return { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }; }
function fade(frame, inA, inB) {
  return interpolate(frame, [inA, inB], [0, 1], clamp());
}
function lerp(frame, a, b, va, vb) {
  return interpolate(frame, [a, b], [va, vb], clamp());
}

// ---- Fonts (same paths as story.jsx) ----
function Fonts() {
  return (
    <style>{`
      @font-face { font-family: Overpass; font-weight: 600;
        src: url('${staticFile('fonts/overpass-600.woff2')}') format('woff2'); }
      @font-face { font-family: Overpass; font-weight: 400;
        src: url('${staticFile('fonts/overpass-400.woff2')}') format('woff2'); }
      @font-face { font-family: Plex; font-weight: 400;
        src: url('${staticFile('fonts/ibm-plex-sans-400.woff2')}') format('woff2'); }
      @font-face { font-family: PlexMono; font-weight: 400;
        src: url('${staticFile('fonts/ibm-plex-mono-400.woff2')}') format('woff2'); }
    `}</style>
  );
}

// ---- AI illustration tag (top-right, every image frame) ----
function AITag() {
  return (
    <div style={{
      position: 'absolute', top: 32, right: 48,
      fontSize: 28, fontFamily: 'Plex', color: C.paper,
      background: 'rgba(18,38,58,0.72)',
      padding: '6px 16px', borderRadius: 4,
      whiteSpace: 'nowrap', letterSpacing: '0.03em',
      zIndex: 20,
    }}>
      AI illustration
    </div>
  );
}

// ---- bottom-band scrim (55-70% opacity, solid) ----
function Scrim({ height = 320, opacity = 0.65 }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height,
      background: `rgba(18,38,58,${opacity})`,
      zIndex: 10,
    }} />
  );
}

// ---- caption (spoken line) ----
function Caption({ text, visible = true }) {
  if (!visible || !text) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 36, left: 80, right: 80,
      fontSize: 42, fontFamily: 'Plex', color: C.paper,
      lineHeight: 1.35, textAlign: 'center',
      zIndex: 30,
      whiteSpace: 'normal',
    }}>{text}</div>
  );
}

// ---- source line ----
function SrcLine({ text }) {
  return (
    <div style={{
      position: 'absolute', bottom: 148, left: 80, right: 80,
      fontSize: 30, fontFamily: 'Plex', color: C.g3,
      textAlign: 'left', whiteSpace: 'nowrap',
      zIndex: 30,
    }}>{text}</div>
  );
}

// ---- PROCEDURAL DUSK BACKGROUND (shot 1: bus stop) ----
// Warm sodium-lamp glow against deep blue night sky
function BusStopBg({ pushF = 0 }) {
  const sc = 1 + pushF * 0.05;
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
    }}>
      {/* Sky */}
      <div style={{
        position: 'absolute', inset: 0,
        background: '#1a2240',
        transform: `scale(${sc})`,
        transformOrigin: '50% 60%',
      }} />
      {/* Tower silhouettes */}
      <svg style={{ position: 'absolute', bottom: 240, left: 0, width: W, height: 500 }} viewBox={`0 0 ${W} 500`}>
        {/* Left cluster */}
        <rect x="80"  y="80"  width="80" height="420" fill="#0a1828" />
        <rect x="200" y="140" width="60" height="360" fill="#0a1828" />
        <rect x="310" y="60"  width="90" height="440" fill="#0c1f36" />
        <rect x="440" y="180" width="55" height="320" fill="#0a1828" />
        {/* Right cluster */}
        <rect x="1500" y="100" width="85"  height="400" fill="#0a1828" />
        <rect x="1620" y="50"  width="100" height="450" fill="#0c1f36" />
        <rect x="1760" y="130" width="70"  height="370" fill="#0a1828" />
        <rect x="1860" y="170" width="60"  height="330" fill="#0a1828" />
      </svg>
      {/* Ground/road */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 240,
        background: '#0d0a06',
      }} />
      {/* Sodium lamp warm circle (no gradient) */}
      <div style={{
        position: 'absolute',
        top: 340, left: 820,
        width: 220, height: 220,
        borderRadius: '50%',
        background: 'rgba(255,160,40,0.12)',
        pointerEvents: 'none',
      }} />
      {/* Bus stop electronic board (empty glowing rect — text in Scene1 overlay) */}
      <div style={{
        position: 'absolute',
        top: 290, left: 740,
        width: 420, height: 160,
        background: 'rgba(10,30,50,0.85)',
        border: '3px solid rgba(100,160,220,0.4)',
        borderRadius: 6,
        zIndex: 5,
      }} />
    </div>
  );
}

// ---- AVENUE AT 18:00 (shots 2 & 3: Dubai avenue, evening traffic) ----
function AvenueDuskBg({ pushF = 0 }) {
  const sc = 1 + pushF * 0.05;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: '#1a1810',
        transform: `scale(${sc})`,
        transformOrigin: '50% 50%',
      }} />
      {/* Tower silhouettes */}
      <svg style={{ position: 'absolute', bottom: 200, left: 0, width: W, height: 600 }} viewBox={`0 0 ${W} 600`}>
        <rect x="0"    y="100" width="90"  height="500" fill="#09152a" />
        <rect x="130"  y="40"  width="110" height="560" fill="#0b1a30" />
        <rect x="290"  y="150" width="70"  height="450" fill="#09152a" />
        <rect x="420"  y="80"  width="130" height="520" fill="#0d2240" />
        <rect x="600"  y="200" width="60"  height="400" fill="#09152a" />
        <rect x="1300" y="90"  width="120" height="510" fill="#0b1a30" />
        <rect x="1460" y="30"  width="140" height="570" fill="#0d2240" />
        <rect x="1660" y="120" width="90"  height="480" fill="#09152a" />
        <rect x="1800" y="60"  width="120" height="540" fill="#0b1a30" />
      </svg>
      {/* Road */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
        background: '#14100a',
      }} />
      {/* Tail-light dots (solid, no gradient) */}
      <div style={{
        position: 'absolute', bottom: 118, left: 340,
        width: 28, height: 24,
        background: 'rgba(255,60,60,0.5)', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', bottom: 118, left: 1540,
        width: 28, height: 24,
        background: 'rgba(255,60,60,0.45)', borderRadius: 4,
      }} />
      {/* Headlight dots (solid) */}
      <div style={{
        position: 'absolute', bottom: 118, left: 980,
        width: 32, height: 24,
        background: 'rgba(255,240,180,0.35)', borderRadius: 4,
      }} />
    </div>
  );
}

// ---- TERMINUS DUSK (shot 4: driver silhouette, short break) ----
function TerminusBg({ pushF = 0 }) {
  const sc = 1 + pushF * 0.05;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: '#141c2e',
        transform: `scale(${sc})`,
        transformOrigin: '50% 60%',
      }} />
      {/* Terminal canopy structure */}
      <div style={{
        position: 'absolute',
        top: 180, left: 200, right: 200, height: 20,
        background: 'rgba(40,60,80,0.8)',
      }} />
      {/* Fluorescent light strip */}
      <div style={{
        position: 'absolute',
        top: 180, left: 400, width: W - 800, height: 20,
        background: 'rgba(180,210,240,0.15)',
      }} />
      {/* Bus shape (parked) */}
      <div style={{
        position: 'absolute',
        bottom: 180, left: 400,
        width: 900, height: 240,
        background: 'rgba(200,210,215,0.12)',
        border: '2px solid rgba(160,180,200,0.2)',
        borderRadius: '4px 4px 0 0',
      }} />
      {/* Driver silhouette */}
      <div style={{
        position: 'absolute',
        bottom: 180, left: 1360,
        width: 44, height: 160,
        background: '#0a1220',
        borderRadius: '50% 50% 0 0 / 40% 40% 0 0',
      }} />
      {/* Ground */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 180,
        background: '#0d1420',
      }} />
    </div>
  );
}

// ---- BUS QUEUE (shot 5: queue of buses) ----
function BusQueueBg({ pushF = 0 }) {
  const sc = 1 + pushF * 0.05;
  const buses = [
    { x: 100,  w: 820 },
    { x: 980,  w: 760 },
    { x: 1800, w: 700 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: '#0e1a2c',
        transform: `scale(${sc})`,
        transformOrigin: '40% 60%',
      }} />
      {/* Ground */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
        background: '#0a1018',
      }} />
      {/* Three buses in queue */}
      {buses.map((b, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: 220, left: b.x,
          width: b.w, height: 220,
          background: `rgba(200,210,215,${0.14 - i * 0.04})`,
          border: `2px solid rgba(160,180,200,${0.22 - i * 0.06})`,
          borderRadius: '4px 4px 0 0',
        }} />
      ))}
      {/* Teal stripe on first bus */}
      <div style={{
        position: 'absolute',
        bottom: 340, left: 100, width: 820, height: 28,
        background: 'rgba(14,90,90,0.4)',
      }} />
    </div>
  );
}

// ---- MORNING AVENUE (shot 6: 08:00, golden morning) ----
function AvenueMorningBg({ pushF = 0 }) {
  const sc = 1 + pushF * 0.05;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: '#c8902a',
        transform: `scale(${sc})`,
        transformOrigin: '50% 50%',
      }} />
      {/* Tower silhouettes (same layout as avenue, morning) */}
      <svg style={{ position: 'absolute', bottom: 200, left: 0, width: W, height: 600 }} viewBox={`0 0 ${W} 600`}>
        <rect x="0"    y="100" width="90"  height="500" fill="rgba(30,20,8,0.5)" />
        <rect x="130"  y="40"  width="110" height="560" fill="rgba(30,20,8,0.55)" />
        <rect x="290"  y="150" width="70"  height="450" fill="rgba(30,20,8,0.5)" />
        <rect x="420"  y="80"  width="130" height="520" fill="rgba(40,28,10,0.5)" />
        <rect x="600"  y="200" width="60"  height="400" fill="rgba(30,20,8,0.5)" />
        <rect x="1300" y="90"  width="120" height="510" fill="rgba(30,20,8,0.55)" />
        <rect x="1460" y="30"  width="140" height="570" fill="rgba(40,28,10,0.5)" />
        <rect x="1660" y="120" width="90"  height="480" fill="rgba(30,20,8,0.5)" />
        <rect x="1800" y="60"  width="120" height="540" fill="rgba(30,20,8,0.55)" />
      </svg>
      {/* Road */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
        background: '#3a2810',
      }} />
    </div>
  );
}

// ========= SCENE COMPONENTS =========

// Scene 0 — 0 to 1.5 s (frames 0-44): paper, fade in
function SceneFadeIn() {
  const f = useCurrentFrame();
  const alpha = fade(f, 0, 30);
  return (
    <AbsoluteFill>
      <Fonts />
      <div style={{
        position: 'absolute', inset: 0,
        background: C.paper,
        opacity: 1 - alpha,
      }} />
      <AvenueDuskBg pushF={0} />
    </AbsoluteFill>
  );
}

// Scene 1 — l1: 1.5-6.5 s (frames 45-194)
// Bus stop at dusk, departure board
function Scene1() {
  const f = useCurrentFrame(); // 0 at scene start = frame 45 abs
  const totalF = 150; // 5 s
  const pushF = f / totalF;
  const alpha = fade(f, 0, 15);
  const captionVis = f >= CUES.l1.vs * FPS - 45 && f <= CUES.l1.se * FPS - 45;
  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <BusStopBg pushF={pushF} />
      <AITag />
      <Scrim height={340} opacity={0.65} />
      {/* Overlay: board shows 19:23 → then 19:36 in red, inside board rect */}
      <div style={{
        position: 'absolute',
        top: 290, left: 740,
        width: 420, height: 160,
        zIndex: 15,
        fontFamily: 'PlexMono', fontSize: 36,
        color: C.paper, letterSpacing: '0.04em',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
        padding: '10px 20px',
      }}>
        <div style={{ fontSize: 28, color: C.g3, whiteSpace: 'nowrap' }}>310 · Scheduled</div>
        <div style={{ color: C.paper, whiteSpace: 'nowrap' }}>19:23</div>
        <div style={{ color: C.over, whiteSpace: 'nowrap' }}>19:36 · 13 min late</div>
      </div>
      {/* Source */}
      <SrcLine text="Illustration, built from route 310's measured times" />
      <Caption
        text="The timetable said 19:23, and the bus left at 19:36."
        visible={captionVis}
      />
    </AbsoluteFill>
  );
}

// Scene 2 — l2: 7.0-15.5 s (frames 210-464)
// Dubai avenue at 18:00, trip bar
function Scene2() {
  const f = useCurrentFrame();
  const totalF = 255;
  const pushF = f / totalF;
  const alpha = fade(f, 0, 15);
  const captionVis = f >= (CUES.l2.vs - 7.0) * FPS && f <= (CUES.l2.se - 7.0) * FPS;

  const barMaxW = 700;
  const tmBarW  = barMaxW * (F.tm67 / 100);
  const actBarW = barMaxW * (F.actual96 / 100);

  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <AvenueDuskBg pushF={pushF} />
      <AITag />
      <Scrim height={380} opacity={0.68} />
      {/* Trip bar overlay */}
      <div style={{
        position: 'absolute',
        bottom: 190, left: 100, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Timetable bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: tmBarW, height: 44,
            background: C.g3,
            borderRadius: 3,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 42,
            color: C.paper, whiteSpace: 'nowrap',
          }}>
            Timetable: {F.tm67} min
          </span>
        </div>
        {/* Actual bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            width: actBarW, height: 44,
            background: C.over,
            borderRadius: 3,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 42,
            color: C.over, whiteSpace: 'nowrap',
          }}>
            It took: {F.actual96} min
          </span>
        </div>
      </div>
      <SrcLine text="Route 310, 18:00, 15 Dec 2025. Measured." />
      <Caption
        text="Every trip is given the same time all day, but at 18:00 route 310 needs 96 min, not 67."
        visible={captionVis}
      />
    </AbsoluteFill>
  );
}

// Scene 3 — l3: 16.0-21.5 s (frames 480-644)
// Terminus, driver silhouette, break
function Scene3() {
  const f = useCurrentFrame();
  const totalF = 165;
  const pushF = f / totalF;
  const alpha = fade(f, 0, 15);
  const captionVis = f >= (CUES.l3.vs - 16.0) * FPS && f <= (CUES.l3.se - 16.0) * FPS;

  const breakBarW = 300;
  const overrunW  = breakBarW * (F.overrun / F.break16);

  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <TerminusBg pushF={pushF} />
      <AITag />
      <Scrim height={360} opacity={0.66} />
      {/* Break bar */}
      <div style={{
        position: 'absolute',
        bottom: 200, left: 100, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <span style={{
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 48,
          color: C.paper, whiteSpace: 'nowrap',
        }}>
          Break between trips: {F.break16} min
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{
            width: breakBarW, height: 40,
            background: C.flow,
            borderRadius: '3px 0 0 3px',
            flexShrink: 0,
          }} />
          <div style={{
            width: overrunW, height: 40,
            background: C.over,
            borderRadius: '0 3px 3px 0',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'Plex', fontSize: 36,
            color: C.over, whiteSpace: 'nowrap', marginLeft: 20,
          }}>
            +29 min overrun swallows it
          </span>
        </div>
      </div>
      <SrcLine text="Planned break about 16 min. 29 min overrun from route 310, 18:00. Measured." />
      <Caption
        text="The break before the next trip is only 16 minutes, so the bus starts that trip late."
        visible={captionVis}
      />
    </AbsoluteFill>
  );
}

// Scene 4 — l4: 22.0-25.5 s (frames 660-764)
// Queue of buses, cascade
function Scene4() {
  const f = useCurrentFrame();
  const totalF = 105;
  const pushF = f / totalF;
  const alpha = fade(f, 0, 15);
  const captionVis = f >= (CUES.l4.vs - 22.0) * FPS && f <= (CUES.l4.se - 22.0) * FPS;

  const trips = [
    { label: 'Trip 1', offsetMin: 0,  color: C.flow },
    { label: 'Trip 2', offsetMin: 13, color: C.spare },
    { label: 'Trip 3', offsetMin: 26, color: C.over },
  ];

  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <BusQueueBg pushF={pushF} />
      <AITag />
      <Scrim height={360} opacity={0.65} />
      <div style={{
        position: 'absolute',
        bottom: 190, left: 100, zIndex: 20,
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <span style={{
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 48,
          color: C.paper, whiteSpace: 'nowrap',
        }}>
          The delay is handed on, trip after trip
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {trips.map((t, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <div style={{
                width: 240, height: 40,
                background: t.color,
                borderRadius: 3,
                marginLeft: t.offsetMin * 4,
              }} />
              <span style={{
                fontFamily: 'Plex', fontSize: 32, color: C.paper,
                marginLeft: t.offsetMin * 4,
                whiteSpace: 'nowrap',
              }}>{t.label}{t.offsetMin > 0 ? ` +${t.offsetMin} min late` : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <Caption
        text="The delay is handed on, trip after trip."
        visible={captionVis}
      />
    </AbsoluteFill>
  );
}

// Scene 5 — proof: 26.0-30.0 s (frames 780-899)
// Split frame: image 6 left (08:00) | image 3 right (18:00)
function Scene5() {
  const f = useCurrentFrame();
  const alpha = fade(f, 0, 15);

  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      {/* Left half: morning */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: W / 2,
        overflow: 'hidden',
      }}>
        <AvenueMorningBg pushF={f / 120 * 0.5} />
        {/* Morning scrim */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 440,
          background: 'rgba(10,20,10,0.68)', zIndex: 10,
        }} />
        {/* 08:00 label */}
        <div style={{
          position: 'absolute', top: 60, left: 60, zIndex: 20,
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 52, color: C.paper,
          whiteSpace: 'nowrap',
        }}>08:00</div>
        {/* Numbers */}
        <div style={{
          position: 'absolute', bottom: 240, left: 60, zIndex: 20,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <span style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 56,
            color: C.paper, whiteSpace: 'nowrap',
          }}>{F.board0800} boardings</span>
          <span style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 72,
            color: C.flow, whiteSpace: 'nowrap',
          }}>{F.late0800}% late</span>
        </div>
      </div>
      {/* Divider */}
      <div style={{
        position: 'absolute', top: 0, left: W / 2 - 2, bottom: 0, width: 4,
        background: C.paper, opacity: 0.3, zIndex: 50,
      }} />
      {/* Right half: evening */}
      <div style={{
        position: 'absolute', top: 0, left: W / 2, bottom: 0, right: 0,
        overflow: 'hidden',
      }}>
        <AvenueDuskBg pushF={f / 120 * 0.5} />
        {/* Evening scrim */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 440,
          background: 'rgba(18,38,58,0.68)', zIndex: 10,
        }} />
        {/* 18:00 label */}
        <div style={{
          position: 'absolute', top: 60, left: 60, zIndex: 20,
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 52, color: C.paper,
          whiteSpace: 'nowrap',
        }}>18:00</div>
        {/* Numbers */}
        <div style={{
          position: 'absolute', bottom: 240, left: 60, zIndex: 20,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <span style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 56,
            color: C.paper, whiteSpace: 'nowrap',
          }}>{F.board1800} boardings</span>
          <span style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 72,
            color: C.over, whiteSpace: 'nowrap',
          }}>{F.late1800}% late</span>
        </div>
      </div>
      {/* AI tag (top-right of full frame) */}
      <AITag />
      {/* Source */}
      <div style={{
        position: 'absolute', bottom: 36, left: 80, right: 80, zIndex: 60,
        fontSize: 30, fontFamily: 'Plex', color: C.g3,
        textAlign: 'center', whiteSpace: 'nowrap',
      }}>
        15 Dec 2025, one day. Measured.
      </div>
    </AbsoluteFill>
  );
}

// Scene 6 — release: 30.0-31.0 s (frames 900-929)
// Soft fade toward paper to cut cleanly to frame 31 of story film
function Scene6() {
  const f = useCurrentFrame();
  // story.jsx frame 930 is ~ paper (Scene0 background)
  const alpha = lerp(f, 0, 29, 0, 1);
  return (
    <AbsoluteFill>
      <AvenueDuskBg pushF={1} />
      <div style={{
        position: 'absolute', inset: 0,
        background: C.paper,
        opacity: alpha,
      }} />
    </AbsoluteFill>
  );
}

// ========= ROOT COMPOSITION =========
function Opening() {
  return (
    <AbsoluteFill style={{ background: '#0d1428' }}>
      <Fonts />
      {/* fade-in: 0-45 frames */}
      <Sequence from={0} durationInFrames={45}>
        <SceneFadeIn />
      </Sequence>
      {/* l1: 45-194 (150 frames = 5 s) */}
      <Sequence from={45} durationInFrames={150}>
        <Scene1 />
      </Sequence>
      {/* l2: 210-464 (255 frames = 8.5 s) */}
      <Sequence from={210} durationInFrames={255}>
        <Scene2 />
      </Sequence>
      {/* l3: 480-644 (165 frames = 5.5 s) */}
      <Sequence from={480} durationInFrames={165}>
        <Scene3 />
      </Sequence>
      {/* l4: 660-764 (105 frames = 3.5 s) */}
      <Sequence from={660} durationInFrames={105}>
        <Scene4 />
      </Sequence>
      {/* proof: 780-899 (120 frames = 4 s) */}
      <Sequence from={780} durationInFrames={120}>
        <Scene5 />
      </Sequence>
      {/* release: 900-929 (30 frames = 1 s) */}
      <Sequence from={900} durationInFrames={30}>
        <Scene6 />
      </Sequence>
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <Composition
      id="InsiyabOpening"
      component={Opening}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
    />
  );
}

registerRoot(RemotionRoot);
