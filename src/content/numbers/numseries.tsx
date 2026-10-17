import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { QuestionBox, Tag, useTicker } from '../../ui/kit';
import { Num, Rod } from './visuals';

type Pattern =
  | { k: 'step'; by: number }
  | { k: 'repeat'; unit: number[] }
  | { k: 'grow'; start: number } // jumps +start, +start+1, ...
  | { k: 'zigzag'; a: number; b: number } // +a, -b, +a, -b
  | { k: 'weave' }; // two interleaved series

export interface SeriesQ extends BaseQ {
  values: number[];
  next: number;
  pattern: Pattern;
}

/** Recompute the sequence from the pattern (used by tests too). */
export function extend(values: number[], p: Pattern): number {
  const n = values.length;
  switch (p.k) {
    case 'step': return values[n - 1] + p.by;
    case 'repeat': return p.unit[n % p.unit.length];
    case 'grow': return values[n - 1] + p.start + (n - 1);
    case 'zigzag': return values[n - 1] + (n % 2 === 1 ? p.a : -p.b);
    case 'weave': return values[n - 2] + (values[n - 2] - values[n - 4]);
  }
}

function build(level: number, rng: Rng): { values: number[]; pattern: Pattern } {
  const len = 5;
  const opts: (() => { values: number[]; pattern: Pattern })[] = [];
  const step = (by: number) => () => {
    // Show as many sticks as fit, leaving room for the next one (max 10 beads).
    const L = Math.min(len, Math.floor(10 / Math.abs(by)));
    const span = Math.abs(by) * L; // distance from first stick to the answer
    const s = by > 0 ? rng.int(0, 10 - span) : rng.int(span, 10);
    return { values: Array.from({ length: L }, (_, i) => s + i * by), pattern: { k: 'step', by } as Pattern };
  };
  if (level === 1) opts.push(step(1));
  if (level === 2) opts.push(step(2), step(-1), step(1));
  if (level === 3) opts.push(step(-2), step(2), () => {
    const a = rng.int(1, 4);
    const b = a + rng.int(2, 5);
    const unit = rng.chance(0.5) ? [a, b] : [b, a];
    return { values: Array.from({ length: len }, (_, i) => unit[i % 2]), pattern: { k: 'repeat', unit } };
  });
  if (level >= 4) {
    opts.push(() => {
      const unit = rng.shuffle([1, 2, 3, 4, 5, 6]).slice(0, 3);
      return { values: Array.from({ length: 6 }, (_, i) => unit[i % 3]), pattern: { k: 'repeat', unit } };
    });
    opts.push(() => {
      const a = rng.int(1, 3);
      const unit = [a, a, a + rng.int(2, 4)];
      return { values: Array.from({ length: 6 }, (_, i) => unit[i % 3]), pattern: { k: 'repeat', unit } };
    });
    opts.push(level >= 5 ? step(rng.pick([3, -3, 2])) : step(rng.pick([-2, 2])));
  }
  if (level >= 5) {
    opts.push(() => ({ values: [0, 1, 3, 6], pattern: { k: 'grow', start: 1 } }));
    opts.push(() => {
      const s = rng.int(1, 2);
      return { values: [s, s + 1, s + 3, s + 6], pattern: { k: 'grow', start: 1 } };
    });
    opts.push(() => {
      // 1, 9, 2, 8, 3, 7 -> 4
      const lo = rng.int(1, 2);
      const hi = rng.int(8, 10);
      return { values: [lo, hi, lo + 1, hi - 1, lo + 2, hi - 2], pattern: { k: 'weave' } };
    });
  }
  if (level >= 6) {
    opts.push(() => {
      const a = 2;
      const b = 1;
      const s = rng.int(1, 3);
      const values = [s];
      for (let i = 1; i < 6; i++) values.push(values[i - 1] + (i % 2 === 1 ? a : -b));
      return { values, pattern: { k: 'zigzag', a, b } };
    });
  }
  return rng.pick(opts)();
}

function jumpsOf(values: number[]): string[] {
  return values.slice(1).map((v, i) => {
    const d = v - values[i];
    return d > 0 ? `+${d}` : d < 0 ? `${d}` : '0';
  });
}

function generate(level: number, rng: Rng): SeriesQ {
  let built = build(level, rng);
  let next = extend(built.values, built.pattern);
  let guard = 0;
  const ok = (b: { values: number[] }, n: number) => n >= 0 && n <= 10 && b.values.every((v) => v >= 0 && v <= 10);
  while (!ok(built, next) && guard++ < 50) {
    built = build(level, rng);
    next = extend(built.values, built.pattern);
  }
  const { values, pattern } = built;
  const last = values[values.length - 1];
  const d = next - last;
  const cand = [
    last,
    next + 1,
    next - 1,
    next + (d || 1),
    last - (d || 1),
    values[values.length - 2],
    next + 2,
    next - 2,
  ].filter((x) => x >= 0 && x <= 10);
  const count = level <= 2 ? 4 : 5;
  // Fallback fillers near the answer so there are always enough options.
  const fillers = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => Math.abs(x - next) <= 4));
  const { choices, correct } = buildChoices(rng, next, [...rng.shuffle(cand), ...fillers], count, String);
  return {
    id: uid('ns'),
    type: 'numseries',
    level,
    say: 'Look at the bead sticks. They follow a pattern. Which stick comes next?',
    answer: { kind: 'choice', choices, correct },
    hint: 'Count the beads on each stick. How many more, or less, each time? Or does part of it repeat?',
    trick: 'numseries',
    values,
    next,
    pattern,
  };
}

