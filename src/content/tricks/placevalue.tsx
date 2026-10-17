import type { BaseQ, TypeModule } from '../../engine/types';
import { uid, type Rng } from '../../engine/rng';
import { Tag, useTicker } from '../../ui/kit';

export type PForm =
  | { k: 'read'; h: number; t: number; o: number } // blocks -> number
  | { k: 'build'; h: number; t: number; o: number } // "4 tens and 7 ones" -> number
  | { k: 'more'; n: number; by: number } // 10/100 more or less
  | { k: 'howmany'; n: number; place: 'tens' | 'hundreds' } // how many tens in 47
  | { k: 'expanded'; h: number; t: number; o: number }; // 300 + 40 + 6

export interface PVQ extends BaseQ { form: PForm; value: number }

export const valueOf = (f: PForm): number => {
  switch (f.k) {
    case 'read': case 'build': case 'expanded': return f.h * 100 + f.t * 10 + f.o;
    case 'more': return f.n + f.by;
    case 'howmany': return f.place === 'tens' ? Math.floor(f.n / 10) % 10 : Math.floor(f.n / 100);
  }
};

function make(level: number, rng: Rng): PForm {
  const kinds: PForm['k'][] = level <= 1 ? ['read'] : level === 2 ? ['read', 'build'] : level === 3 ? ['read', 'more', 'howmany'] : level === 4 ? ['read', 'more', 'build', 'howmany'] : ['read', 'expanded', 'more', 'howmany', 'build'];
  const k = rng.pick(kinds);
  const big = level >= 4;
  const h = big ? rng.int(1, 6) : 0;
  const t = rng.int(level <= 1 ? 1 : 1, level <= 1 ? 5 : 9);
  const o = rng.int(0, 9);
  if (k === 'more') {
    const by = big ? rng.pick([10, -10, 100, -100]) : rng.pick([10, -10]);
    const n = big ? rng.int(120, 880) : rng.int(15, 85);
    return { k, n, by };
  }
  if (k === 'howmany') return { k, n: big ? rng.int(120, 989) : rng.int(21, 98), place: big && rng.chance(0.5) ? 'hundreds' : 'tens' };
  return { k, h, t, o } as PForm;
}

function generate(level: number, rng: Rng): PVQ {
  const form = make(level, rng);
  const value = valueOf(form);
  let say = '';
  let text = '';
  switch (form.k) {
    case 'read': say = 'What number do the blocks show?'; text = ''; break;
    case 'build': say = `What number has ${form.h ? `${form.h} hundreds, ` : ''}${form.t} tens and ${form.o} ones?`; text = `${form.h ? `${form.h} hundreds, ` : ''}${form.t} tens, ${form.o} ones`; break;
    case 'more': say = `What is ${Math.abs(form.by)} ${form.by > 0 ? 'more' : 'less'} than ${form.n}?`; text = `${Math.abs(form.by)} ${form.by > 0 ? 'more' : 'less'} than ${form.n}`; break;
    case 'howmany': say = `How many ${form.place} are in the number ${form.n}?`; text = `How many ${form.place} in ${form.n}?`; break;
    case 'expanded': say = `What number is ${form.h * 100} plus ${form.t * 10} plus ${form.o}?`; text = `${form.h * 100} + ${form.t * 10} + ${form.o}`; break;
  }
  return {
    id: uid('pv'), type: 'placevalue', level, say, text,
    answer: { kind: 'number', correct: value, maxDigits: 3 },
    hint: form.k === 'more' ? `Adding or taking away ${Math.abs(form.by)} changes just one digit.` : 'Count the hundreds, then the tens by tens, then the ones.',
    trick: 'placevalue', form, value,
  };
}

const PURPLE = '#5B3FD6';

