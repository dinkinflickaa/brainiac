import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { numpuzzle, solve } from './numpuzzle';

describe('numpuzzle', () => {
  it('generates valid questions with exactly one right answer', () => {
    const seen = new Set<string>();
    checkModule(numpuzzle, {
      key: (c) => String(c),
      isCorrect: (q, c) => c === solve(q.fmt),
      minChoices: 4,
      extra: (q) => {
        seen.add(q.fmt.f + (q.fmt.f === 'equation' ? q.fmt.kind : ''));
        expect(q.missing).toBeGreaterThanOrEqual(1);
        expect(q.missing).toBeLessThanOrEqual(10);
      },
    });
    expect([...seen].sort()).toEqual(['equationminus', 'equationsum', 'scale', 'train']);
  });
});