const RH = 'clamp(120px, 24vh, 200px)';

function Stimulus({ q }: { q: SeriesQ }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(6px, 1.5vw, 18px)', background: '#fff', padding: '16px 22px', borderRadius: 24 }}>
      {q.values.map((v, i) => <Rod key={i} n={v} height={RH} />)}
      <div style={{ marginLeft: 8 }}><QuestionBox w="clamp(70px, 9vw, 96px)" h={RH} /></div>
    </div>
  );
}

function Choice({ data }: { q: SeriesQ; data: unknown; index: number }) {
  return <Rod n={data as number} height="clamp(90px, 15vh, 140px)" />;
}

function wrongFeedback(q: SeriesQ, given: number): string | undefined {
  if (q.answer.kind !== 'choice') return;
  const v = q.answer.choices[given] as number;
  const last = q.values[q.values.length - 1];
  if (v === last) return 'That is the same as the last stick. The pattern keeps going!';
  if (Math.abs(v - q.next) === 1) return 'So close! Count the beads again, one by one.';
  return 'Count the beads on each stick, and look for the jump.';
}

function patternWords(p: Pattern): string {
  switch (p.k) {
    case 'step': return p.by > 0 ? `Each stick has ${p.by === 1 ? 'one more bead' : `${p.by} more beads`}.` : `Each stick has ${p.by === -1 ? 'one less bead' : `${-p.by} fewer beads`}.`;
    case 'repeat': return `It repeats: ${p.unit.join(', ')}, then ${p.unit.join(', ')} again.`;
    case 'grow': return 'The jump grows: plus 1, plus 2, plus 3. So next is plus 4.';
    case 'zigzag': return `It goes up ${p.a}, then down ${p.b}, again and again.`;
    case 'weave': return 'Two patterns take turns. One goes up, the other goes down.';
  }
}

function solution(q: SeriesQ) {
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  return [
    { say: 'First, count the beads on each stick.' },
    { say: `${patternWords(q.pattern)}` },
    { say: `So the next stick has ${q.next} ${q.next === 1 ? 'bead' : 'beads'}.` },
    { say: `That's ${letter}!` },
    { say: 'Trick: count each stick, then find the jump, or the part that repeats.' },
  ];
}

function Solution({ q, step }: { q: SeriesQ; step: number }) {
  const counted = useTicker(q.values.length, 450, step === 0);
  const beads = useTicker(q.next, 280, step === 2, 300);
  const jumps = jumpsOf(q.values);
  const showJumps = step >= 1;
  const repeatOrWeave = q.pattern.k === 'repeat' || q.pattern.k === 'weave';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, background: '#fff', padding: '16px 22px', borderRadius: 24 }}>
        {q.values.map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Rod n={v} height={RH} />
              <Num n={v} show={step > 0 || i < counted} />
            </div>
            {i < q.values.length - 1 && !repeatOrWeave && (
              <div style={{ alignSelf: 'center', width: 0, display: 'flex', justifyContent: 'center' }}>
                <Tag show={showJumps} style={{ fontSize: 15, padding: '2px 8px' }}>{jumps[i]}</Tag>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginLeft: 6 }}>
          {step >= 2 ? <Rod n={q.next} height={RH} show={step >= 3 ? q.next : beads} color="#177A4C" /> : <QuestionBox w={70} h={RH} />}
          <Num n={q.next} show={step >= 3 || (step === 2 && beads >= q.next)} color="var(--green)" />
        </div>
      </div>
      <div style={{ minHeight: 40 }}>
        {repeatOrWeave && <Tag show={showJumps}>{q.pattern.k === 'repeat' ? `repeats: ${(q.pattern as { unit: number[] }).unit.join(' ')}` : 'two patterns take turns'}</Tag>}
      </div>
    </div>
  );
}

export const numseries: TypeModule<SeriesQ> = {
  type: 'numseries',
  world: 'numbers',
  name: 'Bead patterns',
  testName: 'Number Series',
  intro: 'Bead patterns! Find the pattern on the bead sticks.',
  maxLevel: 6,
  tricks: [
    {
      id: 'numseries',
      type: 'numseries',
      title: 'Find the jump',
      rule: 'Count each stick. Find the jump, or the part that repeats.',
      intro: 'Here is the bead pattern trick. Count, then look for the jump.',
    },
  ],
  targetSeconds: 12,
  generate,
  Stimulus,
  Choice,
  wrongFeedback,
  solution,
  Solution,
};
