import type { CSSProperties } from 'react';
import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Arrow, Tag, useEntered } from '../../ui/kit';

/** Paper is a 4x4 grid. Holes sit in cell centers (x, y are 0.5..3.5). */
export type Dir = 'L' | 'R' | 'T' | 'B';
export interface Rect { x0: number; x1: number; y0: number; y1: number }
export interface Hole { x: number; y: number }
export interface FoldStep { dir: Dir; axis: number; before: Rect; after: Rect; flap: Rect }

export interface FoldQ extends BaseQ {
  folds: FoldStep[];
  punched: Hole[];
  result: Hole[];
  tags: string[];
}

const FULL: Rect = { x0: 0, x1: 4, y0: 0, y1: 4 };
const DIR_WORDS: Record<Dir, string> = {
  L: 'Fold the left side over to the right.',
  R: 'Fold the right side over to the left.',
  T: 'Fold the top down to the bottom.',
  B: 'Fold the bottom up to the top.',
};
const vertical = (d: Dir) => d === 'L' || d === 'R';

export function makeFold(r: Rect, dir: Dir): FoldStep {
  if (vertical(dir)) {
    const axis = (r.x0 + r.x1) / 2;
    const flap = dir === 'L' ? { ...r, x1: axis } : { ...r, x0: axis };
    const after = dir === 'L' ? { ...r, x0: axis } : { ...r, x1: axis };
    return { dir, axis, before: r, after, flap };
  }
  const axis = (r.y0 + r.y1) / 2;
  const flap = dir === 'T' ? { ...r, y1: axis } : { ...r, y0: axis };
  const after = dir === 'T' ? { ...r, y0: axis } : { ...r, y1: axis };
  return { dir, axis, before: r, after, flap };
}

export const reflect = (h: Hole, f: FoldStep): Hole =>
  vertical(f.dir) ? { x: 2 * f.axis - h.x, y: h.y } : { x: h.x, y: 2 * f.axis - h.y };

const holeKey = (h: Hole) => `${h.x},${h.y}`;
export const setKey = (hs: Hole[]) => hs.map(holeKey).sort().join(' ');
const uniq = (hs: Hole[]) => {
  const m = new Map<string, Hole>();
  for (const h of hs) m.set(holeKey(h), h);
  return [...m.values()];
};
const inPaper = (h: Hole) => h.x > 0 && h.x < 4 && h.y > 0 && h.y < 4;

/** Unfold folds from last to first. `upTo` = how many folds to undo. */
export function unfold(holes: Hole[], folds: FoldStep[], upTo = folds.length): Hole[] {
  let cur = holes;
  for (let i = folds.length - 1; i >= folds.length - upTo; i--) {
    cur = uniq([...cur, ...cur.map((h) => reflect(h, folds[i]))]);
  }
  return cur;
}

function translateCopy(holes: Hole[], folds: FoldStep[]): Hole[] {
  // Common mistake: copy the hole sideways instead of mirroring it.
  let cur = holes;
  for (let i = folds.length - 1; i >= 0; i--) {
    const f = folds[i];
    const w = vertical(f.dir) ? f.after.x1 - f.after.x0 : f.after.y1 - f.after.y0;
    const sign = f.dir === 'L' || f.dir === 'T' ? -1 : 1;
    cur = uniq([...cur, ...cur.map((h) => (vertical(f.dir) ? { x: h.x + sign * w, y: h.y } : { x: h.x, y: h.y + sign * w }))]);
  }
  return cur.filter(inPaper);
}

function cellsIn(r: Rect): Hole[] {
  const out: Hole[] = [];
  for (let x = r.x0; x < r.x1; x++) for (let y = r.y0; y < r.y1; y++) out.push({ x: x + 0.5, y: y + 0.5 });
  return out;
}

