import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { skiparrays, valueOf } from './skiparrays';

describe('skiparrays', () => {
  it('generates valid questions', () => {
    checkModule(skiparrays, {
      extra: (q) => {
        expect(q.answer.kind === 'number' && q.answer.correct).toBe(valueOf(q.form));
        if (q.form.k === 'skip') {
          expect(q.form.seq.filter((x) => x === null)).toHaveLength(1);
          const vals = q.form.seq.map((x, i) => x ?? -999 + i);
          for (const v of vals) if (v > -500) expect(v).toBeGreaterThanOrEqual(0);
        }
      },
    });
  });
});
