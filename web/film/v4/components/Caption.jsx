// Caption.jsx — burned-in caption bar synced to voice lines
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../colors.js';

/**
 * Caption — shows a text caption with a semi-opaque ink band.
 * Fades in quickly and fades out quickly.
 * @param {object} props
 * @param {number} props.frame    — current frame
 * @param {number} props.start   — start frame of this caption
 * @param {number} props.end     — end frame of this caption
 * @param {string} props.text    — caption text
 * @param {string} [props.align] — 'left' | 'center' (default 'left')
 */
export function Caption({ frame, start, end, text, align = 'left' }) {
  const FADE = 6; // frames to fade in/out
  const opacity = interpolate(
    frame,
    [start, start + FADE, end - FADE, end],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  if (opacity <= 0) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: 80,
      left: 80,
      right: 80,
      opacity,
      display: 'flex',
      justifyContent: align === 'center' ? 'center' : 'flex-start',
    }}>
      <div style={{
        background: 'rgba(21,24,29,0.78)',
        backdropFilter: 'blur(2px)',
        padding: '10px 20px',
        borderRadius: 4,
        fontFamily: '"IBM Plex Sans"',
        fontSize: 36,
        fontWeight: 400,
        color: C.ivory,
        lineHeight: 1.4,
        maxWidth: '80%',
        letterSpacing: '-0.01em',
      }}>
        {text}
      </div>
    </div>
  );
}

/**
 * CreditTag — small top-right credit label per footage shot
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
