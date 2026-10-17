import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Tag, useTicker } from '../../ui/kit';

export type TForm = { k: 'read'; h: number; m: number } | { k: 'later'; h: number; m: number; add: number } | { k: 'elapsed'; h: number; m: number; h2: number; m2: number };
export interface TimeQ extends BaseQ { form: TForm; value: number }

export const fmt = (mins: number) => {
  const h = Math.floor(mins / 60) % 12 || 12;
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
};
const toMins = (h: number, m: number) => h * 60 + m;

/** Analog clock. `minuteDeg` lets the solution sweep the minute hand. */
export function Clock({ h, m, size = 220, sweep, glowHour }: { h: number; m: number; size?: number | string; sweep?: number; glowHour?: boolean }) {
  const mDeg = (sweep ?? m) * 6;
  const hDeg = ((h % 12) + m / 60) * 30;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`clock showing ${fmt(toMins(h, m))}`}>
      <circle cx={100} cy={100} r={94} fill="#fff" stroke="#1D2445" strokeWidth={6} />
      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i * 6 * Math.PI) / 180;
        const r1 = i % 5 === 0 ? 80 : 85;
        return <line key={i} x1={100 + Math.sin(a) * r1} y1={100 - Math.cos(a) * r1} x2={100 + Math.sin(a) * 89} y2={100 - Math.cos(a) * 89} stroke="#1D2445" strokeWidth={i % 5 === 0 ? 3 : 1} />;
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const n = i + 1;
        const a = (n * 30 * Math.PI) / 180;
        return <text key={n} x={100 + Math.sin(a) * 66} y={100 - Math.cos(a) * 66 + 8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#1D2445" fontFamily="Baloo 2, Nunito, sans-serif">{n}</text>;
      })}
      <line x1={100} y1={100} x2={100} y2={52} stroke={glowHour ? '#E8590C' : '#1D2445'} strokeWidth={9} strokeLinecap="round" style={{ transformOrigin: '100px 100px', transform: `rotate(${hDeg}deg)`, transition: 'transform 600ms' }} />
      <line x1={100} y1={100} x2={100} y2={24} stroke="#5B3FD6" strokeWidth={5} strokeLinecap="round" style={{ transformOrigin: '100px 100px', transform: `rotate(${mDeg}deg)`, transition: sweep !== undefined ? 'transform 380ms linear' : 'transform 600ms' }} />
      <circle cx={100} cy={100} r={7} fill="#1D2445" />
    </svg>
  );
}

function make(level: number, rng: Rng): TForm {
  const h = rng.int(1, 12);
  const m = level <= 1 ? 0 : level === 2 ? rng.pick([0, 30]) : level === 3 ? rng.pick([0, 15, 30, 45]) : 5 * rng.int(0, 11);
  if (level === 5 && rng.chance(0.6)) return { k: 'later', h, m: 5 * rng.int(0, 11), add: rng.pick([30, 15, 60]) };
  if (level >= 6) {
    if (rng.chance(0.5)) return { k: 'later', h, m: 5 * rng.int(0, 11), add: rng.pick([20, 25, 40, 45]) };
    const start = 5 * rng.int(0, 11);
    const len = 5 * rng.int(3, 11);
    const end = toMins(h, start) + len;
    return { k: 'elapsed', h, m: start, h2: Math.floor(end / 60), m2: end % 60 };
  }
  return { k: 'read', h, m };
}