/** Hundred flats, ten rods and one cubes. `lit` = how many pieces are highlighted (for counting). */
export function BaseTen({ h, t, o, lit = -1, unit = 12 }: { h: number; t: number; o: number; lit?: number; unit?: number }) {
  let idx = 0;
  const on = () => { const i = idx++; return lit < 0 || i < lit; };
  const piece = (w: number, hgt: number, active: boolean, key: string, grid: [number, number]) => (
    <div key={key} style={{
      width: w, height: hgt, background: active ? PURPLE : '#C9BCFF', borderRadius: 3, display: 'grid',
      gridTemplateColumns: `repeat(${grid[0]}, 1fr)`, gap: 1, padding: 1, transition: 'background 300ms',
    }}>
      {Array.from({ length: grid[0] * grid[1] }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />)}
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }} role="img" aria-label={`${h} hundreds, ${t} tens, ${o} ones`}>
      {h > 0 && <div style={{ display: 'flex', gap: 6 }}>{Array.from({ length: h }).map((_, i) => piece(unit * 10, unit * 10, on(), `h${i}`, [10, 10]))}</div>}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>{Array.from({ length: t }).map((_, i) => piece(unit + 2, unit * 10, on(), `t${i}`, [1, 10]))}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(5, ${unit}px)`, gap: 3 }}>{Array.from({ length: o }).map((_, i) => piece(unit, unit, on(), `o${i}`, [1, 1]))}</div>
    </div>
  );
}

function Stimulus({ q }: { q: PVQ }) {
  const f = q.form;
  if (f.k === 'read') return <div style={{ background: '#fff', borderRadius: 24, padding: 20 }}><BaseTen h={f.h} t={f.t} o={f.o} unit={f.h ? 11 : 18} /></div>;
  return <div className="display" style={{ fontSize: 'clamp(36px, 7vh, 60px)', background: '#fff', borderRadius: 24, padding: '16px 34px' }}>{q.text}</div>;
}

function wrongFeedback(q: PVQ, given: number): string | undefined {
  const f = q.form;
  if (f.k === 'read' || f.k === 'build') {
    if (given === f.o * 10 + f.t) return 'Tens go first, then ones. Swap them!';
    if (given === f.t + f.o) return 'Each stick is worth 10, not 1. Count the sticks by tens.';
  }
  if (f.k === 'more' && Math.abs(given - q.value) === Math.abs(f.by) * 2) return f.by > 0 ? 'That is less. We need more!' : 'That is more. We need less!';
  return undefined;
}

function solution(q: PVQ) {
  const f = q.form;
  const rule = { say: 'Trick: count hundreds by hundreds, tens by tens, then count on the ones.' };
  if (f.k === 'more') return [
    { say: `${f.n} has ${Math.floor(f.n / 100) ? `${Math.floor(f.n / 100)} hundreds, ` : ''}${Math.floor(f.n / 10) % 10} tens and ${f.n % 10} ones.` },
    { say: `${f.by > 0 ? 'Add' : 'Take away'} ${Math.abs(f.by)}: only the ${Math.abs(f.by) === 100 ? 'hundreds' : 'tens'} digit changes.` },
    { say: `${f.n} becomes ${q.value}.` },
    { say: 'Trick: adding 10 changes the tens digit. Adding 100 changes the hundreds digit.' },
  ];
  if (f.k === 'howmany') return [
    { say: `Look at ${f.n}. Each digit has a place: hundreds, tens, ones.` },
    { say: `The ${f.place} digit is ${q.value}. So there are ${q.value} ${f.place}.` },
    { say: 'Trick: the place of a digit tells what it is worth.' },
  ];
  const tens = Array.from({ length: f.t }, (_, i) => f.h * 100 + (i + 1) * 10);
  return [
    ...(f.h ? [{ say: `Count the hundreds: ${Array.from({ length: f.h }, (_, i) => (i + 1) * 100).join(', ')}.` }] : []),
    { say: `Count the tens by tens: ${tens.join(', ')}.` },
    { say: f.o ? `Now count on the ones: ${Array.from({ length: f.o }, (_, i) => f.h * 100 + f.t * 10 + i + 1).join(', ')}.` : 'There are no ones.' },
    { say: `The number is ${q.value}.` },
    rule,
  ];
}

function Solution({ q, step }: { q: PVQ; step: number }) {
  const f = q.form;
  const steps = solution(q).length;
  const tick = useTicker(30, 450, true, 200);
  if (f.k === 'more' || f.k === 'howmany') {
    const n = f.k === 'more' ? f.n : f.n;
    const digits = String(n).split('');
    const places = digits.length === 3 ? ['hundreds', 'tens', 'ones'] : ['tens', 'ones'];
    const target = f.k === 'more' ? (Math.abs(f.by) === 100 ? 'hundreds' : 'tens') : f.place;
    const newDigits = f.k === 'more' && step >= 2 ? String(q.value).padStart(digits.length, '0').split('') : digits;
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        {newDigits.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="display" style={{ fontSize: 72, width: 100, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20, background: step >= 1 && places[i] === target ? 'var(--sun)' : '#fff', transition: 'background 400ms' }}>{d}</div>
            <span style={{ fontWeight: 800, color: 'var(--muted)' }}>{places[i]}</span>
          </div>
        ))}
      </div>
    );
  }
  // counting: hundreds, tens, ones get highlighted piece by piece
  const hasH = f.h > 0;
  const phaseH = hasH ? 0 : -1;
  const phaseT = hasH ? 1 : 0;
  const phaseO = phaseT + 1;
  let lit = 0;
  if (step === phaseH) lit = Math.min(f.h, tick);
  else if (step === phaseT) lit = f.h + Math.min(f.t, tick);
  else if (step === phaseO) lit = f.h + f.t + Math.min(f.o, tick);
  else if (step > phaseO) lit = f.h + f.t + f.o;
  const running = step >= steps - 2 ? q.value : lit <= f.h ? lit * 100 : lit <= f.h + f.t ? f.h * 100 + (lit - f.h) * 10 : f.h * 100 + f.t * 10 + (lit - f.h - f.t);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <Tag show>{running}</Tag>
      <div style={{ background: '#fff', borderRadius: 24, padding: 20 }}><BaseTen h={f.h} t={f.t} o={f.o} lit={lit} unit={hasH ? 11 : 18} /></div>
    </div>
  );
}

export const placevalue: TypeModule<PVQ> = {
  type: 'placevalue', world: 'tricks', name: 'Place value', testName: 'Place value (achievement)',
  intro: 'Place value! Hundreds, tens and ones.', maxLevel: 6,
  tricks: [{ id: 'placevalue', type: 'placevalue', title: 'Count by place', rule: 'Count hundreds by hundreds, tens by tens, then count on the ones.', intro: 'Here is how to read big numbers made of blocks.' }],
  targetSeconds: 10, generate, Stimulus, wrongFeedback, solution, Solution,
};
