import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence,
  useCurrentFrame, interpolate, staticFile,
} from 'remotion';

// ---- palette (matches story.jsx) ----
const C = {
  paper:  '#F6F5F1',
  ink:    '#12263A',
  flow:   '#0E5A5A',
  over:   '#B23A2E',
  spare:  '#2F6690',
  sim:    '#8A5A00',
  g1:     '#E6E8EA',
  g2:     '#C3C9CF',
  g3:     '#8C96A0',
  g4:     '#5A6672',
  g5:     '#33404D',
};

const FPS   = 30;
const W     = 1920;
const H     = 1080;
// Timeline from real voice durations (gen_voice.py + gen_audio_mix.py):
// l1 starts=1.00s dur=5.20s  l2 starts=6.60s dur=5.02s
// l3 starts=12.02s dur=4.62s l4 starts=17.04s dur=1.38s
// l5 starts=18.82s dur=4.31s l6 starts=23.53s dur=3.24s
// total_dur=28.27s  total_frames=849
const TOTAL = 849;

const T = {
  l1s:  30,   // 1.00s
  l1e:  156,  // 6.20s
  l2s:  198,  // 6.60s
  l2e:  349,  // 11.62s
  l3s:  361,  // 12.02s
  l3e:  500,  // 16.64s
  l4s:  511,  // 17.04s
  l4e:  553,  // 18.42s: manager chose
  l5s:  565,  // 18.82s
  l5e:  694,  // 23.13s
  l6s:  706,  // 23.53s
  l6e:  803,  // 26.77s
};

// ---- animation helpers ----
function clamp(f, a, b, va, vb) {
  return interpolate(f, [a, b], [va, vb], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
}
function easeIn(f, a, b) {
  return interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: t => t * t,
  });
}
function easeOut(f, a, b) {
  return interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: t => 1 - (1 - t) * (1 - t),
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

// Fixed SIMULATED tag (bottom-right on every incident/calls/options frame)
function SimTag() {
  return (
    <div style={{
      position: 'absolute', right: 72, bottom: 68,
      fontFamily: 'PlexMono', fontSize: 28, color: C.sim,
      whiteSpace: 'nowrap', letterSpacing: '0.08em',
    }}>SIMULATED</div>
  );
}

// Thin horizontal rule at y, full width
function Rule({ y, color = C.g2 }) {
  return (
    <div style={{
      position: 'absolute', top: y, left: 96, right: 96,
      height: 1, background: color,
    }} />
  );
}

// ---- SCENE 1: Alert ----
// Frames 0 to T.l2s (0 to 6.6s)
// Displays: "Route 310 · 18:00 · 22 min late"  SIMULATED
// Plus measured context line fading in later
function SceneAlert() {
  const f = useCurrentFrame();

  const alpha = easeOut(f, 5, 25);
  const ruleW = clamp(f, 8, 30, 0, 1728); // 1920 - 2*96

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />
      {/* horizontal rule */}
      <div style={{
        position: 'absolute', top: H / 2 - 60, left: 96,
        width: ruleW, height: 2, background: C.ink,
      }} />

      {/* Alert headline */}
      <div style={{
        position: 'absolute', top: H / 2 - 30,
        left: 96, right: 96,
        opacity: alpha,
        display: 'flex', alignItems: 'baseline', gap: 32,
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          fontFamily: 'Overpass', fontWeight: 600,
          fontSize: 80, color: C.ink, whiteSpace: 'nowrap',
        }}>Route 310</span>
        <span style={{
          fontFamily: 'Plex', fontSize: 56, color: C.g4,
          whiteSpace: 'nowrap',
        }}>18:00</span>
        <span style={{
          fontFamily: 'Overpass', fontWeight: 600,
          fontSize: 64, color: C.over, whiteSpace: 'nowrap',
        }}>22 min late</span>
      </div>

      {/* Sub-caption: simulated drill context */}
      <div style={{
        position: 'absolute', top: H / 2 + 80,
        left: 96, right: 400,
        opacity: clamp(f, 20, 40, 0, 1),
        fontFamily: 'Plex', fontSize: 36, color: C.g4,
        whiteSpace: 'nowrap',
      }}>
        Drill incident, 213 passengers affected this hour
      </div>

      <SimTag />
    </AbsoluteFill>
  );
}

