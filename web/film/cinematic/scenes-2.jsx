// scenes-2.jsx  — Scene 3 (scale / 45%) + Scene 4 (controllers / phone ring)
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, Audio, staticFile } from 'remotion';
import { C, SCENE, cbEase, makeCI } from './tokens.js';

const ci = makeCI(interpolate);

function Credit({ text }) {
  return (
    <div style={{
      position: 'absolute', top: 18, right: 24,
      fontSize: 18, color: C.ivory, opacity: 0.65,
      fontFamily: 'Plex', textShadow: '0 1px 4px rgba(0,0,0,0.95)',
    }}>{text}</div>
  );
}
function CaptionBand({ text }) {
  if (!text) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(21,24,29,0.72)', padding: '14px 60px',
      fontFamily: 'Plex', fontSize: 34, color: C.ivory,
      lineHeight: 1.4, textAlign: 'center',
    }}>{text}</div>
  );
}

// ── Scene 3: Scale (frames 540–900, 18–30s) ──────────────────────────────────
export function Scene3() {
  const f = useCurrentFrame();

  // Big number entrance
  const bigAlpha = ci(f, 0, 24, 0, 1);
  const bigY     = ci(f, 0, 24, 40, 0);

  // Sub-label (12 frames later)
  const subAlpha = ci(f, 20, 44, 0, 1);

  // Morning line (after another 18 frames)
  const morAlpha = ci(f, 48, 72, 0, 1);

  // Caption synced to l3 VO (scene-local frame 0 = film frame 540)
  const capAlpha = ci(f, 0, 24, 0, 1);

  return (
    <AbsoluteFill>
      {/* Photo: scale-2 downtown skyline */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img
          src={staticFile('photos/scale-2.jpg')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Dark scrim */}
      <AbsoluteFill style={{ background: 'rgba(10,14,22,0.60)' }} />

      {/* Ambience continues (quiet) */}
      <Audio src={staticFile('ambience.mp3')} startFrom={SCENE.s3.in / 30 * 44100 | 0} volume={f => 0.07} />

      {/* VO l3 */}
      <Audio src={staticFile('vo/l3.mp3')} startFrom={0} volume={1.0} />

      {/* Giant 45% */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%',
        transform: `translateX(-50%) translateY(${bigY}px)`,
        textAlign: 'center', opacity: bigAlpha,
      }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 800, fontSize: 280,
          color: C.ivory, lineHeight: 1, letterSpacing: -6,
          textShadow: '0 6px 32px rgba(0,0,0,0.5)',
        }}>45%</div>
      </div>

      {/* Sub-label */}
      <div style={{
        position: 'absolute', top: '62%', left: '50%',
        transform: 'translateX(-50%)', textAlign: 'center',
        opacity: subAlpha, maxWidth: 1000,
      }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 48,
          color: C.ivory, lineHeight: 1.3,
          textShadow: '0 2px 12px rgba(0,0,0,0.8)',
        }}>of evening departures leave 5+ minutes late</div>
      </div>

      {/* Morning comparison */}
      <div style={{
        position: 'absolute', top: '75%', left: '50%',
        transform: 'translateX(-50%)', textAlign: 'center',
        opacity: morAlpha,
      }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 600, fontSize: 38,
          color: C.ink25, letterSpacing: 1,
        }}>Morning: 19%.  Same crowd.</div>
      </div>

      {/* Caption */}
      <div style={{ opacity: capAlpha }}>
        <CaptionBand text="On RTA's own records, nearly half of evening departures leave five minutes late or more. Mornings carry the same crowd. Evenings pass the delay on." />
      </div>

      <Credit text="Photo: Nihongraphy, Pexels" />
    </AbsoluteFill>
  );
}

// ── Scene 4: Controllers / phone ring (900–1200, 30–40s) ─────────────────────
export function Scene4() {
  const f = useCurrentFrame();

  // Stat line entrance
  const statAlpha = ci(f, 0, 24, 0, 1);

  // Caption synced to l4
  const capAlpha = ci(f, 0, 24, 0, 1);

  // Phone ring SFX at local frame 30 (film frame 930)
  // Ring at frame 30 (1.0s into scene), gap 15f, second ring at 60f
  const ring1Vol = f >= 30 && f < 48 ? 0.55 : 0;
  const ring2Vol = f >= 60 && f < 78 ? 0.55 : 0;

  return (
    <AbsoluteFill>
      {/* Photo: control-1 (Nevada dispatch centre) */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img
          src={staticFile('photos/control-1.jpg')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Dark scrim */}
      <AbsoluteFill style={{ background: 'rgba(10,14,22,0.58)' }} />

      {/* VO l4 */}
      <Audio src={staticFile('vo/l4.mp3')} startFrom={0} volume={1.0} />

      {/* Phone ring SFX — two separate sequences */}
      {f >= 30 && f < 60 && (
        <Audio src={staticFile('phone-ring.mp3')} startFrom={0} volume={0.55} />
      )}

      {/* Stat line */}
      <div style={{
        position: 'absolute', top: '32%', left: '50%',
        transform: 'translateX(-50%)', textAlign: 'center',
        opacity: statAlpha,
      }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 800, fontSize: 86,
          color: C.ivory, lineHeight: 1.1, whiteSpace: 'nowrap',
          textShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}>6 controllers · 1,400 buses</div>
      </div>

      {/* Caption */}
      <div style={{ opacity: capAlpha }}>
        <CaptionBand text="Six controllers watch fourteen hundred buses. Every late bus means phone calls. One at a time." />
      </div>

      <Credit text="Representative image, not RTA's. Photo: Noah Wulf, CC BY-SA 4.0" />
    </AbsoluteFill>
  );
}
