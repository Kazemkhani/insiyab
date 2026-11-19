// scenes-1.jsx  — Scene 1 (waiting) + Scene 2 (title / 19:36)
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Img, Audio, staticFile } from 'remotion';
import { C, SCENE, VO, SFX, cbEase, makeCI } from './tokens.js';

const ci = makeCI(interpolate);

// Photo credit component — top-right so it never touches the bottom caption band
function Credit({ text }) {
  return (
    <div style={{
      position: 'absolute', top: 18, right: 24,
      fontSize: 18, color: C.ivory, opacity: 0.7,
      fontFamily: 'Plex', textShadow: '0 1px 4px rgba(0,0,0,0.95)',
    }}>{text}</div>
  );
}

// Caption band at bottom
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

// ── Scene 1: Waiting (0–240 f, 0–8s) ────────────────────────────────────────
export function Scene1() {
  const f = useCurrentFrame();

  // Slow push-in: image scales 1.06 → 1.0 over 240 frames
  const scale = interpolate(f, [0, 240], [1.06, 1.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Cool dim: overlay starts at 0.3 opacity, eases to 0.15
  const dimAlpha = interpolate(f, [0, 60], [0.4, 0.2], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Timestamp label fades in at frame 15
  const labelAlpha = ci(f, 15, 45, 0, 1);

  // Caption synced to l1 (VO at frame 45)
  const capAlpha = ci(f, 45, 70, 0, 1);

  return (
    <AbsoluteFill>
      {/* Photo */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img
          src={staticFile('photos/waiting-1.jpg')}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        />
      </AbsoluteFill>

      {/* Cool dim overlay */}
      <AbsoluteFill style={{ background: `rgba(10,15,30,${dimAlpha})` }} />

      {/* Night ambience audio under scenes 1-3 (quiet) */}
      <Audio
        src={staticFile('ambience.mp3')}
        startFrom={0}
        volume={f => 0.08}
      />

      {/* VO l1 */}
      <Audio src={staticFile('vo/l1.mp3')} startFrom={0} volume={1.0} />

      {/* Timestamp label — top left */}
      <div style={{
        position: 'absolute', top: 48, left: 72,
        fontFamily: 'Overpass', fontWeight: 600,
        fontSize: 36, color: C.ivory, opacity: labelAlpha,
        letterSpacing: 2, textShadow: '0 2px 8px rgba(0,0,0,0.7)',
      }}>19:23 · Route 310</div>

      {/* Caption band */}
      <div style={{ opacity: capAlpha }}>
        <CaptionBand text="Nineteen twenty-three. Route three-ten should be leaving now." />
      </div>

      <Credit text="Representative image. Photo: Dwi Setyo, Pexels" />
    </AbsoluteFill>
  );
}

// ── Scene 2: Title / 19:36 (frames 0–300 within scene, offset 240) ───────────
export function Scene2() {
  const f = useCurrentFrame(); // local frame within scene2 (0 = film frame 240)
  const filmFrame = f + SCENE.s2.in;

  // 19:23 → crossfade to 19:36 in red
  const time1Alpha = ci(f, 0, 15, 1, 1); // stays visible
  const time2Alpha = ci(f, 30, 60, 0, 1); // 19:36 fades in
  const time1Fade  = ci(f, 30, 60, 1, 0); // 19:23 fades out

  // Caption fades in at frame 20
  const capAlpha = ci(f, 20, 50, 0, 1);

  // Source line
  const srcAlpha = ci(f, 60, 80, 0, 1);

  return (
    <AbsoluteFill>
      {/* Photo: title-3 Sheikh Zayed Road at night */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img
          src={staticFile('photos/title-3.jpg')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Dark legibility scrim */}
      <AbsoluteFill style={{ background: 'rgba(10,15,25,0.55)' }} />

      {/* VO l2 */}
      <Audio src={staticFile('vo/l2.mp3')} startFrom={0} volume={1.0} />

      {/* Giant time display */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}>
        {/* 19:23 — fading out */}
        <div style={{
          fontFamily: 'Overpass', fontWeight: 800, fontSize: 220,
          color: C.ivory, opacity: time1Fade,
          lineHeight: 1, letterSpacing: -4,
          textShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>19:23</div>

        {/* 19:36 — fading in, in red */}
        <div style={{
          fontFamily: 'Overpass', fontWeight: 800, fontSize: 220,
          color: C.red, opacity: time2Alpha,
          lineHeight: 1, letterSpacing: -4,
          position: 'absolute', top: 0, left: 0, width: '100%',
          textShadow: `0 4px 32px rgba(228,84,75,0.4)`,
        }}>19:36</div>
      </div>

      {/* Caption */}
      <div style={{ opacity: capAlpha }}>
        <CaptionBand text="It leaves at nineteen thirty-six. Its bus was still out, finishing the last trip." />
      </div>

      {/* Source line */}
      <div style={{
        position: 'absolute', bottom: 68, left: 24, right: 24,
        opacity: srcAlpha * 0.75,
        fontSize: 20, fontFamily: 'Plex', color: C.ivory,
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
      }}>
        Illustration built from route 310's measured times. RTA records, 15 Dec 2025.
      </div>
      <Credit text="Photo: Irshad Ahmad, Pexels" />
    </AbsoluteFill>
  );
}
