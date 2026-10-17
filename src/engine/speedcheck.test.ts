import { describe, expect, it } from 'vitest';
import { makeProbe, scoreProbe, probeDue } from './speedcheck';

describe('speed check', () => {
  it('has 40 facts within 20 then 20 two-digit items, same every time per form', () => {
    const a = makeProbe(0);
    expect(a).toHaveLength(60);
    expect(a.slice(0, 40).every((i) => i.kind === 'fact' && i.answer >= 0 && i.answer <= 20)).toBe(true);
    expect(a.slice(40).every((i) => i.kind === 'twodigit' && i.answer >= 0 && i.answer <= 99)).toBe(true);
    expect(makeProbe(2)).toEqual(a);
    expect(makeProbe(1)).not.toEqual(a);
  });
  it('scores correct per minute', () => {
    const items = makeProbe(0);
    const answers = items.map((it, i) => (i < 30 ? it.answer : i < 35 ? it.answer + 1 : null));
    const r = scoreProbe(items, answers, 0, '2026-10-17');
    expect(r.correct).toBe(30);
    expect(r.attempted).toBe(35);
    expect(r.perMinute).toBe(15);
  });
  it('is due on day 1 and every 28 days', () => {
    expect(probeDue([], new Date('2026-10-17'))).toBe(true);
    const h = [{ date: '2026-10-17', form: 0, correct: 1, attempted: 1, perMinute: 1, factsCorrect: 1, twoDigitCorrect: 0 }];
    expect(probeDue(h, new Date('2026-11-01'))).toBe(false);
    expect(probeDue(h, new Date('2026-11-14'))).toBe(true);
  });
});
