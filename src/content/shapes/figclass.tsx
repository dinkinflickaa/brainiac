import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Figure, figKey, type Fig, type Fill, type ShapeKind, ALL_SHAPES, FILL_WORD, SHAPE_WORD } from '../../ui/Figure';
import { Frame, Mark, Tag, useTicker } from '../../ui/kit';

type Rule =
  | { k: 'shape'; v: ShapeKind }
  | { k: 'fill'; v: Fill }
  | { k: 'dot' }
  | { k: 'small' }
  | { k: 'count'; v: number }
  | { k: 'point'; v: number }
  | { k: 'curvy' };

export interface FigClassQ extends BaseQ {
  examples: Fig[];
  rules: Rule[];
}

const CURVY: ShapeKind[] = ['circle', 'heart', 'half'];
const STRAIGHT: ShapeKind[] = ALL_SHAPES.filter((s) => !CURVY.includes(s));
const FILLS: Fill[] = ['solid', 'empty', 'gray', 'striped'];
const DIRS = [0, 90, 180, 270];
const DIR_WORD: Record<number, string> = { 0: 'right', 90: 'down', 180: 'left', 270: 'up' };

export function fits(f: Fig, r: Rule): boolean {
  switch (r.k) {
    case 'shape': return f.shape === r.v;
    case 'fill': return f.fill === r.v;
    case 'dot': return f.dot;
    case 'small': return !f.big;
    case 'count': return f.count === r.v;
    case 'point': return f.shape === 'arrow' && ((f.rot % 360) + 360) % 360 === r.v;
    case 'curvy': return CURVY.includes(f.shape);
  }
}
export const fitsAll = (f: Fig, rules: Rule[]) => rules.every((r) => fits(f, r));

/** Every rule a child could notice. */
export const ALL_RULES: Rule[] = [
  ...ALL_SHAPES.map((v) => ({ k: 'shape', v }) as Rule),
  ...(['solid', 'empty', 'gray', 'striped'] as Fill[]).map((v) => ({ k: 'fill', v }) as Rule),
  { k: 'dot' }, { k: 'small' },
  ...[1, 2, 3].map((v) => ({ k: 'count', v }) as Rule),
  ...[0, 90, 180, 270].map((v) => ({ k: 'point', v }) as Rule),
  { k: 'curvy' },
];
/** Rules all the examples happen to share. The right answer must share all of them too. */
export const commonRules = (examples: Fig[]) => ALL_RULES.filter((r) => examples.every((e) => fits(e, r)));

function ruleWords(r: Rule): string {
  switch (r.k) {
    case 'shape': return `are all ${SHAPE_WORD[r.v]}s`;
    case 'fill': return `are all ${FILL_WORD[r.v]}`;
    case 'dot': return 'all have a dot';
    case 'small': return 'are all small';
    case 'count': return `all have ${r.v} shapes`;
    case 'point': return `all point ${DIR_WORD[r.v]}`;
    case 'curvy': return 'all have curvy sides';
  }
}
function ruleTag(r: Rule): string {
  switch (r.k) {
    case 'shape': return `all ${SHAPE_WORD[r.v]}s`;
    case 'fill': return `all ${FILL_WORD[r.v]}`;
    case 'dot': return 'all have a dot';
    case 'small': return 'all small';
    case 'count': return `all ${r.v} shapes`;
    case 'point': return `all point ${DIR_WORD[r.v]}`;
    case 'curvy': return 'all curvy';
  }
}

/** Random figure; `level` decides how many things vary. */
function randomFig(rng: Rng, level: number, arrows: boolean): Fig {
  return {
    shape: arrows ? 'arrow' : rng.pick(ALL_SHAPES),
    fill: rng.pick(FILLS),
    big: level >= 2 ? rng.chance(0.6) : true,
    rot: arrows ? rng.pick(DIRS) : 0,
    count: level >= 3 ? rng.pick([1, 1, 2, 3]) : 1,
    dot: level >= 2 ? rng.chance(0.3) : false,
  };
}

