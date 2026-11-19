// cinematic-root.jsx — entry point for the Insiyab cinematic pitch film
// New composition only; never modifies existing story.jsx
import React from 'react';
import { registerRoot, Composition, AbsoluteFill, Sequence, staticFile } from 'remotion';
import { TOTAL, FPS, W, H, SCENE } from './cinematic/tokens.js';
import { Scene1, Scene2 } from './cinematic/scenes-1.jsx';
import { Scene3, Scene4 } from './cinematic/scenes-2.jsx';
import { Scene5, Scene6 } from './cinematic/scenes-3.jsx';
import { Scene7, Scene8 } from './cinematic/scenes-4.jsx';

// ── Font declarations (loaded via public dir) ──────────────────────────────
function Fonts() {
  return (
    <style>{`
      @font-face { font-family: Overpass; font-weight: 800;
        src: url('${staticFile('fonts/overpass-600.woff2')}') format('woff2'); }
      @font-face { font-family: Overpass; font-weight: 600;
        src: url('${staticFile('fonts/overpass-600.woff2')}') format('woff2'); }
      @font-face { font-family: Overpass; font-weight: 400;
        src: url('${staticFile('fonts/overpass-400.woff2')}') format('woff2'); }
      @font-face { font-family: Plex; font-weight: 400;
        src: url('${staticFile('fonts/ibm-plex-sans-400.woff2')}') format('woff2'); }
      @font-face { font-family: Plex; font-weight: 500;
        src: url('${staticFile('fonts/ibm-plex-sans-500.woff2')}') format('woff2'); }
      @font-face { font-family: Plex; font-weight: 600;
        src: url('${staticFile('fonts/ibm-plex-sans-500.woff2')}') format('woff2'); }
      @font-face { font-family: Arabic; font-weight: 400;
        src: url('${staticFile('fonts/noto-kufi-arabic-400.woff2')}') format('woff2'); }
      * { box-sizing: border-box; }
    `}</style>
  );
}

// ── Main composition ───────────────────────────────────────────────────────
function InsiyabCinematic() {
  const { in: s1in, out: s1out } = SCENE.s1;
  const { in: s2in, out: s2out } = SCENE.s2;
  const { in: s3in, out: s3out } = SCENE.s3;
  const { in: s4in, out: s4out } = SCENE.s4;
  const { in: s5in, out: s5out } = SCENE.s5;
  const { in: s6in, out: s6out } = SCENE.s6;
  const { in: s7in, out: s7out } = SCENE.s7;
  const { in: s8in, out: s8out } = SCENE.s8;

  return (
    <AbsoluteFill>
      <Fonts />
      <Sequence from={s1in} durationInFrames={s1out - s1in}><Scene1 /></Sequence>
      <Sequence from={s2in} durationInFrames={s2out - s2in}><Scene2 /></Sequence>
      <Sequence from={s3in} durationInFrames={s3out - s3in}><Scene3 /></Sequence>
      <Sequence from={s4in} durationInFrames={s4out - s4in}><Scene4 /></Sequence>
      <Sequence from={s5in} durationInFrames={s5out - s5in}><Scene5 /></Sequence>
      <Sequence from={s6in} durationInFrames={s6out - s6in}><Scene6 /></Sequence>
      <Sequence from={s7in} durationInFrames={s7out - s7in}><Scene7 /></Sequence>
      <Sequence from={s8in} durationInFrames={s8out - s8in}><Scene8 /></Sequence>
    </AbsoluteFill>
  );
}

// ── Root registration ──────────────────────────────────────────────────────
export const RemotionRoot = () => (
  <>
    <Composition
      id="InsiyabCinematic"
      component={InsiyabCinematic}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);

registerRoot(RemotionRoot);
