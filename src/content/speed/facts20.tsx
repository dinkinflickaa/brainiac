import type { BaseQ, Trick, TypeModule } from '../../engine/types';
import { uid, type Rng } from '../../engine/rng';
import { Tag, useEntered } from '../../ui/kit';
import { Blocks, NumberLine, Rekenrek, TenFrames } from './visuals';
import { craFor } from './support';

export type Op = '+' | '-';
export interface Fact { op: Op; a: number; b: number }
export type Strategy =
  | 'countOn' | 'doubles' | 'nearDoubles' | 'tenPartners' | 'plus10' | 'make10' | 'plus9'
  | 'countBack' | 'thinkAdd' | 'backThrough10' | 'minus10';

export const factKey = (f: Fact) => `${f.a}${f.op}${f.b}`;
export const factAnswer = (f: Fact) => (f.op === '+' ? f.a + f.b : f.a - f.b);

/** Which trick fits a fact best. Order matters: the first match wins. */
export function strategyOf(f: Fact): Strategy {
  if (f.op === '+') {
    const lo = Math.min(f.a, f.b);
    const hi = Math.max(f.a, f.b);
    if (f.a === f.b) return 'doubles';
    if (f.a + f.b === 10) return 'tenPartners';
    if (hi === 10) return 'plus10';
    if (lo <= 3) return 'countOn';
    if (hi - lo === 1) return 'nearDoubles';
    if (hi === 9) return 'plus9';
    return 'make10';
  }
  const d = f.a - f.b;
  if (f.b === 10) return 'minus10';
  if (f.b <= 3) return 'countBack';
  if (f.a === 10) return 'tenPartners';
  if (d === f.b) return 'thinkAdd';
  if (f.a > 10 && d < 10) return 'backThrough10';
  return 'thinkAdd';
}

/** Order the tricks are introduced in (easiest first). */
export const CURRICULUM: Strategy[] = ['countOn', 'doubles', 'tenPartners', 'plus10', 'countBack', 'nearDoubles', 'make10', 'plus9', 'thinkAdd', 'minus10', 'backThrough10'];

/** Every fact in the "within 20" set, grouped by trick. */
export function allFacts(): Fact[] {
  const out: Fact[] = [];
  for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10; b++) if (a + b <= 20 && !(a === 0 && b === 0)) out.push({ op: '+', a, b });
  for (let c = 1; c <= 20; c++) for (let b = 1; b <= Math.min(10, c); b++) if (c - b <= 10) out.push({ op: '-', a: c, b });
  return out;
}
export const FACTS_BY_STRATEGY: Record<Strategy, Fact[]> = (() => {
  const m = Object.fromEntries(CURRICULUM.map((s) => [s, [] as Fact[]])) as Record<Strategy, Fact[]>;
  for (const f of allFacts()) {
    // keep zeros and plain "+1 / -1" sparse; they are too easy to drill
    if ((f.op === '+' && (f.a === 0 || f.b === 0)) || (f.op === '-' && f.b === f.a)) continue;
    m[strategyOf(f)].push(f);
  }
  return m;
})();

const LEVEL_TRICKS: Strategy[][] = [
  ['countOn', 'doubles', 'tenPartners', 'plus10'],
  ['countOn', 'doubles', 'tenPartners', 'plus10', 'nearDoubles', 'countBack'],
  ['nearDoubles', 'make10', 'plus9', 'doubles', 'countBack'],
  ['make10', 'plus9', 'thinkAdd', 'minus10', 'nearDoubles'],
  ['backThrough10', 'thinkAdd', 'make10', 'plus9'],
  CURRICULUM,
];

