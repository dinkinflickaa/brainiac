import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { folding, setKey, unfold, makeFold, type Hole } from './folding';

describe('folding', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(folding, {
      key: (c) => setKey(c as Hole[]),
      isCorrect: (q, c) => setKey(c as Hole[]) === setKey(unfold(q.punched, q.folds)),
      minChoices: 4,
      extra: (q) => {
        // every fold doubles the holes
        expect(q.result.length).toBe(q.punched.length * 2 ** q.folds.length);
        for (const h of q.result) {
          expect(h.x).toBeGreaterThan(0);
          expect(h.x).toBeLessThan(4);
          expect(h.y).toBeGreaterThan(0);
          expect(h.y).toBeLessThan(4);
        }
      },
    });
  });

  it('known answer: fold left over right, punch top-right cell', () => {
    const f = makeFold({ x0: 0, x1: 4, y0: 0, y1: 4 }, 'L');
    const res = unfold([{ x: 3.5, y: 0.5 }], [f]);
    expect(setKey(res)).toBe(setKey([{ x: 3.5, y: 0.5 }, { x: 0.5, y: 0.5 }]));
  });
});