function force(f: Fig, r: Rule, sat: boolean, rng: Rng): Fig {
  switch (r.k) {
    case 'shape': return { ...f, shape: sat ? r.v : rng.pick(ALL_SHAPES.filter((s) => s !== r.v)) };
    case 'fill': return { ...f, fill: sat ? r.v : rng.pick(FILLS.filter((x) => x !== r.v)) };
    case 'dot': return { ...f, dot: sat };
    case 'small': return { ...f, big: !sat };
    case 'count': return { ...f, count: sat ? r.v : rng.pick([1, 2, 3].filter((x) => x !== r.v)) };
    case 'point': return { ...f, shape: 'arrow', rot: sat ? r.v : rng.pick(DIRS.filter((x) => x !== r.v)) };
    case 'curvy': return { ...f, shape: rng.pick(sat ? CURVY : STRAIGHT) };
  }
}

function pickRule(rng: Rng, level: number, avoid?: Rule['k']): Rule {
  const kinds: Rule['k'][] = ['shape', 'fill'];
  if (level >= 2) kinds.push('dot', 'small');
  if (level >= 3) kinds.push('count', 'point');
  if (level >= 4) kinds.push('curvy');
  // Arrow-direction rules clash with shape rules, so never pair them.
  const clash = (x: Rule['k']) =>
    !!avoid &&
    (x === 'point' || (avoid === 'point' && (x === 'shape' || x === 'curvy')) ||
      (avoid === 'shape' && x === 'curvy') || (avoid === 'curvy' && x === 'shape'));
  const k = rng.pick(kinds.filter((x) => x !== avoid && !clash(x)));
  switch (k) {
    case 'shape': return { k, v: rng.pick(ALL_SHAPES.filter((s) => s !== 'arrow')) };
    case 'fill': return { k, v: rng.pick(FILLS) };
    case 'count': return { k, v: rng.pick([2, 3]) };
    case 'point': return { k, v: rng.pick(DIRS) };
    default: return { k } as Rule;
  }
}

function compatible(rules: Rule[]): boolean {
  const shape = rules.find((r) => r.k === 'shape') as { v: ShapeKind } | undefined;
  const curvy = rules.some((r) => r.k === 'curvy');
  if (shape && curvy && !CURVY.includes(shape.v)) return false;
  return true;
}

function generate(level: number, rng: Rng): FigClassQ {
  let rules: Rule[];
  do {
    const first = pickRule(rng, level);
    rules = level >= 5 ? [first, pickRule(rng, level, first.k)] : [first];
  } while (!compatible(rules));
  const arrows = rules.some((r) => r.k === 'point');

  const make = (sat: boolean[]): Fig => {
    let f = randomFig(rng, level, arrows);
    rules.forEach((r, i) => { f = force(f, r, sat[i], rng); });
    return f;
  };
  const allSat = rules.map(() => true);

  // Three examples that follow the rule but differ from each other in other ways.
  const examples: Fig[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (examples.length < 3 && guard++ < 200) {
    const f = make(allSat);
    const k = figKey(f);
    if (!seen.has(k)) { seen.add(k); examples.push(f); }
  }
  // The answer must share everything the examples share, so there is no second "rule" that points elsewhere.
  const common = commonRules(examples);
  let answer = make(allSat);
  guard = 0;
  while ((seen.has(figKey(answer)) || !fitsAll(answer, common)) && guard++ < 300) answer = make(allSat);
  if (!fitsAll(answer, common) || seen.has(figKey(answer))) return generate(level, rng);

  // Distractors break the rule. With two rules, they keep one and break the other (harder).
  const distractors: Fig[] = [];
  for (let i = 0; i < 30; i++) {
    const sat = rules.length === 2 ? (i % 2 === 0 ? [true, false] : [false, true]) : [false];
    const base = rng.chance(0.5) ? { ...rng.pick(examples) } : randomFig(rng, level, arrows);
    let f = base;
    rules.forEach((r, j) => { f = force(f, r, sat[j], rng); });
    if (!fitsAll(f, rules)) distractors.push(f);
  }
  const count = level <= 2 ? 4 : 5;
  const { choices, correct } = buildChoices(rng, answer, distractors, count, figKey);
  return {
    id: uid('fc'),
    type: 'figclass',
    level,
    say: 'These three pictures belong together. Which picture below belongs with them too?',
    answer: { kind: 'choice', choices, correct },
    hint: 'What is the same about all three pictures? Look at the shape, the color, the size and any dots.',
    trick: 'figclass',
    examples,
    rules,
  };
}

const S = 'clamp(84px, 14vh, 128px)';

function Examples({ q, glow }: { q: FigClassQ; glow?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 24, background: glow ? 'var(--purple-soft)' : 'transparent', transition: 'background 400ms' }}>
      {q.examples.map((f, i) => (
        <Frame key={i} w={S} h={S} highlight={glow ? 'var(--purple)' : undefined}>
          <Figure fig={f} size="78%" />
        </Frame>
      ))}
    </div>
  );
}

