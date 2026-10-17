import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Figure, figKey, type Fig, type Fill, type ShapeKind, ALL_SHAPES, TURNABLE, FILL_WORD } from '../../ui/Figure';
import { Frame, QuestionBox, Tag, Arrow, useEntered } from '../../ui/kit';

type Change =
  | { attr: 'fill'; from: Fill; to: Fill }
  | { attr: 'size'; toBig: boolean }
  | { attr: 'rot'; by: number }
  | { attr: 'count'; by: number }
  | { attr: 'dot'; add: boolean };

export interface MatrixQ extends BaseQ {
  a: Fig;
  b: Fig;
  c: Fig;
  d: Fig;
  changes: Change[];
  /** What each choice is (for targeted feedback). */
  tags: string[];
}

function apply(f: Fig, changes: Change[]): Fig {
  let g = { ...f };
  for (const ch of changes) {
    if (ch.attr === 'fill') g = { ...g, fill: ch.to };
    if (ch.attr === 'size') g = { ...g, big: ch.toBig };
    if (ch.attr === 'rot') g = { ...g, rot: g.rot + ch.by };
    if (ch.attr === 'count') g = { ...g, count: g.count + ch.by };
    if (ch.attr === 'dot') g = { ...g, dot: ch.add };
  }
  return g;
}

function changeWords(ch: Change): string {
  switch (ch.attr) {
    case 'fill': return `turns ${FILL_WORD[ch.to]}`;
    case 'size': return ch.toBig ? 'gets bigger' : 'gets smaller';
    case 'rot': return Math.abs(ch.by) === 180 ? 'flips upside down' : ch.by > 0 ? 'turns to the right' : 'turns to the left';
    case 'count': return ch.by > 0 ? `gets ${ch.by === 1 ? 'one more' : `${ch.by} more`}` : 'loses one';
    case 'dot': return ch.add ? 'gets a dot' : 'loses its dot';
  }
}

const FILLS: Fill[] = ['solid', 'empty', 'gray', 'striped'];

function pickChange(rng: Rng, level: number, base: Fig, used: string[]): Change {
  const options: string[] = ['fill', 'size'];
  if (level >= 2) options.push('dot', 'count');
  if (level >= 3) options.push('rot');
  const attr = rng.pick(options.filter((o) => !used.includes(o)));
  switch (attr) {
    case 'fill': {
      const pool = level <= 2 ? (['solid', 'empty'] as Fill[]) : FILLS;
      const to = rng.pick(pool.filter((f) => f !== base.fill));
      return { attr: 'fill', from: base.fill, to };
    }
    case 'size': return { attr: 'size', toBig: !base.big };
    case 'dot': return { attr: 'dot', add: !base.dot };
    case 'count': return { attr: 'count', by: base.count >= 3 ? -1 : 1 };
    default: return { attr: 'rot', by: level >= 4 ? rng.pick([90, -90, 180]) : 180 };
  }
}

function generate(level: number, rng: Rng): MatrixQ {
  const nChanges = level >= 5 ? 2 : 1;
  const changes: Change[] = [];
  // Base figure for the top row
  let a: Fig = {
    shape: rng.pick(ALL_SHAPES),
    fill: rng.pick(level <= 2 ? (['solid', 'empty'] as Fill[]) : FILLS),
    big: rng.chance(0.6),
    rot: 0,
    count: level >= 2 ? rng.int(1, 2) : 1,
    dot: false,
  };
  for (let i = 0; i < nChanges; i++) changes.push(pickChange(rng, level, a, changes.map((c) => c.attr)));
  // Rotations only make sense on shapes that look different when turned.
  const hasRot = changes.some((c) => c.attr === 'rot');
  if (hasRot) a = { ...a, shape: rng.pick(TURNABLE) };
  // Bottom row: a different shape, same starting values for the changing attributes.
  const shapePool: ShapeKind[] = (hasRot ? TURNABLE : ALL_SHAPES).filter((s) => s !== a.shape);
  let c: Fig = { ...a, shape: rng.pick(shapePool) };
  if (level >= 4) {
    // Make the rows differ in something that does NOT change, so she has to focus on the rule.
    const changing = changes.map((x) => x.attr);
    if (!changing.includes('count') && rng.chance(0.5)) c = { ...c, count: c.count === 1 ? 2 : 1 };
    if (!changing.includes('fill') && rng.chance(0.5)) c = { ...c, fill: rng.pick(FILLS.filter((f) => f !== a.fill)) };
  }
  const b = apply(a, changes);
  const d = apply(c, changes);

  // Distractors, each tagged so we can give targeted feedback.
  const cand: { fig: Fig; tag: string }[] = [];
  cand.push({ fig: c, tag: 'same' });
  cand.push({ fig: { ...b }, tag: 'top' });
  if (changes.length === 2) {
    cand.push({ fig: apply(c, [changes[0]]), tag: 'half' });
    cand.push({ fig: apply(c, [changes[1]]), tag: 'half' });
  }
  for (const ch of changes) {
    if (ch.attr === 'rot') cand.push({ fig: { ...d, rot: d.rot - 2 * ch.by }, tag: 'wrongway' }, { fig: { ...d, rot: d.rot + 90 }, tag: 'wrongway' });
    if (ch.attr === 'fill') cand.push({ fig: { ...d, fill: rng.pick(FILLS.filter((f) => f !== ch.to && f !== ch.from)) }, tag: 'other' });
    if (ch.attr === 'count') cand.push({ fig: { ...d, count: d.count + ch.by }, tag: 'other' });
  }
  // Generic "changed the wrong thing" options
  const wrongAttrs: Fig[] = [
    { ...c, big: !c.big },
    { ...c, dot: !c.dot },
    { ...c, fill: c.fill === 'solid' ? 'empty' : 'solid' },
    { ...d, dot: !d.dot },
    { ...d, big: !d.big },
  ];
  for (const w of rng.shuffle(wrongAttrs)) cand.push({ fig: w, tag: 'other' });

  const count = level <= 2 ? 4 : 5;
  const ordered = [cand[0], cand[1], ...rng.shuffle(cand.slice(2))];
  const { choices, correct } = buildChoices(rng, { fig: d, tag: 'right' }, ordered, count, (x) => figKey(x.fig));

  return {
    id: uid('mx'),
    type: 'matrices',
    level,
    say: 'The two pictures on top go together. Which picture goes with the bottom one, in the same way?',
    answer: { kind: 'choice', choices: choices.map((x) => x.fig), correct },
    hint: 'Look at the top row. What is different about the second picture? Do that to the bottom picture.',
    trick: 'matrices',
    a, b, c, d, changes,
    tags: choices.map((x) => x.tag),
  };
}

