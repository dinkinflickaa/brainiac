import type { BaseQ, Trick, TypeModule } from '../../engine/types';
import { uid, type Rng } from '../../engine/rng';
import { Tag } from '../../ui/kit';
import { Blocks, NumberLine, type Hop } from './visuals';
import { craFor } from './support';

export type MStrategy = 'addTens' | 'subTens' | 'splitAdd' | 'compensate' | 'subJump' | 'countUpSub' | 'hundreds';

export interface MentalQ extends BaseQ {
  a: number;
  b: number;
  op: '+' | '-';
  strategy: MStrategy;
}

export const TRICKS: Record<MStrategy, Trick> = {
  addTens: { id: 'addTens', type: 'mental100', title: 'Jump by tens', rule: 'Adding tens? Only the tens digit changes: 34 + 20 is 54.', intro: 'Adding tens is quick. Jump ten at a time.' },
  subTens: { id: 'subTens', type: 'mental100', title: 'Jump back tens', rule: 'Taking away tens? Only the tens digit changes: 74 − 30 is 44.', intro: 'Taking away tens is quick. Jump back ten at a time.' },
  splitAdd: { id: 'splitAdd', type: 'mental100', title: 'Tens with tens', rule: 'Add the tens, add the ones, then put them together.', intro: 'Big numbers? Split them into tens and ones.' },
  compensate: { id: 'compensate', type: 'mental100', title: 'Round and fix', rule: 'Adding 19 or 29? Add 20 or 30, then take 1 away.', intro: 'Numbers ending in 9 are almost a round number. Round up, then fix it.' },
  subJump: { id: 'subJump', type: 'mental100', title: 'Tens, then ones', rule: 'Take away the tens first, then the ones.', intro: 'Here is how to take away big numbers in your head.' },
  countUpSub: { id: 'countUpSub', type: 'mental100', title: 'Count up', rule: 'Numbers close together? Count up from the small one to the big one.', intro: 'When two numbers are close, counting up is the fastest way to take away.' },
  hundreds: { id: 'hundreds', type: 'mental100', title: 'Ten more, hundred more', rule: 'Adding 10 changes the tens digit. Adding 100 changes the hundreds digit.', intro: 'Big numbers like 340 plus 100? Only one digit changes!' },
};
export const MCURRICULUM: MStrategy[] = ['addTens', 'subTens', 'hundreds', 'splitAdd', 'compensate', 'subJump', 'countUpSub'];
const LEVELS: MStrategy[][] = [
  ['addTens', 'subTens'],
  ['addTens', 'subTens', 'splitAdd', 'hundreds'],
  ['splitAdd', 'compensate', 'hundreds'],
  ['subJump', 'countUpSub', 'compensate'],
  ['splitAdd', 'subJump', 'countUpSub', 'compensate'],
  MCURRICULUM,
];

export const answerOf = (q: { a: number; b: number; op: '+' | '-' }) => (q.op === '+' ? q.a + q.b : q.a - q.b);

function make(s: MStrategy, rng: Rng, level: number): { a: number; b: number; op: '+' | '-' } {
  switch (s) {
    case 'addTens': { const b = 10 * rng.int(1, 4); return { a: rng.int(11, 99 - b), b, op: '+' }; }
    case 'subTens': { const b = 10 * rng.int(1, 4); return { a: rng.int(b + 11, 99), b, op: '-' }; }
    case 'splitAdd': {
      const regroup = level >= 5 && rng.chance(0.6);
      for (;;) {
        const a = rng.int(12, 68);
        const b = rng.int(11, 99 - a);
        const carry = (a % 10) + (b % 10) >= 10;
        if (b % 10 === 0 || a % 10 === 0) continue;
        if (carry === regroup && a + b <= 99) return { a, b, op: '+' };
      }
    }
    case 'compensate': { const b = rng.pick([9, 19, 29, 39]); return { a: rng.int(11, 99 - b), b, op: '+' }; }
    case 'subJump': {
      for (;;) {
        const a = rng.int(41, 99);
        const b = rng.int(12, a - 11);
        if (b % 10 !== 0) return { a, b, op: '-' };
      }
    }
    case 'countUpSub': { const b = rng.int(18, 88); return { a: b + rng.int(2, 8), b, op: '-' }; }
    case 'hundreds': {
      const by = rng.pick([10, 100]);
      const op = rng.pick(['+', '-'] as const);
      const a = rng.int(op === '-' ? by + 100 : 100, op === '+' ? 899 : 999);
      return { a, b: by, op };
    }
  }
}

