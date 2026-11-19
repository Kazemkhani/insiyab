// scenes-4.jsx  — Scene 7 (evidence / drill) + Scene 8 (close / logo)
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, Audio, staticFile, Sequence } from 'remotion';
import { C, SCENE, cbEase, makeCI } from './tokens.js';

const ci = makeCI(interpolate);

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

function Credit({ text }) {
  return (
    <div style={{
      position: 'absolute', top: 18, right: 24,
      fontSize: 18, color: C.ivory, opacity: 0.65,
      fontFamily: 'Plex', textShadow: '0 1px 4px rgba(0,0,0,0.95)',
    }}>{text}</div>
  );
}

// ── Scene 7: Drill evidence (1980–2220, 66–74s, 240f) ────────────────────────
// First 90f: call-live.jpg (cropped to show role boxes)
// Then fade to close-1.jpg (real X25 bus) at frame 90-120
// Stat label: "4 reports · 1 decision · 4 confirmations"
export function Scene7() {
  const f = useCurrentFrame();

  // Screen crop fades out at frame 90, bus fades in
  const screenAlpha = ci(f, 0, 15, 0, 1);
  const screenFadeOut = ci(f, 85, 110, 1, 0);
  const busAlpha = ci(f, 95, 120, 0, 1);

  // Stat label
  const statAlpha = ci(f, 20, 50, 0, 1);

  // Caption synced to l7 (starts at scene-local 0)
  const capAlpha = ci(f, 0, 24, 0, 1);

  return (
    <AbsoluteFill>
      {/* Real drill screen (call-live.jpg) */}
      <AbsoluteFill style={{ overflow: 'hidden', opacity: screenAlpha * screenFadeOut }}>
        <Img
          src={staticFile('photos/call-live.jpg')}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center top',
          }}
        />
      </AbsoluteFill>

      {/* Dark scrim over screen */}
      <AbsoluteFill style={{
        background: 'rgba(10,14,22,0.42)',
        opacity: screenAlpha * screenFadeOut,
      }} />

      {/* X25 bus — close-1.jpg (real bus, daylight) */}
      <AbsoluteFill style={{ overflow: 'hidden', opacity: busAlpha }}>
        <Img
          src={staticFile('photos/close-1.jpg')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'rgba(10,14,22,0.28)', opacity: busAlpha }} />

      {/* VO l7 */}
      <Audio src={staticFile('vo/l7.mp3')} startFrom={0} volume={1.0} />

      {/* Stat on ink band — full width, single line, no wrap */}
      <div style={{
        position: 'absolute', top: '32%', left: 0, right: 0,
        background: 'rgba(21,24,29,0.72)',
        padding: '20px 60px', textAlign: 'center',
        opacity: statAlpha,
      }}>
        <div style={{
          fontFamily: 'Overpass', fontWeight: 800, fontSize: 72,
          color: C.ivory, lineHeight: 1.1, whiteSpace: 'nowrap',
        }}>4 reports · 1 decision · 4 confirmations</div>
      </div>

      {/* Caption */}
      <div style={{ opacity: capAlpha }}>
        <CaptionBand text="We ran it end to end, on real phones. Four reports. One decision. Four confirmations." />
      </div>

      {/* Drill caption */}
      <div style={{
        position: 'absolute', bottom: 68, left: 24, opacity: screenAlpha * screenFadeOut * 0.9,
        fontSize: 20, fontFamily: 'Plex', color: C.ivory,
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
      }}>Our drill, 18 November 2026. Conditions simulated.</div>

      <Credit text="Route X25, Al Karama. Photo: Rob Dammers, CC BY-SA 2.0" />
    </AbsoluteFill>
  );
}

// ── Scene 8: Close / Logo (2220–2400, 74–80s, 180f) ──────────────────────────
// Ivory card, Ink type
// l8a "Insiyab sees it coming." at local frame 0
// l8b "The controller decides." at local frame 46
// 1s silence (30f) after l8b ends (~84f), then logo reveal
// Logo holds to end

function InsiyabSymbolRevealed({ f, size, fill }) {
  const revealPct  = ci(f, 0, 24, 0, 100);
  const revealLower = ci(f, 4, 28, 0, 100);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <defs>
        <clipPath id="close-upper">
          <rect x="0" y="0" width={revealPct * 1.2} height="90" />
        </clipPath>
        <clipPath id="close-lower">
          <rect x="0" y="40" width={revealLower * 1.2} height="80" />
        </clipPath>
      </defs>
      <g clipPath="url(#close-upper)">
        <path d="M10 10 H93 L110 27 V38 H71 C56 38 46 48 40 64 C36 74 32 76 22 76 H10 Z" fill={fill}/>
      </g>
      <g clipPath="url(#close-lower)">
        <path d="M10 94 H32 C45 94 52 86 58 74 C63 63 68 60 78 60 H110 V110 H10 Z" fill={fill}/>
      </g>
    </svg>
  );
}

// Inline wordmark SVG: "Insiyab" (latin) + "انسياب" (arabic)
// Using simple text as outlined paths are too complex; this matches prior brand-sting approach
function Wordmarks({ opacity }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, opacity,
    }}>
      <div style={{ fontFamily: 'Plex', fontWeight: 500, fontSize: 56, color: C.ink, letterSpacing: 4 }}>
        Insiyab
      </div>
      <div style={{ fontFamily: 'Arabic', fontWeight: 400, fontSize: 52, color: C.ink, letterSpacing: 2, direction: 'rtl' }}>
        انسياب
      </div>
    </div>
  );
}

export function Scene8() {
  const f = useCurrentFrame();

  const l8a_local = 0;
  const l8b_local = 46;  // l8a is 1.515s = 45.5f ≈ 46f

  // Type lines fade in
  const line1A = ci(f, l8a_local, l8a_local + 18, 0, 1);
  const line2A = ci(f, l8b_local, l8b_local + 18, 0, 1);

  // Logo reveal at frame 115 (~3.8s into scene = after lines + ~1s silence)
  const logoRevealAt = 112;
  const logoF = Math.max(0, f - logoRevealAt);
  const logoAlpha = ci(f, logoRevealAt, logoRevealAt + 8, 0, 1);
  const wordmarkA = ci(f, logoRevealAt + 6, logoRevealAt + 24, 0, 1);

  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      {/* VO */}
      <Sequence from={l8a_local} durationInFrames={48}>
        <Audio src={staticFile('vo/l8a.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={l8b_local} durationInFrames={48}>
        <Audio src={staticFile('vo/l8b.mp3')} startFrom={0} volume={1.0} />
      </Sequence>

      {/* Type lines — Overpass 800, ~120px, left-aligned on grid */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: 80, right: 80,
      }}>
        <div style={{
          opacity: line1A,
          fontFamily: 'Overpass', fontWeight: 800,
          fontSize: 120, color: C.ink, lineHeight: 1.1,
        }}>Insiyab sees it coming.</div>

        <div style={{
          opacity: line2A, marginTop: 16,
          fontFamily: 'Overpass', fontWeight: 800,
          fontSize: 120, color: C.ink, lineHeight: 1.1,
        }}>The controller decides.</div>
      </div>

      {/* Full bilingual lockup */}
      <div style={{
        position: 'absolute', top: '68%', left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: logoAlpha,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <InsiyabSymbolRevealed f={logoF} size={160} fill={C.ink} />
        <Wordmarks opacity={wordmarkA} />
      </div>
    </AbsoluteFill>
  );
}