export const TRICKS: Record<Strategy, Trick> = {
  countOn: { id: 'countOn', type: 'facts20', title: 'Count on', rule: 'Start at the bigger number and count on.', intro: 'When you add a small number, start big and count on.' },
  doubles: { id: 'doubles', type: 'facts20', title: 'Double twins', rule: 'Doubles are twins. Learn them by heart: 6 and 6 is 12.', intro: 'Doubles are numbers added to themselves. They are the easiest facts to remember!' },
  nearDoubles: { id: 'nearDoubles', type: 'facts20', title: 'Doubles plus one', rule: 'Numbers next to each other? Double the small one, add 1.', intro: 'When two numbers are neighbors, use a double and add one.' },
  tenPartners: { id: 'tenPartners', type: 'facts20', title: 'Ten friends', rule: 'Ten friends always make 10: 1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5.', intro: 'Some numbers are best friends because together they make ten.' },
  plus10: { id: 'plus10', type: 'facts20', title: 'Plus ten', rule: 'Adding 10? Just add one ten-stick: 6 becomes 16.', intro: 'Adding ten is super fast. Watch!' },
  make10: { id: 'make10', type: 'facts20', title: 'Make a 10', rule: 'Move some over to make 10. Then add what is left.', intro: 'Ten is a magic number. Make a ten first, and adding gets easy.' },
  plus9: { id: 'plus9', type: 'facts20', title: 'The +9 shortcut', rule: 'Adding 9? Add 10, then take 1 away.', intro: 'Nine is almost ten. Here is a shortcut.' },
  countBack: { id: 'countBack', type: 'facts20', title: 'Count back', rule: 'Taking away a small number? Count back.', intro: 'When you take away 1, 2 or 3, just count back.' },
  thinkAdd: { id: 'thinkAdd', type: 'facts20', title: 'Think addition', rule: 'For take away, think: what plus the small number makes the big one?', intro: 'Every take away fact has an adding fact hiding inside it.' },
  backThrough10: { id: 'backThrough10', type: 'facts20', title: 'Back through 10', rule: 'Take away to get to 10 first. Then take away the rest.', intro: 'Here is how to take away across ten in your head.' },
  minus10: { id: 'minus10', type: 'facts20', title: 'Minus ten', rule: 'Taking away 10? Just take away one ten-stick: 17 becomes 7.', intro: 'Taking away ten is super fast. Watch!' },
};

export interface FactQ extends BaseQ {
  f: Fact;
  strategy: Strategy;
}

export function makeFactQ(f: Fact, level = 1, cra?: 0 | 1 | 2): FactQ {
  const strategy = strategyOf(f);
  const ans = factAnswer(f);
  return {
    id: uid('f'),
    type: 'facts20',
    level,
    say: `What is ${f.a} ${f.op === '+' ? 'plus' : 'take away'} ${f.b}?`,
    text: `${f.a} ${f.op === '+' ? '+' : '−'} ${f.b}`,
    answer: { kind: 'number', correct: ans, maxDigits: 2 },
    hint: hintFor(f, strategy),
    trick: strategy,
    fact: factKey(f),
    cra: cra ?? craFor(strategy),
    f,
    strategy,
  };
}

function hintFor(f: Fact, s: Strategy): string {
  const hi = Math.max(f.a, f.b);
  const lo = Math.min(f.a, f.b);
  switch (s) {
    case 'countOn': return `Start at ${hi}, and count on ${lo}.`;
    case 'doubles': return `It's a double! ${f.a} and ${f.a}.`;
    case 'nearDoubles': return `What is ${lo} plus ${lo}? Now add one more.`;
    case 'tenPartners': return f.op === '+' ? 'These two are ten friends!' : `What goes with ${f.b} to make ten?`;
    case 'plus10': return `Add one ten to ${lo}.`;
    case 'make10': return `How many does ${hi} need to make ten? Move them over.`;
    case 'plus9': return `Add 10 to ${f.a === 9 ? f.b : f.a}, then take 1 away.`;
    case 'countBack': return `Start at ${f.a} and count back ${f.b}.`;
    case 'thinkAdd': return `Think: ${f.b} plus what makes ${f.a}?`;
    case 'backThrough10': return `First take away ${f.a - 10} to get to 10. Then take away the rest.`;
    case 'minus10': return `Take one ten away from ${f.a}.`;
  }
}

function pickFact(rng: Rng, s: Strategy): Fact {
  const pool = FACTS_BY_STRATEGY[s];
  return rng.pick(pool);
}

