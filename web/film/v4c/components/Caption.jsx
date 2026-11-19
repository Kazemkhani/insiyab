// Caption.jsx (v4c) — adds BottomCreditTag to avoid alert tile overlap at ~36s
// CreditTag is at top-right; BottomCreditTag is at bottom-left above caption band.
// Also re-exports Caption unchanged from v4.
export { Caption } from '../../v4/components/Caption.jsx';

/**
 * CreditTag — original: top-right position (may overlap alert tiles).
 * Kept for backward compat; new ControlRoom.jsx uses BottomCreditTag.
 */
export { CreditTag } from '../../v4/components/Caption.jsx';

/**
 * BottomCreditTag — credit positioned at bottom-left above caption band.
 * Use in any scene where top-right overlaps with dynamic content.
 */
export function BottomCreditTag({ text }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 160,   // above the 80px caption bottom margin + 80px padding
      left: 80,      // aligned with caption left edge
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
