import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { numseries, extend } from './numseries';

describe('numseries', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(numseries, {
      key: (c) => String(c),
      isCorrect: (q, c) => c === extend(q.values, q.pattern),
      minChoices: 4,
      extra: (q) => {
        for (const v of [...q.values, q.next]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(10);
        }
        // pattern must actually describe the shown values
        for (let i = 2; i < q.values.length; i++) {
          if (q.pattern.k === 'weave' && i < 4) continue;
          expect(extend(q.values.slice(0, i), q.pattern)).toBe(q.values[i]);
        }
      },
    });
  });
});
