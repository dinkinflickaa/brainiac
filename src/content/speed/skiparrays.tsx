import type { BaseQ, Trick, TypeModule } from '../../engine/types';
import { uid, type Rng } from '../../engine/rng';
import { Tag, useTicker } from '../../ui/kit';
import { DotArray, NumberLine } from './visuals';
import { Group } from '../numbers/visuals';

export type SForm =
  | { k: 'skip'; by: number; seq: (number | null)[] } // one null = the missing number
  | { k: 'array'; rows: number; cols: number }
  | { k: 'groups'; groups: number; each: number; e: string };

export interface SkipQ extends BaseQ {
  form: SForm;
  value: number;
}

export const TRICKS: Record<string, Trick> = {
  skip: { id: 'skip', type: 'skiparrays', title: 'Skip counting', rule: 'Skip counting jumps the same amount every time: 5, 10, 15, 20.', intro: 'Skip counting is counting with big jumps. It is the secret start of times tables!' },
  arrays: { id: 'arrays', type: 'skiparrays', title: 'Count by rows', rule: 'Rows that are the same? Count by the row: 4, 8, 12.', intro: 'When dots are in neat rows, you do not need to count every dot.' },
};

export const valueOf = (f: SForm): number => {
  if (f.k === 'skip') {
    const i = f.seq.indexOf(null);
    const known = f.seq.findIndex((x) => x !== null);
    return (f.seq[known] as number) + (i - known) * f.by;
  }
  if (f.k === 'array') return f.rows * f.cols;
  return f.groups * f.each;
};

const OBJ = ['🍎', '⭐', '🍪', '🐞', '🎈'];

function makeForm(level: number, rng: Rng, trickId?: string): SForm {
  const kind = trickId === 'skip' ? 'skip' : trickId === 'arrays' ? rng.pick(['array', 'groups'] as const)
    : level <= 2 ? 'skip' : level === 3 ? rng.pick(['skip', 'array'] as const) : rng.pick(['skip', 'array', 'groups'] as const);
  if (kind === 'skip') {
    const by = level <= 1 ? 10 : level === 2 ? rng.pick([5, 10, 2]) : rng.pick([2, 5, 10, level >= 5 ? 3 : 5, level >= 5 ? 4 : 2]);
    const len = 5;
    const down = level >= 6 && rng.chance(0.4);
    const start = by * rng.int(down ? len : 0, down ? len + 4 : 4);
    const seq: (number | null)[] = Array.from({ length: len }, (_, i) => start + (down ? -1 : 1) * i * by);
    const missing = rng.int(level <= 2 ? len - 1 : 2, len - 1);
    seq[missing] = null;
    return { k: 'skip', by: down ? -by : by, seq };
  }
  if (kind === 'array') {
    const cols = level <= 3 ? rng.pick([2, 5, 10]) : rng.int(2, 5);
    const rows = rng.int(2, level <= 3 ? 3 : 5);
    return { k: 'array', rows, cols };
  }
  return { k: 'groups', groups: rng.int(2, 5), each: rng.pick(level <= 4 ? [2, 5, 10] : [2, 3, 4, 5]), e: rng.pick(OBJ) };
}

function generate(level: number, rng: Rng, trickId?: string): SkipQ {
  const form = makeForm(level, rng, trickId);
  const value = valueOf(form);
  const say =
    form.k === 'skip'
      ? `Skip count: ${form.seq.map((x) => (x === null ? 'blank' : x)).join(', ')}. What number goes in the blank?`
      : form.k === 'array'
        ? `There are ${form.rows} rows with ${form.cols} dots in each row. How many dots in all?`
        : `There are ${form.groups} bags with ${form.each} in each bag. How many in all?`;
  return {
    id: uid('sk'),
    type: 'skiparrays',
    level,
    say,
    answer: { kind: 'number', correct: value, maxDigits: 2 },
    hint: form.k === 'skip' ? `How much does it jump each time? Keep jumping.` : `Count by ${form.k === 'array' ? form.cols : form.each}s, one ${form.k === 'array' ? 'row' : 'bag'} at a time.`,
    trick: form.k === 'skip' ? 'skip' : 'arrays',
    form,
    value,
  };
}

function SkipRow({ seq, fill }: { seq: (number | null)[]; fill?: number }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {seq.map((x, i) => (
        <div key={i} className="display" style={{
          width: 'clamp(70px, 10vw, 100px)', height: 'clamp(70px, 10vw, 100px)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(30px, 5vh, 44px)', background: '#fff', border: x === null ? `3px dashed ${fill != null ? 'var(--green)' : '#9AA3C0'}` : '3px solid var(--line)',
          color: x === null ? (fill != null ? 'var(--green)' : '#9AA3C0') : 'var(--ink)',
        }}>
          {x === null ? (fill ?? '?') : x}
        </div>
      ))}
    </div>
  );
}

