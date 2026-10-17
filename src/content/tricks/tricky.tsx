import type { BaseQ, Trick, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Pic, Tag, useTicker } from '../../ui/kit';
import { NumberLine } from '../speed/visuals';

export type T =
  | { k: 'digitcount'; digit: number; upTo: number }
  | { k: 'legs'; animals: { e: string; w: string; legs: number; n: number }[] }
  | { k: 'fence'; trees: number; gap: number }
  | { k: 'squares'; size: number }
  | { k: 'family'; sisters: number; brothers: number; name: string }
  | { k: 'riddle'; diff: number; sum: number; value: number }
  | { k: 'nextday'; today: number; days: number }
  | { k: 'ages'; inYears: number; willBe: number; name: string };

export interface TrickyQ extends BaseQ { t: T; value: number }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NAMES = ['Sam', 'Leo', 'Max', 'Ben', 'Omar', 'Raj'];
const GIRLS = ['Mia', 'Ava', 'Zoe', 'Lily', 'Nora', 'Isha'];

export const TRICKS: Record<string, Trick> = {
  digitcount: { id: 'digitcount', type: 'tricky', title: 'Count each place', rule: 'Count the digit in the ones place, then the tens place, then add. Watch for numbers that use it twice!', intro: 'How many times do you write a digit? Here is the detective trick.' },
  legs: { id: 'legs', type: 'tricky', title: 'Count by legs', rule: 'Count legs in groups: 2, 4, 6 for birds, then 4 more for each dog.', intro: 'Counting legs? Count by twos and fours.' },
  fence: { id: 'fence', type: 'tricky', title: 'Gaps are one fewer', rule: 'In a row, the gaps between things are always one fewer than the things.', intro: 'Here is a sneaky one. Count the gaps, not the trees!' },
  squares: { id: 'squares', type: 'tricky', title: 'Hidden squares', rule: 'Count the small squares, then the bigger squares made of small ones, then add.', intro: 'Squares can hide inside other squares. Let us find them all.' },
  family: { id: 'family', type: 'tricky', title: 'Same person', rule: 'Read carefully: the brother of every sister can be the same boy!', intro: 'Family puzzles can trick you. Draw the family!' },
  riddle: { id: 'riddle', type: 'tricky', title: 'Try a table', rule: 'Make a list of numbers that fit one clue. Then check the other clue.', intro: 'Number riddles: list what fits, then check.' },
  nextday: { id: 'nextday', type: 'tricky', title: 'Seven-day loop', rule: 'Every 7 days it is the same day again. Take out the 7s, count the rest.', intro: 'Days of the week go round and round in a loop of seven.' },
  ages: { id: 'ages', type: 'tricky', title: 'Go backwards', rule: 'To find "now", start from the future and count backwards.', intro: 'Age puzzles: start at the end and go backwards.' },
};
const LEVELS: string[][] = [
  ['legs', 'fence', 'ages'],
  ['legs', 'digitcount', 'ages', 'fence'],
  ['squares', 'family', 'digitcount', 'fence'],
  ['digitcount', 'nextday', 'family', 'legs'],
  ['riddle', 'squares', 'nextday', 'digitcount'],
  ['digitcount', 'riddle', 'legs', 'nextday', 'squares', 'family'],
];

export function countDigit(d: number, upTo: number) {
  let c = 0;
  for (let n = 1; n <= upTo; n++) c += String(n).split('').filter((x) => x === String(d)).length;
  return c;
}
export function countSquares(k: number) {
  let c = 0;
  for (let s = 1; s <= k; s++) c += (k - s + 1) ** 2;
  return c;
}
export function riddleSolutions(diff: number, sum: number): number[] {
  const out: number[] = [];
  for (let n = 10; n <= 99; n++) {
    const t = Math.floor(n / 10), o = n % 10;
    if (t - o === diff && t + o === sum) out.push(n);
  }
  return out;
}

export function valueOf(t: T): number {
  switch (t.k) {
    case 'digitcount': return countDigit(t.digit, t.upTo);
    case 'legs': return t.animals.reduce((s, a) => s + a.n * a.legs, 0);
    case 'fence': return (t.trees - 1) * t.gap;
    case 'squares': return countSquares(t.size);
    case 'family': return t.sisters + t.brothers;
    case 'riddle': return t.value;
    case 'nextday': return (t.today + t.days) % 7;
    case 'ages': return t.willBe - t.inYears;
  }
}

