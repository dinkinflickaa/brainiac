import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { placevalue, valueOf as pv } from './placevalue';
import { money, valueOf as mv } from './money';
import { time, fmt } from './time';

describe('achievement math', () => {
  it('place value', () => {
    checkModule(placevalue, { extra: (q) => { expect(q.answer.kind === 'number' && q.answer.correct).toBe(pv(q.form)); expect(q.value).toBeGreaterThanOrEqual(0); } });
  });
  it('money', () => {
    checkModule(money, { extra: (q) => { expect(q.answer.kind === 'number' && q.answer.correct).toBe(mv(q.form)); expect(q.value).toBeGreaterThan(0); expect(q.value).toBeLessThan(100); } });
  });
  it('time', () => {
    checkModule(time, {
      key: (c) => fmt(c as number),
      isCorrect: (q, c) => fmt(c as number) === fmt(q.value),
      extra: (q) => { if (q.answer.kind === 'number') expect(q.answer.correct).toBeGreaterThan(0); },
    });
    expect(fmt(0)).toBe('12:00');
    expect(fmt(4 * 60 + 35)).toBe('4:35');
  });
});
