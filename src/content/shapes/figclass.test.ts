import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { figclass, fitsAll, commonRules } from './figclass';
import { figKey, type Fig } from '../../ui/Figure';

describe('figclass', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(figclass, {
      key: (c) => figKey(c as Fig),
      isCorrect: (q, c) => fitsAll(c as Fig, q.rules),
      minChoices: 4,
      extra: (q) => {
        expect(q.examples).toHaveLength(3);
        for (const e of q.examples) expect(fitsAll(e, q.rules)).toBe(true);
        // No choice except the answer shares everything the examples share.
        if (q.answer.kind === 'choice') {
          const common = commonRules(q.examples);
          const sharing = (q.answer.choices as Fig[]).map((c, i) => (fitsAll(c, common) ? i : -1)).filter((i) => i >= 0);
          expect(sharing).toEqual([q.answer.correct]);
        }
      },
    });
  });
});