function Bags({ f, show }: { f: Extract<SForm, { k: 'groups' }>; show?: number }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: f.groups }).map((_, g) => (
        <div key={g} style={{ background: '#fff', border: `3px solid ${show !== undefined && g < show ? 'var(--purple)' : 'var(--line)'}`, borderRadius: 18, padding: 10, transition: 'border-color 300ms' }}>
          <Group n={f.each} e={f.e} size={22} />
        </div>
      ))}
    </div>
  );
}

function Stimulus({ q }: { q: SkipQ }) {
  const f = q.form;
  if (f.k === 'skip') return <SkipRow seq={f.seq} />;
  if (f.k === 'array') return <div style={{ background: '#fff', padding: 20, borderRadius: 24 }}><DotArray rows={f.rows} cols={f.cols} size={f.cols > 5 ? 22 : 32} /></div>;
  return <Bags f={f} />;
}

function wrongFeedback(q: SkipQ, given: number): string | undefined {
  const f = q.form;
  if (f.k === 'skip' && Math.abs(given - q.value) === Math.abs(f.by)) return 'Check the jump. Is it the same every time?';
  if (f.k === 'array' && given === f.rows + f.cols) return `That's adding ${f.rows} and ${f.cols}. Count all the dots, row by row.`;
  if (f.k === 'groups' && given === f.groups + f.each) return `That's adding ${f.groups} and ${f.each}. Count everything in all the bags.`;
  return undefined;
}

function solution(q: SkipQ) {
  const f = q.form;
  if (f.k === 'skip') {
    const by = Math.abs(f.by);
    return [
      { say: `Look at the jump. Each number is ${by} ${f.by > 0 ? 'more' : 'less'} than the one before.` },
      { say: `Keep jumping by ${by}. The missing number is ${q.value}.` },
      { say: `Trick: ${TRICKS.skip.rule}` },
    ];
  }
  const per = f.k === 'array' ? f.cols : f.each;
  const n = f.k === 'array' ? f.rows : f.groups;
  const seq = Array.from({ length: n }, (_, i) => per * (i + 1));
  return [
    { say: `Each ${f.k === 'array' ? 'row' : 'bag'} has ${per}. Count by ${per}s.` },
    { say: `${seq.join(', ')}.` },
    { say: `${n} groups of ${per} is ${q.value}.` },
    { say: `Trick: ${TRICKS.arrays.rule}` },
  ];
}

function Solution({ q, step }: { q: SkipQ; step: number }) {
  const f = q.form;
  const per = f.k === 'array' ? f.cols : f.k === 'groups' ? f.each : 0;
  const n = f.k === 'array' ? f.rows : f.k === 'groups' ? f.groups : 0;
  const lit = useTicker(n, 800, step === 1, 200);
  if (f.k === 'skip') {
    const known = f.seq.findIndex((x) => x !== null);
    const first = f.seq[known] as number;
    const hops = Array.from({ length: f.seq.length - 1 }, () => ({ by: f.by }));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
        <SkipRow seq={f.seq} fill={step >= 1 ? q.value : undefined} />
        <div style={{ background: '#fff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 700 }}>
          <NumberLine key={step} from={first - known * f.by} hops={hops} auto={step === 0} played={step >= 1 ? hops.length : undefined} everyMs={600} width={660} />
        </div>
      </div>
    );
  }
  const shown = step >= 2 ? n : step === 1 ? lit : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, minHeight: 38 }}>
        {Array.from({ length: n }).map((_, i) => <Tag key={i} show={i < shown}>{per * (i + 1)}</Tag>)}
      </div>
      {f.k === 'array' ? (
        <div style={{ background: '#fff', padding: 20, borderRadius: 24 }}><DotArray rows={f.rows} cols={f.cols} lit={shown} size={f.cols > 5 ? 22 : 32} /></div>
      ) : (
        <Bags f={f} show={shown} />
      )}
      <div className="display" style={{ fontSize: 44, color: 'var(--green)', opacity: step >= 2 ? 1 : 0, transition: 'opacity 300ms' }}>{q.value} in all</div>
    </div>
  );
}

export const skiparrays: TypeModule<SkipQ> = {
  type: 'skiparrays',
  world: 'speed',
  name: 'Skip and rows',
  testName: 'Skip counting and arrays (2.NBT.A.2, 2.OA.C.4)',
  intro: 'Skip counting and rows! The first step to times tables.',
  maxLevel: 6,
  tricks: [TRICKS.skip, TRICKS.arrays],
  targetSeconds: 6,
  generate,
  Stimulus,
  wrongFeedback,
  solution,
  Solution,
};
