// root.jsx (v4e) — Insiyab Film v4e
// 87 seconds · 1920×1080 · 30fps · 2610 frames
//
// Changes from v4d:
//   A) lar2 moved 45.20→45.30 (fix lar1→lar2 gap: 0.506→0.610 ≥ 0.60s)
//   B) l09/ACT2_START moved 48.60→48.70 (maintain lar2→l09 gap ≥ 0.60s)
//   C) l12 moved 65.10→65.30 (fix l11→l12 gap: 0.309→0.509 ≥ 0.45s)
//   D) l13 moved 71.35→71.50 (+0.15s cascade)
//   E) CALL_CHAIN: 65.3→76.1s; CHART: 76.1→83.4s; RESOLUTION: 83.4→87s
//   F) ALL 18 voice lines now use word-level Caption.jsx (backed by alignment JSON)
//   G) CallChain: "decides" flip at localFrame 238; "confirms" cascade at 284+6i
//   H) Act2 SFX adjusted for new ACT2_START (48.70) and scene boundaries
import React, { useEffect, useState } from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Audio, Sequence,
  useCurrentFrame, staticFile, delayRender, continueRender, cancelRender,
} from 'remotion';

import { FPS, TOTAL_FRAMES, SCENE, VO, s } from './beat.js';
import { C } from '../v4/colors.js';
import { Act1 } from './act1/Act1.jsx';
import { Turn } from './turn/Turn.jsx';
import { Act2 } from './act2/Act2.jsx';

// Font face declarations (unchanged from v4d)
const FONTS = `
@font-face {
  font-family: 'Overpass';
  font-weight: 400;
  src: url('${staticFile('fonts/overpass-400.woff2')}') format('woff2');
}
@font-face {
  font-family: 'Overpass';
  font-weight: 600 800;
  src: url('${staticFile('fonts/overpass-600.woff2')}') format('woff2');
}
@font-face {
  font-family: 'IBM Plex Sans';
  font-weight: 400;
  src: url('${staticFile('fonts/ibm-plex-sans-400.woff2')}') format('woff2');
}
@font-face {
  font-family: 'IBM Plex Sans';
  font-weight: 500;
  src: url('${staticFile('fonts/ibm-plex-sans-500.woff2')}') format('woff2');
}
@font-face {
  font-family: 'Noto Kufi Arabic';
  font-weight: 400;
  src: url('${staticFile('fonts/noto-kufi-arabic-400.woff2')}') format('woff2');
}
`;

function musicVol(frame) {
  for (const { start, dur } of Object.values(VO)) {
    const margin = 15;
    if (frame >= start - margin && frame <= start + dur + margin) return 0.3;
  }
  if (frame < s(38))                return 0.65;
  if (frame < SCENE.ACT2_START)     return 0;
  return 0.6;
}

