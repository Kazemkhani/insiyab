import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence,
  useCurrentFrame, interpolate, staticFile,
} from 'remotion';

// ---- palette (same tokens as story.jsx) ----
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
  g5:    '#33404D',
  flowLight: '#EEF6F6',
};

const FPS   = 30;
const W     = 1920;
const H     = 1080;
const TOTAL = 600; // 20 s

function easeOut(f, a, b, outVal = 1) {
  return interpolate(f, [a, b], [0, outVal], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: t => 1 - (1 - t) * (1 - t),
  });
}
function lerp(f, a, b, va, vb) {
  return interpolate(f, [a, b], [va, vb], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
}

// ---- shared components ----

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

// Persistent drill label — always at top
function DrillBanner() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 56,
      background: C.g1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        fontFamily: 'Plex', fontSize: 36, color: C.sim,
        letterSpacing: 0.5, whiteSpace: 'nowrap',
      }}>
        A drill on our own phones, not an RTA system.
      </div>
    </div>
  );
}

// Narration caption band — bottom 100px
function Caption({ text, visible = true }) {
  if (!text || !visible) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
      background: C.paper + 'f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 120px',
      zIndex: 90,
    }}>
      <div style={{
        fontFamily: 'Plex', fontSize: 42, color: C.ink,
        textAlign: 'center', whiteSpace: 'nowrap',
      }}>{text}</div>
    </div>
  );
}

// FIX 1: Phone shape drawn in SVG — no Unicode glyphs
function PhoneShape({ color = C.g4, size = 56 }) {
  const bw = Math.round(size * 0.56);
  const r  = Math.round(size * 0.14);
  return (
    <svg
      width={bw} height={size}
      viewBox={`0 0 ${bw} ${size}`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* body outline */}
      <rect
        x="2" y="2"
        width={bw - 4} height={size - 4}
        rx={r} ry={r}
        stroke={color} strokeWidth="3" fill="none"
      />
      {/* earpiece slot */}
      <rect
        x={Math.round(bw * 0.28)} y={Math.round(size * 0.09)}
        width={Math.round(bw * 0.44)} height={Math.round(size * 0.045)}
        rx="2"
        fill={color}
      />
      {/* home button hint */}
      <circle
        cx={Math.round(bw / 2)} cy={Math.round(size * 0.88)}
        r={Math.round(size * 0.055)}
        stroke={color} strokeWidth="2" fill="none"
      />
    </svg>
  );
}

// FIX 2: Proper arrow-pointer cursor drawn in SVG
function CursorArrow({ color = C.ink }) {
  return (
    <svg
      width={30} height={42}
      viewBox="0 0 30 42"
      style={{ display: 'block' }}
    >
      <polygon
        points="2,2 2,32 10,24 14,40 19,38 15,22 25,22"
        fill={color}
        stroke={C.paper}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- SCENE A: 0–90f (0–3 s) ----
// Bus bar slows; timetable marker advances; interface card appears (centred, 1.6x).
function SceneA() {
  const f = useCurrentFrame();

  const barAlpha   = easeOut(f, 0, 15);
  const busPos     = lerp(f, 0, 90, 0.08, 0.46);
  const markerPos  = lerp(f, 15, 60, 0.46, 0.68);
  const markerA    = easeOut(f, 15, 30);

  // Interface card centred in lower half
  const cardA  = easeOut(f, 44, 58);
  const pressed  = f >= 68;
  const statusA  = easeOut(f, 72, 86);

  const BAR_LEFT  = 160;
  const BAR_WIDTH = 1200;
  const BAR_Y     = 320; // pushed up so lower half is free for card

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />
      <DrillBanner />

      {/* Route 310 label */}
      <div style={{
        position: 'absolute', top: 190, left: BAR_LEFT,
        fontFamily: 'Overpass', fontWeight: 600, fontSize: 52, color: C.g4,
        opacity: barAlpha, whiteSpace: 'nowrap',
      }}>Route 310</div>

      {/* Bus bar */}
      <div style={{
        position: 'absolute', top: BAR_Y, left: BAR_LEFT, width: BAR_WIDTH,
        opacity: barAlpha,
      }}>
        <div style={{ position: 'relative', width: '100%', height: 20, background: C.g2, borderRadius: 3 }}>

          {/* FIX 3: BUS label sits 42px ABOVE the dot — clear space */}
          <div style={{
            position: 'absolute',
            left: `${busPos * 100}%`, top: -44,
            transform: 'translateX(-50%)',
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 38, color: C.spare,
            whiteSpace: 'nowrap',
          }}>BUS</div>

          {/* Bus dot */}
          <div style={{
            position: 'absolute',
            left: `${busPos * 100}%`, top: -4,
            width: 28, height: 28, borderRadius: '50%',
            background: C.spare, transform: 'translateX(-50%)',
          }} />

          {/* Timetable marker */}
          <div style={{
            position: 'absolute',
            left: `${markerPos * 100}%`, top: -4,
            width: 4, height: 36,
            background: C.over, transform: 'translateX(-50%)',
            opacity: markerA,
          }} />
          <div style={{
            position: 'absolute',
            left: `${markerPos * 100}%`, top: 36,
            fontFamily: 'Plex', fontSize: 34, color: C.over,
            transform: 'translateX(-50%)',
            opacity: markerA, whiteSpace: 'nowrap',
          }}>Timetable</div>
        </div>
      </div>

      {/* Interface card — centred, 1.6× bigger */}
      <div style={{
        position: 'absolute', top: 480, left: 560, width: 800,
        opacity: cardA,
      }}>
        <div style={{
          border: `2px solid ${C.g2}`, borderRadius: 10,
          padding: '36px 56px', background: C.paper,
        }}>
          <div style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.g4,
            marginBottom: 24, whiteSpace: 'nowrap',
          }}>Insiyab · Drill mode</div>

          <div style={{
            fontFamily: 'Plex', fontSize: 54, color: pressed ? C.g3 : C.ink,
            border: `2px solid ${pressed ? C.g3 : C.ink}`,
            borderRadius: 8, padding: '14px 32px',
            textAlign: 'center',
            background: pressed ? C.g1 : C.paper,
            whiteSpace: 'nowrap',
          }}>Simulate a delay</div>

          {statusA > 0 && (
            <div style={{
              marginTop: 22,
              fontFamily: 'Plex', fontSize: 48, color: C.sim,
              opacity: statusA, whiteSpace: 'nowrap',
            }}>Example incident · Route 310</div>
          )}
        </div>
      </div>

      <Caption text="Illustrated demonstration. Route 310." />
    </AbsoluteFill>
  );
}

