import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Arrow, Frame, QuestionBox, Tag, useTicker } from '../../ui/kit';
import { Group, Num } from './visuals';

export type NRule = { k: 'add'; n: number } | { k: 'mul'; n: number } | { k: 'half' };

export interface NumAnalogyQ extends BaseQ {
  a: number;
  b: number;
  c: number;
  d: number;
  eA: string;
  eC: string;
  rule: NRule;
}

const OBJECTS = ['🍎', '🍓', '⭐', '🐟', '🌸', '🍪', '🎈', '🐞', '🍋', '🦋'];

export function applyRule(x: number, r: NRule): number | null {
  if (r.k === 'add') return x + r.n;
  if (r.k === 'mul') return x * r.n;
  return x % 2 === 0 ? x / 2 : null;
}

/** All the simple rules a child might see. Used to make sure the top pair has only ONE explanation. */
export const ALL_NRULES: NRule[] = [
  ...[1, 2, 3, 4, -1, -2, -3, -4].map((n) => ({ k: 'add', n }) as NRule),
  { k: 'mul', n: 2 },
  { k: 'mul', n: 3 },
  { k: 'half' },
];
const ok = (x: number | null): x is number => x !== null && x >= 1 && x <= 12;

function rulesFor(level: number): NRule[] {
  switch (level) {
    case 1: return [{ k: 'add', n: 1 }, { k: 'add', n: -1 }];
    case 2: return [{ k: 'add', n: 2 }, { k: 'add', n: -2 }, { k: 'add', n: 1 }];
    case 3: return [{ k: 'mul', n: 2 }, { k: 'half' }, { k: 'add', n: 2 }];
    case 4: return [{ k: 'add', n: 3 }, { k: 'add', n: -3 }, { k: 'mul', n: 2 }, { k: 'half' }];
    default: return [{ k: 'add', n: 4 }, { k: 'add', n: -4 }, { k: 'mul', n: 3 }, { k: 'mul', n: 2 }, { k: 'half' }, { k: 'add', n: 3 }];
  }
}

function generate(level: number, rng: Rng): NumAnalogyQ {
  for (let tries = 0; tries < 500; tries++) {
    const rule = rng.pick(rulesFor(level));
    const a = rng.int(1, 10);
    const b = applyRule(a, rule);
    if (!ok(b) || b === a) continue;
    // The top pair must have exactly one rule that explains it, or the puzzle is unfair.
    const explaining = ALL_NRULES.filter((r) => applyRule(a, r) === b);
    if (explaining.length !== 1) continue;
    const c = rng.int(1, 10);
    if (c === a) continue;
    const d = applyRule(c, rule);
    if (!ok(d) || d === c) continue;
    const eA = rng.pick(OBJECTS);
    const eC = level >= 5 ? rng.pick(OBJECTS.filter((o) => o !== eA)) : eA;
    const others = ALL_NRULES.map((r) => applyRule(c, r)).filter(ok);
    const cand = [c, d + 1, d - 1, b, ...rng.shuffle(others), d + 2, d - 2].filter((x) => x >= 1 && x <= 12);
    const count = level <= 2 ? 4 : 5;
    const { choices, correct } = buildChoices(rng, d, cand, count, String);
    if (choices.length < count) continue;
    return {
      id: uid('na'),
      type: 'numanalogy',
      level,
      say: 'The first box changes into the second box. Change the third box the same way. Which group goes in the empty box?',
      answer: { kind: 'choice', choices, correct },
      hint: 'Count the first two boxes. How did the number change? Do the same thing to the third box.',
      trick: 'numanalogy',
      a, b, c, d, eA, eC, rule,
    };
  }
  throw new Error('numanalogy: could not generate');
}

function ruleTag(r: NRule): string {
  if (r.k === 'add') return r.n > 0 ? `+${r.n}` : `${r.n}`;
  if (r.k === 'mul') return r.n === 2 ? 'double' : 'x3';
  return 'half';
}
function ruleWords(r: NRule): string {
  if (r.k === 'add') return r.n > 0 ? `It gets ${r.n} more.` : `It loses ${-r.n}.`;
  if (r.k === 'mul') return r.n === 2 ? 'It doubles. Twice as many!' : 'It becomes three times as many.';
  return 'It is cut in half.';
}

const BOX = 'clamp(110px, 17vh, 150px)';

function Layout({ q, fourth, counts, tag }: { q: NumAnalogyQ; fourth: React.ReactNode; counts?: [boolean, boolean, boolean]; tag?: boolean }) {
  const box = (n: number, e: string, show?: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <Frame w={BOX} h={BOX}><Group n={n} e={e} size={22} /></Frame>
      {counts && <Num n={n} show={show} />}
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 22, background: '#fff' }}>
        {box(q.a, q.eA, counts?.[0])}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {tag !== undefined && <Tag show={tag}>{ruleTag(q.rule)}</Tag>}
          <Arrow />
        </div>
        {box(q.b, q.eA, counts?.[1])}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 22, background: '#fff' }}>
        {box(q.c, q.eC, counts?.[2])}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {tag !== undefined && <Tag show={tag}>{ruleTag(q.rule)}</Tag>}
          <Arrow />
        </div>
        {fourth}
      </div>
    </div>
  );
}

function Stimulus({ q }: { q: NumAnalogyQ }) {
  return <Layout q={q} fourth={<QuestionBox w={BOX} h={BOX} />} />;
}

function Choice({ q, data }: { q: NumAnalogyQ; data: unknown; index: number }) {
  return <Group n={data as number} e={q.eC} size={18} />;
}

function wrongFeedback(q: NumAnalogyQ, given: number): string | undefined {
  if (q.answer.kind !== 'choice') return;
  const v = q.answer.choices[given] as number;
  if (v === q.c) return 'That is the same as the third box. Something needs to change!';
  if (v === q.b) return 'That matches the second box. Use the third box and change it the same way.';
  if (Math.abs(v - q.d) === 1) return 'So close! Count again carefully.';
  return 'Count the first two boxes. How much did it change?';
}

function solution(q: NumAnalogyQ) {
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  return [
    { say: `Count the first two boxes. ${q.a}, and ${q.b}.` },
    { say: `How did it change? ${ruleWords(q.rule)}` },
    { say: `The third box has ${q.c}. Do the same change.` },
    { say: `That makes ${q.d}. The answer is ${letter}!` },
    { say: 'Trick: count both boxes and find the change. Then make the same change.' },
  ];
}

function Solution({ q, step }: { q: NumAnalogyQ; step: number }) {
  const pops = useTicker(q.d, 260, step === 2, 600);
  const fourth =
    step < 2 ? <QuestionBox w={BOX} h={BOX} /> : (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <Frame w={BOX} h={BOX} highlight="var(--green)"><Group n={q.d} e={q.eC} size={22} show={step >= 3 ? q.d : pops} /></Frame>
        <Num n={q.d} show={step >= 3 || pops >= q.d} color="var(--green)" />
      </div>
    );
  return <Layout q={q} fourth={fourth} counts={[true, true, step >= 2]} tag={step >= 1} />;
}

export const numanalogy: TypeModule<NumAnalogyQ> = {
  type: 'numanalogy',
  world: 'numbers',
  name: 'Number pairs',
  testName: 'Number Analogies',
  intro: 'Number pairs! Find how the first group changes, and change the next one the same way.',
  maxLevel: 6,
  tricks: [
    {
      id: 'numanalogy',
      type: 'numanalogy',
      title: 'Same change',
      rule: 'Count both boxes and find the change. Make the same change.',
      intro: 'Here is the number pairs trick. Count, find the change, copy it.',
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