function make(k: string, level: number, rng: Rng): T {
  switch (k) {
    case 'digitcount': {
      const upTo = level <= 2 ? rng.pick([20, 30]) : level <= 4 ? 50 : 100;
      return { k, digit: rng.int(upTo === 20 ? 1 : 2, upTo >= 50 ? 9 : 9), upTo };
    }
    case 'legs': {
      const pool = [
        { e: '🐔', w: 'chickens', legs: 2 }, { e: '🐶', w: 'dogs', legs: 4 }, { e: '🐄', w: 'cows', legs: 4 },
        { e: '🦆', w: 'ducks', legs: 2 }, ...(level >= 6 ? [{ e: '🕷️', w: 'spiders', legs: 8 }] : []),
      ];
      const two = rng.pick(pool.filter((p) => p.legs === 2));
      const other = rng.pick(pool.filter((p) => p.legs !== 2));
      const animals = level <= 1 ? [{ ...two, n: rng.int(2, 4) }] : [{ ...two, n: rng.int(1, 4) }, { ...other, n: rng.int(1, level >= 6 ? 2 : 3) }];
      return { k, animals };
    }
    case 'fence': return { k, trees: rng.int(3, level <= 2 ? 5 : 7), gap: rng.int(2, level <= 2 ? 3 : 5) };
    case 'squares': return { k, size: level >= 5 ? 3 : 2 };
    case 'family': return { k, sisters: rng.int(2, 4), brothers: level >= 4 ? rng.int(1, 2) : 1, name: rng.pick(NAMES) };
    case 'riddle': {
      for (;;) {
        const n = rng.int(21, 98);
        const t = Math.floor(n / 10), o = n % 10;
        if (t <= o) continue;
        return { k, diff: t - o, sum: t + o, value: n };
      }
    }
    case 'nextday': return { k, today: rng.int(0, 6), days: level >= 6 ? rng.int(9, 20) : rng.pick([7, 8, 9, 10, 14]) };
    default: return { k: 'ages', inYears: rng.int(2, 5), willBe: rng.int(8, 14), name: rng.pick(GIRLS) };
  }
}

function sayFor(t: T): { say: string; text: string } {
  switch (t.k) {
    case 'digitcount': return { say: `You write all the numbers from 1 to ${t.upTo}. How many times do you write the digit ${t.digit}?`, text: `How many ${t.digit}s from 1 to ${t.upTo}?` };
    case 'legs': {
      const parts = t.animals.map((a) => `${a.n} ${a.w}`);
      return { say: `A farm has ${parts.join(' and ')}. How many legs are there in all?`, text: `${parts.join(' + ')}: how many legs?` };
    }
    case 'fence': return { say: `${t.trees} trees stand in a row. Each tree is ${t.gap} steps from the next one. How many steps is it from the first tree to the last tree?`, text: `${t.trees} trees, ${t.gap} steps apart. First to last?` };
    case 'squares': return { say: `How many squares can you find in this picture? Look carefully, some are hiding!`, text: 'How many squares?' };
    case 'family': return {
      say: `${t.name} has ${t.sisters} sisters. Each sister has ${t.brothers === 1 ? 'one brother' : `${t.brothers} brothers`}. How many children are in the family?`,
      text: `${t.sisters} sisters, each has ${t.brothers} brother${t.brothers === 1 ? '' : 's'}. How many kids?`,
    };
    case 'riddle': return { say: `I am a two-digit number. My tens digit is ${t.diff} more than my ones digit. My two digits add up to ${t.sum}. What number am I?`, text: `Tens is ${t.diff} more than ones. Digits add to ${t.sum}.` };
    case 'nextday': return { say: `Today is ${DAYS[t.today]}. What day will it be in ${t.days} days?`, text: `Today: ${DAYS[t.today]}. In ${t.days} days?` };
    case 'ages': return { say: `In ${t.inYears} years, ${t.name} will be ${t.willBe} years old. How old is ${t.name} now?`, text: `In ${t.inYears} years: ${t.willBe}. Now?` };
  }
}