// ---- SCENE B: 90–240f (3–8 s) = 150 frames ----
// 4 role cards 1.3× with SVG phone shapes.
const ROLES_DATA = [
  { key: 'driver',   label: 'Driver',   msg: 'Bus can continue. Return delayed.',   col: 0, row: 0, arriveAt: 8  },
  { key: 'depot',    label: 'Depot',    msg: 'Standby bus and driver confirmed.',    col: 1, row: 0, arriveAt: 38 },
  { key: 'station',  label: 'Station',  msg: 'Departure board needs updating.',      col: 0, row: 1, arriveAt: 68 },
  { key: 'planning', label: 'Planning', msg: "Review this route's timetable.",       col: 1, row: 1, arriveAt: 98 },
];

// 1.3× card geometry
const CARD_W   = 832;
const CARD_H   = 290;
const CARD_GAP = 56;
const CARD_LEFT = Math.round((W - 2 * CARD_W - CARD_GAP) / 2); // 100
const ROW_TOP_Y = 170;
const ROW_BOT_Y = 620;

function rolePos(col, row) {
  return {
    x: CARD_LEFT + col * (CARD_W + CARD_GAP),
    y: row === 0 ? ROW_TOP_Y : ROW_BOT_Y,
  };
}

function SceneB() {
  const f = useCurrentFrame();
  const incAlpha = easeOut(f, 0, 15);
  const showCaption = f <= 112;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />
      <DrillBanner />

      {/* Incident label */}
      <div style={{
        position: 'absolute', top: 68, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: incAlpha,
      }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 50, color: C.over,
          letterSpacing: 0.5, whiteSpace: 'nowrap',
        }}>
          EXAMPLE INCIDENT · Route 310 · Simulated
        </div>
      </div>

      {/* Role cards */}
      {ROLES_DATA.map(role => {
        const { x, y } = rolePos(role.col, role.row);
        const alpha = easeOut(f, role.arriveAt, role.arriveAt + 14);
        return (
          <div key={role.key} style={{
            position: 'absolute', left: x, top: y,
            width: CARD_W, height: CARD_H, opacity: alpha,
          }}>
            <div style={{
              border: `2px solid ${C.g2}`, borderRadius: 10,
              padding: '26px 38px', background: C.paper,
              height: '100%', boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <PhoneShape color={C.flow} size={56} />
                <div style={{
                  fontFamily: 'Overpass', fontWeight: 600, fontSize: 54, color: C.flow,
                  whiteSpace: 'nowrap',
                }}>{role.label}</div>
              </div>
              <div style={{
                fontFamily: 'Plex', fontSize: 42, color: C.ink, lineHeight: 1.4,
                marginBottom: 14,
              }}>{role.msg}</div>
              <div style={{
                fontFamily: 'Plex', fontSize: 36, color: C.sim, whiteSpace: 'nowrap',
              }}>Simulated</div>
            </div>
          </div>
        );
      })}

      <Caption
        text="When a delay is reported, Insiyab checks with the team."
        visible={showCaption}
      />
    </AbsoluteFill>
  );
}

