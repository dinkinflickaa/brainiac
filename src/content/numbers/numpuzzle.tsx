import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Frame, Tag, useTicker } from '../../ui/kit';
import { Group, Num, Scale, Train } from './visuals';

export type PuzzleFormat =
  | { f: 'scale'; left: number; right: number }
  | { f: 'train'; top: number[]; bottom: number[] } // bottom's last car is the empty one
  | { f: 'equation'; kind: 'sum'; total: number; parts: number[] } // total = parts + ?
  | { f: 'equation'; kind: 'minus'; start: number; result: number }; // start - ? = result

export interface NumPuzzleQ extends BaseQ {
  fmt: PuzzleFormat;
  missing: number;
  e: string;
}

const OBJ = ['🍎', '🍊', '🍪', '⭐', '🧁', '🍓'];
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function solve(fmt: PuzzleFormat): number {
  switch (fmt.f) {
    case 'scale': return fmt.left - fmt.right;
    case 'train': return sum(fmt.top) - sum(fmt.bottom);
    case 'equation': return fmt.kind === 'sum' ? fmt.total - sum(fmt.parts) : fmt.start - fmt.result;
  }
}

function makeFormat(level: number, rng: Rng): PuzzleFormat {
  const pool: PuzzleFormat['f'][] =
    level === 1 ? ['scale'] : level === 2 ? ['scale', 'train'] : level === 3 ? ['scale', 'train', 'train'] : level === 4 ? ['train', 'equation'] : ['equation', 'equation', 'train'];
  const f = rng.pick(pool);
  if (f === 'scale') {
    const max = level === 1 ? 6 : 10;
    const left = rng.int(3, max);
    const right = rng.int(1, left - 1);
    return { f, left, right };
  }
  if (f === 'train') {
    const nTop = level >= 4 ? 3 : 2;
    const top = Array.from({ length: nTop }, () => rng.int(1, level >= 4 ? 5 : 4));
    const total = sum(top);
    const known = Array.from({ length: nTop - 1 }, () => rng.int(1, 4));
    let missing = total - sum(known);
    if (missing < 1 || missing > 6) {
      known[0] = Math.max(1, total - (nTop - 2) * 1 - rng.int(1, 4));
      for (let i = 1; i < known.length; i++) known[i] = 1;
      missing = total - sum(known);
    }
    return { f, top, bottom: known };
  }
  if (level >= 6 && rng.chance(0.4)) {
    const start = rng.int(8, 18);
    const result = rng.int(1, start - 2);
    return { f: 'equation', kind: 'minus', start, result };
  }
  const nParts = level >= 5 ? 2 : rng.int(1, 2);
  const parts = Array.from({ length: nParts }, () => rng.int(1, level >= 5 ? 8 : 5));
  const total = sum(parts) + rng.int(1, level >= 5 ? 9 : 6);
  return { f: 'equation', kind: 'sum', total, parts };
}

function generate(level: number, rng: Rng): NumPuzzleQ {
  let fmt = makeFormat(level, rng);
  let guard = 0;
  while ((solve(fmt) < 1 || solve(fmt) > 10) && guard++ < 50) fmt = makeFormat(level, rng);
  const missing = solve(fmt);
  const e = rng.pick(OBJ);
  const cand = rng.shuffle([missing + 1, missing - 1, missing + 2, missing - 2, missing + 3]).filter((x) => x >= 0 && x <= 12);
  if (fmt.f === 'scale') cand.unshift(fmt.left, fmt.right);
  if (fmt.f === 'train') cand.unshift(sum(fmt.top));
  if (fmt.f === 'equation') cand.unshift(fmt.kind === 'sum' ? fmt.total : fmt.result);
  const count = level <= 2 ? 4 : 5;
  const { choices, correct } = buildChoices(rng, missing, cand.filter((x) => x >= 1 && x <= 12), count, String);
  const say =
    fmt.f === 'scale'
      ? 'The scale is not even. How many should go in the empty spot to make both sides the same?'
      : fmt.f === 'train'
        ? 'Both trains must carry the same number of boxes. How many boxes go in the empty car?'
        : fmt.kind === 'sum'
          ? `${fmt.total} is the same as ${fmt.parts.join(' plus ')} plus what? Which number goes in the box?`
          : `${fmt.start} take away what makes ${fmt.result}? Which number goes in the box?`;
  return {
    id: uid('np'),
    type: 'numpuzzle',
    level,
    say,
    answer: { kind: 'choice', choices, correct },
    hint: 'Count both sides. How many more does the smaller side need?',
    trick: 'numpuzzle',
    fmt,
    missing,
    e: fmt.f === 'train' ? '📦' : e,
  };
}