function generate(level: number, rng: Rng, trickId?: string): TrickyQ {
  const k = trickId && trickId in TRICKS ? trickId : rng.pick(LEVELS[Math.min(5, level - 1)]);
  const t = make(k, level, rng);
  const value = valueOf(t);
  const { say, text } = sayFor(t);
  const hint = {
    digitcount: 'Count the ones place first: numbers that END in that digit. Then the tens place.',
    legs: 'Chickens and ducks have 2 legs. Dogs and cows have 4. Spiders have 8.',
    fence: 'Draw it! Count the spaces between the trees, not the trees.',
    squares: 'Count the small squares first. Is the whole picture a square too?',
    family: 'Draw the family. Is the brother a new boy, or someone you already counted?',
    riddle: 'Write down numbers whose digits add up to the total. Which one fits the other clue?',
    nextday: 'After 7 days it is the same day again. How many days are left over?',
    ages: 'Start at the future age and count back the years.',
  }[t.k];
  const answer = t.k === 'nextday'
    ? (() => {
        const others = [1, 2, 3, 4, 5, 6].map((d) => (value + d) % 7);
        const c = buildChoices(rng, value, [(t.today + (t.days % 7) + 1) % 7, (t.today + 1) % 7, t.today, ...others], 4, String);
        return { kind: 'choice' as const, choices: c.choices, correct: c.correct };
      })()
    : { kind: 'number' as const, correct: value, maxDigits: 3 };
  return { id: uid('tq'), type: 'tricky', level, say, text, answer, hint, trick: t.k, t, value };
}

/* ---------- pictures ---------- */

