// CallChain.jsx (v4d) — 64.6–72.6s
// Design rules (v4d, supersede v4b):
//   - Medallions: 96px circles, ink disc, ivory icon, thin gold outer ring
//   - On Received: teal ring + small "Received" label
//   - Connectors: solid 1.5px gold hairlines (#9C7B3E at 70%), cubic Bézier curves
//     from Insiyab card bottom-edge to icon top-centers; animated outward on "calling"
//     then inward (reverse) on "received"
//   - Names: IBM Plex Sans semibold, sentence case, normal letter-spacing
//   - Briefing card: ivory panel, 1px gold rule top only, generous padding
//   - Background: SVG feTurbulence procedural fine paper texture, <4% contrast
//   - No flat grey fills, no dashed lines, no backdrop-blur
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { C } from '../../../v4/colors.js';
import { FPS, s, BEAT } from '../../../v4/beat.js';

const W = 1920;
const H = 1080;

// ---- Procedural paper background -------------------------------------------
// SVG feTurbulence at <4% contrast — warm ivory stone
function PaperBg() {
  return (
    <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>
      <defs>
        <filter id="cc-paper-v4d" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65 0.70"
            numOctaves="4"
            seed="42"
            result="noise"
          />
          <feColorMatrix
            type="matrix"
            // Maps noise → very faint warm tint at ~3% contrast on ivory
            values="0 0 0 0 0.968
                    0 0 0 0 0.957
                    0 0 0 0 0.937
                    0 0 0 0.04 0"
            result="tinted"
          />
          <feComposite in="tinted" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>
      {/* Ivory base */}
      <rect width={W} height={H} fill={C.ivory} />
      {/* Texture layer */}
      <rect width={W} height={H} fill={C.ivory} filter="url(#cc-paper-v4d)" />
    </svg>
  );
}

// ---- SVG icon paths (stroke-based, designed for medallion) -----------------
function DriverPath({ size, color }) {
  const sc = size / 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5.5" r="2.25" />
      <path d="M6.5 11.5C7.5 9.5 16.5 9.5 17.5 11.5" />
      <circle cx="12" cy="16" r="5" />
      <path d="M7.5 14H16.5M12 14V21" />
    </svg>
  );
}
function DepotPath({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V7.5L12 3L21 7.5V21Z" />
      <path d="M6.5 21V12H10V21M14 21V12H17.5V21M7 8.5H17" />
    </svg>
  );
}
function StationPath({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L6 4.5H18L21 9ZM5 9V21M19 9V21" />
      <path d="M8 14H16M8 17H16M9 14V20M15 14V20M3 21H21" />
    </svg>
  );
}
function PlanningPath({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3V7M17 3V7M3 9H21M7 17H10C13 17 11 13 14 13H17" />
      <path d="M7 15.5V18.5M17 11.5V14.5" />
    </svg>
  );
}

const ROLES = [
  { key: 'driver',   label: 'Driver',   Icon: DriverPath },
  { key: 'depot',    label: 'Depot',     Icon: DepotPath },
  { key: 'station',  label: 'Station',   Icon: StationPath },
  { key: 'planning', label: 'Planning',  Icon: PlanningPath },
];

