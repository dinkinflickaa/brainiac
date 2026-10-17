/**
 * The 2-minute speed check. Same shape every time so scores can be compared:
 * 40 facts within 20 (20 adding, 20 taking away) then 20 two-digit problems, in a fixed shuffle.
 * Two alternating forms (A/B) so she doesn't memorize the order.
 * Score = correct answers per minute.
 */
import { makeRng } from './rng';

export interface ProbeItem { text: string; say: string; answer: number; kind: 'fact' | 'twodigit' }
export const PROBE_SECONDS = 120;

export function makeProbe(form: number): ProbeItem[] {
  const rng = makeRng(form % 2 === 0 ? 20260101 : 20260202);
  const items: ProbeItem[] = [];
  for (let i = 0; i < 20; i++) {
    const a = rng.int(2, 10);
    const b = rng.int(2, 10);
    items.push({ text: `${a} + ${b}`, say: `${a} plus ${b}`, answer: a + b, kind: 'fact' });
  }
  for (let i = 0; i < 20; i++) {
    const b = rng.int(2, 10);
    const d = rng.int(1, 10);
    items.push({ text: `${b + d} − ${b}`, say: `${b + d} take away ${b}`, answer: d, kind: 'fact' });
  }
  const facts = rng.shuffle(items);
  const two: ProbeItem[] = [];
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
      const a = rng.int(12, 68);
      const b = rng.int(11, 99 - a);
      two.push({ text: `${a} + ${b}`, say: `${a} plus ${b}`, answer: a + b, kind: 'twodigit' });
    } else {
      const a = rng.int(31, 99);
      const b = rng.int(11, a - 5);
      two.push({ text: `${a} − ${b}`, say: `${a} take away ${b}`, answer: a - b, kind: 'twodigit' });
    }
  }
  return [...facts, ...two];
}

export interface ProbeResult { date: string; form: number; correct: number; attempted: number; perMinute: number; factsCorrect: number; twoDigitCorrect: number }

export function scoreProbe(items: ProbeItem[], answers: (number | null)[], form: number, date: string): ProbeResult {
  let correct = 0, attempted = 0, fc = 0, tc = 0;
  items.forEach((it, i) => {
    const a = answers[i];
    if (a === null || a === undefined) return;
    attempted++;
    if (a === it.answer) {
      correct++;
      if (it.kind === 'fact') fc++; else tc++;
    }
  });
  return { date, form, correct, attempted, perMinute: Math.round((correct / (PROBE_SECONDS / 60)) * 10) / 10, factsCorrect: fc, twoDigitCorrect: tc };
}

/** Speed check is due on the first day, then every 28 days. */
export function probeDue(history: ProbeResult[], today: Date): boolean {
  if (!history.length) return true;
  const last = new Date(history[history.length - 1].date);
  return (today.getTime() - last.getTime()) / 86400000 >= 28;
}
