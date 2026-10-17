import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { numanalogy, applyRule, ALL_NRULES } from './numanalogy';

describe('numanalogy', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(numanalogy, {
      key: (c) => String(c),
      isCorrect: (q, c) => c === applyRule(q.c, q.rule),
      minChoices: 4,
      extra: (q) => {
        // the top pair is explained by exactly one rule
        expect(ALL_NRULES.filter((r) => applyRule(q.a, r) === q.b)).toHaveLength(1);
        for (const n of [q.a, q.b, q.c, q.d]) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(12);
        }
      },
    });
  });
});
