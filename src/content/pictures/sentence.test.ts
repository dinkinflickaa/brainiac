import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { sentence, BANK, type Opt } from './sentence';

describe('sentence', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(sentence, {
      key: (c) => (c as Opt).e,
      isCorrect: (q, c) => (c as Opt).e === q.item.ans.e,
      minChoices: 4,
    });
  });
  it('bank has enough items per level and no repeated answers inside an item', () => {
    for (let l = 1; l <= 6; l++) expect(BANK.filter((b) => b.level === l).length).toBeGreaterThanOrEqual(7);
    for (const b of BANK) {
      const es = [b.ans.e, ...b.wrong.map((w) => w.e)];
      expect(new Set(es).size).toBe(es.length);
      expect(b.wrong.length).toBeGreaterThanOrEqual(3);
    }
  });
});