// ---- SCENE 2: Calls ----
// Frames T.l2s to T.l3s (6.6s to 12.02s)
// Three staff rows, each showing "Calling…" then a one-line report
function SceneCalls() {
  const f = useCurrentFrame(); // 0 at scene start (T.l2s)
  // local frame zero = when this scene starts

  const ROWS = [
    { role: 'Driver', report: 'Waiting at the stop, running 22 minutes late.' },
    { role: 'Depot controller', report: 'Standby bus and driver confirmed.' },
    { role: 'Station supervisor', report: 'Platform clear, ready for arrival.' },
  ];

  const ROW_H = 160;
  const TOP = H / 2 - ROW_H * 1.5;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      {/* Section label */}
      <div style={{
        position: 'absolute', top: 80, left: 96,
        fontFamily: 'Plex', fontSize: 32, color: C.g3,
        letterSpacing: '0.12em',
        opacity: easeOut(f, 0, 15),
        whiteSpace: 'nowrap',
      }}>CALLS</div>

      {ROWS.map((row, i) => {
        const rowStart = i * 25;      // stagger 25f each
        const callingAlpha = easeOut(f, rowStart, rowStart + 15);
        const reportAlpha  = easeOut(f, rowStart + 30, rowStart + 50);
        const y = TOP + i * ROW_H;

        return (
          <div key={row.role} style={{
            position: 'absolute', top: y, left: 96, right: 96,
            height: ROW_H,
          }}>
            {/* Role label */}
            <div style={{
              position: 'absolute', top: 20,
              fontFamily: 'Overpass', fontWeight: 600, fontSize: 42,
              color: C.ink, whiteSpace: 'nowrap',
              opacity: callingAlpha,
            }}>{row.role}</div>

            {/* Calling indicator */}
            <div style={{
              position: 'absolute', top: 68,
              fontFamily: 'PlexMono', fontSize: 32, color: C.flow,
              whiteSpace: 'nowrap',
              opacity: callingAlpha * (1 - easeIn(f, rowStart + 28, rowStart + 32)),
            }}>calling…</div>

            {/* Report */}
            <div style={{
              position: 'absolute', top: 68,
              fontFamily: 'Plex', fontSize: 34, color: C.g5,
              opacity: reportAlpha,
            }}>{row.report}</div>

            {/* Thin rule below */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 1, background: C.g1,
            }} />
          </div>
        );
      })}

      <SimTag />
    </AbsoluteFill>
  );
}

