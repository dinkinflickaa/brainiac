import { useId, type CSSProperties } from 'react';

export type ShapeKind =
  | 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon'
  | 'star' | 'arrow' | 'cross' | 'heart' | 'half';
export type Fill = 'solid' | 'empty' | 'gray' | 'striped';

/** A test-style figure: one shape (or a few copies) with a fill, size, rotation and optional dot. */
export interface Fig {
  shape: ShapeKind;
  fill: Fill;
  big: boolean;
  rot: number; // degrees, multiples of 90 (or 45)
  count: number; // 1..4
  dot: boolean;
}

export const ALL_SHAPES: ShapeKind[] = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'arrow', 'cross', 'heart', 'half'];
/** Shapes that look different when turned (useful for rotation rules). */
export const TURNABLE: ShapeKind[] = ['triangle', 'arrow', 'heart', 'half'];
export const SIDES: Partial<Record<ShapeKind, number>> = { triangle: 3, square: 4, diamond: 4, pentagon: 5, hexagon: 6 };
export const ALL_FILLS: Fill[] = ['solid', 'empty', 'gray', 'striped'];

/** Rotations that leave each shape looking the same. */
const SYMMETRY: Record<ShapeKind, number> = {
  circle: 1, square: 90, cross: 90, diamond: 180, hexagon: 60, pentagon: 72, star: 72, triangle: 120, arrow: 360, heart: 360, half: 360,
};
/** Visual rotation, so two figures that look the same get the same key. */
export function visualRot(f: Fig): number {
  if (f.shape === 'circle') return 0;
  const s = SYMMETRY[f.shape];
  return (((f.rot % s) + s) % s);
}
/** Two figures that look identical get the same key. */
export const figKey = (f: Fig) => `${f.shape}|${f.fill}|${f.big ? 'B' : 's'}|${visualRot(f)}|${f.count}|${f.dot ? 'd' : '-'}`;

export const SHAPE_WORD: Record<ShapeKind, string> = {
  circle: 'circle', square: 'square', triangle: 'triangle', diamond: 'diamond', pentagon: 'pentagon',
  hexagon: 'hexagon', star: 'star', arrow: 'arrow', cross: 'plus sign', heart: 'heart', half: 'half circle',
};
export const FILL_WORD: Record<Fill, string> = { solid: 'dark', empty: 'white', gray: 'gray', striped: 'striped' };

const INK = '#1D2445';

function poly(n: number, r = 1, start = -Math.PI / 2) {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i * 2 * Math.PI) / n;
    pts.push(`${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`);
  }
  return pts.join(' ');
}
function starPts() {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 1 : 0.45;
    pts.push(`${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`);
  }
  return pts.join(' ');
}

function ShapeEl({ shape, fill, stroke }: { shape: ShapeKind; fill: string; stroke: string }) {
  const p = { fill, stroke, strokeWidth: 3, vectorEffect: 'non-scaling-stroke' as const, strokeLinejoin: 'round' as const, style: { transition: 'fill 500ms ease' } };
  switch (shape) {
    case 'circle': return <circle r={0.92} {...p} />;
    case 'square': return <rect x={-0.82} y={-0.82} width={1.64} height={1.64} rx={0.06} {...p} />;
    case 'triangle': return <polygon points="0,-0.95 0.95,0.72 -0.95,0.72" {...p} />;
    case 'diamond': return <polygon points="0,-1 0.75,0 0,1 -0.75,0" {...p} />;
    case 'pentagon': return <polygon points={poly(5, 0.97)} {...p} />;
    case 'hexagon': return <polygon points={poly(6, 0.95, 0)} {...p} />;
    case 'star': return <polygon points={starPts()} {...p} />;
    case 'arrow': return <path d="M-0.92,-0.3 H0.15 V-0.72 L0.95,0 L0.15,0.72 V0.3 H-0.92 Z" {...p} />;
    case 'cross': return <path d="M-0.3,-0.92 H0.3 V-0.3 H0.92 V0.3 H0.3 V0.92 H-0.3 V0.3 H-0.92 V-0.3 H-0.3 Z" {...p} />;
    case 'heart': return <path d="M0,0.9 C-1.3,0 -0.9,-1.15 0,-0.45 C0.9,-1.15 1.3,0 0,0.9 Z" {...p} />;
    case 'half': return <path d="M-0.95,0.35 A0.95,0.95 0 0 1 0.95,0.35 Z" {...p} />;
  }
}

const LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 50], [70, 50]],
  3: [[50, 28], [28, 70], [72, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
};

/** Draws a Fig inside a square SVG. `size` is the pixel width. */
export function Figure({ fig, size = 110, style, title }: { fig: Fig; size?: number | string; style?: CSSProperties; title?: string }) {
  const pid = useId().replace(/:/g, '');
  const count = Math.max(1, Math.min(4, fig.count));
  const r = (count === 1 ? 34 : count === 2 ? 18 : 16) * (fig.big ? 1 : 0.62);
  const fillColor =
    fig.fill === 'solid' ? INK : fig.fill === 'gray' ? '#A3ABC6' : fig.fill === 'striped' ? `url(#st${pid})` : '#FFFFFF';
  const dotColor = fig.fill === 'solid' ? '#FFFFFF' : INK;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', overflow: 'visible', ...style }} role="img" aria-label={title ?? describeFig(fig)}>
      <defs>
        <pattern id={`st${pid}`} width={0.32} height={0.32} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={0.32} height={0.32} fill="#fff" />
          <rect width={0.13} height={0.32} fill={INK} />
        </pattern>
      </defs>
      {LAYOUTS[count].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g style={{ transform: `rotate(${fig.rot}deg) scale(${r})`, transition: 'transform 600ms cubic-bezier(.4,1.3,.5,1)' }}>
            <ShapeEl shape={fig.shape} fill={fillColor} stroke={INK} />
          </g>
          {fig.dot && <circle r={count === 1 ? 6 : 4} fill={dotColor} stroke={fig.fill === 'solid' ? 'none' : '#fff'} strokeWidth={1.2} />}
        </g>
      ))}
    </svg>
  );
}

export function describeFig(f: Fig): string {
  const n = f.count > 1 ? `${f.count} ` : 'a ';
  const s = SHAPE_WORD[f.shape] + (f.count > 1 ? 's' : '');
  return `${n}${f.big ? 'big' : 'small'} ${FILL_WORD[f.fill]} ${s}${f.dot ? ' with a dot' : ''}`;
}