function Stimulus({ q }: { q: FigClassQ }) {
  return <Examples q={q} />;
}

function Choice({ data }: { q: FigClassQ; data: unknown; index: number }) {
  return <Figure fig={data as Fig} size="clamp(70px, 11vh, 100px)" />;
}

function wrongFeedback(q: FigClassQ, given: number): string | undefined {
  if (q.answer.kind !== 'choice') return undefined;
  const f = q.answer.choices[given] as Fig;
  const broken = q.rules.find((r) => !fits(f, r));
  if (!broken) return undefined;
  return `Look again. The three pictures ${ruleWords(broken)}. Is that one?`;
}

function solution(q: FigClassQ) {
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  const what = q.rules.map(ruleWords).join(', and they ');
  return [
    { say: 'Look at the three pictures. What is the same about all of them?' },
    { say: `They ${what}.` },
    { say: 'Now check each answer. Does it follow the same rule?' },
    { say: `Only ${letter} follows the rule. That's the answer!` },
    { say: 'Trick: find what all three have in common. Then pick the one that has it too.' },
  ];
}

function Solution({ q, step }: { q: FigClassQ; step: number }) {
  const choices = q.answer.kind === 'choice' ? (q.answer.choices as Fig[]) : [];
  const checked = useTicker(choices.length, 700, step === 2);
  const shown = step >= 3 ? choices.length : step === 2 ? checked : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ minHeight: 38, display: 'flex', gap: 8 }}>
        {q.rules.map((r, i) => <Tag key={i} show={step >= 1}>{ruleTag(r)}</Tag>)}
      </div>
      <Examples q={q} glow={step <= 1} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', opacity: step >= 2 ? 1 : 0.35, transition: 'opacity 400ms' }}>
        {choices.map((f, i) => {
          const ok = fitsAll(f, q.rules);
          const isAns = q.answer.kind === 'choice' && i === q.answer.correct;
          return (
            <div key={i} style={{ position: 'relative', opacity: step >= 3 && !isAns ? 0.35 : 1, transition: 'opacity 400ms' }}>
              <Frame w="clamp(70px, 11vh, 100px)" h="clamp(70px, 11vh, 100px)" highlight={step >= 3 && isAns ? 'var(--green)' : undefined}>
                <Figure fig={f} size="76%" />
              </Frame>
              <div style={{ position: 'absolute', top: -10, right: -10 }}><Mark ok={ok} show={i < shown} size={30} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const figclass: TypeModule<FigClassQ> = {
  type: 'figclass',
  world: 'shapes',
  name: 'Which one belongs',
  testName: 'Figure Classification',
  intro: 'Which one belongs? Find what three pictures share.',
  maxLevel: 6,
  tricks: [
    {
      id: 'figclass',
      type: 'figclass',
      title: 'What do they share?',
      rule: 'Find what all three have in common. Pick the one that has it too.',
      intro: 'Here is the trick for which one belongs. Be a detective and find what is the same.',
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
