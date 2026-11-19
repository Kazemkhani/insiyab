// Caption.jsx (v4e) — word-level caption reveal backed by forced-alignment JSON
//
// Design rules (v4e brief, mandatory):
//   • Current word (being spoken): ivory #F7F5F0 at opacity 1.0
//   • Upcoming words (not yet spoken): ivory at opacity 0.4
//   • Past words (already spoken): ivory at opacity 1.0 (karaoke hold)
//   • Caption band appears at startAbs − 0.1s (5-frame pre-roll)
//   • Caption band CLEARS 0.3s after last word's end time
//   • Arabic lines: direction=rtl, Noto Kufi Arabic, alignment works character-by-word
//   • Fallback: if alignment fetch fails, full text at ivory 1.0 (whole-line, old behavior)
//
// Props:
//   line     (string) — 'l01' … 'l16' | 'lar1' | 'lar2'
//   frame    (number) — current ABSOLUTE composition frame
//   startAbs (number) — line start in SECONDS (absolute composition time)
//   text     (string) — fallback caption text
//   rtl      (boolean, default false) — true for Arabic lines
//   align    ('left' | 'center', default 'left')
//
// PROOF GREP TARGET: this file uses staticFile + delayRender to load alignment JSON
// grep -n 'align.json' web/film/v4e/components/Caption.jsx

import React, { useState, useEffect } from 'react';
import { staticFile, delayRender, continueRender } from 'remotion';

const FPS = 30;
const IVORY = '#F7F5F0';
const CAPTION_BAND = 'rgba(21,24,29,0.78)';

/**
 * WordCaption — the actual word-by-word band.
 * Shown when alignment data is available.
 */
function WordCaption({ words, absTime, startAbs, rtl, align }) {
  const rendered = words.map((w, i) => {
    const wordStartAbs = startAbs + w.start;    // seconds
    const spoken       = absTime >= wordStartAbs;
    const color        = spoken
      ? `rgba(247,245,240,1.0)`   // current or past word — full ivory
      : `rgba(247,245,240,0.4)`;  // upcoming word — ivory at 40%

    // Insert a space after each word except the last
    // For RTL Arabic: words already contain proper spacing in the JSON text
    const sep = i < words.length - 1
      ? (rtl ? '‏ ' : ' ')   // RTL mark + space for Arabic, plain space otherwise
      : '';

    return (
      <span key={i} style={{ color }}>
        {w.text}{sep}
      </span>
    );
  });

  return (
    <div style={{
      fontFamily: rtl ? '"Noto Kufi Arabic"' : '"IBM Plex Sans"',
      fontSize: 36,
      fontWeight: 400,
      color: IVORY,
      lineHeight: 1.4,
      direction: rtl ? 'rtl' : 'ltr',
      letterSpacing: rtl ? '0.03em' : '-0.01em',
      display: 'inline',
    }}>
      {rendered}
    </div>
  );
}

/**
 * Caption — word-level caption bar synced to ElevenLabs forced-alignment JSON.
 *
 * Usage:
 *   <Caption line="l13" frame={frame} startAbs={71.5} text="One briefing…" />
 *   <Caption line="lar2" frame={frame} startAbs={45.3} text="المدينة تشوف اللي جاي" rtl />
 */
export function Caption({ line, frame, startAbs, text, rtl = false, align = 'left' }) {
  // delayRender gate: Remotion pauses this frame until continueRender is called.
  // useState initializer ensures handle is created once per component instance,
  // which persists across frame re-renders in the headless browser render process.
  const [handle] = useState(() => delayRender(`caption-align-${line}`));
  const [words, setWords]   = useState(null);  // null = loading; [] = failed
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Fetch forced-alignment JSON: audio/voice/${line}-align.json
    fetch(staticFile(`audio/voice/${line}-align.json`))
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        // Filter out space-only tokens (ElevenLabs alignment includes ' ' entries)
        const filtered = (data.words || []).filter(
          w => w.text && w.text.trim() !== '' && w.text !== ' '
        );
        setWords(filtered);
        continueRender(handle);
      })
      .catch(err => {
        console.warn(`Caption: failed to load ${line}-align.json:`, err);
        setFailed(true);
        setWords([]);
        continueRender(handle);
      });
  }, [handle, line]); // eslint-disable-line react-hooks/exhaustive-deps

  const absTime = frame / FPS;   // current time in seconds

  // ── Visibility window ──────────────────────────────────────────────────────
  // Start: startAbs − 0.1s (brief pre-roll so band doesn't pop in on word 1)
  // End:   last word's absolute end + 0.3s
  const preRoll = 0.1;
  const clearDelay = 0.3;

  // Before pre-roll: nothing visible
  if (absTime < startAbs - preRoll) return null;

  // Compute end from words array when available
  if (words && words.length > 0) {
    const lastWord    = words[words.length - 1];
    const lastEndAbs  = startAbs + lastWord.end;
    if (absTime > lastEndAbs + clearDelay) return null;
  }

  // ── Band container (positioned identically to v4/Caption.jsx) ─────────────
  const containerStyle = {
    position: 'absolute',
    bottom: 80,
    left: 80,
    right: 80,
    display: 'flex',
    justifyContent: align === 'center' ? 'center' : (rtl ? 'flex-end' : 'flex-start'),
  };

  const bandStyle = {
    background: CAPTION_BAND,
    backdropFilter: 'blur(2px)',
    padding: '10px 20px',
    borderRadius: 4,
    maxWidth: '80%',
    display: 'inline-block',
  };

  // ── Fallback: alignment fetch failed or not yet loaded ────────────────────
  if (!words || failed) {
    // Render full line in ivory (matches v4d behavior — only whole-line opacity)
    return (
      <div style={containerStyle}>
        <div style={bandStyle}>
          <span style={{
            fontFamily: rtl ? '"Noto Kufi Arabic"' : '"IBM Plex Sans"',
            fontSize: 36,
            fontWeight: 400,
            color: `rgba(247,245,240,1.0)`,
            direction: rtl ? 'rtl' : 'ltr',
            letterSpacing: rtl ? '0.03em' : '-0.01em',
            lineHeight: 1.4,
          }}>
            {text}
          </span>
        </div>
      </div>
    );
  }

  // ── Normal: word-by-word reveal ───────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={bandStyle}>
        <WordCaption
          words={words}
          absTime={absTime}
          startAbs={startAbs}
          rtl={rtl}
          align={align}
        />
      </div>
    </div>
  );
}

/**
 * CreditTag — small top-right source credit label.
 * Re-exported for backward compat (ControlRoom, Highway, etc. import it from here).
 */
export function CreditTag({ text }) {
  return (
    <div style={{
      position: 'absolute',
      top: 24,
      right: 24,
      fontFamily: '"IBM Plex Sans"',
      fontSize: 14,
      fontWeight: 400,
      color: 'rgba(247,245,240,0.6)',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      pointerEvents: 'none',
    }}>
      {text}
    </div>
  );
}

/**
 * BottomCreditTag — credit positioned at bottom-left above caption band.
 * Use in scenes where top-right overlaps with dynamic content.
 */
export function BottomCreditTag({ text }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 160,
      left: 80,
      fontFamily: '"IBM Plex Sans"',
      fontSize: 14,
      fontWeight: 400,
      color: 'rgba(247,245,240,0.6)',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      pointerEvents: 'none',
      lineHeight: 1.4,
      maxWidth: 700,
    }}>
      {text}
    </div>
  );
}