function generate(level: number, rng: Rng): FoldQ {
  const nFolds = level <= 2 ? 1 : 2;
  const first: Dir = rng.pick(level <= 1 ? (['L', 'R'] as Dir[]) : (['L', 'R', 'T', 'B'] as Dir[]));
  const folds: FoldStep[] = [makeFold(FULL, first)];
  if (nFolds === 2) {
    const sameWay = level >= 5 && rng.chance(0.4);
    const pool: Dir[] = sameWay ? (vertical(first) ? ['L', 'R'] : ['T', 'B']) : vertical(first) ? ['T', 'B'] : ['L', 'R'];
    folds.push(makeFold(folds[0].after, rng.pick(pool)));
  }
  const final = folds[folds.length - 1].after;
  const nHoles = level === 1 || level === 3 ? 1 : level >= 6 ? 2 : rng.int(1, 2);
  const punched = rng.shuffle(cellsIn(final)).slice(0, nHoles);
  const result = unfold(punched, folds);

  const cand: { holes: Hole[]; tag: string }[] = [];
  cand.push({ holes: punched, tag: 'notunfolded' });
  cand.push({ holes: translateCopy(punched, folds), tag: 'shifted' });
  if (nFolds === 2) {
    cand.push({ holes: unfold(punched, folds, 1), tag: 'onefold' });
    cand.push({ holes: unfold(punched, [folds[0]]), tag: 'onefold' });
  }
  // Mirror across the wrong axis
  const wrongDir: Dir[] = folds.map((f) => (vertical(f.dir) ? 'T' : 'L'));
  const wrongFolds = wrongDir.reduce<FoldStep[]>((acc, d) => [...acc, makeFold(acc.length ? acc[acc.length - 1].after : FULL, d)], []);
  cand.push({ holes: unfold(punched, wrongFolds).filter(inPaper), tag: 'wrongaxis' });
  const empties = cellsIn(FULL).filter((c) => !result.some((h) => holeKey(h) === holeKey(c)));
  cand.push({ holes: [...result, rng.pick(empties)], tag: 'extra' });
  if (result.length >= 2) cand.push({ holes: rng.shuffle(result).slice(1), tag: 'missing' });
  // A plausible "twin in the wrong spot"
  cand.push({ holes: uniq([...punched, ...punched.map((h) => ({ x: 4 - h.y, y: 4 - h.x }))]).filter(inPaper), tag: 'wrongaxis' });

  const usable = cand.filter((c) => c.holes.length > 0);
  const ordered = [usable[0], usable[1], ...rng.shuffle(usable.slice(2))];
  const count = level <= 2 ? 4 : 5;
  const { choices, correct } = buildChoices(rng, { holes: result, tag: 'right' }, ordered, count, (c) => setKey(c.holes));

  return {
    id: uid('fd'),
    type: 'folding',
    level,
    say:
      nFolds === 1
        ? `A paper is folded, then ${nHoles === 1 ? 'a hole is' : 'holes are'} punched. Which picture shows the paper when it is opened up?`
        : `A paper is folded two times, then ${nHoles === 1 ? 'a hole is' : 'holes are'} punched. Which picture shows the paper when it is opened up?`,
    answer: { kind: 'choice', choices: choices.map((c) => c.holes), correct },
    hint:
      nFolds === 1
        ? 'The paper has two layers when you punch. So how many holes will there be? Each hole gets a twin across the fold.'
        : 'Two folds make four layers. Unfold one fold at a time, and give every hole a twin across the fold.',
    trick: 'folding',
    folds,
    punched,
    result,
    tags: choices.map((c) => c.tag),
  };
}

/* ---------- drawing ---------- */

const PEACH = '#FFE1D3';

function HoleDot({ h, r, u, style }: { h: Hole; r: Rect; u: number; style?: CSSProperties }) {
  const d = u * 0.46;
  return (
    <div
      style={{
        position: 'absolute',
        left: (h.x - r.x0) * u - d / 2,
        top: (h.y - r.y0) * u - d / 2,
        width: d,
        height: d,
        borderRadius: '50%',
        background: '#1D2445',
        ...style,
      }}
    />
  );
}