function DigitGrid({ t, phase }: { t: Extract<T, { k: 'digitcount' }>; phase: number }) {
  // phase 0 plain, 1 ones lit, 2 tens lit, 3 doubles pulse
  const d = String(t.digit);
  const rows = Math.ceil(t.upTo / 10);
  const cell = rows > 5 ? 'clamp(26px, 4.4vh, 40px)' : 'clamp(34px, 6vh, 50px)';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(10, ${cell})`, gap: 3 }}>
      {Array.from({ length: t.upTo }, (_, i) => i + 1).map((n) => {
        const s = String(n);
        const ones = s[s.length - 1] === d;
        const tens = s.length >= 2 && s[s.length - 2] === d;
        const hund = s.length === 3 && s[0] === d;
        const row = Math.floor((n - 1) / 10);
        let bg = '#F2F7FF', fg = '#4A5275', ring = 'none';
        if (phase >= 1 && ones) { bg = '#FFC233'; fg = '#1D2445'; }
        if (phase >= 2 && (tens || hund)) { bg = '#5B3FD6'; fg = '#fff'; }
        if (phase >= 2 && ones && (tens || hund)) ring = 'inset 0 0 0 4px #FFC233';
        const pulse = phase === 3 && ones && (tens || hund);
        return (
          <div key={n} style={{
            height: cell, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15,
            background: bg, color: fg, boxShadow: ring, transform: pulse ? 'scale(1.3)' : 'scale(1)', position: 'relative', zIndex: pulse ? 2 : 0,
            transition: `background 400ms ${phase === 1 ? row * 90 : (n % 10) * 50}ms, color 400ms, transform 400ms cubic-bezier(.3,1.6,.5,1)`,
          }}>{n}</div>
        );
      })}
    </div>
  );
}

function SquaresGrid({ k, highlight }: { k: number; highlight?: { x: number; y: number; s: number } | null }) {
  const W = 220, u = W / k;
  return (
    <svg viewBox={`-6 -6 ${W + 12} ${W + 12}`} width={W + 12} height={W + 12} role="img" aria-label={`${k} by ${k} grid`}>
      {Array.from({ length: k + 1 }).map((_, i) => (
        <g key={i}>
          <line x1={0} y1={i * u} x2={W} y2={i * u} stroke="#1D2445" strokeWidth={4} />
          <line x1={i * u} y1={0} x2={i * u} y2={W} stroke="#1D2445" strokeWidth={4} />
        </g>
      ))}
      {highlight && <rect x={highlight.x * u + 3} y={highlight.y * u + 3} width={highlight.s * u - 6} height={highlight.s * u - 6} fill="#FFC23355" stroke="#E8590C" strokeWidth={6} rx={4} style={{ transition: 'all 300ms' }} />}
    </svg>
  );
}

function Trees({ t, gapsShown }: { t: Extract<T, { k: 'fence' }>; gapsShown: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
      {Array.from({ length: t.trees }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Pic e="🌳" size={50} />
          {i < t.trees - 1 && (
            <div style={{ width: 'clamp(40px, 6vw, 70px)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 8 }}>
              <Tag show={i < gapsShown} style={{ fontSize: 14, padding: '2px 8px' }}>{t.gap}</Tag>
              <div style={{ width: '100%', borderTop: `3px dashed ${i < gapsShown ? 'var(--purple)' : '#C9D3EA'}` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Stimulus({ q }: { q: TrickyQ }) {
  const t = q.t;
  const box = (child: React.ReactNode) => <div style={{ background: '#fff', borderRadius: 24, padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>{child}</div>;
  const textLine = <div className="display" style={{ fontSize: 'clamp(24px, 4vh, 34px)', textAlign: 'center' }}>{q.text}</div>;
  switch (t.k) {
    case 'squares': return box(<>{textLine}<SquaresGrid k={t.size} /></>);
    case 'fence': return box(<>{textLine}<Trees t={t} gapsShown={0} /></>);
    case 'legs': return box(<>{textLine}<div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>{t.animals.map((a, i) => <div key={i} style={{ display: 'flex', gap: 2 }}>{Array.from({ length: a.n }).map((_, j) => <Pic key={j} e={a.e} size={44} />)}</div>)}</div></>);
    case 'family': return box(<>{textLine}<div style={{ display: 'flex', gap: 6 }}><Pic e="👦" size={50} />{Array.from({ length: t.sisters }).map((_, i) => <Pic key={i} e="👧" size={50} />)}</div></>);
    case 'digitcount': return box(<>{textLine}<div style={{ fontSize: 15, fontWeight: 800, color: 'var(--muted)' }}>1, 2, 3, ... {t.upTo}</div></>);
    default: return box(textLine);
  }
}

function Choice({ data }: { q: TrickyQ; data: unknown; index: number }) {
  return <span className="display" style={{ fontSize: 26 }}>{DAYS[data as number]}</span>;
}

function wrongFeedback(q: TrickyQ, given: number): string | undefined {
  const t = q.t;
  if (t.k === 'fence' && given === t.trees * t.gap) return `That counts ${t.trees} gaps. But ${t.trees} trees only have ${t.trees - 1} gaps between them!`;
  if (t.k === 'squares' && given === t.size * t.size) return 'You found the small squares. Look for bigger squares made of small ones!';
  if (t.k === 'family' && given === t.sisters + t.sisters * t.brothers + 1) return 'Wait! Each sister has the SAME brother. Did you count him more than once?';
  if (t.k === 'digitcount') {
    const ones = Array.from({ length: t.upTo }, (_, i) => i + 1).filter((n) => n % 10 === t.digit).length;
    if (given === ones) return 'You found the ones place. Now check the tens place!';
    if (given === q.value - 1) return `So close! Look at ${t.digit}${t.digit}. How many ${t.digit}s does it have?`;
  }
  if (t.k === 'ages' && given === t.willBe + t.inYears) return 'That is in the future! Count backwards to find now.';
  return undefined;
}

function solution(q: TrickyQ) {
  const t = q.t;
  const rule = { say: `Trick: ${TRICKS[t.k].rule}` };
  switch (t.k) {
    case 'digitcount': {
      const ones = Array.from({ length: t.upTo }, (_, i) => i + 1).filter((n) => n % 10 === t.digit).length;
      const tens = Array.from({ length: t.upTo }, (_, i) => i + 1).filter((n) => Math.floor(n / 10) % 10 === t.digit && n >= 10).length;
      const hund = t.digit === 1 && t.upTo >= 100 ? 1 : 0;
      return [
        { say: `Let's find every ${t.digit}. One place at a time.` },
        { say: `Ones place first: numbers that end in ${t.digit}. That's ${ones}.` },
        { say: tens ? `Now the tens place: the ${t.digit}0s. That's ${tens} more${hund ? ', and 100 has a 1 too' : ''}.` : `The tens place has no ${t.digit}s up to ${t.upTo}.` },
        { say: tens ? `See ${t.digit}${t.digit}? It has two ${t.digit}s, so it counts twice. ${ones} plus ${tens + hund} is ${q.value}.` : `So the answer is ${q.value}.` },
        rule,
      ];
    }
    case 'legs': {
      let run = 0;
      const steps = t.animals.map((a) => {
        run += a.n * a.legs;
        return { say: `${a.n} ${a.w} with ${a.legs} legs each: count by ${a.legs}s. ${Array.from({ length: a.n }, (_, i) => (i + 1) * a.legs).join(', ')}.` };
      });
      return [...steps, { say: `Add them up: ${t.animals.map((a) => a.n * a.legs).join(' plus ')} is ${run} legs.` }, rule];
    }
    case 'fence': return [
      { say: `Look at the spaces between the trees. Count them.` },
      { say: `${t.trees} trees have only ${t.trees - 1} spaces between them.` },
      { say: `${t.trees - 1} spaces of ${t.gap} steps: ${Array.from({ length: t.trees - 1 }, (_, i) => (i + 1) * t.gap).join(', ')}. That's ${q.value} steps.` },
      rule,
    ];
    case 'squares': return t.size === 2
      ? [{ say: 'First count the small squares: 1, 2, 3, 4.' }, { say: 'Now the big square: the whole picture is a square too! That makes 5.' }, rule]
      : [{ say: 'Count the small squares: there are 9.' }, { say: 'Now the middle-size squares, made of 4 small ones. There are 4.' }, { say: 'And the whole big square: 1 more. 9 plus 4 plus 1 is 14.' }, rule];
    case 'family': return [
      { say: `Let's draw ${t.name} and the ${t.sisters} sisters.` },
      { say: t.brothers === 1 ? `Each sister's brother is ${t.name}! He is the same boy for all of them.` : `Each sister has ${t.brothers} brothers: ${t.name} and one more boy. They are the same boys for every sister.` },
      { say: `So the family has ${t.sisters} girls and ${t.brothers} ${t.brothers === 1 ? 'boy' : 'boys'}: ${q.value} children.` },
      rule,
    ];
    case 'riddle': {
      const pairs = Array.from({ length: Math.min(9, t.sum) + 1 }, (_, o) => [t.sum - o, o]).filter(([a, b]) => a <= 9 && a >= 1 && b <= 9);
      return [
        { say: `List two-digit numbers whose digits add up to ${t.sum}: ${pairs.map(([a, b]) => `${a}${b}`).join(', ')}.` },
        { say: `Which one has a tens digit ${t.diff} more than the ones digit? ${t.value}!` },
        rule,
      ];
    }
    case 'nextday': {
      const left = t.days % 7;
      return [
        { say: `Every 7 days, it is ${DAYS[t.today]} again.` },
        { say: t.days >= 7 ? `${t.days} days is ${Math.floor(t.days / 7) === 1 ? 'one week' : `${Math.floor(t.days / 7)} weeks`} and ${left} more ${left === 1 ? 'day' : 'days'}.` : `Count forward ${t.days} days.` },
        { say: `Count ${left} more from ${DAYS[t.today]}: it is ${DAYS[q.value]}.` },
        rule,
      ];
    }
    case 'ages': return [
      { say: `Start in the future: ${t.name} is ${t.willBe}.` },
      { say: `Go back ${t.inYears} years: ${Array.from({ length: t.inYears }, (_, i) => t.willBe - i - 1).join(', ')}.` },
      { say: `${t.name} is ${q.value} now.` },
      rule,
    ];
  }
}