// ---- Medallion (96px circle, ink disc, ivory icon, gold ring) --------------
function Medallion({ Icon, label, frame, appearFrame, receivedFrame }) {
  const appear = interpolate(frame, [appearFrame, appearFrame + 15], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const received = receivedFrame ? interpolate(
    frame, [receivedFrame, receivedFrame + 12], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  ) : 0;

  const outerRing = received > 0.5 ? C.teal : C.gold;
  const outerWidth = received > 0.5 ? 2.5 : 1.5;
  const iconColor = C.ivory;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      opacity: appear,
      transform: `translateY(${interpolate(appear, [0, 1], [24, 0])}px)`,
    }}>
      {/* Circle medallion */}
      <div style={{
        width: 96,
        height: 96,
        borderRadius: '50%',
        background: C.ink,
        border: `${outerWidth}px solid ${outerRing}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        transition: 'border-color 0.3s',
      }}>
        <Icon size={42} color={iconColor} />
      </div>

      {/* Name: IBM Plex Sans semibold, sentence case, normal letter-spacing */}
      <div style={{
        fontFamily: '"IBM Plex Sans"',
        fontSize: 34,
        fontWeight: 600,
        color: received > 0.5 ? C.teal : C.ink,
        letterSpacing: 0,
        textTransform: 'none',   // ← sentence case, not uppercase
      }}>
        {label}
      </div>

      {/* "Received" label */}
      {received > 0 && (
        <div style={{
          fontFamily: '"IBM Plex Sans"',
          fontSize: 24,
          fontWeight: 500,
          color: C.teal,
          opacity: received,
          letterSpacing: 0,
        }}>
          Received
        </div>
      )}
    </div>
  );
}

// ---- Cubic Bézier connectors -----------------------------------------------
// From briefing card bottom-center → each medallion top-center
// animate outward (calling), then fade to teal on received
function Connectors({ frame, callingStart, receivedFrames, medalPositions }) {
  // Briefing card: top=100, height~220, so bottom-edge y ≈ 320
  const sourceX = W / 2;
  const sourceY = 332;   // bottom of briefing card
  const medalY  = H - 300 - 96 / 2; // center of medallions (top of circles)

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={W} height={H}>
      {ROLES.map((role, i) => {
        const targetX = medalPositions[i];
        const targetY = medalY - 48 + 10;   // near top of medallion

        // Cubic Bézier: control points push outward from source, inward to target
        const dx = targetX - sourceX;
        const cp1x = sourceX + dx * 0.15;
        const cp1y = sourceY + 80;           // drop from card bottom
        const cp2x = targetX - dx * 0.1;
        const cp2y = targetY - 80;           // rise into medallion top

        const path = `M ${sourceX},${sourceY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;

        // Measure approx path length for strokeDashoffset animation
        const pathLen = Math.sqrt(dx * dx + (targetY - sourceY) ** 2) * 1.2;

        const callProg = interpolate(frame,
          [callingStart + i * 8, callingStart + i * 8 + 25], [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

        if (callProg <= 0) return null;

        const isReceived = receivedFrames[i]
          ? frame >= receivedFrames[i] + 6
          : false;

        // On received: color transitions gold → teal
        const receivedProg = receivedFrames[i] ? interpolate(frame,
          [receivedFrames[i], receivedFrames[i] + 12], [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

        const lineColor = receivedProg > 0
          ? `rgba(46,125,107,${0.5 + receivedProg * 0.3})`
          : 'rgba(156,123,62,0.70)';  // gold at 70%

        return (
          <path key={role.key}
            d={path}
            fill="none"
            stroke={lineColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            // Draw outward: dashoffset from full (0) to 0 (pathLen exposed)
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen * (1 - callProg)}
            opacity={callProg}
          />
        );
      })}
    </svg>
  );
}

// ---- Main component --------------------------------------------------------
export function CallChain({ frame, localFrame }) {
  const lf = localFrame; // 0 to s(8)

  const briefingOpacity = interpolate(lf, [0, 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const decisionProgress = interpolate(lf, [BEAT * 2, BEAT * 2 + 20], [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const callingStart = BEAT * 3;
  const receivedFrames = ROLES.map((_, i) => callingStart + BEAT + i * BEAT);
  const rolesAppearStart = BEAT * 2 - 10;

  // Medallion horizontal positions
  const spacing = 300;
  const totalW = spacing * (ROLES.length - 1);
  const medalPositions = ROLES.map((_, i) => W / 2 - totalW / 2 + i * spacing);

  // Caption timing: l12 at start, l13 from s(6)
  const cap12 = interpolate(lf, [0, 6, s(5.5), s(6)], [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cap13 = interpolate(lf, [s(6), s(6.3), s(7.5), s(8)], [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      {/* Procedural paper background */}
      <PaperBg />

      {/* Briefing card — ivory panel, 1px gold top rule, generous padding */}
      <div style={{
        position: 'absolute',
        top: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 800,
        opacity: briefingOpacity,
      }}>
        <div style={{
          background: C.ivory,
          borderTop: `1px solid ${C.gold}`,
          padding: '32px 44px 36px',
          boxShadow: '0 20px 60px rgba(21,24,29,0.08)',
        }}>
          {/* "Briefing" label — Overpass 600, sentence case */}
          <div style={{
            fontFamily: 'Overpass',
            fontSize: 18,
            fontWeight: 600,
            color: C.gold,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 22,
          }}>
            Briefing
          </div>

          {/* Three IBM Plex Sans 40px lines, ink color */}
          <div style={{
            fontFamily: '"IBM Plex Sans"',
            fontWeight: 400,
            fontSize: 40,
            color: C.ink,
            lineHeight: 1.5,
          }}>
            Route: 8 min delay risk<br />
            Stop: overflow likely<br />
            41°C heat index, affected stop
          </div>

          {/* "Illustrative" small */}
          <div style={{
            marginTop: 10,
            fontFamily: '"IBM Plex Sans"',
            fontSize: 14,
            fontWeight: 400,
            color: `rgba(21,24,29,0.40)`,
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}>
            Illustrative
          </div>

          {/* Controller's decision — ink border row, fills on chosen */}
          {decisionProgress > 0 && (
            <div style={{
              marginTop: 24,
              padding: '14px 22px',
              border: `1px solid ${C.ink}`,
              fontFamily: '"IBM Plex Sans"',
              fontWeight: 500,
              fontSize: 36,
              color: decisionProgress > 0.5 ? C.ivory : C.ink,
              background: decisionProgress > 0.5 ? C.ink : C.ivory,
              opacity: decisionProgress,
              letterSpacing: 0,
              transition: 'background 0.3s, color 0.3s',
            }}>
              Controller's decision
            </div>
          )}
        </div>
      </div>

      {/* Cubic connectors */}
      {lf >= callingStart && (
        <Connectors
          frame={lf}
          callingStart={callingStart}
          receivedFrames={receivedFrames}
          medalPositions={medalPositions}
        />
      )}

      {/* Medallions */}
      <div style={{
        position: 'absolute',
        bottom: 180,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: `${spacing - 96}px`,
        alignItems: 'flex-start',
      }}>
        {ROLES.map((role, i) => (
          <Medallion
            key={role.key}
            Icon={role.Icon}
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
            background: 'rgba(21,24,29,0.86)', padding: '12px 22px',
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
            background: 'rgba(21,24,29,0.86)', padding: '12px 22px',
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
