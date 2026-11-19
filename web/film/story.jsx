import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence,
  useCurrentFrame, interpolate, Img, staticFile
} from 'remotion';

// ---- palette tokens (docs/RULES.md sections 5 and 10) ----
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
};

const FPS = 30;
const W   = 1920;
const H   = 1080;
const TOTAL = 1800; // 60 s

// ---- easing helpers ----
function easeIn(f, a, b, outVal = 1) {
  return interpolate(f, [a, b], [0, outVal], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: t => t * t,
  });
}
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

// ---- verified numbers (from story/film-facts.json) ----
const F = {
  dep1923: '19:23',
  dep1936: '19:36',
  gap13: 13,
  tm67: 67,
  actual96: 96,
  break16: 16,
  board0800: '48,724',
  board1800: '49,707',
  late0800: 19,
  late1800: 45,
  maeTm: 8.25,
  maeMod: 6.97,
  gainPct: 15,
  gainLo: 12,
  gainHi: 19,
  holdoutTrips: '2,043',
  busHoursEve: 244,
};

// ---- source lines ----
const SRC = {
  s1: 'Route 310, typical evening trip. Illustration.',
  s2: 'Route 310, 18:00, 15 Dec 2025. Measured.',
  s3: 'Planned break about 16 min at every hour. Measured.',
  s5: 'Boardings and late departures by hour, 15 Dec 2025. Late = 5 min or more. RTA data, worked out in Dataiku.',
  s7: 'Forecast made 30 minutes before departure.',
  s8: "Planner's worklist, 15 Dec 2025. Measured, not predicted.",
  s9: 'Evening peak 16:00 to 19:00. 2,043 trips the model never saw. One day.',
};

// ---- shared components ----

function SourceLine({ text }) {
  return (
    <div style={{
      position: 'absolute', bottom: 68, left: 96, right: 96,
      fontSize: 32, color: C.g4, fontFamily: 'Plex',
      lineHeight: 1.3,
    }}>{text}</div>
  );
}

