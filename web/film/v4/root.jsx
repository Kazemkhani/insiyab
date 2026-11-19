// root.jsx — Insiyab Film v4: From Chaos to Calm
// 80 seconds · 1920x1080 · 30fps · 2400 frames
import React, { useEffect, useState } from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Audio, Sequence,
  useCurrentFrame, staticFile, delayRender, continueRender, cancelRender,
} from 'remotion';

import { FPS, TOTAL_FRAMES, SCENE, VO, s, musicVolume } from './beat.js';
import { C } from './colors.js';
import { Act1 } from './act1/Act1.jsx';
import { Turn } from './turn/Turn.jsx';
import { Act2 } from './act2/Act2.jsx';

// Font face declarations (inlined so they work inside Remotion)
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

function Film() {
  const [handle] = useState(() => delayRender('fonts-loaded'));
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      Promise.all([
        document.fonts.load('800 36px Overpass'),
        document.fonts.load('400 36px "IBM Plex Sans"'),
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

  // Choose which section to render
  const renderSection = () => {
    if (frame < SCENE.ACT1_END) {
      return <Act1 frame={frame} />;
    }
    if (frame < SCENE.ACT2_START) {
      return <Turn frame={frame} localFrame={frame - SCENE.ACT1_END} />;
    }
    return <Act2 frame={frame} />;
  };

  // --- Audio tracks ---
  // 1. Act 1 music: 0 to 38s
  const act1MusicVol = frame < s(38) ? musicVolume(frame) : 0;
  // 2. Turn silence: 38-42s — no music
  // 3. Act 2 music: 42-80s
  const act2MusicVol = frame >= s(42) ? musicVolume(frame) : 0;

  // SFX helper: plays a sound at a specific frame for its duration
  const SFX = ({ src, startFrame, volume = 0.7 }) => {
    if (frame < startFrame || frame > startFrame + s(5)) return null;
    return (
      <Audio
        src={staticFile(`audio/sfx/${src}`)}
        startFrom={0}
        volume={volume}
      />
    );
  };

  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: 'Overpass' }}>
      <style>{FONTS}</style>

      {/* === MUSIC === */}
      {/* Act 1 music (0-38s) */}
      <Sequence from={0} durationInFrames={s(38) + 10}>
        <Audio
          src={staticFile('audio/act1.mp3')}
          startFrom={0}
          volume={(f) => {
            if (f >= s(37)) return 0; // hard cut
            return musicVolume(f);
          }}
        />
      </Sequence>

      {/* Act 2 music (42-80s, starts at 42s in composition) */}
      <Sequence from={s(42)} durationInFrames={s(38) + 10}>
        <Audio
          src={staticFile('audio/act2.mp3')}
          startFrom={0}
          volume={(f) => {
            const compFrame = f + s(42);
            if (compFrame >= s(79)) return 0;
            return musicVolume(compFrame);
          }}
        />
      </Sequence>

      {/* === VOICE LINES === */}
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

      {/* === SFX === */}
      {/* City ambience (runs through Act 1) */}
      <Sequence from={0} durationInFrames={s(38)}>
        <Audio src={staticFile('audio/sfx/city-evening.mp3')} startFrom={0}
          volume={(f) => 0.25} />
      </Sequence>

      {/* Bus brakes at start of highway section */}
      <Sequence from={s(5)} durationInFrames={s(3)}>
        <Audio src={staticFile('audio/sfx/bus-brakes.mp3')} startFrom={0}
          volume={0.4} />
      </Sequence>

      {/* Clock tick starts at 18s, runs through control room */}
      <Sequence from={s(18)} durationInFrames={s(20)}>
        <Audio src={staticFile('audio/sfx/clock-tick.mp3')} startFrom={0}
          volume={(f) => {
            // Gets louder as tension builds
            const prog = f / s(20);
            return 0.3 + prog * 0.5;
          }} />
      </Sequence>

      {/* Phone rings multiplying from 26s */}
      <Sequence from={s(26)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/phone-ring.mp3')} startFrom={0}
          volume={0.5} />
      </Sequence>
      <Sequence from={s(29)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/phone-ring-2.mp3')} startFrom={0}
          volume={0.6} />
      </Sequence>
      <Sequence from={s(32)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/phone-ring.mp3')} startFrom={0}
          volume={0.5} />
      </Sequence>

      {/* Heartbeat sub at 34s */}
      <Sequence from={s(34)} durationInFrames={s(4)}>
        <Audio src={staticFile('audio/sfx/heartbeat.mp3')} startFrom={0}
          volume={0.6} />
      </Sequence>

      {/* Riser peaks at 38s */}
      <Sequence from={s(33)} durationInFrames={s(5)}>
        <Audio src={staticFile('audio/sfx/riser.mp3')} startFrom={0}
          volume={0.7} />
      </Sequence>

      {/* Sub drop at 38s */}
      <Sequence from={s(38)} durationInFrames={s(2)}>
        <Audio src={staticFile('audio/sfx/sub-drop.mp3')} startFrom={0}
          volume={0.9} />
      </Sequence>

      {/* Soft tone at emblem reveal (40.5s) */}
      <Sequence from={s(40.5)} durationInFrames={s(2)}>
        <Audio src={staticFile('audio/sfx/soft-tone.mp3')} startFrom={0}
          volume={0.6} />
      </Sequence>

      {/* UI ticks for map predictions in Act 2 (one per beat from 48s) */}
      <Sequence from={s(48)} durationInFrames={s(1)}>
        <Audio src={staticFile('audio/sfx/ui-tick.mp3')} startFrom={0} volume={0.5} />
      </Sequence>
      <Sequence from={s(48) + 20} durationInFrames={s(1)}>
        <Audio src={staticFile('audio/sfx/ui-tick.mp3')} startFrom={0} volume={0.5} />
      </Sequence>
      <Sequence from={s(48) + 40} durationInFrames={s(1)}>
        <Audio src={staticFile('audio/sfx/ui-tick.mp3')} startFrom={0} volume={0.5} />
      </Sequence>

      {/* Confirm tone at controller decision */}
      <Sequence from={s(62)} durationInFrames={s(2)}>
        <Audio src={staticFile('audio/sfx/confirm.mp3')} startFrom={0} volume={0.6} />
      </Sequence>

      {/* Received chimes — 4 beats from s(63) */}
      {[s(63), s(63)+20, s(63)+40, s(63)+60].map((startF, i) => (
        <Sequence key={i} from={startF} durationInFrames={s(1)}>
          <Audio src={staticFile('audio/sfx/received-chime.mp3')} startFrom={0} volume={0.55} />
        </Sequence>
      ))}

      {/* Whoosh on chart reveal */}
      <Sequence from={s(66)} durationInFrames={s(2)}>
        <Audio src={staticFile('audio/sfx/whoosh.mp3')} startFrom={0} volume={0.4} />
      </Sequence>

      {/* === VISUAL RENDER === */}
      {renderSection()}
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="InsiyabV4"
        component={Film}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Stage cut: 0 to 40s = 1200 frames */}
      <Composition
        id="InsiyabV4Opening"
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