function generate(level: number, rng: Rng): TimeQ {
  const form = make(level, rng);
  if (form.k === 'elapsed') {
    const value = toMins(form.h2, form.m2) - toMins(form.h, form.m);
    return {
      id: uid('ti'), type: 'time', level,
      say: `Recess starts at ${fmt(toMins(form.h, form.m))} and ends at ${fmt(toMins(form.h2, form.m2))}. How many minutes long is it?`,
      text: `${fmt(toMins(form.h, form.m))} to ${fmt(toMins(form.h2, form.m2))}: how many minutes?`,
      answer: { kind: 'number', correct: value, maxDigits: 3 },
      hint: 'Count by fives from the start time to the end time.', trick: 'time', form, value,
    };
  }
  const base = toMins(form.h, form.m);
  const value = form.k === 'later' ? base + form.add : base;
  const wrong = [
    value + 60, value - 60, // hour off
    toMins(form.m === 0 ? 12 : Math.round(form.m / 5) || 12, (form.h % 12) * 5), // hands swapped
    value + 5, value - 5, value + 30, base,
  ].map((x) => ((x % 720) + 720) % 720);
  const c = buildChoices(rng, value % 720, wrong, 4, (x) => fmt(x));
  return {
    id: uid('ti'), type: 'time', level,
    say: form.k === 'later' ? `What time will it be ${form.add} minutes from now?` : 'What time does the clock show?',
    text: form.k === 'later' ? `${form.add} minutes later?` : undefined,
    answer: { kind: 'choice', choices: c.choices, correct: c.correct },
    hint: 'The short hand points to the hour. Count the long hand by fives.', trick: 'time', form, value: value % 720,
  };
}

function Stimulus({ q }: { q: TimeQ }) {
  const f = q.form;
  if (f.k === 'elapsed') return <div className="display" style={{ fontSize: 'clamp(30px, 5vh, 44px)', background: '#fff', borderRadius: 24, padding: '16px 30px', textAlign: 'center' }}>{q.text}</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: '#fff', borderRadius: 24, padding: 14 }}>
      <Clock h={f.h} m={f.m} size="clamp(170px, 30vh, 250px)" />
      {f.k === 'later' && <Tag show>+{f.add} min</Tag>}
    </div>
  );
}

function Choice({ data }: { q: TimeQ; data: unknown; index: number }) {
  return <span className="display" style={{ fontSize: 40 }}>{fmt(data as number)}</span>;
}

function solution(q: TimeQ) {
  const f = q.form;
  const rule = { say: 'Trick: the short hand tells the hour. Count the long hand by fives.' };
  if (f.k === 'elapsed') return [
    { say: `Start at ${fmt(toMins(f.h, f.m))}. Count by fives until ${fmt(toMins(f.h2, f.m2))}.` },
    { say: `That's ${q.value} minutes.` },
    rule,
  ];
  const fives = f.m / 5;
  return [
    { say: `The short hand points to ${f.m >= 30 ? `just past ${f.h}` : f.h}. The hour is ${f.h}.` },
    { say: f.m === 0 ? 'The long hand points straight up at 12. That means o\'clock.' : `Count the long hand by fives: ${Array.from({ length: fives }, (_, i) => (i + 1) * 5).join(', ')}.` },
    { say: `It is ${fmt(toMins(f.h, f.m))}.${f.k === 'later' ? ` ${f.add} minutes later, it will be ${fmt(q.value)}.` : ''}` },
    rule,
  ];
}

function Solution({ q, step }: { q: TimeQ; step: number }) {
  const f = q.form;
  const fives = f.k === 'elapsed' ? (toMins(f.h2, f.m2) - toMins(f.h, f.m)) / 5 : f.m / 5;
  const k = useTicker(fives, 500, f.k === 'elapsed' ? step === 0 : step === 1, 200);
  if (f.k === 'elapsed') {
    const done = step >= 1 ? fives : k;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Clock h={f.h} m={f.m} sweep={f.m + done * 5} size={240} />
        <Tag show>{done * 5} minutes</Tag>
      </div>
    );
  }
  const sweep = step === 0 ? 0 : step === 1 ? k * 5 : f.m;
  const later = f.k === 'later' && step >= 2;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <Clock h={f.h} m={f.m} sweep={later ? f.m + f.add : sweep} glowHour={step === 0} size={240} />
      <Tag show={step >= 1}>{later ? fmt(q.value) : `${sweep} minutes`}</Tag>
    </div>
  );
}

export const time: TypeModule<TimeQ> = {
  type: 'time', world: 'tricks', name: 'Telling time', testName: 'Time (achievement)',
  intro: 'Telling time! Read the clock hands.', maxLevel: 6,
  tricks: [{ id: 'time', type: 'time', title: 'Count by fives', rule: 'The short hand tells the hour. Count the long hand by fives.', intro: 'Here is how to read any clock.' }],
  targetSeconds: 12, generate, Stimulus, Choice, solution, Solution,
};
