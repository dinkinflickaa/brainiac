import { useEffect, useState } from 'react';

const PURPLE = '#5B3FD6';
const ORANGE = '#E8590C';
const INK = '#1D2445';

/* ---------------- Number line with animated hops ---------------- */

export interface Hop { by: number; label?: string; color?: string }

/**
 * A number line that draws hops one after another.
 * `played` = how many hops are drawn (control it from the step for static frames, or let `auto` animate).
 */
export function NumberLine({ from, hops, played, width = 640, auto = false, everyMs = 800 }: {
  from: number; hops: Hop[]; played?: number; width?: number; auto?: boolean; everyMs?: number;
}) {
  const [k, setK] = useState(auto ? 0 : hops.length);
  useEffect(() => {
    if (!auto) return;
    setK(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setK(i);
      if (i >= hops.length) clearInterval(iv);
    }, everyMs);
    return () => clearInterval(iv);
  }, [auto, hops.length, everyMs, from]);
  const shown = played ?? k;
  const points = [from];
  for (const h of hops) points.push(points[points.length - 1] + h.by);
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = Math.max(4, hi - lo);
  const pad = Math.max(1, Math.round(span * 0.08));
  const min = lo - pad;
  const max = hi + pad;
  const H = 150;
  const x = (v: number) => 24 + ((v - min) / (max - min)) * (width - 48);
  const step = max - min <= 26 ? 1 : max - min <= 60 ? 5 : 10;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  const baseY = 110;
  return (
    <svg viewBox={`0 0 ${width} ${H}`} width={width} style={{ display: 'block', overflow: 'visible' }} role="img" aria-label={`number line from ${from}`}>
      <line x1={10} y1={baseY} x2={width - 10} y2={baseY} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={baseY - 7} x2={x(t)} y2={baseY + 7} stroke={INK} strokeWidth={t % 10 === 0 ? 3 : 1.6} />
          {(step > 1 || t % 5 === 0 || points.includes(t)) && (
            <text x={x(t)} y={baseY + 28} textAnchor="middle" fontSize={points.includes(t) ? 19 : 14} fontWeight={800} fill={points.includes(t) ? INK : '#5A6385'} fontFamily="Nunito, sans-serif">{t}</text>
          )}
        </g>
      ))}
      {hops.map((h, i) => {
        const a = x(points[i]);
        const b = x(points[i + 1]);
        const mid = (a + b) / 2;
        const lift = Math.min(70, 26 + Math.abs(b - a) * 0.35);
        const d = `M ${a} ${baseY - 4} Q ${mid} ${baseY - lift * 1.6} ${b} ${baseY - 4}`;
        const len = Math.abs(b - a) * 1.6 + lift * 1.4;
        const on = i < shown;
        const color = h.color ?? (h.by >= 0 ? PURPLE : ORANGE);
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
              style={{ strokeDasharray: len, strokeDashoffset: on ? 0 : len, transition: 'stroke-dashoffset 600ms ease' }} />
            <text x={mid} y={baseY - lift * 0.95} textAnchor="middle" fontSize={18} fontWeight={800} fill={color} fontFamily="Baloo 2, Nunito, sans-serif"
              style={{ opacity: on ? 1 : 0, transition: 'opacity 300ms 300ms' }}>
              {h.label ?? (h.by > 0 ? `+${h.by}` : `${h.by}`)}
            </text>
          </g>
        );
      })}
      {/* where we are now */}
      <circle cx={x(points[Math.min(shown, hops.length)])} cy={baseY} r={9} fill={ORANGE} stroke="#fff" strokeWidth={3} style={{ transition: 'cx 600ms ease' }} />
      <circle cx={x(from)} cy={baseY} r={6} fill={INK} />
    </svg>
  );
}

/* ---------------- Ten frames ---------------- */

/**
 * Two ten-frames. `a` dots (purple) and `b` dots (orange).
 * When `made10` is true, orange dots slide into the first frame to fill it to 10.
 */