/** The flat paper (any region of it) with holes. */
export function PaperView({ holes, size, creases = [], rect = FULL, ghost, fill = '#fff', border = '#1D2445', style }: {
  holes: Hole[]; size: number; creases?: FoldStep[]; rect?: Rect; ghost?: boolean; fill?: string; border?: string; style?: CSSProperties;
}) {
  const u = size / 4;
  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      {ghost && <div style={{ position: 'absolute', inset: 0, border: '2px dashed #C9D3EA', borderRadius: 4 }} />}
      <div
        style={{
          position: 'absolute', left: rect.x0 * u, top: rect.y0 * u, width: (rect.x1 - rect.x0) * u, height: (rect.y1 - rect.y0) * u,
          background: fill, border: `3px solid ${border}`, borderRadius: 4, boxSizing: 'border-box',
        }}
      >
        {creases.map((f, i) =>
          vertical(f.dir) ? (
            <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: (f.axis - rect.x0) * u - 1.5, borderLeft: '2px dashed #A3ABC6' }} />
          ) : (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: (f.axis - rect.y0) * u - 1.5, borderTop: '2px dashed #A3ABC6' }} />
          ),
        )}
        {holes.map((h, i) => <HoleDot key={i} h={h} r={{ ...rect, x0: rect.x0 + 3 / u, y0: rect.y0 + 3 / u }} u={u} />)}
      </div>
    </div>
  );
}

/** A curved arrow showing which way a fold goes, drawn over a region. */
function FoldArrow({ f, u }: { f: FoldStep; u: number }) {
  const r = f.before;
  const cx = ((r.x0 + r.x1) / 2) * u;
  const cy = ((r.y0 + r.y1) / 2) * u;
  const w = (r.x1 - r.x0) * u;
  const h = (r.y1 - r.y0) * u;
  const rot = { L: 0, R: 180, T: 90, B: 270 }[f.dir];
  const len = (vertical(f.dir) ? w : h) * 0.32;
  return (
    <svg style={{ position: 'absolute', left: cx - len, top: cy - len, overflow: 'visible', pointerEvents: 'none' }} width={len * 2} height={len * 2} aria-hidden="true">
      <g transform={`translate(${len} ${len}) rotate(${rot})`}>
        <path d={`M ${-len * 0.8} ${len * 0.15} Q 0 ${-len * 0.9} ${len * 0.8} ${len * 0.15}`} fill="none" stroke="#B4500F" strokeWidth={4} strokeLinecap="round" />
        <path d={`M ${len * 0.8 - 9} ${len * 0.15 - 9} L ${len * 0.8} ${len * 0.15} L ${len * 0.8 - 12} ${len * 0.15 + 3}`} fill="none" stroke="#B4500F" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** One frame of the question strip: the current folded shape, plus an arrow for the next fold. */
function StripFrame({ rect, next, holes, size }: { rect: Rect; next?: FoldStep; holes?: Hole[]; size: number }) {
  const u = size / 4;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <PaperView holes={holes ?? []} size={size} rect={rect} ghost={rect !== FULL} fill={rect === FULL ? '#fff' : PEACH} creases={next ? [next] : []} />
      {next && <FoldArrow f={next} u={u} />}
    </div>
  );
}

function useBox(): number {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1100;
  return Math.round(Math.max(96, Math.min(150, vh * 0.17, vw * 0.15)));
}

function Stimulus({ q }: { q: FoldQ }) {
  const size = useBox();
  const frames: React.ReactNode[] = [];
  q.folds.forEach((f, i) => {
    frames.push(<StripFrame key={`f${i}`} rect={f.before} next={f} size={size} />);
  });
  frames.push(<StripFrame key="p" rect={q.folds[q.folds.length - 1].after} holes={q.punched} size={size} />);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      {frames.map((fr, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {i > 0 && <Arrow />}
          <div style={{ background: '#fff', borderRadius: 18, padding: 12, border: '3px solid var(--line)' }}>{fr}</div>
        </div>
      ))}
    </div>
  );
}