function hint(s: MStrategy, a: number, b: number): string {
  switch (s) {
    case 'addTens': return `Count up by tens from ${a}.`;
    case 'subTens': return `Count back by tens from ${a}.`;
    case 'splitAdd': return 'Add the tens first, then add the ones.';
    case 'compensate': return `${b} is almost ${b + 1}. Add ${b + 1}, then take 1 away.`;
    case 'subJump': return `Take away ${Math.floor(b / 10) * 10} first, then ${b % 10} more.`;
    case 'countUpSub': return `Count up from ${b} to ${a}.`;
    case 'hundreds': return b === 100 ? 'Only the hundreds digit changes.' : 'Only the tens digit changes.';
  }
}

export function makeMentalQ(s: MStrategy, rng: Rng, level: number): MentalQ {
  const { a, b, op } = make(s, rng, level);
  const ans = answerOf({ a, b, op });
  return {
    id: uid('m'),
    type: 'mental100',
    level,
    say: `What is ${a} ${op === '+' ? 'plus' : 'take away'} ${b}?`,
    text: `${a} ${op === '+' ? '+' : '−'} ${b}`,
    answer: { kind: 'number', correct: ans, maxDigits: 3 },
    hint: hint(s, a, b),
    trick: s,
    cra: craFor(s),
    a, b, op, strategy: s,
  };
}

function generate(level: number, rng: Rng, trickId?: string): MentalQ {
  const s = (trickId && trickId in TRICKS ? trickId : rng.pick(LEVELS[Math.min(5, level - 1)])) as MStrategy;
  return makeMentalQ(s, rng, level);
}

/** The hops that tell this trick's story. */
export function hopsFor(q: MentalQ): Hop[] {
  const { a, b, strategy } = q;
  switch (strategy) {
    case 'addTens': return Array.from({ length: b / 10 }, () => ({ by: 10 }));
    case 'subTens': return Array.from({ length: b / 10 }, () => ({ by: -10 }));
    case 'compensate': return [{ by: b + 1 }, { by: -1 }];
    case 'subJump': return [{ by: -Math.floor(b / 10) * 10 }, { by: -(b % 10) }];
    case 'countUpSub': {
      const toTen = Math.ceil(b / 10) * 10;
      return toTen > b && toTen < a ? [{ by: toTen - b, color: '#177A4C' }, { by: a - toTen, color: '#177A4C' }] : [{ by: a - b, color: '#177A4C' }];
    }
    case 'hundreds': return [{ by: q.op === '+' ? b : -b }];
    case 'splitAdd': return [{ by: Math.floor(b / 10) * 10 }, { by: b % 10 }];
  }
}

function Stimulus({ q }: { q: MentalQ }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div className="display" style={{ fontSize: 'clamp(60px, 11vh, 96px)', lineHeight: 1, background: '#fff', borderRadius: 26, padding: '14px 40px' }}>
        {q.a} {q.op === '+' ? '+' : '−'} {q.b} = <span style={{ color: '#9AA3C0' }}>?</span>
      </div>
      {q.cra === 0 && q.strategy !== 'hundreds' && q.a < 100 && (
        <div style={{ display: 'flex', gap: 34, alignItems: 'flex-end', background: '#fff', padding: 16, borderRadius: 20 }}>
          <Blocks tens={Math.floor(q.a / 10)} ones={q.a % 10} unit={11} />
          {q.op === '+' && <Blocks tens={Math.floor(q.b / 10)} ones={q.b % 10} unit={11} />}
        </div>
      )}
    </div>
  );
}

function wrongFeedback(q: MentalQ, given: number): string | undefined {
  const ans = answerOf(q);
  if (Math.abs(given - ans) === 10) return 'Check the tens again. Are you off by ten?';
  if (Math.abs(given - ans) === 1) return 'Just one off! Check the ones.';
  if (q.op === '-' && given === q.a + q.b) return 'Oops, that is adding. This one is take away.';
  return undefined;
}