// ---- SCENE C: 240–390f (8–13 s) = 150 frames ----
// 1.3× briefing card + 1.3× options.
const OPTIONS = [
  'Send the standby bus',
  'Hold the next departure',
  'Monitor and request an update',
];

const OPTS_LEFT = 120;
const OPTS_Y    = 630;
const OPTS_GAP  = 56;

function SceneC() {
  const f = useCurrentFrame();
  const rolesFade = lerp(f, 0, 22, 1, 0);
  const cardAlpha = easeOut(f, 18, 46);
  const optAlpha  = easeOut(f, 46, 76);
  const showCaption = f >= 9 && f <= 108;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />
      <DrillBanner />

      {/* Fading role outlines */}
      {ROLES_DATA.map(role => {
        const { x, y } = rolePos(role.col, role.row);
        return (
          <div key={role.key} style={{
            position: 'absolute', left: x, top: y,
            width: CARD_W, height: CARD_H, opacity: rolesFade,
          }}>
            <div style={{
              border: `2px solid ${C.g2}`, borderRadius: 10,
              padding: '26px 38px', background: C.paper,
              height: '100%', boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <PhoneShape color={C.g3} size={56} />
                <div style={{
                  fontFamily: 'Overpass', fontWeight: 600, fontSize: 54, color: C.g3,
                  whiteSpace: 'nowrap',
                }}>{role.label}</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Controller briefing card — 1.3× */}
      <div style={{
        position: 'absolute', top: 140, left: 160, width: 1600,
        opacity: cardAlpha,
      }}>
        <div style={{
          border: `3px solid ${C.ink}`, borderRadius: 12,
          padding: '40px 64px', background: C.paper,
        }}>
          <div style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 42, color: C.g4,
            marginBottom: 22, whiteSpace: 'nowrap',
          }}>CONTROLLER BRIEFING</div>
          <div style={{
            fontFamily: 'Plex', fontSize: 56, color: C.ink, lineHeight: 1.5,
          }}>
            Late return reported.<br />
            A standby bus and driver are confirmed.
          </div>
        </div>
      </div>

      {/* Three equal options — 1.3× */}
      <div style={{
        position: 'absolute', top: OPTS_Y,
        left: OPTS_LEFT, right: OPTS_LEFT,
        display: 'flex', gap: OPTS_GAP,
        opacity: optAlpha,
      }}>
        {OPTIONS.map(opt => (
          <div key={opt} style={{
            flex: 1,
            border: `2px solid ${C.ink}`, borderRadius: 10,
            padding: '28px 36px',
            fontFamily: 'Plex', fontSize: 44, color: C.ink,
            textAlign: 'center', lineHeight: 1.45,
            background: C.paper, minHeight: 190,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{opt}</div>
        ))}
      </div>

      <Caption
        text="The controller gets a short briefing and three options."
        visible={showCaption}
      />
    </AbsoluteFill>
  );
}

// ---- SCENE D: 390–480f (13–16 s) = 90 frames ----
// FIX 2: Arrow cursor, travels to LEFT EDGE of first option — text stays readable.
function SceneD() {
  const f = useCurrentFrame();

  // First option left edge ≈ x=OPTS_LEFT+8=128, mid-height of option ≈ OPTS_Y+95=725
  // Cursor tip starts bottom-left off-screen, ends just left of first option
  const TIP_END_X = 148;  // just inside left edge of first option
  const TIP_END_Y = 725;  // mid-height of option box

  const cursorX  = lerp(f, 0, 28, 60,       TIP_END_X);
  const cursorY  = lerp(f, 0, 28, 920,      TIP_END_Y);
  const cursorA  = easeOut(f, 0, 10);

  const selAlpha = easeOut(f, 30, 44);
  const labelA   = easeOut(f, 42, 56);
  const showCaption = f >= 18 && f <= 74;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />
      <DrillBanner />

      {/* Briefing card — static */}
      <div style={{
        position: 'absolute', top: 140, left: 160, width: 1600,
      }}>
        <div style={{
          border: `3px solid ${C.ink}`, borderRadius: 12,
          padding: '40px 64px', background: C.paper,
        }}>
          <div style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 42, color: C.g4,
            marginBottom: 22, whiteSpace: 'nowrap',
          }}>CONTROLLER BRIEFING</div>
          <div style={{
            fontFamily: 'Plex', fontSize: 56, color: C.ink, lineHeight: 1.5,
          }}>
            Late return reported.<br />
            A standby bus and driver are confirmed.
          </div>
        </div>
      </div>

      {/* Options */}
      <div style={{
        position: 'absolute', top: OPTS_Y,
        left: OPTS_LEFT, right: OPTS_LEFT,
        display: 'flex', gap: OPTS_GAP,
      }}>
        {OPTIONS.map((opt, i) => {
          const isSelected = i === 0 && f >= 30;
          return (
            <div key={opt} style={{
              flex: 1,
              border: `2px solid ${isSelected ? C.flow : C.ink}`,
              borderRadius: 10,
              padding: '28px 36px',
              fontFamily: 'Plex', fontSize: 44,
              color: isSelected ? C.flow : C.ink,
              textAlign: 'center', lineHeight: 1.45,
              background: isSelected ? C.flowLight : C.paper,
              minHeight: 190,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isSelected ? 1 : (f >= 30 ? 0.5 : 1),
            }}>{opt}</div>
          );
        })}
      </div>

      {/* FIX 2: Arrow pointer cursor — tip lands left of option, NOT on text */}
      <div style={{
        position: 'absolute',
        left: cursorX,
        top: cursorY,
        opacity: cursorA,
      }}>
        <CursorArrow color={C.ink} />
      </div>

      {/* Controller's decision label */}
      <div style={{
        position: 'absolute', top: 870, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: labelA,
      }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 46, color: C.flow,
          whiteSpace: 'nowrap', letterSpacing: 0.5,
        }}>Controller's decision</div>
      </div>

      <Caption text="The controller decides." visible={showCaption} />
    </AbsoluteFill>
  );
}