function Equation({ fmt, fill }: { fmt: Extract<PuzzleFormat, { f: 'equation' }>; fill?: number | null }) {
  const box = (
    <span style={{ display: 'inline-flex', width: 72, height: 72, alignItems: 'center', justifyContent: 'center', border: fill == null ? '3px dashed #9AA3C0' : '3px solid var(--green)', borderRadius: 14, background: '#fff', color: fill == null ? '#9AA3C0' : 'var(--green)', transition: 'border-color 300ms' }}>
      {fill == null ? '?' : fill}
    </span>
  );
  return (
    <div className="display" style={{ fontSize: 'clamp(40px, 7vh, 64px)', display: 'flex', alignItems: 'center', gap: 14, background: '#fff', padding: '18px 30px', borderRadius: 24 }}>
      {fmt.kind === 'sum' ? (
        <>
          <span>{fmt.total}</span><span>=</span>
          {fmt.parts.map((p, i) => <span key={i} style={{ display: 'flex', gap: 14 }}><span>{p}</span><span>+</span></span>)}
          {box}
        </>
      ) : (
        <>
          <span>{fmt.start}</span><span>-</span>{box}<span>=</span><span>{fmt.result}</span>
        </>
      )}
    </div>
  );
}

function scaleWidth() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
  return Math.max(300, Math.min(480, vw * 0.45));
}

function Stimulus({ q }: { q: NumPuzzleQ }) {
  const f = q.fmt;
  if (f.f === 'scale') return <div style={{ background: '#fff', borderRadius: 24, padding: '10px 20px' }}><Scale left={f.left} right={f.right} e={q.e} rightEmpty width={scaleWidth()} /></div>;
  if (f.f === 'train')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, background: '#fff', borderRadius: 24, padding: '18px 26px' }}>
        <Train cars={f.top} />
        <Train cars={[...f.bottom, null]} />
      </div>
    );
  return <Equation fmt={f} />;
}

function Choice({ q, data }: { q: NumPuzzleQ; data: unknown; index: number }) {
  const n = data as number;
  if (q.fmt.f === 'equation') return <span className="display" style={{ fontSize: 44 }}>{n}</span>;
  return <Group n={n} e={q.e} size={20} />;
}

function wrongFeedback(q: NumPuzzleQ, given: number): string | undefined {
  if (q.answer.kind !== 'choice') return;
  const v = q.answer.choices[given] as number;
  if (Math.abs(v - q.missing) === 1) return 'Very close! Count each side again.';
  if (v > q.missing) return 'Too many! Now the other side would be heavier.';
  return 'Not quite enough. Count how many more are needed.';
}

function solution(q: NumPuzzleQ) {
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  const f = q.fmt;
  const trick = { say: 'Trick: count both sides. Add what is missing to make them even.' };
  if (f.f === 'scale')
    return [
      { say: `Count the left side: ${f.left}.` },
      { say: `Count the right side: ${f.right}. It needs more to be even.` },
      { say: `Add one at a time until it is even. ${q.missing} more!` },
      { say: `Now the scale is level. The answer is ${letter}.` },
      trick,
    ];
  if (f.f === 'train')
    return [
      { say: `Count the boxes on the top train: ${f.top.join(' plus ')} is ${sum(f.top)}.` },
      { say: `The bottom train has ${sum(f.bottom)} so far.` },
      { say: `Fill the empty car until it has ${sum(f.top)} too. That's ${q.missing} boxes.` },
      { say: `Both trains have ${sum(f.top)}. The answer is ${letter}.` },
      trick,
    ];
  if (f.kind === 'sum') {
    const s = sum(f.parts);
    return [
      { say: `First add the numbers you know: ${f.parts.join(' plus ')} is ${s}.` },
      { say: `Now count up from ${s} to ${f.total}.` },
      { say: `That's ${q.missing} more. ${f.total} equals ${f.parts.join(' plus ')} plus ${q.missing}.` },
      { say: `The answer is ${letter}.` },
      trick,
    ];
  }
  return [
    { say: `We start with ${f.start} and end with ${f.result}.` },
    { say: `Count up from ${f.result} to ${f.start} to see how many were taken away.` },
    { say: `That's ${q.missing}. ${f.start} take away ${q.missing} is ${f.result}.` },
    { say: `The answer is ${letter}.` },
    trick,
  ];
}