// ---- SCENE 3: Decision ----
// Frames T.l3s to T.l5s (12.02s to 18.82s)
// Decision panel with three option rows; Option A highlighted at T.l4e
function SceneDecision() {
  const gf = useCurrentFrame() + T.l3s; // global frame
  const f   = useCurrentFrame();

  const chosen = gf >= T.l4e; // manager chose

  const OPTIONS = [
    {
      key: 'send_spare',
      label: 'Send standby bus',
      pct: -63.6,
      headline: '63.6% less waiting',
      barFrac: 0.364, // 1 - 0.636
      backOnTime: 'Back on time: 18:20',
      backNote: 'Standby 8 min away → 18:08; next departure unaffected. SIMULATED.',
      approver: 'Depot controller',
    },
    {
      key: 'hold',
      label: 'Hold next departure 2 min',
      pct: 9.1,
      headline: '9.1% more waiting',
      barFrac: 1.091,
      backOnTime: 'Not recovered this hour',
      backNote: '',
      approver: 'Station supervisor',
    },
    {
      key: 'none',
      label: 'No action',
      pct: 0,
      headline: 'Baseline · 4,686 passenger-minutes',
      barFrac: 1.0,
      backOnTime: 'Not recovered this hour',
      backNote: '',
      approver: 'Duty manager',
    },
  ];

  const panelAlpha = easeOut(f, 0, 15);
  const BAR_MAX = 600; // px for baseline (100%)

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      {/* Panel header */}
      <div style={{
        position: 'absolute', top: 60, left: 96,
        fontFamily: 'Plex', fontSize: 32, color: C.g3,
        letterSpacing: '0.12em', opacity: panelAlpha, whiteSpace: 'nowrap',
      }}>DECISION</div>
      <div style={{
        position: 'absolute', top: 110, left: 96,
        fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.ink,
        opacity: panelAlpha, whiteSpace: 'nowrap',
      }}>Duty manager, Bus Operations Control Centre</div>

      {OPTIONS.map((opt, i) => {
        const rowY = 220 + i * 240;
        const rowAlpha = easeOut(f, i * 10, i * 10 + 20);
        const isChosen = chosen && opt.key === 'send_spare';
        const bg = isChosen ? C.flow + '1a' : 'transparent';
        const accent = isChosen ? C.flow : C.g3;
        const barFill = easeOut(f, i * 8 + 15, i * 8 + 50);
        const barW = opt.barFrac * BAR_MAX * barFill;
        const barColor = opt.pct < 0 ? C.flow : opt.pct > 0 ? C.over : C.g3;

        return (
          <div key={opt.key} style={{
            position: 'absolute', top: rowY, left: 96, right: 96,
            height: 220,
            background: bg,
            borderLeft: isChosen ? `4px solid ${C.flow}` : '4px solid transparent',
            paddingLeft: 20,
            opacity: rowAlpha,
          }}>
            {/* Option label */}
            <div style={{
              position: 'absolute', top: 10,
              fontFamily: 'Overpass', fontWeight: 600,
              fontSize: 44, color: isChosen ? C.flow : C.ink,
              whiteSpace: 'nowrap',
            }}>{opt.label}</div>

            {/* Bar: passenger waiting vs baseline */}
            <div style={{
              position: 'absolute', top: 70, left: 0,
              height: 20, width: Math.min(barW, 1600), background: barColor,
              borderRadius: 2,
            }} />
            {/* Baseline ghost bar */}
            <div style={{
              position: 'absolute', top: 70, left: 0,
              height: 20, width: BAR_MAX, background: C.g1,
              zIndex: -1, borderRadius: 2,
            }} />

            {/* Change headline */}
            <div style={{
              position: 'absolute', top: 100,
              fontFamily: 'Plex', fontSize: 36, color: barColor,
              whiteSpace: 'nowrap',
            }}>{opt.headline}</div>

            {/* Back on time + approver */}
            <div style={{
              position: 'absolute', top: 148,
              left: 0, right: 0,
              display: 'flex', gap: 48,
            }}>
              <span style={{
                fontFamily: 'PlexMono', fontSize: 28, color: C.g4,
                whiteSpace: 'nowrap',
              }}>{opt.backOnTime}</span>
              <span style={{
                fontFamily: 'Plex', fontSize: 28, color: accent,
                whiteSpace: 'nowrap',
              }}>approves: {opt.approver}</span>
            </div>

            {/* Back note (arithmetic source, only for send_spare) */}
            {opt.backNote && (
              <div style={{
                position: 'absolute', top: 185,
                fontFamily: 'PlexMono', fontSize: 22, color: C.sim,
                whiteSpace: 'nowrap',
              }}>{opt.backNote}</div>
            )}

            {/* Row separator */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 1, background: C.g1,
            }} />
          </div>
        );
      })}

      <SimTag />
    </AbsoluteFill>
  );
}