function generate(level: number, rng: Rng, trickId?: string): FactQ {
  const s = (trickId && trickId in TRICKS ? trickId : rng.pick(LEVEL_TRICKS[Math.min(5, level - 1)])) as Strategy;
  return makeFactQ(pickFact(rng, s), level);
}

/* ---------- Visual support (concrete / pictorial) ---------- */

/** Starting picture for each trick, used under the question (concrete stage) and at the start of solutions. */
function StartVisual({ q, compact }: { q: FactQ; compact?: boolean }) {
  const { f, strategy } = q;
  const hi = Math.max(f.a, f.b);
  const lo = Math.min(f.a, f.b);
  const w = compact ? 420 : 560;
  switch (strategy) {
    case 'doubles':
    case 'nearDoubles':
      return <Rekenrek rows={[f.a, f.b]} width={w} />;
    case 'tenPartners':
      return f.op === '+' ? <Rekenrek rows={[f.a + f.b]} width={w} /> : <Rekenrek rows={[10]} width={w} />;
    case 'make10':
      return <TenFrames a={hi} b={lo} size={compact ? 32 : 40} />;
    case 'plus10':
    case 'plus9': {
      const base = strategy === 'plus10' ? lo : f.a === 9 ? f.b : f.a;
      return <Blocks tens={Math.floor(base / 10)} ones={base % 10} unit={compact ? 12 : 15} />;
    }
    case 'minus10':
      return <Blocks tens={Math.floor(f.a / 10)} ones={f.a % 10} unit={compact ? 12 : 15} />;
    default:
      return <NumberLine from={f.op === '+' ? hi : f.a} hops={[]} played={0} width={w} />;
  }
}

/** Dots only (pictorial stage): two small groups. */
function Dots({ q }: { q: FactQ }) {
  const { f } = q;
  const group = (n: number, color: string, crossed = 0) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 16px)', gap: 4 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: color, opacity: i >= n - crossed ? 0.25 : 1 }} />
      ))}
    </div>
  );
  return f.op === '+' ? (
    <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>{group(f.a, '#5B3FD6')}<span className="display" style={{ fontSize: 30 }}>+</span>{group(f.b, '#E8590C')}</div>
  ) : (
    <div>{group(f.a, '#5B3FD6', f.b)}</div>
  );
}

function Stimulus({ q }: { q: FactQ }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div className="display" style={{ fontSize: 'clamp(64px, 12vh, 104px)', lineHeight: 1, background: '#fff', borderRadius: 26, padding: '14px 40px' }}>
        {q.f.a} {q.f.op === '+' ? '+' : '−'} {q.f.b} = <span style={{ color: '#9AA3C0' }}>?</span>
      </div>
      {q.cra === 0 && <StartVisual q={q} compact />}
      {q.cra === 1 && <Dots q={q} />}
    </div>
  );
}

function wrongFeedback(q: FactQ, given: number): string | undefined {
  const ans = factAnswer(q.f);
  if (Math.abs(given - ans) === 1) return 'Just one off! Try again.';
  if (q.f.op === '-' && given === q.f.a + q.f.b) return 'Oops, that is adding. This one is take away.';
  if (q.f.op === '+' && given === Math.abs(q.f.a - q.f.b)) return 'Oops, that is take away. This one is adding.';
  if (Math.abs(given - ans) === 10) return 'Check your tens. Is it more than ten, or less?';
  return undefined;
}

/* ---------- Narrated solutions ---------- */