function Caption({ text, visible = true }) {
  if (!text || !visible) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 110, left: 96, right: 96,
      background: C.paper + 'e8',
      padding: '10px 20px', borderRadius: 4,
      fontSize: 44, color: C.ink, fontFamily: 'Plex',
      lineHeight: 1.3, textAlign: 'center',
    }}>{text}</div>
  );
}

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
      @font-face { font-family: Arabic; font-weight: 400;
        src: url('${staticFile('fonts/noto-kufi-arabic-400.woff2')}') format('woff2'); }
    `}</style>
  );
}

// ----- SCENE 0: 0-30f (0.0 to 1.0 s) — paper, thin rule -----
function Scene0() {
  const f = useCurrentFrame();
  const ruleW = lerp(f, 5, 25, 0, 1200);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{
        position: 'absolute', top: H / 2, left: 96,
        width: ruleW, height: 2, background: C.ink,
      }} />
    </AbsoluteFill>
  );
}

// ----- SCENE 1: 30-180f (1.0 to 6.0 s) -----
// Board: 310  19:23 | clock 19:23→19:36 | red bar grows | 13 MIN | ILLUSTRATION
function Scene1() {
  const f = useCurrentFrame(); // 0 at scene start
  const caption = 'The timetable said seven twenty-three, and the bus left at seven thirty-six.';

  // Board fade-in
  const boardAlpha = easeOut(f, 0, 15);

  // Clock: seconds that elapsed (we show 0 to 13 min = 780 s real)
  // Animate over frames 20-130 (1.3s scene-relative = about 1.3 actual = too fast)
  // We use a stylised clock. The minute hand goes from 23 to 36.
  const minProg = lerp(f, 15, 140, 0, 1); // 0 = 19:23, 1 = 19:36

  // Red bar: appears at f=20, grows to full width by f=130
  const redBarW = lerp(f, 20, 130, 0, 340);
  const redBarAlpha = easeOut(f, 20, 35);

  // 13 MIN label: static, shown only after bar animation finishes

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      {/* Departure board */}
      <div style={{
        position: 'absolute', top: 180, left: 96,
        opacity: boardAlpha,
      }}>
        <div style={{ fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.g4, letterSpacing: 2 }}>
          DEPARTURE BOARD
        </div>
        <div style={{
          marginTop: 24, padding: '28px 48px',
          border: `3px solid ${C.ink}`,
          display: 'flex', alignItems: 'center', gap: 80,
          background: C.paper,
        }}>
          <div style={{ fontFamily: 'PlexMono', fontSize: 72, color: C.ink, letterSpacing: 4 }}>310</div>
          <div style={{ fontFamily: 'PlexMono', fontSize: 72, color: C.ink, letterSpacing: 4 }}>
            {F.dep1923}
          </div>
          <div style={{ fontFamily: 'Plex', fontSize: 40, color: C.g4 }}>Scheduled</div>
        </div>
      </div>

      {/* Time axis — lowered to clear the board */}
      <div style={{ position: 'absolute', top: 560, left: 96, width: 1200, opacity: boardAlpha }}>
        {/* Base axis line */}
        <div style={{ width: '100%', height: 3, background: C.ink, position: 'relative' }}>
          {/* 19:23 marker */}
          <div style={{ position: 'absolute', left: 0, top: -60, fontFamily: 'PlexMono', fontSize: 40, color: C.ink }}>19:23</div>
          {/* 19:36 marker */}
          <div style={{ position: 'absolute', left: 340, top: -60, fontFamily: 'PlexMono', fontSize: 40, color: C.over }}>19:36</div>
        </div>

        {/* Red delay bar */}
        <div style={{
          position: 'absolute', top: 10, left: 0,
          width: redBarW, height: 48,
          background: C.over, opacity: redBarAlpha,
        }} />

        {/* Counter */}
        {f >= 130 && (
          <div style={{
            position: 'absolute', top: 10, left: 420,
            fontFamily: 'PlexMono', fontSize: 56, color: C.over,
            fontWeight: 400,
          }}>
            13 MIN LATE
          </div>
        )}
      </div>

      <Caption text={caption} />
      <SourceLine text={SRC.s1} />
    </AbsoluteFill>
  );
}

// ----- SCENE 2: 180-450f (6.0 to 15.0 s) -----
// Trip bar: grey outlined bar 67 min, then solid ink bar extending in red to 96
function Scene2() {
  const f = useCurrentFrame(); // 0 at scene start
  const caption1 = 'Every trip is given the same time all day, but at six in the evening';
  const caption2 = 'route three-ten needs ninety-six minutes, not sixty-seven.';
  const capText = f < 90 ? caption1 : caption2;

  const totalDur = 270; // 9s scene
  const scale = 10; // px per minute

  // Grey timetable bar: grows 0-80f
  const greyW = lerp(f, 10, 80, 0, 67 * scale);
  const greyAlpha = easeOut(f, 5, 25);

  // Ink actual bar: appears at f=90, reaches 67*scale at f=130, then red extends
  const actualGrowTo67 = lerp(f, 90, 130, 0, 67 * scale);
  const actualAlpha = easeOut(f, 85, 100);

  // Red extension: grows from f=130 to f=200, from 0 to (96-67)*scale
  const redExtW = lerp(f, 130, 210, 0, (96 - 67) * scale);
  const redAlpha = easeOut(f, 125, 145);

  const topY = 320;
  const barH = 56;
  const gap = 32;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 120, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        Route 310, 18:00 trip
      </div>

      {/* Timetable bar (grey outlined) */}
      <div style={{ position: 'absolute', top: topY, left: 96, opacity: greyAlpha }}>
        <div style={{ fontFamily: 'Plex', fontSize: 40, color: C.g4, marginBottom: 10 }}>TIMETABLE ALLOWS</div>
        <div style={{ position: 'relative', height: barH }}>
          <div style={{
            width: greyW, height: barH,
            border: `3px solid ${C.g3}`, background: C.g1,
          }} />
          {f >= 80 && (
            <div style={{
              position: 'absolute', top: 8, left: 67 * scale + 24,
              fontFamily: 'PlexMono', fontSize: 48, color: C.g4, whiteSpace: 'nowrap',
            }}>
              67 min
            </div>
          )}
        </div>
      </div>

      {/* Actual bar (ink + red) */}
      <div style={{ position: 'absolute', top: topY + barH + gap + 40, left: 96, opacity: actualAlpha }}>
        <div style={{ fontFamily: 'Plex', fontSize: 40, color: C.ink, marginBottom: 10 }}>IT TOOK</div>
        <div style={{ position: 'relative', height: barH, display: 'flex' }}>
          {/* Ink portion up to 67 */}
          <div style={{ width: actualGrowTo67, height: barH, background: C.ink }} />
          {/* Red extension */}
          {f > 125 && (
            <div style={{
              width: redExtW, height: barH,
              background: C.over, opacity: redAlpha,
            }} />
          )}
        </div>

        {/* Labels under bars */}
        {f > 150 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ width: 67 * scale, textAlign: 'center', fontFamily: 'PlexMono', fontSize: 36, color: C.ink }}>
              67 min
            </div>
            <div style={{ width: redExtW, textAlign: 'left', fontFamily: 'PlexMono', fontSize: 36, color: C.over, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {f > 160 ? '+29 min' : ''}
            </div>
          </div>
        )}
      </div>

      {/* Total label */}
      {f > 200 && (
        <div style={{
          position: 'absolute', top: topY + 300, left: 96,
          fontFamily: 'PlexMono', fontSize: 72, color: C.over, fontWeight: 400,
        }}>
          96 MIN ACTUAL
        </div>
      )}

      <Caption text={capText} />
      <SourceLine text={SRC.s2} />
    </AbsoluteFill>
  );
}

// ----- SCENE 3: 450-630f (15.0 to 21.0 s) -----
// 16-min break block, red bar overruns it, next trip slides right
function Scene3() {
  const f = useCurrentFrame(); // 0-180
  const caption = 'The break before the next trip is only sixteen minutes, so the bus starts that trip late.';
  const scale = 10;

  // Initial state: trip bar 67+29 from scene 2
  const trip1W = (67 + 29) * scale; // 960px total
  const breakW = 16 * scale; // 160px
  const trip2W = 67 * scale; // planned next trip

  // Break block appears: f 10-30
  const breakAlpha = easeOut(f, 8, 25);
  // Next trip block appears: f 30-50
  const trip2Alpha = easeOut(f, 28, 45);
  // Red overrun highlight: f 50-80
  const overrunAlpha = easeOut(f, 48, 65);
  // Next trip slides right: f 70-130
  const trip2Shift = lerp(f, 70, 130, 0, 29 * scale);

  const topY = 300;
  const barH = 60;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 120, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        The break between trips
      </div>

      <div style={{ position: 'absolute', top: topY, left: 96 }}>
        {/* Trip 1: 67 ink + 29 red */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 8 }}>
          <div style={{ fontFamily: 'Plex', fontSize: 32, color: C.g4, width: 67 * scale, textAlign: 'center' }}>Trip 1</div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 67 * scale, height: barH, background: C.ink }} />
          <div style={{ width: 29 * scale, height: barH, background: C.over }} />
        </div>

        {/* Break block */}
        <div style={{ display: 'flex', marginTop: 8, opacity: breakAlpha }}>
          <div style={{ width: 67 * scale + 29 * scale, height: 0 }} /> {/* spacer */}
          <div style={{
            width: breakW, height: barH,
            border: `3px solid ${C.g3}`, background: C.g1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'PlexMono', fontSize: 32, color: C.g4 }}>16m</span>
          </div>
        </div>

        {/* Red overrun indicator */}
        {f > 48 && (
          <div style={{
            position: 'absolute', top: 0, left: (67 + 29) * scale,
            width: 29 * scale, height: barH,
            border: `3px dashed ${C.over}`,
            opacity: overrunAlpha,
          }} />
        )}

        {/* Trip 2 (next trip) — slides right */}
        <div style={{ display: 'flex', marginTop: 16, opacity: trip2Alpha }}>
          <div style={{ width: (67 + 29) * scale + breakW + trip2Shift, height: 0 }} />
          <div>
            <div style={{ fontFamily: 'Plex', fontSize: 32, color: C.g4, marginBottom: 4 }}>Trip 2</div>
            <div style={{ width: trip2W, height: barH, background: C.g3 }} />
          </div>
        </div>

        {/* Label: break label */}
        {f > 25 && (
          <div style={{
            position: 'absolute', top: barH + 100, left: (67 + 29) * scale,
            fontFamily: 'PlexMono', fontSize: 40, color: C.g4,
          }}>
            Break: 16 min
          </div>
        )}
      </div>

      {/* Explanation label */}
      {f > 100 && (
        <div style={{
          position: 'absolute', top: 540, left: 96,
          fontFamily: 'Plex', fontSize: 48, color: C.over,
        }}>
          The delay is handed on.
        </div>
      )}

      <Caption text={caption} />
      <SourceLine text={SRC.s3} />
    </AbsoluteFill>
  );
}

// ----- SCENE 4: 630-750f (21.0 to 25.0 s) -----
// Five trip blocks, each sliding right, red offset accumulating
function Scene4() {
  const f = useCurrentFrame(); // 0-120
  const caption = 'The delay is handed on, trip after trip.';
  const scale = 6;
  const tripW = 67 * scale; // planned trip width
  const extra = 29 * scale; // overrun width per trip
  const breakW = 16 * scale;
  const barH = 44;

  // Five trips. Each one slides right progressively.
  const trips = [0, 1, 2, 3, 4].map((i) => {
    const appear = easeOut(f, i * 18, i * 18 + 12);
    const offset = i * extra * lerp(f, i * 18 + 20, Math.min(i * 18 + 50, 115), 0, 1);
    return { appear, offset, i };
  });

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 120, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        Evening: five trips on one bus
      </div>

      {trips.map(({ appear, offset, i }) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: 260 + i * (barH + 20),
            left: 96 + (tripW + breakW) * i + offset,
            opacity: appear,
            display: 'flex',
          }}
        >
          <div style={{ width: tripW, height: barH, background: C.ink }} />
          <div style={{ width: extra, height: barH, background: C.over, opacity: i > 0 ? 1 : lerp(f, 60, 90, 0, 1) }} />
          <div style={{ width: breakW, height: barH, background: C.g1, border: `2px solid ${C.g3}` }} />
        </div>
      ))}

      {/* Accumulating red offset indicator */}
      {f > 60 && (
        <div style={{
          position: 'absolute', top: 560, left: 96,
          fontFamily: 'PlexMono', fontSize: 56, color: C.over,
        }}>
          +{Math.round(lerp(f, 60, 78, 0, 29 * 5))} min of delay across 5 trips
        </div>
      )}

      <Caption text={caption} />
    </AbsoluteFill>
  );
}

// ----- SCENE 5: 750-900f (25.0 to 30.0 s) -----
// Proof: two columns 08:00 and 18:00, boarding bars, late pct
function Scene5() {
  const f = useCurrentFrame(); // 0-150
  // No caption — voice rests

  const colW = 400;
  const maxH = 300;
  const boardMax = 49707;

  const bar0800H = lerp(f, 10, 60, 0, (48724 / boardMax) * maxH);
  const bar1800H = lerp(f, 20, 70, 0, (49707 / boardMax) * maxH);
  const redBar0800H = lerp(f, 70, 110, 0, (19 / 100) * (48724 / boardMax) * maxH);
  const redBar1800H = lerp(f, 80, 120, 0, (45 / 100) * (49707 / boardMax) * maxH);

  const col1X = 160;
  const col2X = 160 + colW + 200;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 80, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        Same crowd. More than twice as many late.
      </div>

      {/* 08:00 column */}
      <div style={{ position: 'absolute', bottom: 160, left: col1X }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Boarding bar */}
          <div style={{ position: 'relative', width: colW }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: bar0800H, background: C.ink }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: redBar0800H, background: C.over }} />
            <div style={{ height: maxH }} />
          </div>
          <div style={{ fontFamily: 'PlexMono', fontSize: 52, color: C.ink, marginTop: 12 }}>{F.board0800}</div>
          <div style={{ fontFamily: 'Plex', fontSize: 36, color: C.g4 }}>boardings</div>
          <div style={{ fontFamily: 'Overpass', fontWeight: 600, fontSize: 72, color: C.over, marginTop: 20 }}>
            {Math.round(lerp(f, 70, 88, 0, 19))}%
          </div>
          <div style={{ fontFamily: 'Plex', fontSize: 36, color: C.over }}>departures late</div>
          <div style={{ fontFamily: 'Overpass', fontWeight: 600, fontSize: 56, color: C.g4, marginTop: 16 }}>08:00</div>
        </div>
      </div>

      {/* 18:00 column */}
      <div style={{ position: 'absolute', bottom: 160, left: col2X }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: colW }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: bar1800H, background: C.ink }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: redBar1800H, background: C.over }} />
            <div style={{ height: maxH }} />
          </div>
          <div style={{ fontFamily: 'PlexMono', fontSize: 52, color: C.ink, marginTop: 12 }}>{F.board1800}</div>
          <div style={{ fontFamily: 'Plex', fontSize: 36, color: C.g4 }}>boardings</div>
          <div style={{ fontFamily: 'Overpass', fontWeight: 600, fontSize: 72, color: C.over, marginTop: 20 }}>
            {Math.round(lerp(f, 80, 98, 0, 45))}%
          </div>
          <div style={{ fontFamily: 'Plex', fontSize: 36, color: C.over }}>departures late</div>
          <div style={{ fontFamily: 'Overpass', fontWeight: 600, fontSize: 56, color: C.g4, marginTop: 16 }}>18:00</div>
        </div>
      </div>

      {/* Comparison arrow/label */}
      {f > 120 && (
        <div style={{
          position: 'absolute', top: 380, left: col1X + colW + 60,
          width: col2X - col1X - colW - 80, textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Plex', fontSize: 40, color: C.over, lineHeight: 1.4 }}>
            19% {'->'} 45%
          </div>
        </div>
      )}

      <SourceLine text={SRC.s5} />
    </AbsoluteFill>
  );
}

// ----- SCENE 6: 900-930f (30.0 to 31.0 s) -----
// Everything leaves, paper is empty. Wordmark appears.
function Scene6() {
  const f = useCurrentFrame(); // 0-30
  const alpha = lerp(f, 15, 28, 0, 1);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />
      <div style={{
        position: 'absolute', top: 80, left: 96,
        opacity: alpha,
        fontFamily: 'Overpass', fontWeight: 600, fontSize: 72, color: C.ink,
      }}>
        Insiyab&nbsp;&nbsp;
        <span style={{ fontFamily: 'Arabic', fontWeight: 400 }}>انسياب</span>
      </div>
    </AbsoluteFill>
  );
}

// ----- SCENE 7: 930-1110f (31.0 to 37.0 s) -----
// Now marker at 17:30, forecast bar for 18:00 trip
function Scene7() {
  const f = useCurrentFrame(); // 0-180
  const caption = 'Insiyab forecasts how long each trip will really take, thirty minutes before it leaves.';
  const scale = 8;

  // Axis: 17:00 to 19:00 = 120 min = 960px
  const axisW = 1200;
  const tToX = (t) => ((t - 17 * 60) / 120) * axisW; // t in minutes since midnight

  // Now marker at 17:30 appears: f 5-20
  const nowAlpha = easeOut(f, 4, 18);
  // Timetable ghost bar (67 min starting at 18:00): f 20-50
  const ghostW = lerp(f, 18, 50, 0, 67 * scale * 0.5); // at half scale to fit
  const ghostAlpha = easeOut(f, 15, 35);
  // Forecast bar (actual 96 min starting at 18:00): f 50-100
  // Show forecast as model's 6.97 min closer = ~90 min effective
  const forecastW = lerp(f, 48, 110, 0, 90 * scale * 0.5);
  const forecastAlpha = easeOut(f, 45, 65);

  const axisY = 400;
  const startX = 96;
  const x1800 = startX + tToX(18 * 60);
  const barH = 52;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 80, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        Forecast: 30 minutes ahead
      </div>

      {/* Wordmark stays */}
      <div style={{ position: 'absolute', top: 80, right: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.flow }}>
        Insiyab
      </div>

      {/* Time axis */}
      <div style={{ position: 'absolute', top: axisY, left: startX, width: axisW, height: 2, background: C.ink }} />

      {/* Hour markers */}
      {[17, 18, 19].map((h) => (
        <div key={h} style={{ position: 'absolute', top: axisY - 40, left: startX + tToX(h * 60) - 20 }}>
          <div style={{ fontFamily: 'PlexMono', fontSize: 36, color: C.g4 }}>{h}:00</div>
          <div style={{ position: 'absolute', top: 46, left: 20, width: 2, height: 20, background: C.g3 }} />
        </div>
      ))}

      {/* NOW marker at 17:30 */}
      <div style={{
        position: 'absolute', top: axisY - 100, left: startX + tToX(17 * 60 + 30) - 2,
        opacity: nowAlpha,
      }}>
        <div style={{ width: 2, height: 100, background: C.flow }} />
        <div style={{ fontFamily: 'Plex', fontSize: 36, color: C.flow, marginTop: 4 }}>NOW<br/>17:30</div>
      </div>

      {/* Timetable ghost bar */}
      <div style={{
        position: 'absolute', top: axisY + 10, left: x1800,
        width: ghostW, height: barH,
        border: `3px solid ${C.g3}`, background: 'transparent',
        opacity: ghostAlpha,
      }} />
      {ghostW > 60 && (
        <div style={{
          position: 'absolute', top: axisY + 72, left: x1800,
          fontFamily: 'PlexMono', fontSize: 32, color: C.g4, opacity: ghostAlpha,
        }}>
          Timetable: 67 min
        </div>
      )}

      {/* Forecast bar */}
      <div style={{
        position: 'absolute', top: axisY + barH + 30, left: x1800,
        width: forecastW, height: barH,
        background: C.flow,
        opacity: forecastAlpha,
      }} />
      {forecastW > 60 && (
        <div style={{
          position: 'absolute', top: axisY + 2 * barH + 32, left: x1800,
          fontFamily: 'PlexMono', fontSize: 32, color: C.flow, opacity: forecastAlpha,
        }}>
          Forecast: needed
        </div>
      )}

      {/* Label: 18:00 trip */}
      {f > 20 && (
        <div style={{
          position: 'absolute', top: axisY - 100, left: x1800 - 10,
          fontFamily: 'PlexMono', fontSize: 36, color: C.ink,
        }}>
          18:00 trip
        </div>
      )}

      <Caption text={caption} />
      <SourceLine text={SRC.s7} />
    </AbsoluteFill>
  );
}

// ----- SCENE 8: 1110-1290f (37.0 to 43.0 s) -----
// Planner's worklist
function Scene8() {
  const f = useCurrentFrame(); // 0-180
  const caption = "It turns that into a list for the timetable planner: each route, each hour, and the minutes to add.";

  const rows = [
    // The one real row, exactly as the Dataiku worklist shows it (needed = 85th percentile).
    { route: '310', hour: '18:00', planned: 67.3, needed: 104.4, add: '+37.2' },
  ];

  const headerAlpha = easeOut(f, 5, 20);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 80, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        Planner's worklist
      </div>
      <div style={{ position: 'absolute', top: 80, right: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.flow }}>
        Insiyab
      </div>

      {/* Table */}
      <div style={{ position: 'absolute', top: 190, left: 96, right: 96, opacity: headerAlpha }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '160px 160px 220px 220px 180px',
          gap: 0,
          borderBottom: `3px solid ${C.ink}`,
          paddingBottom: 12, marginBottom: 8,
        }}>
          {['Route', 'Hour', 'Planned (min)', 'Needed (min)', 'Add'].map((h) => (
            <div key={h} style={{ fontFamily: 'Plex', fontSize: 36, color: C.g4, textAlign: 'center' }}>{h}</div>
          ))}
        </div>

        {rows.map((row, i) => {
          const appear = easeOut(f, 20 + i * 20, 35 + i * 20);
          return (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '160px 160px 220px 220px 180px',
                gap: 0,
                borderBottom: `1px solid ${C.g2}`,
                padding: '16px 0',
                opacity: appear,
                background: i === 0 ? C.g1 : 'transparent',
              }}
            >
              <div style={{ fontFamily: 'PlexMono', fontSize: 44, color: C.ink, textAlign: 'center', fontWeight: 400 }}>{row.route}</div>
              <div style={{ fontFamily: 'PlexMono', fontSize: 44, color: C.ink, textAlign: 'center' }}>{row.hour}</div>
              <div style={{ fontFamily: 'PlexMono', fontSize: 44, color: C.g4, textAlign: 'center' }}>{row.planned}</div>
              <div style={{ fontFamily: 'PlexMono', fontSize: 44, color: C.ink, textAlign: 'center' }}>{row.needed}</div>
              <div style={{ fontFamily: 'PlexMono', fontSize: 44, color: C.flow, textAlign: 'center', fontWeight: 400 }}>{row.add}</div>
            </div>
          );
        })}
      </div>

      {/* Footer: 244 bus hours */}
      {f > 120 && (
        <div style={{
          position: 'absolute', top: 700, left: 96,
          fontFamily: 'PlexMono', fontSize: 56, color: C.over,
        }}>
          {F.busHoursEve} bus hours, 16:00 to 18:59
        </div>
      )}

      <Caption text={caption} />
      <SourceLine text={SRC.s8} />
    </AbsoluteFill>
  );
}

// ----- SCENE 9: 1290-1440f (43.0 to 48.0 s) -----
// Error bars: TIMETABLE 8.25 MIN vs INSIYAB 6.97 MIN
function Scene9() {
  const f = useCurrentFrame(); // 0-150
  const caption = 'In the evening rush it is fifteen per cent closer than the timetable, tested on trips it never saw.';

  const maxBarW = 700;
  const tmBarW = lerp(f, 15, 70, 0, (8.25 / 10) * maxBarW);
  const modBarW = lerp(f, 40, 100, 0, (6.97 / 10) * maxBarW);

  const tmAlpha = easeOut(f, 10, 28);
  const modAlpha = easeOut(f, 35, 55);
  const bracketAlpha = easeOut(f, 100, 120);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 80, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        How close is the forecast?
      </div>
      <div style={{ position: 'absolute', top: 80, right: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.flow }}>
        Insiyab
      </div>

      {/* Timetable bar */}
      <div style={{ position: 'absolute', top: 240, left: 96, opacity: tmAlpha }}>
        <div style={{ fontFamily: 'Plex', fontSize: 40, color: C.g4, marginBottom: 12 }}>TIMETABLE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: tmBarW, height: 56, background: C.g3 }} />
          <div style={{ fontFamily: 'PlexMono', fontSize: 56, color: C.g4 }}>
            {f >= 70 ? '8.25 min' : ''}
          </div>
        </div>
      </div>

      {/* Insiyab bar */}
      <div style={{ position: 'absolute', top: 380, left: 96, opacity: modAlpha }}>
        <div style={{ fontFamily: 'Plex', fontSize: 40, color: C.flow, marginBottom: 12 }}>INSIYAB</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: modBarW, height: 56, background: C.flow }} />
          <div style={{ fontFamily: 'PlexMono', fontSize: 56, color: C.flow }}>
            {f >= 100 ? '6.97 min' : ''}
          </div>
        </div>
      </div>

      {/* 15% closer bracket */}
      {f > 100 && (
        <div style={{ position: 'absolute', top: 540, left: 96, opacity: bracketAlpha }}>
          <div style={{
            fontFamily: 'Overpass', fontWeight: 600, fontSize: 96, color: C.flow,
          }}>
            15% CLOSER
          </div>
          <div style={{ fontFamily: 'PlexMono', fontSize: 44, color: C.g4, marginTop: 8 }}>
            Range: {F.gainLo}% to {F.gainHi}%
          </div>
        </div>
      )}

      <Caption text={caption} />
      <SourceLine text={SRC.s9} />
    </AbsoluteFill>
  );
}

// ----- SCENE 10: 1440-1590f (48.0 to 53.0 s) -----
// Accept control — planner decides
function Scene10() {
  const f = useCurrentFrame(); // 0-150
  const caption = 'The planner accepts a row, or sets it aside. Nothing changes by itself.';

  const rowAlpha = easeOut(f, 5, 20);
  const proposed = f < 70;
  const acceptAlpha = easeOut(f, 68, 85);
  const acceptedAlpha = easeOut(f, 85, 100);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 80, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        The planner decides
      </div>
      <div style={{ position: 'absolute', top: 80, right: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.flow }}>
        Insiyab
      </div>

      {/* Row */}
      <div style={{ position: 'absolute', top: 240, left: 96, opacity: rowAlpha }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '160px 160px 220px 220px 180px 240px',
          borderTop: `3px solid ${C.ink}`,
          borderBottom: `3px solid ${C.ink}`,
          padding: '20px 0',
          background: C.g1,
        }}>
          {[{ v: '310', c: C.ink }, { v: '18:00', c: C.ink }, { v: '67', c: C.g4 }, { v: '96', c: C.ink }, { v: '+29', c: C.flow }].map((cell, i) => (
            <div key={i} style={{ fontFamily: 'PlexMono', fontSize: 44, color: cell.c, textAlign: 'center' }}>
              {cell.v}
            </div>
          ))}
          {/* Status cell */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {proposed && (
              <div style={{
                fontFamily: 'Plex', fontSize: 36, color: C.g4,
                border: `2px solid ${C.g3}`, padding: '6px 20px', borderRadius: 4,
              }}>
                Proposed
              </div>
            )}
            {!proposed && (
              <div style={{
                fontFamily: 'Plex', fontSize: 36, color: C.flow,
                border: `2px solid ${C.flow}`, padding: '6px 20px', borderRadius: 4,
                opacity: acceptedAlpha,
              }}>
                Accepted
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nothing changes by itself */}
      {f > 100 && (
        <div style={{
          position: 'absolute', top: 440, left: 96,
          fontFamily: 'Plex', fontSize: 48, color: C.g4,
          letterSpacing: 2,
        }}>
          NOTHING CHANGES BY ITSELF
        </div>
      )}

      <Caption text={caption} />
    </AbsoluteFill>
  );
}

// ----- SCENE 11: 1590-1740f (53.0 to 58.0 s) -----
// Back to board with 19:36. Clock closes to 0 delay. ILLUSTRATION.
function Scene11() {
  const f = useCurrentFrame(); // 0-150
  const caption = 'So the timetable can promise a time the bus will keep. Insiyab.';

  const boardAlpha = easeOut(f, 5, 20);
  // The bar closes: starts at 13 min delay, goes to 0
  const delayMin = Math.round(lerp(f, 20, 110, 13, 0));

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Fonts />

      <div style={{ position: 'absolute', top: 80, left: 96, fontFamily: 'Overpass', fontWeight: 600, fontSize: 60, color: C.ink }}>
        A timetable the bus will keep
      </div>

      {/* Updated board */}
      <div style={{ position: 'absolute', top: 220, left: 96, opacity: boardAlpha }}>
        <div style={{ fontFamily: 'Overpass', fontWeight: 600, fontSize: 48, color: C.g4, letterSpacing: 2, marginBottom: 16 }}>
          UPDATED DEPARTURE BOARD
        </div>
        <div style={{
          padding: '28px 48px',
          border: `3px solid ${C.flow}`,
          display: 'flex', alignItems: 'center', gap: 80,
          background: C.paper,
        }}>
          <div style={{ fontFamily: 'PlexMono', fontSize: 72, color: C.ink, letterSpacing: 4 }}>310</div>
          <div style={{ fontFamily: 'PlexMono', fontSize: 72, color: C.flow, letterSpacing: 4 }}>
            {F.dep1936}
          </div>
          <div style={{ fontFamily: 'Plex', fontSize: 40, color: C.flow }}>Scheduled (updated)</div>
        </div>
        <div style={{ marginTop: 12, fontFamily: 'Plex', fontSize: 36, color: C.over, letterSpacing: 2 }}>
          ILLUSTRATION. The planner decides.
        </div>
      </div>

      {/* Closing delay bar — lowered to clear ILLUSTRATION label */}
      <div style={{ position: 'absolute', top: 560, left: 96, width: 1200, opacity: boardAlpha }}>
        <div style={{ width: '100%', height: 3, background: C.ink, position: 'relative', marginTop: 40 }}>
          <div style={{ position: 'absolute', left: 0, top: 10, fontFamily: 'PlexMono', fontSize: 36, color: C.flow }}>19:36</div>
        </div>
        <div style={{
          position: 'absolute', top: 10, left: 0,
          width: Math.max(0, delayMin * 26), height: 44,
          background: C.over,
          transition: 'width 0.1s',
        }} />
        <div style={{ position: 'absolute', top: 10, left: Math.max(0, delayMin * 26) + 16, fontFamily: 'PlexMono', fontSize: 44, color: C.over }}>
          {delayMin > 0 ? `${delayMin} MIN` : ''}
        </div>
      </div>

      <Caption text={caption} />
    </AbsoluteFill>
  );
}

// ----- SCENE 12: 1740-1800f (58.0 to 60.0 s) -----
// End card: wordmark, QR, address
function Scene12() {
  const f = useCurrentFrame(); // 0-60
  const alpha = easeOut(f, 5, 30);

  return (
    <AbsoluteFill style={{ background: C.paper, alignItems: 'center', justifyContent: 'center' }}>
      <Fonts />
      <div style={{ opacity: alpha, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 120, color: C.ink,
          letterSpacing: -2,
        }}>
          Insiyab&nbsp;&nbsp;
          <span style={{ fontFamily: 'Arabic', fontWeight: 400, fontSize: 100 }}>انسياب</span>
        </div>

        <Img src={staticFile('qr.svg')} style={{ width: 240, height: 240 }} />

        <div style={{ fontFamily: 'Plex', fontSize: 44, color: C.flow }}>
          insiyab.amirkazemkhani.com
        </div>

        <div style={{ fontFamily: 'Plex', fontSize: 32, color: C.g4, textAlign: 'center', maxWidth: 900 }}>
          A student prototype for the RTA Future Move Hackathon.
          Built on RTA's real day, 15 December 2025.
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---- scene list: [component, startFrame, durationFrames] ----
const SCENES = [
  [Scene0, 0,    30],   // 0.0 s — paper
  [Scene1, 30,  150],   // 1.0 s — board 19:23 → 19:36
  [Scene2, 180, 270],   // 6.0 s — trip bar 67 → 96
  [Scene3, 450, 180],   // 15.0 s — break, overrun
  [Scene4, 630, 120],   // 21.0 s — five trips
  [Scene5, 750, 150],   // 25.0 s — proof columns
  [Scene6, 900,  30],   // 30.0 s — release, wordmark
  [Scene7, 930, 180],   // 31.0 s — forecast bar
  [Scene8, 1110, 180],  // 37.0 s — worklist
  [Scene9, 1290, 150],  // 43.0 s — error bars
  [Scene10, 1440, 220], // 48.0 s — accept control, held to 55.33 s so it covers the cut at 55.25 s
  [Scene11, 1660, 80],  // 55.33 s — updated board
  [Scene12, 1740, 60],  // 58.0 s — end card
];

function StoryFilm() {
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: 'Plex', color: C.ink }}>
      {SCENES.map(([Comp, from, dur], i) => (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <Comp />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

registerRoot(() => (
  <Composition
    id="InsiyabStory"
    component={StoryFilm}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
  />
));