function solution(q: MentalQ) {
  const { a, b, strategy } = q;
  const ans = answerOf(q);
  const rule = { say: `Trick: ${TRICKS[strategy].rule}` };
  switch (strategy) {
    case 'addTens': return [{ say: `Start at ${a}. Jump ten at a time, ${b / 10} ${b === 10 ? 'time' : 'times'}.` }, { say: `${Array.from({ length: b / 10 }, (_, i) => a + 10 * (i + 1)).join(', ')}. Only the tens digit changed!` }, rule];
    case 'subTens': return [{ say: `Start at ${a}. Jump back ten at a time, ${b / 10} ${b === 10 ? 'time' : 'times'}.` }, { say: `${Array.from({ length: b / 10 }, (_, i) => a - 10 * (i + 1)).join(', ')}. Only the tens digit changed!` }, rule];
    case 'splitAdd': {
      const t = Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10;
      const o = (a % 10) + (b % 10);
      return [
        { say: `Split them up. Tens: ${Math.floor(a / 10) * 10} plus ${Math.floor(b / 10) * 10} is ${t}.` },
        { say: `Ones: ${a % 10} plus ${b % 10} is ${o}.` },
        { say: `Put them together: ${t} plus ${o} is ${ans}.` }, rule];
    }
    case 'compensate': return [{ say: `${b} is almost ${b + 1}. Add ${b + 1} first: ${a + b + 1}.` }, { say: `We added one too many. Take 1 away: ${ans}.` }, rule];
    case 'subJump': return [
      { say: `Start at ${a}. Take away the tens: minus ${Math.floor(b / 10) * 10} is ${a - Math.floor(b / 10) * 10}.` },
      { say: `Now take away the ones: minus ${b % 10} is ${ans}.` }, rule];
    case 'countUpSub': return [{ say: `${b} and ${a} are close together. Count up from ${b} to ${a}.` }, { say: `That's ${ans} steps. So ${a} take away ${b} is ${ans}.` }, rule];
    case 'hundreds': return [{ say: `${q.op === '+' ? 'Add' : 'Take away'} ${b}. Only the ${b === 100 ? 'hundreds' : 'tens'} digit changes.` }, { say: `${a} becomes ${ans}.` }, rule];
  }
}

function Solution({ q, step }: { q: MentalQ; step: number }) {
  const hops = hopsFor(q);
  const ans = answerOf(q);
  const last = solution(q).length - 1;
  if (q.strategy === 'splitAdd') {
    const tA = Math.floor(q.a / 10), tB = Math.floor(q.b / 10);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="display" style={{ fontSize: 58 }}>{q.a} + {q.b} = <span style={{ color: step >= 2 ? 'var(--green)' : '#9AA3C0' }}>{step >= 2 ? ans : '?'}</span></div>
        <div style={{ display: 'flex', gap: 12, minHeight: 38, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Tag show>{tA * 10} + {tB * 10} = {(tA + tB) * 10}</Tag>
          <Tag show={step >= 1} color="#8A3A08" bg="var(--orange-soft)">{q.a % 10} + {q.b % 10} = {(q.a % 10) + (q.b % 10)}</Tag>
        </div>
        <div style={{ background: '#fff', borderRadius: 24, padding: 20 }}>
          <Blocks tens={tA} ones={q.a % 10} extraTens={tB} extraOnes={q.b % 10} showExtra />
        </div>
      </div>
    );
  }
  const played = step >= last - 0 ? hops.length : Math.min(hops.length, step + 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      <div className="display" style={{ fontSize: 58 }}>{q.a} {q.op === '+' ? '+' : '−'} {q.b} = <span style={{ color: step >= last - 1 ? 'var(--green)' : '#9AA3C0' }}>{step >= last - 1 ? ans : '?'}</span></div>
      <div style={{ background: '#fff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 720 }}>
        <NumberLine key={step} from={q.strategy === 'countUpSub' ? q.b : q.a} hops={hops} played={played} width={680} />
      </div>
    </div>
  );
}

export const mental100: TypeModule<MentalQ> = {
  type: 'mental100',
  world: 'speed',
  name: 'Big number tricks',
  testName: 'Add and subtract within 100 / 1000 (2.NBT.B.5, B.8)',
  intro: 'Big number tricks! Add and take away big numbers in your head.',
  maxLevel: 6,
  tricks: MCURRICULUM.map((s) => TRICKS[s]),
  targetSeconds: 8,
  generate,
  Stimulus,
  wrongFeedback,
  solution,
  Solution,
};