// ---- SCENE 4: Relay ----
// Frames T.l5s to T.l6s (18.82s to 23.53s)
function SceneRelay() {
  const f = useCurrentFrame();

  const CONTACTS = [
    { role: 'Depot controller', status: 'asked to confirm', confirmed: true,  confirmF: 40 },
    { role: 'Station supervisor', status: 'informed',       confirmed: false, confirmF: 0  },
    { role: 'Driver',            status: 'informed',       confirmed: false, confirmF: 0  },
  ];

  const ROW_H = 160;
  const TOP   = H / 2 - ROW_H * 1.5;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      {/* Section label */}
      <div style={{
        position: 'absolute', top: 80, left: 96,
        fontFamily: 'Plex', fontSize: 32, color: C.g3,
        letterSpacing: '0.12em',
        opacity: easeOut(f, 0, 15),
        whiteSpace: 'nowrap',
      }}>RELAY</div>

      {CONTACTS.map((c, i) => {
        const rowStart = i * 20;
        const rowAlpha = easeOut(f, rowStart, rowStart + 15);
        const y = TOP + i * ROW_H;
        const statusAlpha  = easeOut(f, rowStart + 15, rowStart + 30);
        const confirmAlpha = c.confirmed ? easeOut(f, c.confirmF, c.confirmF + 15) : 0;
        const statusFade   = c.confirmed ? 1 - easeIn(f, c.confirmF - 5, c.confirmF + 5) : 1;

        return (
          <div key={c.role} style={{
            position: 'absolute', top: y, left: 96, right: 96,
            height: ROW_H, opacity: rowAlpha,
          }}>
            <div style={{
              position: 'absolute', top: 20,
              fontFamily: 'Overpass', fontWeight: 600, fontSize: 42,
              color: C.ink, whiteSpace: 'nowrap',
            }}>{c.role}</div>

            {/* Status label */}
            <div style={{
              position: 'absolute', top: 70,
              fontFamily: 'PlexMono', fontSize: 32, color: C.g4,
              whiteSpace: 'nowrap', opacity: statusAlpha * statusFade,
            }}>{c.status}</div>

            {/* Confirmed overlay */}
            {c.confirmed && (
              <div style={{
                position: 'absolute', top: 70,
                fontFamily: 'PlexMono', fontSize: 32, color: C.flow,
                whiteSpace: 'nowrap', opacity: confirmAlpha,
              }}>confirmed</div>
            )}

            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 1, background: C.g1,
            }} />
          </div>
        );
      })}

      <SimTag />
    </AbsoluteFill>
  );
}

// ---- SCENE 5: End ----
// Frames T.l6s to TOTAL (23.53s to 28.27s)
function SceneEnd() {
  const f = useCurrentFrame();

  const alpha = easeOut(f, 0, 20);
  const nameAlpha = easeOut(f, 30, 55);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      {/* Main line */}
      <div style={{
        position: 'absolute',
        top: H / 2 - 80, left: 96, right: 96,
        fontFamily: 'Plex', fontSize: 56, color: C.ink,
        lineHeight: 1.4, opacity: alpha,
      }}>
        A person decides.
      </div>
      <div style={{
        position: 'absolute',
        top: H / 2 - 80 + 80, left: 96, right: 96,
        fontFamily: 'Plex', fontSize: 56, color: C.g4,
        lineHeight: 1.4, opacity: alpha,
      }}>
        Insiyab does the calling.
      </div>

      {/* Brand name */}
      <div style={{
        position: 'absolute',
        bottom: 120, left: 96,
        fontFamily: 'Overpass', fontWeight: 600,
        fontSize: 72, color: C.ink, letterSpacing: '0.04em',
        opacity: nameAlpha, whiteSpace: 'nowrap',
      }}>Insiyab</div>

      {/* Measured note (separate from SIMULATED content) */}
      <div style={{
        position: 'absolute',
        bottom: 68, left: 96, right: 96,
        fontFamily: 'PlexMono', fontSize: 26, color: C.g3,
      }}>
        696 linked departures, one day. Measured. 15 Dec 2025
      </div>
    </AbsoluteFill>
  );
}

// ---- ROOT COMPOSITION ----
function InsiyabOncall() {
  const f = useCurrentFrame();

  // Scene select: show the right scene based on global frame
  const inAlert    = f < T.l2s;
  const inCalls    = f >= T.l2s && f < T.l3s;
  const inDecision = f >= T.l3s && f < T.l5s;
  const inRelay    = f >= T.l5s && f < T.l6s;
  const inEnd      = f >= T.l6s;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {inAlert    && <SceneAlert    />}
      {inCalls    && (
        <Sequence from={T.l2s} durationInFrames={T.l3s - T.l2s}>
          <SceneCalls />
        </Sequence>
      )}
      {inDecision && (
        <Sequence from={T.l3s} durationInFrames={T.l5s - T.l3s}>
          <SceneDecision />
        </Sequence>
      )}
      {inRelay    && (
        <Sequence from={T.l5s} durationInFrames={T.l6s - T.l5s}>
          <SceneRelay />
        </Sequence>
      )}
      {inEnd      && (
        <Sequence from={T.l6s} durationInFrames={TOTAL - T.l6s}>
          <SceneEnd />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}

// registerRoot for standalone render
export const RemotionRoot = () => (
  <>
    <Composition
      id="InsiyabOncall"
      component={InsiyabOncall}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);

registerRoot(RemotionRoot);
