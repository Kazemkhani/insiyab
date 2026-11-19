// CallChain.jsx (v4b) — 58-66s: ivory background, kit SVG icons, non-specific briefing
// Gold = Insiyab only. Teal = Received only. Call lines = ink 40%.
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { FPS, s, BEAT } from '../../../v4/beat.js';

// --- Inline SVG icons from ~/work/insiyab-deploy/brand/assets/icons/ ---
function DriverIcon({ size = 64, color = C.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5.5" r="2.25"/>
      <path d="M6.5 11.5C7.5 9.5 16.5 9.5 17.5 11.5"/>
      <circle cx="12" cy="16" r="5"/>
      <path d="M7.5 14H16.5M12 14V21"/>
    </svg>
  );
}

function DepotIcon({ size = 64, color = C.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V7.5L12 3L21 7.5V21Z"/>
      <path d="M6.5 21V12H10V21M14 21V12H17.5V21M7 8.5H17"/>
    </svg>
  );
}

function StationIcon({ size = 64, color = C.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L6 4.5H18L21 9ZM5 9V21M19 9V21"/>
      <path d="M8 14H16M8 17H16M9 14V20M15 14V20M3 21H21"/>
    </svg>
  );
}

function PlanningIcon({ size = 64, color = C.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M7 3V7M17 3V7M3 9H21M7 17H10C13 17 11 13 14 13H17"/>
      <path d="M7 15.5V18.5M17 11.5V14.5"/>
    </svg>
  );
}

const ROLES = [
  { label: 'Driver',   icon: DriverIcon,   key: 'driver' },
  { label: 'Depot',    icon: DepotIcon,     key: 'depot' },
  { label: 'Station',  icon: StationIcon,   key: 'station' },
  { label: 'Planning', icon: PlanningIcon,  key: 'planning' },
];

function RoleCard({ icon: Icon, label, receivedFrame, frame, appearFrame }) {
  const appear = interpolate(frame, [appearFrame, appearFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const received = receivedFrame ? interpolate(
    frame, [receivedFrame, receivedFrame + 12], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) : 0;

  // On ivory bg: unreceived = ink border; received = teal border
  const borderColor = received > 0.5 ? C.teal : 'rgba(21,24,29,0.25)';
  const iconColor = received > 0.5 ? C.teal : C.ink;
  const bg = received > 0.5 ? `rgba(46,125,107,0.08)` : 'rgba(21,24,29,0.04)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
      opacity: appear,
      transform: `translateY(${interpolate(appear, [0,1], [20, 0])}px)`,
    }}>
      <div style={{
        width: 120,
        height: 120,
        borderRadius: 14,
        border: `2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
      }}>
        <Icon size={64} color={iconColor} />
      </div>
      {/* Full name >= 34px */}
      <div style={{
        fontFamily: '"IBM Plex Sans"',
        fontSize: 34,
        fontWeight: 600,
        color: received > 0.5 ? C.teal : C.ink,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {received > 0 && (
        <div style={{
          fontFamily: '"IBM Plex Sans"',
          fontSize: 26,
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
  const y1 = 420;
  const y2 = 580;

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
            stroke={C.ink}
            strokeWidth={2}
            strokeDasharray="8 4"
            strokeDashoffset={-prog * 100}
            opacity={prog * 0.4}
          />
        );
      })}
    </svg>
  );
}

export function CallChain({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(8)

  const briefingOpacity = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const decisionProgress = interpolate(lf, [BEAT * 2, BEAT * 2 + 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const callsStart = BEAT * 3;
  const receivedFrames = ROLES.map((_, i) => callsStart + BEAT + i * BEAT);
  const rolesAppearStart = BEAT * 2 - 10;

  const cap12 = interpolate(lf, [0, 6, s(5.5), s(6)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cap13 = interpolate(lf, [s(6), s(6.3), s(7.5), s(8)], [0,1,1,0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    // Ivory background — the visual lift
    <AbsoluteFill style={{ background: C.ivory }}>
      {/* Briefing card — white card on ivory */}
      <div style={{
        position: 'absolute',
        top: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 760,
        opacity: briefingOpacity,
      }}>
        <div style={{
          background: 'rgba(21,24,29,0.05)',
          border: `1.5px solid ${
            decisionProgress > 0.5
              ? C.gold
              : 'rgba(21,24,29,0.2)'
          }`,
          borderRadius: 10,
          padding: '28px 36px',
        }}>
          {/* "Insiyab Briefing" label */}
          <div style={{
            fontFamily: '"IBM Plex Sans"',
            fontSize: 20,
            fontWeight: 600,
            color: C.gold,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Insiyab Briefing
          </div>
          {/* Non-specific briefing text >= 34px, ink color */}
          <div style={{
            fontFamily: 'Overpass',
            fontWeight: 600,
            fontSize: 34,
            color: C.ink,
            lineHeight: 1.5,
          }}>
            Route: 8 min delay risk<br />
            Stop: overflow likely<br />
            41°C heat index, affected stop
          </div>
          {/* Small "Illustrative" label */}
          <div style={{
            marginTop: 10,
            fontFamily: '"IBM Plex Sans"',
            fontSize: 14,
            fontWeight: 400,
            color: 'rgba(21,24,29,0.4)',
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}>
            Illustrative
          </div>
          {decisionProgress > 0 && (
            <div style={{
              marginTop: 20,
              padding: '12px 20px',
              border: `1.5px solid ${C.gold}`,
              borderRadius: 6,
              fontFamily: 'Overpass',
              fontWeight: 800,
              fontSize: 24,
              color: C.gold,
              opacity: decisionProgress,
              letterSpacing: '0.03em',
            }}>
              Controller's decision
            </div>
          )}
        </div>
      </div>

      {/* Call lines — ink 40% opacity (not teal) */}
      {lf >= callsStart && (
        <CallLines frame={lf} startFrame={callsStart} roleCount={ROLES.length} />
      )}

      {/* Role cards with kit icons + full names */}
      <div style={{
        position: 'absolute',
        bottom: 180,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 100,
      }}>
        {ROLES.map((role, i) => (
          <RoleCard
            key={role.key}
            icon={role.icon}
            label={role.label}
            frame={lf}
            appearFrame={rolesAppearStart + i * 8}
            receivedFrame={receivedFrames[i]}
          />
        ))}
      </div>

      {/* Voice captions */}
      {cap12 > 0 && (
        <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80, opacity: cap12 }}>
          <div style={{
            background: 'rgba(21,24,29,0.82)', padding: '10px 20px',
            borderRadius: 4, fontFamily: '"IBM Plex Sans"', fontSize: 36,
            color: C.ivory, display: 'inline-block',
          }}>
            It suggests a fix, and calls everyone who makes it happen. At once.
          </div>
        </div>
      )}
      {cap13 > 0 && (
        <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80, opacity: cap13 }}>
          <div style={{
            background: 'rgba(21,24,29,0.82)', padding: '10px 20px',
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