function CountUp({ from, to, run, done }: { from: number; to: number; run: boolean; done?: boolean }) {
  const n = to - from;
  const tick = useTicker(n, 450, run);
  const k = done ? n : tick;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Num n={from} />
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag show={i < k} color="#0F5A37" bg="var(--green-soft)" style={{ fontSize: 14, padding: '2px 8px' }}>+1</Tag>
          <Num n={from + i + 1} show={i < k} color="var(--green)" />
        </span>
      ))}
    </div>
  );
}

function Solution({ q, step }: { q: NumPuzzleQ; step: number }) {
  const f = q.fmt;
  const adding = useTicker(q.missing, 450, step === 2, 300);
  if (f.f === 'scale') {
    const added = step >= 3 ? q.missing : step === 2 ? adding : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 60 }}>
          <Num n={f.left} show={step >= 0} />
          <Num n={f.right + added} show={step >= 1} color={added === q.missing ? 'var(--green)' : 'var(--purple)'} />
        </div>
        <div style={{ background: '#fff', borderRadius: 24, padding: '10px 20px' }}>
          <Scale left={f.left} right={f.right + q.missing} showRight={f.right + added} e={q.e} width={scaleWidth()} />
        </div>
        <Tag show={step >= 2} color="#0F5A37" bg="var(--green-soft)">+{added}</Tag>
      </div>
    );
  }
  if (f.f === 'train') {
    const filled = step >= 3 ? q.missing : step === 2 ? adding : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, background: '#fff', borderRadius: 24, padding: '18px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Train cars={f.top} /><Num n={sum(f.top)} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Train cars={step >= 2 ? [...f.bottom, q.missing] : [...f.bottom, null]} show={step >= 2 ? [...f.bottom, filled] : undefined} highlight={step >= 2 ? f.bottom.length : undefined} />
            <Num n={sum(f.bottom) + filled} show={step >= 1} color={filled === q.missing ? 'var(--green)' : 'var(--purple)'} />
          </div>
        </div>
      </div>
    );
  }
  const from = f.kind === 'sum' ? sum(f.parts) : f.result;
  const to = f.kind === 'sum' ? f.total : f.start;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
      <Equation fmt={f} fill={step >= 2 ? q.missing : null} />
      {f.kind === 'sum' && <Tag show={step >= 0}>{f.parts.join(' + ')} = {from}</Tag>}
      {step >= 1 && <Frame style={{ padding: 14 }}><CountUp from={from} to={to} run={step === 1} done={step >= 2} /></Frame>}
    </div>
  );
}

export const numpuzzle: TypeModule<NumPuzzleQ> = {
  type: 'numpuzzle',
  world: 'numbers',
  name: 'Balance puzzles',
  testName: 'Number Puzzles',
  intro: 'Balance puzzles! Make both sides the same.',
  maxLevel: 6,
  tricks: [
    {
      id: 'numpuzzle',
      type: 'numpuzzle',
      title: 'Make it even',
      rule: 'Count both sides. Add what is missing to make them even.',
      intro: 'Here is the balance trick. Count each side, then count up to make them even.',
    },
  ],
  targetSeconds: 14,
  generate,
  Stimulus,
  Choice,
  wrongFeedback,
  solution,
  Solution,
};