export function TenFrames({ a, b, made10 = false, size = 44 }: { a: number; b: number; made10?: boolean; size?: number }) {
  const total = a + b;
  const gap = 6;
  const frameW = size * 5 + gap * 6;
  const frameH = size * 2 + gap * 3;
  const pos = (i: number) => {
    const frame = Math.floor(i / 10);
    const j = i % 10;
    return { x: frame * (frameW + 24) + gap + (j % 5) * (size + gap), y: gap + Math.floor(j / 5) * (size + gap) };
  };
  // Before: a dots in frame 1 (0..a-1), b dots start in frame 2 (10..10+b-1).
  // After: all dots fill 0..total-1 in order.
  const dots = Array.from({ length: total }, (_, i) => {
    const isA = i < a;
    const before = isA ? pos(i) : pos(10 + (i - a));
    const after = pos(i);
    return { isA, p: made10 ? after : before, moved: !isA && made10 && i < 10 };
  });
  return (
    <div style={{ position: 'relative', width: frameW * 2 + 24, height: frameH }} role="img" aria-label={`${a} and ${b}`}>
      {[0, 1].map((f) => (
        <div key={f} style={{ position: 'absolute', left: f * (frameW + 24), top: 0, width: frameW, height: frameH, background: '#fff', border: `3px solid ${INK}`, borderRadius: 10 }}>
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} style={{ position: 'absolute', left: gap - 3 + (j % 5) * (size + gap), top: gap - 3 + Math.floor(j / 5) * (size + gap), width: size, height: size, border: '1.5px solid #DDE3F0', borderRadius: 6 }} />
          ))}
        </div>
      ))}
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: d.p.x + 3, top: d.p.y + 3, width: size - 6, height: size - 6, borderRadius: '50%',
            background: d.isA ? PURPLE : ORANGE, boxShadow: d.moved ? '0 0 0 4px #FFC23388' : 'none',
            transition: `left 700ms cubic-bezier(.5,0,.3,1) ${i * 60}ms, top 700ms cubic-bezier(.5,0,.3,1) ${i * 60}ms, box-shadow 300ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------- Rekenrek (bead rack) ---------------- */

/** A bead rack: each row has 10 beads (5 red + 5 white). `rows[i]` beads are slid to the left (counted). */
export function Rekenrek({ rows, highlight, width = 520 }: { rows: number[]; highlight?: { row: number; index: number }[]; width?: number }) {
  const bead = (width - 80) / 14;
  return (
    <div style={{ background: '#fff', border: `3px solid #8C6A43`, borderRadius: 14, padding: '10px 16px', width }} role="img" aria-label={`bead rack showing ${rows.join(' and ')}`}>
      {rows.map((n, r) => (
        <div key={r} style={{ position: 'relative', height: bead + 10, margin: '4px 0' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: (bead + 10) / 2 - 2, height: 4, background: '#C9B79C', borderRadius: 2 }} />
          {Array.from({ length: 10 }).map((_, i) => {
            const counted = i < n;
            const left = counted ? i * (bead + 2) : width - 32 - (10 - i) * (bead + 2);
            const red = i < 5;
            const hl = highlight?.some((h) => h.row === r && h.index === i);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute', top: 5, left, width: bead, height: bead, borderRadius: '50%',
                  background: red ? '#D9342B' : '#F4F1EA', border: `2px solid ${red ? '#A3241D' : '#C9C2B3'}`,
                  boxShadow: hl ? '0 0 0 5px #FFC233' : 'none',
                  transition: `left 600ms cubic-bezier(.5,0,.3,1) ${i * 40}ms, box-shadow 300ms`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Base-ten blocks ---------------- */

/** Tens rods and ones cubes. `addTens`/`removeOnes` etc. animate changes when their flags flip. */
export function Blocks({ tens, ones, extraTens = 0, extraOnes = 0, showExtra = false, removeOnes = 0, removed = false, removeTens = 0, unit = 16 }: {
  tens: number; ones: number; extraTens?: number; extraOnes?: number; showExtra?: boolean; removeOnes?: number; removed?: boolean; removeTens?: number; unit?: number;
}) {
  const rod = (key: string, color: string, visible = true, gone = false) => (
    <div key={key} style={{
      width: unit + 4, height: unit * 10 + 18, display: 'flex', flexDirection: 'column', gap: 2, padding: 2, borderRadius: 4,
      background: color, opacity: gone ? 0 : visible ? 1 : 0, transform: gone ? 'translateY(30px)' : visible ? 'none' : 'translateY(-30px)',
      transition: 'opacity 400ms, transform 500ms cubic-bezier(.3,1.4,.5,1)',
    }}>
      {Array.from({ length: 10 }).map((_, i) => <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />)}
    </div>
  );
  const cube = (key: string, color: string, visible = true, gone = false, delay = 0) => (
    <div key={key} style={{
      width: unit, height: unit, borderRadius: 3, background: color,
      opacity: gone ? 0 : visible ? 1 : 0, transform: gone ? 'translate(20px, 30px) rotate(40deg)' : visible ? 'none' : 'translateY(-24px)',
      transition: `opacity 400ms ${delay}ms, transform 500ms cubic-bezier(.3,1.4,.5,1) ${delay}ms`,
    }} />
  );
  const onesAll = ones + extraOnes;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }} role="img" aria-label={`${tens} tens and ${ones} ones`}>
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
        {Array.from({ length: tens }).map((_, i) => rod(`t${i}`, PURPLE, true, removed && i >= tens - removeTens))}
        {Array.from({ length: extraTens }).map((_, i) => rod(`x${i}`, '#E0A100', showExtra))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(5, ${unit}px)`, gap: 4, alignContent: 'end' }}>
        {Array.from({ length: onesAll }).map((_, i) => {
          const isExtra = i >= ones;
          const gone = removed && i >= onesAll - removeOnes;
          return cube(`o${i}`, isExtra ? '#E0A100' : '#A898EE', isExtra ? showExtra : true, gone, isExtra ? (i - ones) * 80 : 0);
        })}
      </div>
    </div>
  );
}

/* ---------------- Array of dots (for early multiplication) ---------------- */

export function DotArray({ rows, cols, lit = rows, size = 30 }: { rows: number; cols: number; lit?: number; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} role="img" aria-label={`${rows} rows of ${cols}`}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{
              width: size, height: size, borderRadius: '50%', background: r < lit ? PURPLE : '#DDE3F0',
              transform: r < lit ? 'scale(1)' : 'scale(0.85)', transition: `background 300ms ${c * 40}ms, transform 300ms ${c * 40}ms`,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}