function solution(q: FactQ) {
  const { f, strategy } = q;
  const ans = factAnswer(f);
  const hi = Math.max(f.a, f.b);
  const lo = Math.min(f.a, f.b);
  const rule = { say: `Trick: ${TRICKS[strategy].rule}` };
  switch (strategy) {
    case 'countOn': return [
      { say: `Start at the bigger number, ${hi}.` },
      { say: `Count on ${lo}: ${Array.from({ length: lo }, (_, i) => hi + i + 1).join(', ')}.` },
      { say: `${f.a} plus ${f.b} is ${ans}.` }, rule];
    case 'doubles': return [
      { say: `${f.a} and ${f.a}. Two rows the same. That's a double!` },
      { say: `Double ${f.a} is ${ans}.` }, rule];
    case 'nearDoubles': return [
      { say: `${lo} and ${hi} are neighbors.` },
      { say: `Double the small one: ${lo} plus ${lo} is ${lo * 2}.` },
      { say: `Then one more: ${lo * 2} plus 1 is ${ans}.` }, rule];
    case 'tenPartners': return f.op === '+'
      ? [{ say: `${f.a} and ${f.b} fill a whole row.` }, { say: `They are ten friends! ${f.a} plus ${f.b} is 10.` }, rule]
      : [{ say: `Start with 10. Take away ${f.b}.` }, { say: `${f.b} and ${ans} are ten friends. So 10 take away ${f.b} is ${ans}.` }, rule];
    case 'plus10': return [
      { say: `Here is ${lo}.` },
      { say: `Add one ten-stick.` },
      { say: `${lo} plus 10 is ${ans}.` }, rule];
    case 'make10': return [
      { say: `${hi} needs ${10 - hi} more to make ten.` },
      { say: `Move ${10 - hi} over. Now the first frame is full: 10!` },
      { say: `There are ${lo - (10 - hi)} left. 10 plus ${lo - (10 - hi)} is ${ans}.` }, rule];
    case 'plus9': {
      const other = f.a === 9 ? f.b : f.a;
      return [
        { say: `Here is ${other}. We want to add 9.` },
        { say: `9 is almost 10. Add a whole ten: ${other + 10}.` },
        { say: `But that is one too many. Take 1 away: ${ans}.` }, rule];
    }
    case 'countBack': return [
      { say: `Start at ${f.a}.` },
      { say: `Count back ${f.b}: ${Array.from({ length: f.b }, (_, i) => f.a - i - 1).join(', ')}.` },
      { say: `${f.a} take away ${f.b} is ${ans}.` }, rule];
    case 'thinkAdd': return f.a - f.b === f.b
      ? [{ say: `Think addition. What plus ${f.b} makes ${f.a}?` }, { say: `It's a double! ${f.b} plus ${f.b} is ${f.a}.` }, { say: `So ${f.a} take away ${f.b} is ${ans}.` }, rule]
      : [{ say: `Think addition. ${f.b} plus what makes ${f.a}?` }, { say: `Jump from ${f.b} up to ${f.a}. That's ${ans}.` }, { say: `So ${f.a} take away ${f.b} is ${ans}.` }, rule];
    case 'backThrough10': {
      const first = f.a - 10;
      return [
        { say: `Start at ${f.a}. First take away ${first} to land on 10.` },
        { say: `We still need to take away ${f.b - first} more.` },
        { say: `10 take away ${f.b - first} is ${ans}.` }, rule];
    }
    case 'minus10': return [
      { say: `Here is ${f.a}.` },
      { say: `Take away one ten-stick.` },
      { say: `${f.a} take away 10 is ${ans}.` }, rule];
  }
}

function Equation({ q, done }: { q: FactQ; done: boolean }) {
  return (
    <div className="display" style={{ fontSize: 'clamp(44px, 8vh, 72px)', lineHeight: 1 }}>
      {q.f.a} {q.f.op === '+' ? '+' : '−'} {q.f.b} = <span style={{ color: done ? 'var(--green)' : '#9AA3C0' }}>{done ? factAnswer(q.f) : '?'}</span>
    </div>
  );
}

