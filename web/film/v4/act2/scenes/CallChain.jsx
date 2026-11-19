// CallChain.jsx — 58-66s: role icons, parallel calls, briefing card, confirmed
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../../colors.js';
import { FPS, s, BEAT } from '../../beat.js';

const ROLES = [
  { label: 'Driver', abbr: 'D', key: 'driver' },
  { label: 'Depot', abbr: 'Dp', key: 'depot' },
  { label: 'Station', abbr: 'St', key: 'station' },
  { label: 'Planning', abbr: 'Pl', key: 'planning' },
];

function RoleCard({ abbr, label, receivedFrame, frame, appearFrame }) {
  const appear = interpolate(frame, [appearFrame, appearFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const received = receivedFrame ? interpolate(
    frame, [receivedFrame, receivedFrame + 12], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) : 0;

  const borderColor = received > 0.5 ? C.teal : 'rgba(247,245,240,0.3)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      opacity: appear,
      transform: `translateY(${interpolate(appear, [0,1], [20, 0])}px)`,
    }}>
      <div style={{
        width: 100,
        height: 100,
        borderRadius: 12,
        border: `2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Overpass',
        fontWeight: 800,
        fontSize: 40,
        background: received > 0.5 ? `rgba(46,125,107,0.15)` : 'rgba(247,245,240,0.05)',
        transition: 'all 0.3s ease',
        color: received > 0.5 ? C.teal : C.ivory,
      }}>
        {abbr}
      </div>
      <div style={{
        fontFamily: '"IBM Plex Sans"',
        fontSize: 22,
        fontWeight: 500,
        color: received > 0.5 ? C.teal : C.ivory,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {received > 0 && (
        <div style={{
          fontFamily: '"IBM Plex Sans"',
          fontSize: 20,
          fontWeight: 500,
          color: C.teal,
          opacity: received,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Received
        </div>
      )}
    </div>
  );
}

function CallLines({ frame, startFrame, roleCount }) {
  const lines = Array.from({ length: roleCount }, (_, i) => {
    const start = startFrame + i * 8;
    const progress = interpolate(frame, [start, start + 25], [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return progress;
  });

  const W = 1920;
  const centerX = W / 2;
  const y1 = 420; // from briefing card
  const y2 = 580; // to role cards

  // Role card positions (evenly spread)
  const positions = ROLES.map((_, i) => {
    const spacing = 300;
    const totalW = spacing * (roleCount - 1);
    return centerX - totalW / 2 + i * spacing;
  });

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={W} height={1080}>
      {lines.map((prog, i) => {
        if (prog <= 0) return null;
        const x2 = positions[i];
        return (
          <line key={i}
            x1={centerX} y1={y1}
            x2={x2} y2={y2}
            stroke={C.teal}
            strokeWidth={2}
            strokeDasharray="8 4"
            strokeDashoffset={-prog * 100}
            opacity={prog * 0.8}
          />
        );
      })}
    </svg>
  );
}

export function CallChain({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(8)

  // Briefing card assembles
  const briefingOpacity = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Controller's decision highlight
  const decisionProgress = interpolate(lf, [BEAT * 2, BEAT * 2 + 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Relay sweep (calls fire)
  const callsStart = BEAT * 3;

  // Received — one per beat after calls start
  const receivedFrames = ROLES.map((_, i) => callsStart + BEAT + i * BEAT);

  // Role icons appear
  const rolesAppearStart = BEAT * 2 - 10;

  // Captions
  const cap12 = interpolate(lf, [0, 6, s(5.5), s(6)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cap13 = interpolate(lf, [s(6), s(6.3), s(7.5), s(8)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Top: Briefing card */}
      <div style={{
        position: 'absolute',
        top: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 700,
        opacity: briefingOpacity,
      }}>
        <div style={{
          background: `rgba(247,245,240,0.06)`,
          border: `1px solid ${
            decisionProgress > 0.5
              ? C.gold
              : 'rgba(247,245,240,0.2)'
          }`,
          borderRadius: 8,
          padding: '24px 32px',
        }}>
          <div style={{
            fontFamily: '"IBM Plex Sans"',
            fontSize: 20,
            fontWeight: 500,
            color: C.gold,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Insiyab Briefing
          </div>
          <div style={{
            fontFamily: 'Overpass',
            fontWeight: 600,
            fontSize: 28,
            color: C.ivory,
            lineHeight: 1.5,
          }}>
            Route 303: 8 min delay risk<br />
            Stop 1446: overflow likely<br />
            41°C heat index, stop 2219
          </div>
          {decisionProgress > 0 && (
            <div style={{
              marginTop: 20,
              padding: '12px 20px',
              border: `1.5px solid ${C.gold}`,
              borderRadius: 6,
              fontFamily: 'Overpass',
              fontWeight: 800,
              fontSize: 22,
              color: C.gold,
              opacity: decisionProgress,
              letterSpacing: '0.03em',
            }}>
              Controller's decision
            </div>
          )}
        </div>
      </div>

      {/* Call lines */}
      {lf >= callsStart && (
        <CallLines frame={lf} startFrame={callsStart} roleCount={ROLES.length} />
      )}

      {/* Role cards */}
      <div style={{
        position: 'absolute',
        bottom: 200,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 100,
      }}>
        {ROLES.map((role, i) => (
          <RoleCard
            key={role.key}
            abbr={role.abbr}
            label={role.label}
            frame={lf}
            appearFrame={rolesAppearStart + i * 8}
            receivedFrame={receivedFrames[i]}
          />
        ))}
      </div>

      {/* Voice captions */}
      {cap12 > 0 && (
        <div style={{ position: 'absolute', bottom: 80, left: 80, right: 80, opacity: cap12 }}>
          <div style={{
            background: 'rgba(21,24,29,0.85)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            It suggests a fix, and calls everyone who makes it happen. At once.
          </div>
        </div>
      )}
      {cap13 > 0 && (
        <div style={{ position: 'absolute', bottom: 80, left: 80, right: 80, opacity: cap13 }}>
          <div style={{
            background: 'rgba(21,24,29,0.85)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            One briefing. The controller decides. Everyone confirms.
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
