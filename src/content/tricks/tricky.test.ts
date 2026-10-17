import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { tricky, TRICKS, valueOf, countDigit, countSquares, riddleSolutions } from './tricky';
import { makeRng } from '../../engine/rng';

describe('tricky', () => {
  it('generates valid questions with brute-force checked answers', () => {
    checkModule(tricky, {
      key: (c) => String(c),
      isCorrect: (q, c) => c === valueOf(q.t),
      extra: (q) => {
        if (q.answer.kind === 'number') expect(q.answer.correct).toBe(valueOf(q.t));
        if (q.t.k === 'riddle') expect(riddleSolutions(q.t.diff, q.t.sum)).toEqual([q.t.value]);
      },
    });
  });
  it('known answers', () => {
    expect(countDigit(4, 100)).toBe(20);
    expect(countDigit(1, 100)).toBe(21);
    expect(countDigit(1, 20)).toBe(12);
    expect(countSquares(2)).toBe(5);
    expect(countSquares(3)).toBe(14);
  });
  it('honors every trick id', () => {
    for (const id of Object.keys(TRICKS)) expect(tricky.generate(3, makeRng(9), id).t.k).toBe(id);
  });
});