function SquaresSolution({ k, step }: { k: number; step: number }) {
  const list: { x: number; y: number; s: number }[] = [];
  for (let s = 1; s <= k; s++) for (let y = 0; y + s <= k; y++) for (let x = 0; x + s <= k; x++) list.push({ x, y, s });
  const ones = list.filter((l) => l.s === 1).length;
  const range = k === 2 ? [[0, ones], [ones, list.length]][Math.min(step, 1)] : [[0, 9], [9, 13], [13, 14]][Math.min(step, 2)];
  const i = useTicker(range[1] - range[0], 650, true, 200);
  const cur = list[Math.min(range[1] - 1, range[0] + Math.max(0, i - 1))];
  const counted = range[0] + i;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
      <SquaresGrid k={k} highlight={i > 0 ? cur : null} />
      <div className="display" style={{ fontSize: 64, color: 'var(--purple)', minWidth: 80 }}>{counted}</div>
    </div>
  );
}

function Solution({ q, step }: { q: TrickyQ; step: number }) {
  const t = q.t;
  const gaps = useTicker(t.k === 'fence' ? t.trees - 1 : 0, 600, step === 2 || step === 0);
  const wrap = (child: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div className="display" style={{ fontSize: 'clamp(22px, 3.6vh, 30px)', textAlign: 'center' }}>{q.text}</div>
      <div style={{ background: '#fff', borderRadius: 24, padding: 20 }}>{child}</div>
    </div>
  );
  switch (t.k) {
    case 'digitcount': return wrap(<DigitGrid t={t} phase={Math.min(step, 3)} />);
    case 'squares': return wrap(<SquaresSolution key={step} k={t.size} step={step} />);
    case 'fence': return wrap(<Trees t={t} gapsShown={step >= 2 ? (step >= 3 ? t.trees - 1 : gaps) : step === 1 ? t.trees - 1 : gaps} />);
    case 'legs': {
      const shownGroups = Math.min(step + 1, t.animals.length);
      return wrap(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          {t.animals.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i < shownGroups ? 1 : 0.3, transition: 'opacity 300ms' }}>
              {Array.from({ length: a.n }).map((_, j) => (
                <div key={j} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Pic e={a.e} size={40} />
                  <Tag show={i < shownGroups} style={{ fontSize: 14, padding: '1px 8px' }}>{(j + 1) * a.legs}</Tag>
                </div>
              ))}
            </div>
          ))}
          {step >= t.animals.length && <Tag color="#0F5A37" bg="var(--green-soft)">{t.animals.map((a) => a.n * a.legs).join(' + ')} = {q.value}</Tag>}
        </div>,
      );
    }
    case 'family': return wrap(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {Array.from({ length: t.brothers }).map((_, i) => <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Pic e="👦" size={56} /><Tag show={step >= 1} style={{ fontSize: 13, padding: '1px 8px' }}>{i === 0 ? t.name : 'brother'}</Tag></div>)}
          {Array.from({ length: t.sisters }).map((_, i) => <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Pic e="👧" size={56} /><Tag show color="#8A3A08" bg="var(--orange-soft)" style={{ fontSize: 13, padding: '1px 8px' }}>sister</Tag></div>)}
        </div>
        {step >= 2 && <Tag color="#0F5A37" bg="var(--green-soft)">{t.sisters} + {t.brothers} = {q.value}</Tag>}
      </div>,
    );
    case 'riddle': {
      const pairs = Array.from({ length: 10 }, (_, o) => [t.sum - o, o]).filter(([a, b]) => a <= 9 && a >= 1 && b >= 0 && b <= 9);
      return wrap(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
          {pairs.map(([a, b]) => {
            const hit = a * 10 + b === t.value;
            return <div key={a} className="display" style={{ fontSize: 34, padding: '8px 16px', borderRadius: 14, background: step >= 1 && hit ? 'var(--green)' : '#F2F7FF', color: step >= 1 && hit ? '#fff' : 'var(--ink)', opacity: step >= 1 && !hit ? 0.35 : 1, transition: 'all 400ms' }}>{a}{b}</div>;
          })}
        </div>,
      );
    }
    case 'nextday': {
      const left = t.days % 7;
      const lit = step >= 2 ? left : 0;
      return wrap(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Array.from({ length: 7 }, (_, i) => (t.today + i) % 7).map((d, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 14, fontWeight: 800, background: i === 0 ? 'var(--purple)' : i === left && step >= 2 ? 'var(--green)' : i <= lit && i > 0 ? 'var(--purple-soft)' : '#F2F7FF', color: i === 0 || (i === left && step >= 2) ? '#fff' : 'var(--ink)', transition: 'all 400ms' }}>{DAYS[d].slice(0, 3)}</div>
          ))}
        </div>,
      );
    }
    case 'ages': return wrap(<NumberLine key={step} from={t.willBe} hops={Array.from({ length: t.inYears }, () => ({ by: -1 }))} auto={step === 1} played={step === 0 ? 0 : step >= 2 ? t.inYears : undefined} width={600} />);
  }
}

export const tricky: TypeModule<TrickyQ> = {
  type: 'tricky',
  world: 'tricks',
  name: 'Trick questions',
  testName: 'Math reasoning puzzles',
  intro: 'Trick questions! Think carefully. They try to fool you.',
  maxLevel: 6,
  tricks: Object.values(TRICKS),
  targetSeconds: 40,
  generate,
  Stimulus,
  Choice,
  wrongFeedback,
  solution,
  Solution,
};
