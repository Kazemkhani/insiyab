// KineticType.jsx — word-by-word type-on effect and departures board flip
import React from 'react';
import { interpolate } from 'remotion';
import { C } from '../colors.js';

/**
 * WordByWord — reveals words one at a time, one word per 'wordFrames' frames.
 */
export function WordByWord({ frame, startFrame, text, wordFrames = 8,
  fontSize = 80, color = C.ivory, fontWeight = 800,
  fontFamily = 'Overpass', align = 'left' }) {
  const words = text.split(' ');
  const elapsed = frame - startFrame;
  const wordsShown = Math.max(0, Math.floor(elapsed / wordFrames) + 1);
  return (
    <div style={{
      fontFamily,
      fontWeight,
      fontSize,
      color,
      lineHeight: 1.3,
      textAlign: align,
      letterSpacing: '-0.02em',
    }}>
      {words.map((w, i) => (
        <span key={i} style={{
          opacity: i < wordsShown ? 1 : 0,
          display: 'inline',
          marginRight: '0.28em',
          transition: 'opacity 0.1s',
        }}>
          {w}
        </span>
      ))}
    </div>
  );
}

/**
 * FlipNumber — simulates a departures-board flip animation.
 * Shows a 6-character clock string that increments every flipFrames frames.
 */
export function FlipClock({ frame, startFrame, startTime = '17:59:52', targetTime = '18:00',
  flipFrames = 2, fontSize = 180 }) {
  // Parse startTime into seconds
  const parseTime = (t) => {
    const [h, m, s] = t.split(':').map(Number);
    return h * 3600 + (m || 0) * 60 + (s || 0);
  };
  const start = parseTime(startTime);
  const elapsed = Math.max(0, frame - startFrame);
  const secondsElapsed = Math.floor(elapsed / flipFrames);
  const current = start + secondsElapsed;
  const h = Math.floor(current / 3600) % 24;
  const m = Math.floor((current % 3600) / 60);
  const s = current % 60;
  const str = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return (
    <div style={{
      fontFamily: 'Overpass',
      fontWeight: 800,
      fontSize,
      color: C.ivory,
      letterSpacing: '0.08em',
      fontVariantNumeric: 'tabular-nums',
      textShadow: '0 0 40px rgba(21,24,29,0.6)',
    }}>
      {str}
    </div>
  );
}

/**
 * SlammingText — a large word that slams in with a scale+opacity effect.
 */
export function SlammingText({ frame, startFrame, text, fontSize = 200,
  color = C.red, fontWeight = 800, durationFrames = 12 }) {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 2) }
  );
  const scale = interpolate(progress, [0, 0.6, 1], [1.4, 0.95, 1]);
  const opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1]);
  return (
    <div style={{
      fontFamily: 'Overpass',
      fontWeight,
      fontSize,
      color,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'left center',
    }}>
      {text}
    </div>
  );
}
