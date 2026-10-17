import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { mental100, answerOf, hopsFor, MCURRICULUM } from './mental100';
import { makeRng } from '../../engine/rng';

describe('mental100', () => {
  it('generates valid questions whose hops land on the answer', () => {
    checkModule(mental100, {
      extra: (q) => {
        const ans = answerOf(q);
        expect(q.answer.kind === 'number' && q.answer.correct).toBe(ans);
        expect(ans).toBeGreaterThanOrEqual(0);
        if (q.strategy !== 'hundreds') expect(ans).toBeLessThanOrEqual(99);
        const start = q.strategy === 'countUpSub' ? q.b : q.a;
        const end = hopsFor(q).reduce((s, h) => s + h.by, start);
        expect(end).toBe(q.strategy === 'countUpSub' ? q.a : ans);
      },
    });
  });
  it('honors trick ids', () => {
    for (const s of MCURRICULUM) expect(mental100.generate(4, makeRng(3), s).strategy).toBe(s);
  });
});