function Solution({ q, step }: { q: FactQ; step: number }) {
  const { f, strategy } = q;
  const on = useEntered(300);
  const ans = factAnswer(f);
  const hi = Math.max(f.a, f.b);
  const lo = Math.min(f.a, f.b);
  const total = solution(q).length;
  const done = step >= total - 2;
  let visual: React.ReactNode = null;
  let tag: React.ReactNode = null;
  switch (strategy) {
    case 'countOn':
      visual = <NumberLine key={`c${step}`} from={hi} hops={Array.from({ length: lo }, () => ({ by: 1 }))} played={step === 0 ? 0 : undefined} auto={step === 1} everyMs={650} />;
      break;
    case 'countBack':
      visual = <NumberLine key={`b${step}`} from={f.a} hops={Array.from({ length: f.b }, () => ({ by: -1 }))} played={step === 0 ? 0 : undefined} auto={step === 1} everyMs={650} />;
      break;
    case 'doubles':
      visual = <Rekenrek rows={[f.a, f.b]} />;
      tag = <Tag show={step >= 0}>double {f.a}</Tag>;
      break;
    case 'nearDoubles':
      visual = <Rekenrek rows={[lo, hi]} highlight={step >= 2 ? [{ row: 1, index: hi - 1 }] : []} />;
      tag = <Tag show={step >= 1}>{lo} + {lo} = {lo * 2}{step >= 2 ? ', +1' : ''}</Tag>;
      break;
    case 'tenPartners':
      visual = f.op === '+' ? <Rekenrek rows={[10]} highlight={Array.from({ length: f.b }, (_, i) => ({ row: 0, index: f.a + i }))} />
        : <Rekenrek rows={[step >= 1 && on ? ans : 10]} />;
      tag = <Tag show={step >= 1}>ten friends: {f.op === '+' ? `${f.a} + ${f.b}` : `${f.b} + ${ans}`}</Tag>;
      break;
    case 'plus10':
      visual = <Blocks tens={Math.floor(lo / 10)} ones={lo % 10} extraTens={1} showExtra={step >= 1 && (step > 1 || on)} />;
      break;
    case 'minus10':
      visual = <Blocks tens={Math.floor(f.a / 10)} ones={f.a % 10} removeTens={1} removed={step >= 1 && (step > 1 || on)} />;
      break;
    case 'plus9': {
      const other = f.a === 9 ? f.b : f.a;
      visual = <Blocks tens={Math.floor(other / 10)} ones={other % 10} extraTens={1} showExtra={step >= 1 && (step > 1 || on)} removeOnes={1} removed={step >= 2 && (step > 2 || on)} />;
      tag = <Tag show={step >= 1}>+10{step >= 2 ? ', −1' : ''}</Tag>;
      break;
    }
    case 'make10':
      visual = <TenFrames a={hi} b={lo} made10={step >= 1 && (step > 1 || on)} />;
      tag = <Tag show={step >= 1}>10 + {lo - (10 - hi)}</Tag>;
      break;
    case 'thinkAdd':
      visual = f.a - f.b === f.b
        ? <Rekenrek rows={[f.b, f.b]} />
        : <NumberLine key={`t${step}`} from={f.b} hops={[{ by: ans, label: `+${ans}` }]} played={step === 0 ? 0 : undefined} auto={step === 1} />;
      tag = <Tag show={step >= 0}>{f.b} + ? = {f.a}</Tag>;
      break;
    case 'backThrough10': {
      const first = f.a - 10;
      visual = <NumberLine key={`bt${step}`} from={f.a} hops={[{ by: -first }, { by: -(f.b - first) }]} played={Math.min(2, step === 0 ? (on ? 1 : 0) : step === 1 ? 1 : 2)} />;
      break;
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
      <Equation q={q} done={done} />
      <div style={{ minHeight: 38 }}>{tag}</div>
      <div style={{ background: '#fff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 680, display: 'flex', justifyContent: 'center' }}>{visual}</div>
    </div>
  );
}

export const facts20: TypeModule<FactQ> = {
  type: 'facts20',
  world: 'speed',
  name: 'Fact tricks',
  testName: 'Add and subtract within 20 (fluency)',
  intro: 'Fact tricks! Learn the shortcuts, then get super fast.',
  maxLevel: 6,
  tricks: CURRICULUM.map((s) => TRICKS[s]),
  targetSeconds: 3,
  generate,
  Stimulus,
  wrongFeedback,
  solution,
  Solution,
};
