import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { picclass, belongs, commonTags } from './picclass';
import type { Item } from './bank';

describe('picclass', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(picclass, {
      key: (c) => (c as Item).e,
      isCorrect: (q, c) => belongs(c as Item, q.cat),
      minChoices: 4,
      extra: (q) => {
        if (q.answer.kind !== 'choice') return;
        const common = commonTags(q.examples);
        const sharing = (q.answer.choices as Item[]).map((c, i) => (common.every((t) => c.tags.includes(t)) ? i : -1)).filter((i) => i >= 0);
        expect(sharing).toEqual([q.answer.correct]);
        // no distractor shares ANY tag all the examples share
        (q.answer.choices as Item[]).forEach((c, i) => {
          if (i !== q.answer.correct) expect(common.some((t) => c.tags.includes(t))).toBe(false);
        });
      },
    });
  });
});