function Choice({ q, data }: { q: FoldQ; data: unknown; index: number }) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const size = Math.round(Math.max(72, Math.min(112, vh * 0.12)));
  return <PaperView holes={data as Hole[]} size={size} creases={q.folds} />;
}

function wrongFeedback(q: FoldQ, given: number): string | undefined {
  switch (q.tags[given]) {
    case 'notunfolded': return 'Those are only the holes you punched. When you open the paper, each hole gets a twin!';
    case 'onefold': return 'You opened one fold. Open the other fold too!';
    case 'wrongaxis': return 'The twin hole lands across the fold line. Check which way the paper was folded.';
    case 'shifted': return 'So close! The twin is flipped like a mirror. It sits the same distance from the fold.';
    case 'extra': return 'There is an extra hole. Each fold doubles the holes. Count them!';
    case 'missing': return 'A hole is missing. Each fold doubles the holes. Count them!';
    default: return undefined;
  }
}

function solution(q: FoldQ) {
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  const layers = 2 ** q.folds.length;
  const steps = q.folds.map((f) => ({ say: DIR_WORDS[f.dir] + (f === q.folds[0] ? '' : ' Now it is even smaller.') }));
  steps.push({ say: `Punch! It goes through all ${layers} layers at once.` });
  for (let i = q.folds.length - 1; i >= 0; i--) {
    steps.push({ say: i === q.folds.length - 1 ? 'Now open it up. Each hole gets a twin, flipped across the fold.' : 'Open the next fold. Every hole gets a twin again.' });
  }
  steps.push({ say: `${q.result.length} ${q.result.length === 1 ? 'hole' : 'holes'}. The answer is ${letter}!` });
  steps.push({ say: 'Trick: every fold doubles the holes. Each twin is a mirror image across the fold line.' });
  return steps;
}

/** Animated fold/unfold of one flap. */
function FoldStage({ f, holesBase, holesFlap, folding, size, ghostAll }: {
  f: FoldStep; holesBase: Hole[]; holesFlap: Hole[]; folding: boolean; size: number; ghostAll: boolean;
}) {
  const on = useEntered(350);
  const flipped = folding ? on : !on;
  const u = size / 4;
  const flap = f.flap;
  const base = f.after;
  const origin = { L: 'right center', R: 'left center', T: 'center bottom', B: 'center top' }[f.dir];
  const rot = { L: 'rotateY(180deg)', R: 'rotateY(-180deg)', T: 'rotateX(-180deg)', B: 'rotateX(180deg)' }[f.dir];
  const box = (r: Rect): CSSProperties => ({
    position: 'absolute', left: r.x0 * u, top: r.y0 * u, width: (r.x1 - r.x0) * u, height: (r.y1 - r.y0) * u,
    border: '3px solid #1D2445', borderRadius: 4, boxSizing: 'border-box',
  });
  const holeIn = (r: Rect) => ({ ...r, x0: r.x0 + 3 / u, y0: r.y0 + 3 / u });
  return (
    <div style={{ position: 'relative', width: size, height: size, perspective: 1400 }}>
      {ghostAll && <div style={{ position: 'absolute', inset: 0, border: '2px dashed #C9D3EA', borderRadius: 4 }} />}
      <div style={{ ...box(base), background: '#fff' }}>
        {holesBase.map((h, i) => <HoleDot key={i} h={h} r={holeIn(base)} u={u} />)}
      </div>
      <div
        style={{
          ...box(flap), background: PEACH, transformOrigin: origin, transform: flipped ? rot : 'none',
          transition: 'transform 1300ms cubic-bezier(.55,0,.3,1)', zIndex: 2,
        }}
      >
        {holesFlap.map((h, i) => (
          <HoleDot key={i} h={h} r={holeIn(flap)} u={u} style={{ opacity: folding ? 1 : 1 }} />
        ))}
      </div>
    </div>
  );
}

