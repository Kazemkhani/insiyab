import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence,
  useCurrentFrame, interpolate, Img, staticFile
} from 'remotion';

// ---- palette (docs/RULES.md sections 5 and 10, 01-CONTEXT.md section 11) ----
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
  bg:     '#0D1C29',   // dark canvas: ink lightened slightly
  accent: '#2F6690',   // spare — highlight rect
};

const FPS    = 30;
const W      = 1920;
const H      = 1080;
const TOTAL  = 1800;  // 60 s
const FADE   = 8;     // crossfade frames
const INSET  = 24;    // px inset from canvas edge for screenshot border
const BORDER = 2;     // px border width

// --- easing helpers ---
function clamp(f, a, b, va, vb) {
  return interpolate(f, [a, b], [va, vb], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// ---- shot definitions ----
// Each shot: id, natural w/h of the PNG, chapter label, highlight rect (in natural px),
// focusX/Y (natural px, where Ken Burns pushes toward), and frame window.
//
// Frame windows from re-timed script.json (voices laid end-to-end, 0.4 s air, start 1.0 s).
// Open title: f 0-30 (1 s).
// l01 s=1.000-5.598   => f  30- 168  s01 pitch site heading
// l02 s=5.998-9.576   => f 180- 287  s02 47%/16% panel
// l03 s=9.976-15.828  => f 299- 475  s03 +29 panel
// l04 s=16.228-20.355 => f 487- 611  s04 589 of 945 panel
// l05 s=20.755-24.412 => f 623- 732  s05 Dataiku Flow canvas
// l06 s=24.812-30.272 => f 744- 908  s06 worklist table
// l07 s=30.672-34.251 => f 920-1028  s07 Accept button
// l08 s=34.651-39.849 => f 1040-1195 s08 244 hours panel
// l09 s=40.249-44.324 => f 1207-1330 s09 forecast table+chart
// l10 s=44.724-48.747 => f 1342-1462 s10 15% panel
// l11 s=49.147-52.438 => f 1474-1573 s06 worklist again
// l12 s=52.838-53.805 => f 1585-1614 s01 Insiyab close
// End card: f 1725-1800 (2.5 s)
//
// Highlight coords set from actual PNG inspection.
// s01 1920x1080 — heading "Why does the evening fall behind?" upper-left of text
// s02 1920x1080 — left info panel (47% large, 16% sub-row)
// s03 1920x1080 — left info panel (+29, 67/96/16 row)
// s04 1920x1080 — left info panel (589 of 945)
// s05 1200x731  — full flow canvas (6 groups, Default through Forecast)
// s06 1200x731  — table rows (Route, Hour, Planned min, Accept buttons)
// s07 1200x731  — Accept button on row 1 (Route 310, 18:00)
// s08 1920x1080 — left info panel (244 hours)
// s09 1200x731  — model comparison table + bar chart area
// s10 1920x1080 — left info panel (15% closer, 8.25/7.42/6.97)

const SEGS = [
  // { startF, endF, shot, chapter, caption, hx, hy, hw, hh, focusX, focusY, natW, natH }
  {
    startF: 30, endF: 180,
    shot: 's01', natW: 1920, natH: 1080,
    chapter: '1  The day',
    caption: 'Monday 15 December 2025 | One real service day',
    hx: 430, hy: 93, hw: 575, hh: 133,
    focusX: 717, focusY: 160,
  },
  {
    startF: 180, endF: 299,
    shot: 's02', natW: 1920, natH: 1080,
    chapter: '2  The gap',
    caption: '47% of departures late at 19:00. 16% at 07:00. | Measured on the real day',
    hx: 28, hy: 258, hw: 362, hh: 285,
    focusX: 209, focusY: 400,
  },
  {
    startF: 299, endF: 487,
    shot: 's03', natW: 1920, natH: 1080,
    chapter: '3  One bus',
    caption: 'Route 310, 18:00 | Illustration: arithmetic on measured times, not one real passenger',
    hx: 28, hy: 258, hw: 362, hh: 295,
    focusX: 209, focusY: 405,
  },
  {
    startF: 487, endF: 623,
    shot: 's04', natW: 1920, natH: 1080,
    chapter: '4  Carry forward',
    caption: '589 of 945 linked late starts: bus still on its previous trip | Measured',
    hx: 28, hy: 250, hw: 362, hh: 315,
    focusX: 209, focusY: 408,
  },
  {
    startF: 623, endF: 744,
    shot: 's05', natW: 1200, natH: 731,
    chapter: '5  Dataiku Flow',
    caption: 'INSIYAB project | Dataiku, dss-8a0eac1b-a0da2b15-dku.eu-west-2.app.dataiku.io',
    hx: 215, hy: 88, hw: 720, hh: 582,
    focusX: 575, focusY: 379,
  },
  {
    startF: 744, endF: 920,
    shot: 's06', natW: 1200, natH: 731,
    chapter: '6  Worklist',
    caption: "Planner's worklist | Dataiku web app, project INSIYAB",
    hx: 22, hy: 430, hw: 1140, hh: 290,
    focusX: 600, focusY: 575,
  },
  {
    startF: 920, endF: 1040,
    shot: 's07', natW: 1200, natH: 731,
    chapter: '6  Worklist',
    caption: 'Accept or set aside. Nothing changes by itself.',
    hx: 890, hy: 473, hw: 70, hh: 43,
    focusX: 925, focusY: 495,
  },
  {
    startF: 1040, endF: 1207,
    shot: 's08', natW: 1920, natH: 1080,
    chapter: '7  Missing hours',
    caption: '244 bus hours, 16:00 to 18:59 | Measured, not predicted | 630 across the whole day',
    hx: 28, hy: 258, hw: 385, hh: 295,
    focusX: 215, focusY: 405,
  },
  {
    startF: 1207, endF: 1342,
    shot: 's09', natW: 1200, natH: 731,
    chapter: '8  Forecast',
    caption: '2,043 held-out trips | Evening peak 16:00 to 19:00 | Model trained on morning and midday only',
    hx: 22, hy: 100, hw: 1150, hh: 460,
    focusX: 600, focusY: 330,
  },
  {
    startF: 1342, endF: 1474,
    shot: 's10', natW: 1920, natH: 1080,
    chapter: '9  Improvement',
    caption: 'Timetable: 8.25 min off per trip. Model: 6.97 min off. | Range 12 to 19 per cent',
    hx: 28, hy: 258, hw: 385, hh: 295,
    focusX: 215, focusY: 405,
  },
  {
    startF: 1474, endF: 1585,
    shot: 's06', natW: 1200, natH: 731,
    chapter: '6  Worklist',
    caption: "At each timetable change, the planner opens this list.",
    hx: 22, hy: 430, hw: 1140, hh: 290,
    focusX: 600, focusY: 575,
  },
  {
    startF: 1585, endF: 1725,
    shot: 's01', natW: 1920, natH: 1080,
    chapter: '10  Insiyab',
    caption: 'insiyab.amirkazemkhani.com',
    hx: 430, hy: 93, hw: 575, hh: 133,
    focusX: 717, focusY: 160,
  },
];

// ---- single shot frame ----
function ShotFrame({ seg, localF, duration, opacity = 1 }) {
  const { shot, natW, natH, chapter, caption, hx, hy, hw, hh, focusX, focusY } = seg;

  // Ken Burns: 3% push over the shot duration
  const push = 0.03;
  const scale = clamp(localF, 0, duration, 1.0, 1.0 + push);

  // how far to translate toward focus (as fraction of image dimensions, in render px)
  // focusX in natural coords → fraction from center
  const fxFrac = (focusX / natW) - 0.5;  // -0.5 to 0.5
  const fyFrac = (focusY / natH) - 0.5;

  // Push toward focus: translate by up to push/2 * W (so total pan is smooth)
  const tx = clamp(localF, 0, duration, 0, fxFrac * push * W * 0.5);
  const ty = clamp(localF, 0, duration, 0, fyFrac * push * H * 0.5);

  // The screenshot is fitted inside the inset area
  // inset area: W - 2*INSET x H - 2*INSET
  const ia_w = W - 2 * INSET;
  const ia_h = H - 2 * INSET;

  // fit screenshot in inset area (letterbox / pillarbox)
  const imgAR = natW / natH;
  const iaAR  = ia_w / ia_h;
  let fitW, fitH;
  if (imgAR > iaAR) {
    fitW = ia_w;
    fitH = ia_w / imgAR;
  } else {
    fitH = ia_h;
    fitW = ia_h * imgAR;
  }

  // position inside canvas
  const imgLeft = INSET + (ia_w - fitW) / 2;
  const imgTop  = INSET + (ia_h - fitH) / 2;

  // highlight rect in render-space (natW → fitW scale)
  const scaleX = fitW / natW;
  const scaleY = fitH / natH;
  const rleft  = imgLeft + hx * scaleX;
  const rtop   = imgTop  + hy * scaleY;
  const rw     = hw * scaleX;
  const rh     = hh * scaleY;

  // caption fade: in over 6 frames, out over 6 frames
  const capAlpha = Math.min(
    clamp(localF, 0, 6, 0, 1),
    clamp(localF, duration - 6, duration, 1, 0)
  );

  // chapter fade same
  const chAlpha = capAlpha;

  return (
    <AbsoluteFill style={{ opacity, background: C.bg }}>
      {/* screenshot with Ken Burns */}
      <div style={{
        position: 'absolute',
        left: imgLeft, top: imgTop,
        width: fitW, height: fitH,
        overflow: 'hidden',
        border: `${BORDER}px solid ${C.g4}`,
        boxSizing: 'border-box',
      }}>
        <div style={{
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          transformOrigin: `${focusX / natW * 100}% ${focusY / natH * 100}%`,
          width: '100%', height: '100%',
        }}>
          <Img
            src={staticFile(`${shot}.png`)}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }}
          />
        </div>
      </div>

      {/* highlight rectangle */}
      <div style={{
        position: 'absolute',
        left: rleft, top: rtop,
        width: rw, height: rh,
        border: `2px solid ${C.accent}`,
        boxSizing: 'border-box',
        opacity: clamp(localF, 4, 12, 0, 0.9),
        pointerEvents: 'none',
      }} />

      {/* chapter label — top-left zone, below the app navbar */}
      <div style={{
        position: 'absolute',
        left: INSET + 12,
        top: INSET + 52,
        opacity: chAlpha,
        fontFamily: '"Overpass", "IBM Plex Sans", sans-serif',
        fontSize: 20,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: C.g2,
        lineHeight: 1,
        background: 'rgba(13,28,41,0.82)',
        padding: '6px 12px',
        borderLeft: `2px solid ${C.accent}`,
      }}>
        {chapter}
      </div>

      {/* caption band — bottom zone, never overlaps content */}
      <div style={{
        position: 'absolute',
        left: 0, bottom: 0,
        width: W, height: 80,
        background: 'rgba(13,28,41,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: capAlpha,
        padding: '0 48px',
        boxSizing: 'border-box',
      }}>
        <span style={{
          fontFamily: '"IBM Plex Sans", "Overpass", sans-serif',
          fontSize: 22,
          color: C.g1,
          letterSpacing: '0.02em',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}>
          {caption}
        </span>
      </div>
    </AbsoluteFill>
  );
}

// ---- crossfade between two shots ----
function CrossFade({ segA, segB, localF }) {
  // localF: 0 = fully A, FADE = fully B
  const alphaB = clamp(localF, 0, FADE, 0, 1);
  const alphaA = 1 - alphaB;
  return (
    <AbsoluteFill>
      <ShotFrame seg={segA} localF={segA.endF - segA.startF} duration={segA.endF - segA.startF} opacity={alphaA} />
      <ShotFrame seg={segB} localF={0} duration={segB.endF - segB.startF} opacity={alphaB} />
    </AbsoluteFill>
  );
}

// ---- open title (1 s = 30 frames) ----
function OpenTitle({ frame }) {
  const alpha = clamp(frame, 0, 10, 0, 1) * clamp(frame, 20, 30, 1, 0);
  return (
    <AbsoluteFill style={{ background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        opacity: alpha,
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          fontFamily: '"Overpass", sans-serif',
          fontSize: 52,
          fontWeight: 700,
          color: C.paper,
          letterSpacing: '0.04em',
        }}>
          Insiyab
        </div>
        <div style={{
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 22,
          color: C.g3,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          RTA Future Move Hackathon
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---- end card (2.5 s = 75 frames) ----
function EndCard({ frame }) {
  const alpha = clamp(frame, 0, 15, 0, 1);
  return (
    <AbsoluteFill style={{ background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        opacity: alpha,
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div style={{
          fontFamily: '"Overpass", sans-serif',
          fontSize: 72,
          fontWeight: 700,
          color: C.paper,
          letterSpacing: '0.04em',
        }}>
          Insiyab
        </div>
        <div style={{
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 26,
          color: C.g2,
          letterSpacing: '0.03em',
        }}>
          insiyab.amirkazemkhani.com
        </div>
        <div style={{
          width: 320, height: 1, background: C.g4,
        }} />
        <div style={{
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 18,
          color: C.g3,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Dataiku | RTA Future Move Hackathon
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---- main composition ----
function WalkthroughMain() {
  const frame = useCurrentFrame();

  // Open title: 0-30
  if (frame < 30) {
    return <OpenTitle frame={frame} />;
  }

  // End card: 1725-1800
  if (frame >= 1725) {
    return <EndCard frame={frame - 1725} />;
  }

  // Find which segment we are in
  for (let i = 0; i < SEGS.length; i++) {
    const seg = SEGS[i];
    const next = SEGS[i + 1];

    // Check if we are in a crossfade to the next segment
    if (next && frame >= seg.endF - FADE && frame < seg.endF) {
      const localF = frame - (seg.endF - FADE);
      return <CrossFade segA={seg} segB={next} localF={localF} />;
    }

    // Check if we are within this segment
    if (frame >= seg.startF && frame < (next ? next.startF : seg.endF)) {
      const localF = frame - seg.startF;
      const duration = seg.endF - seg.startF;
      return <ShotFrame seg={seg} localF={localF} duration={duration} />;
    }
  }

  // fallback: dark
  return <AbsoluteFill style={{ background: C.bg }} />;
}

export function WalkthroughComposition() {
  return <WalkthroughMain />;
}

// ---- registration ----
export const RemotionRoot = () => (
  <Composition
    id="InsiyabWalkthrough"
    component={WalkthroughComposition}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
  />
);

registerRoot(RemotionRoot);