function Grid({ q, fourth, highlightTop, highlightBottom }: { q: MatrixQ; fourth: React.ReactNode; highlightTop?: boolean; highlightBottom?: boolean }) {
  const S = 'clamp(92px, 16vh, 140px)';
  const fs = '78%';
  const top = highlightTop ? 'var(--purple)' : undefined;
  const bot = highlightBottom ? 'var(--sun)' : undefined;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${S} 40px ${S}`, gridTemplateRows: `${S} ${S}`, gap: 14, alignItems: 'center', justifyItems: 'center' }}>
      <Frame w={S} h={S} highlight={top}><Figure fig={q.a} size={fs} /></Frame>
      <Arrow />
      <Frame w={S} h={S} highlight={top}><Figure fig={q.b} size={fs} /></Frame>
      <Frame w={S} h={S} highlight={bot}><Figure fig={q.c} size={fs} /></Frame>
      <Arrow />
      {fourth}
    </div>
  );
}

function Stimulus({ q }: { q: MatrixQ }) {
  return <Grid q={q} fourth={<QuestionBox w="clamp(92px, 16vh, 140px)" h="clamp(92px, 16vh, 140px)" />} />;
}

function Choice({ data }: { q: MatrixQ; data: unknown; index: number }) {
  return <Figure fig={data as Fig} size="clamp(70px, 11vh, 100px)" />;
}

function wrongFeedback(q: MatrixQ, given: number): string | undefined {
  const tag = q.tags[given];
  if (tag === 'same') return 'That one looks just like the bottom picture. Something needs to change!';
  if (tag === 'top') return 'That is the top picture. We need the bottom shape, changed the same way.';
  if (tag === 'half') return 'Close! But two things change in the top row. Did you do both?';
  if (tag === 'wrongway') return 'Almost! Check which way it turns.';
  return 'Look at the top row again. What exactly changed?';
}

function solution(q: MatrixQ) {
  const what = q.changes.map(changeWords).join(', and it ');
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  return [
    { say: 'Look at the top row. The first picture changes into the second picture.' },
    { say: `What changed? It ${what}.` },
    { say: 'Now do the exact same thing to the bottom picture.' },
    { say: `There it is! The answer is ${letter}.` },
    { say: 'Trick: find what changes in the top row, then do the same change to the bottom.' },
  ];
}

function Solution({ q, step }: { q: MatrixQ; step: number }) {
  const entered = useEntered(400);
  const S = 'clamp(92px, 16vh, 140px)';
  const morphTo = step >= 3 || (step === 2 && entered);
  const fourth =
    step < 2 ? (
      <QuestionBox w={S} h={S} />
    ) : (
      <Frame w={S} h={S} highlight={step >= 3 ? 'var(--green)' : 'var(--sun)'}>
        <Figure fig={morphTo ? q.d : q.c} size="78%" />
      </Frame>
    );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ minHeight: 40, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {q.changes.map((ch, i) => (
          <Tag key={i} show={step >= 1}>It {changeWords(ch)}</Tag>
        ))}
      </div>
      <Grid q={q} fourth={fourth} highlightTop={step <= 1} highlightBottom={step === 2} />
    </div>
  );
}

export const matrices: TypeModule<MatrixQ> = {
  type: 'matrices',
  world: 'shapes',
  name: 'Shape grids',
  testName: 'Figure Matrices',
  intro: 'Shape grids! The top two pictures are a pair. Make a matching pair on the bottom.',
  maxLevel: 6,
  tricks: [
    {
      id: 'matrices',
      type: 'matrices',
      title: 'Same change',
      rule: 'Find what changes in the top row. Do the same change to the bottom.',
      intro: 'Here is a trick for shape grids. The top row shows a change. Watch how we copy it.',
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