function PunchStage({ rect, holes, size, layers }: { rect: Rect; holes: Hole[]; size: number; layers: number }) {
  const on = useEntered(400);
  const u = size / 4;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{ position: 'absolute', inset: 0, border: '2px dashed #C9D3EA', borderRadius: 4 }} />
      <div
        style={{
          position: 'absolute', left: rect.x0 * u, top: rect.y0 * u, width: (rect.x1 - rect.x0) * u, height: (rect.y1 - rect.y0) * u,
          background: PEACH, border: '3px solid #1D2445', borderRadius: 4, boxSizing: 'border-box',
          boxShadow: `${Math.min(layers, 4) * 2}px ${Math.min(layers, 4) * 2}px 0 #F5C9AE`,
        }}
      >
        {holes.map((h, i) => (
          <HoleDot key={i} h={h} r={{ ...rect, x0: rect.x0 + 3 / u, y0: rect.y0 + 3 / u }} u={u}
            style={{ transform: on ? 'scale(1)' : 'scale(0)', transition: `transform 380ms cubic-bezier(.3,1.8,.5,1) ${i * 250}ms` }} />
        ))}
      </div>
    </div>
  );
}

function Solution({ q, step }: { q: FoldQ; step: number }) {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const size = Math.round(Math.max(200, Math.min(300, vh * 0.34)));
  const n = q.folds.length;
  const layers = 2 ** n;
  // Holes at each stage of unfolding: stage[n] = punched, stage[0] = fully open.
  const stage: Hole[][] = [];
  stage[n] = q.punched;
  for (let k = n - 1; k >= 0; k--) stage[k] = uniq([...stage[k + 1], ...stage[k + 1].map((h) => reflect(h, q.folds[k]))]);

  let view: React.ReactNode;
  let tag: React.ReactNode = null;
  if (step < n) {
    view = <FoldStage key={`f${step}`} f={q.folds[step]} holesBase={[]} holesFlap={[]} folding size={size} ghostAll={step > 0} />;
    tag = <Tag>{step === 0 ? '2 layers' : '4 layers'}</Tag>;
  } else if (step === n) {
    view = <PunchStage key="p" rect={q.folds[n - 1].after} holes={q.punched} size={size} layers={layers} />;
    tag = <Tag color="#8A3A08" bg="var(--orange-soft)">{layers} layers = {layers}x the holes</Tag>;
  } else if (step <= 2 * n) {
    const k = 2 * n - step; // fold index being undone: n-1 ... 0
    const f = q.folds[k];
    view = (
      <FoldStage key={`u${k}`} f={f} holesBase={stage[k + 1]} holesFlap={stage[k + 1].map((h) => reflect(h, f))} folding={false} size={size} ghostAll={k > 0} />
    );
    tag = <Tag color="#0F5A37" bg="var(--green-soft)">{stage[k].length} holes</Tag>;
  } else {
    view = <PaperView key="done" holes={q.result} size={size} creases={q.folds} border="var(--green)" style={{ animation: 'pop 420ms ease' }} />;
    tag = <Tag color="#0F5A37" bg="var(--green-soft)">{q.result.length} holes</Tag>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ minHeight: 36 }}>{tag}</div>
      <div style={{ padding: 24, background: '#fff', borderRadius: 24 }}>{view}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--muted)' }}>Peach = the part that moves</div>
    </div>
  );
}

export const folding: TypeModule<FoldQ> = {
  type: 'folding',
  world: 'shapes',
  name: 'Paper folding',
  testName: 'Paper Folding',
  intro: 'Paper folding! We fold a paper, punch holes, and imagine opening it up.',
  maxLevel: 6,
  tricks: [
    {
      id: 'folding',
      type: 'folding',
      title: 'Fold twins',
      rule: 'Every fold doubles the holes. Each twin is a mirror image across the fold.',
      intro: 'Here is the paper folding trick. Watch where the holes go when we open the paper.',
    },
  ],
  targetSeconds: 15,
  generate,
  Stimulus,
  Choice,
  wrongFeedback,
  solution,
  Solution,
};
