import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { picanalogy, validFor, type Opt } from './picanalogy';

describe('picanalogy', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(picanalogy, {
      key: (c) => (c as Opt).e,
      isCorrect: (q, c) => validFor(q.rel, q.bottom.a).includes((c as Opt).e),
      minChoices: 4,
      extra: (q) => {
        expect(q.top.a).not.toBe(q.bottom.a);
        expect(q.top.b).not.toBe(q.bottom.b);
      },
    });
  });
});