function Film() {
  const [handle] = useState(() => delayRender('fonts-loaded-v4e'));
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      Promise.all([
        document.fonts.load('800 36px Overpass'),
        document.fonts.load('400 36px "IBM Plex Sans"'),
        document.fonts.load('400 36px "Noto Kufi Arabic"'),
      ]).then(() => {
        setFontsReady(true);
        continueRender(handle);
      }).catch(e => {
        console.warn('Font load failed, continuing:', e);
        setFontsReady(true);
        continueRender(handle);
      });
    } else {
      setFontsReady(true);
      continueRender(handle);
    }
  }, [handle]);

  const frame = useCurrentFrame();

  const renderSection = () => {
    if (frame < SCENE.ACT1_END) return <Act1 frame={frame} />;
    if (frame < SCENE.TURN_END) return <Turn frame={frame} localFrame={frame - SCENE.ACT1_END} />;
    return <Act2 frame={frame} />;
  };

  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: 'Overpass' }}>
      <style>{FONTS}</style>

      {/* ═══════════════════ MUSIC ═══════════════════ */}
      <Sequence from={0} durationInFrames={s(38) + 10}>
        <Audio
          src={staticFile('audio/act1.mp3')}
          startFrom={0}
          volume={(f) => {
            if (f >= s(37)) return 0;
            return musicVol(f);
          }}
        />
      </Sequence>

      {/* Act 2 music: starts at SCENE.ACT2_START (48.70s) */}
      <Sequence from={SCENE.ACT2_START} durationInFrames={s(38) + 10}>
        <Audio
          src={staticFile('audio/act2.mp3')}
          startFrom={0}
          volume={(f) => {
            const compFrame = f + SCENE.ACT2_START;
            if (compFrame >= s(87)) return 0;
            return musicVol(compFrame);
          }}
        />
      </Sequence>

      {/* ═══════════════════ ACT 1 VOICE (unchanged) ═══════════════════ */}
      <Sequence from={VO.l01.start} durationInFrames={VO.l01.dur + 20}>
        <Audio src={staticFile('audio/voice/l01.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l02.start} durationInFrames={VO.l02.dur + 20}>
        <Audio src={staticFile('audio/voice/l02.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l03.start} durationInFrames={VO.l03.dur + 20}>
        <Audio src={staticFile('audio/voice/l03.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l04.start} durationInFrames={VO.l04.dur + 20}>
        <Audio src={staticFile('audio/voice/l04.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l05.start} durationInFrames={VO.l05.dur + 20}>
        <Audio src={staticFile('audio/voice/l05.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l06.start} durationInFrames={VO.l06.dur + 20}>
        <Audio src={staticFile('audio/voice/l06.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l07.start} durationInFrames={VO.l07.dur + 20}>
        <Audio src={staticFile('audio/voice/l07.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l08.start} durationInFrames={VO.l08.dur + 20}>
        <Audio src={staticFile('audio/voice/l08.mp3')} startFrom={0} volume={1.0} />
      </Sequence>

      {/* ═══════════════════ TURN VOICE ═══════════════════ */}
      <Sequence from={VO.lar1.start} durationInFrames={VO.lar1.dur + 20}>
        <Audio src={staticFile('audio/voice/lar1.mp3')} startFrom={0} volume={0.95} />
      </Sequence>
      <Sequence from={VO.lar2.start} durationInFrames={VO.lar2.dur + 20}>
        <Audio src={staticFile('audio/voice/lar2.mp3')} startFrom={0} volume={0.95} />
      </Sequence>

      {/* ═══════════════════ ACT 2 VOICE (v4e: lar2+0.1s, l09+0.1s, l12+0.2s, l13+0.15s) */}
      <Sequence from={VO.l09.start} durationInFrames={VO.l09.dur + 20}>
        <Audio src={staticFile('audio/voice/l09.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l10.start} durationInFrames={VO.l10.dur + 20}>
        <Audio src={staticFile('audio/voice/l10.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l11.start} durationInFrames={VO.l11.dur + 20}>
        <Audio src={staticFile('audio/voice/l11.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l12.start} durationInFrames={VO.l12.dur + 20}>
        <Audio src={staticFile('audio/voice/l12.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l13.start} durationInFrames={VO.l13.dur + 20}>
        <Audio src={staticFile('audio/voice/l13.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l14.start} durationInFrames={VO.l14.dur + 20}>
        <Audio src={staticFile('audio/voice/l14.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l15.start} durationInFrames={VO.l15.dur + 20}>
        <Audio src={staticFile('audio/voice/l15.mp3')} startFrom={0} volume={1.0} />
      </Sequence>
      <Sequence from={VO.l16.start} durationInFrames={VO.l16.dur + 20}>
        <Audio src={staticFile('audio/voice/l16.mp3')} startFrom={0} volume={1.0} />
      </Sequence>

      {/* ═══════════════════ ACT 1 SFX (unchanged) ═══════════════════ */}
      <Sequence from={0} durationInFrames={s(38)}>
        <Audio src={staticFile('audio/sfx/city-evening.mp3')} startFrom={0} volume={0.25} />
      </Sequence>
      <Sequence from={s(5)} durationInFrames={s(3)}>
        <Audio src={staticFile('audio/sfx/bus-brakes.mp3')} startFrom={0} volume={0.4} />
      </Sequence>
      <Sequence from={s(18)} durationInFrames={s(20)}>
        <Audio src={staticFile('audio/sfx/clock-tick.mp3')} startFrom={0}
          volume={(f) => 0.3 + (f / s(20)) * 0.5} />
      </Sequence>
      <Sequence from={s(26)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/phone-ring.mp3')} startFrom={0} volume={0.5} />
      </Sequence>
      <Sequence from={s(29)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/phone-ring-2.mp3')} startFrom={0} volume={0.6} />
      </Sequence>
      <Sequence from={s(32)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/phone-ring.mp3')} startFrom={0} volume={0.5} />
      </Sequence>
      <Sequence from={s(34)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/heartbeat.mp3')} startFrom={0} volume={0.6} />
      </Sequence>
      <Sequence from={s(33)} durationInFrames={s(5)}>
        <Audio src={staticFile('audio/sfx/riser.mp3')} startFrom={0} volume={0.7} />
      </Sequence>

      {/* ═══════════════════ TURN SFX (unchanged) ═══════════════════ */}
      <Sequence from={s(38) - 2} durationInFrames={s(2) + 2}>
        <Audio src={staticFile('audio/sfx/sub-drop.mp3')} startFrom={0} volume={0.9} />
      </Sequence>
      <Sequence from={s(38)} durationInFrames={s(1.5)}>
        <Audio src={staticFile('audio/sfx/heartbeat.mp3')} startFrom={0}
          volume={(f) => 0.35 * (1 - f / s(1.5))} />
      </Sequence>
      <Sequence from={s(38) + 36} durationInFrames={s(2.5)}>
        <Audio src={staticFile('audio/sfx/reverse-swell.mp3')} startFrom={0}
          volume={(f) => 0.55 + f / s(2.5) * 0.2} />
      </Sequence>
      <Sequence from={s(38) + 108} durationInFrames={s(2.5)}>
        <Audio src={staticFile('audio/sfx/warm-chord.mp3')} startFrom={0}
          volume={(f) => {
            const prog = f / s(2.5);
            return 0.6 * (prog < 0.3 ? prog / 0.3 : prog > 0.7 ? (1 - prog) / 0.3 : 1);
          }} />
      </Sequence>
      <Sequence from={s(38) + 140} durationInFrames={s(1)}>
        <Audio src={staticFile('audio/sfx/received-chime.mp3')} startFrom={0} volume={0.5} />
      </Sequence>
      <Sequence from={s(38) + 99} durationInFrames={s(1.5)}>
        <Audio src={staticFile('audio/sfx/soft-tone.mp3')} startFrom={0} volume={0.5} />
      </Sequence>
      <Sequence from={s(38) + 120} durationInFrames={s(12)}>
        <Audio src={staticFile('audio/sfx/airy-shimmer.mp3')} startFrom={0}
          volume={(f) => {
            const ramp = Math.min(f / s(2), 1);
            const fadeOut = f > s(10) ? 1 - (f - s(10)) / s(2) : 1;
            return 0.35 * ramp * fadeOut;
          }} />
      </Sequence>
      <Sequence from={s(38) + 150} durationInFrames={s(15)}>
        <Audio src={staticFile('audio/sfx/dawn-ambience.mp3')} startFrom={0}
          volume={(f) => Math.min(f / s(3), 1) * 0.3} />
      </Sequence>

      {/* ═══════════════════ ACT 2 SFX (v4e: +0.1s from v4d ACT2_START shift) */}
      {/* Chime cascade: SCENE.ACT2_START=48.70 (+0.1s from v4d 48.60) */}
      {[SCENE.ACT2_START, SCENE.ACT2_START + 10, SCENE.ACT2_START + 20, SCENE.ACT2_START + 30].map((startF, i) => (
        <Sequence key={`cascade-${i}`} from={startF} durationInFrames={s(1)}>
          <Audio src={staticFile('audio/sfx/received-chime.mp3')} startFrom={0}
            volume={0.4 - i * 0.05} />
        </Sequence>
      ))}

      {/* UI ticks: s(54.6) = same as v4d (l10 anchor unchanged) */}
      {[s(54.6), s(54.6) + 20, s(54.6) + 40].map((startF, i) => (
        <Sequence key={`tick-${i}`} from={startF} durationInFrames={s(1)}>
          <Audio src={staticFile('audio/sfx/ui-tick.mp3')} startFrom={0} volume={0.5} />
        </Sequence>
      ))}

      {/* Confirm: keyed to word "confirms" abs frame 2243 ≈ s(74.77) */}
      <Sequence from={s(74.8)} durationInFrames={s(2)}>
        <Audio src={staticFile('audio/sfx/confirm.mp3')} startFrom={0} volume={0.6} />
      </Sequence>

      {/* Received chimes: cascade from s(74.8)+0/20/40/60 */}
      {[s(74.8), s(74.8) + 20, s(74.8) + 40, s(74.8) + 60].map((startF, i) => (
        <Sequence key={`chime-${i}`} from={startF} durationInFrames={s(1)}>
          <Audio src={staticFile('audio/sfx/received-chime.mp3')} startFrom={0}
            volume={0.55} />
        </Sequence>
      ))}

      {/* Whoosh: s(76.0) — matches CHART start */}
      <Sequence from={s(76.1)} durationInFrames={s(2)}>
        <Audio src={staticFile('audio/sfx/whoosh.mp3')} startFrom={0} volume={0.4} />
      </Sequence>

      {/* ═══════════════════ VISUAL ═══════════════════ */}
      {renderSection()}
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="InsiyabV4f"
        component={Film}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Opening cut: 0-40s */}
      <Composition
        id="InsiyabV4fOpening"
        component={Film}
        durationInFrames={s(40)}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
}

registerRoot(RemotionRoot);
