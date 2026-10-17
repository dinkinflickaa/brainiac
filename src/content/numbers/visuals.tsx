import type { CSSProperties } from 'react';

const BEAD_COLORS = ['#5B3FD6', '#E8590C'];

/** One abacus rod with `n` beads stacked from the bottom (0..10). `show` limits how many are drawn (for animation). */
export function Rod({ n, height = 200, show, color = BEAD_COLORS[0], ghost }: { n: number; height?: number | string; show?: number; color?: string; ghost?: boolean }) {
  const H = 230;
  const visible = show ?? n;
  return (
    <svg viewBox={`0 0 50 ${H}`} style={{ height, width: 'auto', display: 'block', overflow: 'visible' }} role="img" aria-label={`${n} beads`}>
      <rect x={22} y={8} width={6} height={H - 24} rx={3} fill="#C9B79C" />
      <rect x={2} y={H - 18} width={46} height={12} rx={5} fill="#8C6A43" />
      {Array.from({ length: n }).map((_, i) => (
        <ellipse
          key={i}
          cx={25}
          cy={H - 30 - i * 19.5}
          rx={19}
          ry={9.5}
          fill={ghost ? '#E4E8F2' : color}
          stroke={ghost ? '#C9D3EA' : 'rgba(0,0,0,0.18)'}
          strokeWidth={1.5}
          style={{
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? 'translateY(0)' : 'translateY(-30px)',
            transition: 'opacity 250ms, transform 350ms cubic-bezier(.3,1.5,.5,1)',
          }}
        />
      ))}
    </svg>
  );
}

/** A group of `n` objects laid out in rows of 5 (like a ten-frame) so they can be counted at a glance. */
export function Group({ n, e = '🍎', size = 30, show, style, perRow = 5 }: { n: number; e?: string; size?: number; show?: number; style?: CSSProperties; perRow?: number }) {
  const visible = show ?? n;
  const rows: number[][] = [];
  for (let i = 0; i < n; i += perRow) rows.push(Array.from({ length: Math.min(perRow, n - i) }, (_, k) => i + k));
  return (
    <div role="img" aria-label={`${n}`} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', ...style }}>
      {n === 0 && <div style={{ height: size, width: size }} />}
      {rows.map((r, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 2 }}>
          {r.map((i) => (
            <span
              key={i}
              className="emoji"
              style={{
                fontSize: size,
                opacity: i < visible ? 1 : 0,
                transform: i < visible ? 'scale(1)' : 'scale(0.3)',
                transition: 'opacity 250ms, transform 350ms cubic-bezier(.3,1.6,.5,1)',
              }}
            >
              {e}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A balance scale. `left`/`right` are item counts. Tilts toward the heavier side unless `level`. */
export function Scale({ left, right, e = '🍎', rightEmpty = false, width = 420, showRight, tiltOverride }: {
  left: number; right: number; e?: string; rightEmpty?: boolean; width?: number; showRight?: number; tiltOverride?: number;
}) {
  const shownRight = showRight ?? right;
  const diff = left - shownRight;
  const tilt = tiltOverride ?? Math.max(-14, Math.min(14, diff * 4));
  const pan = (n: number, empty: boolean, show?: number) => (
    <div style={{ width: width * 0.36, minHeight: 74, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 40 }}>
        <Group n={n} e={e} size={Math.min(30, width / 16)} show={show} />
        {empty && (
          <div style={{ width: 44, height: 44, border: '3px dashed #9AA3C0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="display" style={{ fontSize: 26, color: '#9AA3C0' }}>?</span>
          </div>
        )}
      </div>
      <svg viewBox="0 0 160 30" width="100%" height={26} aria-hidden="true">
        <path d="M6 4 H154 L134 26 H26 Z" fill="#C9D3EA" stroke="#9AA3C0" strokeWidth={2} />
      </svg>
    </div>
  );
  return (
    <div style={{ position: 'relative', width, height: width * 0.62 }} role="img" aria-label={`scale with ${left} on the left and ${right} on the right`}>
      {/* stand */}
      <svg viewBox="0 0 100 62" width={width} height={width * 0.62} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        <path d="M50 14 L50 58" stroke="#8C6A43" strokeWidth={3.2} />
        <path d="M36 60 H64" stroke="#8C6A43" strokeWidth={4} strokeLinecap="round" />
        <circle cx={50} cy={14} r={2.6} fill="#8C6A43" />
      </svg>
      {/* beam + pans rotate together around the pivot */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: width * 0.14 - 3, height: 0,
          transform: `rotate(${-tilt}deg)`, transformOrigin: '50% 50%', transition: 'transform 900ms cubic-bezier(.4,1.4,.5,1)',
        }}
      >
        <div style={{ position: 'absolute', left: width * 0.1, right: width * 0.1, top: -3, height: 6, borderRadius: 3, background: '#8C6A43' }} />
        <div style={{ position: 'absolute', left: width * 0.1 - width * 0.18 + 3, bottom: 0, transform: `rotate(${tilt}deg)`, transformOrigin: '50% 100%', transition: 'transform 900ms cubic-bezier(.4,1.4,.5,1)' }}>
          {pan(left, false)}
        </div>
        <div style={{ position: 'absolute', right: width * 0.1 - width * 0.18 + 3, bottom: 0, transform: `rotate(${tilt}deg)`, transformOrigin: '50% 100%', transition: 'transform 900ms cubic-bezier(.4,1.4,.5,1)' }}>
          {pan(right, rightEmpty, showRight)}
        </div>
      </div>
    </div>
  );
}

/** A little train: an engine pulling cars, each car holding some objects. `null` = empty car with a "?". */
export function Train({ cars, e = '📦', show, highlight }: { cars: (number | null)[]; e?: string; show?: (number | undefined)[]; highlight?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }} role="img" aria-label={`train with cars ${cars.map((c) => c ?? 'empty').join(', ')}`}>
      <span className="emoji" style={{ fontSize: 46, transform: 'scaleX(-1)' }}>🚂</span>
      {cars.map((c, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              minWidth: 76, minHeight: 64, padding: 4, borderRadius: 10, background: c === null ? '#fff' : '#FFF6DA',
              border: c === null ? '3px dashed #9AA3C0' : `3px solid ${highlight === i ? 'var(--green)' : '#E0A100'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 300ms',
            }}
          >
            {c === null ? <span className="display" style={{ fontSize: 30, color: '#9AA3C0' }}>?</span> : <Group n={c} e={e} size={20} show={show?.[i]} perRow={3} />}
          </div>
          <div style={{ display: 'flex', gap: 22, marginTop: -4 }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#1D2445' }} />
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#1D2445' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Big number label that pops in. */
export function Num({ n, show = true, color = 'var(--purple)' }: { n: number | string; show?: boolean; color?: string }) {
  return (
    <span
      className="display"
      style={{
        fontSize: 30, color, opacity: show ? 1 : 0, transform: show ? 'scale(1)' : 'scale(0.5)',
        transition: 'opacity 300ms, transform 350ms cubic-bezier(.3,1.6,.5,1)', display: 'inline-block', minWidth: 30, textAlign: 'center',
      }}
    >
      {n}
    </span>
  );
}