// ---- SCENE E: 480–600f (16–20 s) = 120 frames ----
// Decision travels back; 4 ack cards 1.3×.
function SceneE() {
  const f = useCurrentFrame();

  const bannerA = easeOut(f, 0, 15);
  const fadeOut = lerp(f, 105, 120, 1, 0);
  const ackTimes = [15, 35, 55, 75];
  const showCaption = f >= 6 && f <= 108;

  return (
    <AbsoluteFill style={{ background: C.paper, opacity: fadeOut }}>
      <Fonts />
      <DrillBanner />

      {/* Decision banner */}
      <div style={{
        position: 'absolute', top: 68, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: bannerA,
      }}>
        <div style={{
          border: `3px solid ${C.flow}`, borderRadius: 10,
          padding: '14px 56px',
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 46, color: C.flow,
          whiteSpace: 'nowrap',
        }}>Decision: Send the standby bus</div>
      </div>

      {/* Role ack cards 1.3× */}
      {ROLES_DATA.map((role, idx) => {
        const { x, y } = rolePos(role.col, role.row);
        const ackAt = ackTimes[idx];
        const cardA = easeOut(f, ackAt, ackAt + 14);
        const msgA  = easeOut(f, ackAt + 8, ackAt + 20);
        return (
          <div key={role.key} style={{
            position: 'absolute', left: x, top: y,
            width: CARD_W, height: 250, opacity: cardA,
          }}>
            <div style={{
              border: `2px solid ${C.flow}`, borderRadius: 10,
              padding: '24px 38px', background: C.paper,
              height: '100%', boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <PhoneShape color={C.flow} size={56} />
                <div style={{
                  fontFamily: 'Overpass', fontWeight: 600, fontSize: 54, color: C.flow,
                  whiteSpace: 'nowrap',
                }}>{role.label}</div>
              </div>
              <div style={{
                fontFamily: 'Plex', fontSize: 42, color: C.flow,
                opacity: msgA, whiteSpace: 'nowrap',
              }}>Message received</div>
            </div>
          </div>
        );
      })}

      <Caption
        text="Insiyab relays that choice and records who received it."
        visible={showCaption}
      />
    </AbsoluteFill>
  );
}

// ---- root ----
function InsertFilm() {
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence from={0}   durationInFrames={90}><SceneA /></Sequence>
      <Sequence from={90}  durationInFrames={150}><SceneB /></Sequence>
      <Sequence from={240} durationInFrames={150}><SceneC /></Sequence>
      <Sequence from={390} durationInFrames={90}><SceneD /></Sequence>
      <Sequence from={480} durationInFrames={120}><SceneE /></Sequence>
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <Composition
    id="InsiyabInsert"
    component={InsertFilm}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
  />
));
