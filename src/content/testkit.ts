import { expect } from 'vitest';
import { makeRng } from '../engine/rng';
import type { BaseQ, TypeModule } from '../engine/types';

/**
 * Generic sanity checks every question type must pass:
 * - answer index is valid, choices are distinct (by `key`)
 * - narration fields are filled in
 * - `isCorrect`, if given, is true for the right choice and false for every other choice
 */
export function checkModule<Q extends BaseQ>(
  mod: TypeModule<Q>,
  opts: {
    seeds?: number;
    key?: (choice: unknown, q: Q) => string;
    isCorrect?: (q: Q, choice: unknown) => boolean;
    extra?: (q: Q) => void;
    minChoices?: number;
  } = {},
) {
  const seeds = opts.seeds ?? 300;
  for (let level = 1; level <= mod.maxLevel; level++) {
    for (let s = 0; s < seeds; s++) {
      const q = mod.generate(level, makeRng(s * 7919 + level));
      expect(q.type).toBe(mod.type);
      expect(q.say.length).toBeGreaterThan(5);
      expect(q.hint.length).toBeGreaterThan(5);
      expect(q.trick.length).toBeGreaterThan(0);
      const steps = mod.solution(q);
      expect(steps.length).toBeGreaterThanOrEqual(2);
      for (const st of steps) expect(st.say.length).toBeGreaterThan(3);
      if (q.answer.kind === 'choice') {
        const { choices, correct } = q.answer;
        expect(choices.length).toBeGreaterThanOrEqual(opts.minChoices ?? 3);
        expect(correct).toBeGreaterThanOrEqual(0);
        expect(correct).toBeLessThan(choices.length);
        const key = opts.key ?? ((c: unknown) => JSON.stringify(c));
        const keys = choices.map((c) => key(c, q));
        expect(new Set(keys).size, `duplicate choices at level ${level} seed ${s}: ${keys.join(' / ')}`).toBe(keys.length);
        if (opts.isCorrect) {
          choices.forEach((c, i) => {
            expect(opts.isCorrect!(q, c), `choice ${i} correctness wrong at level ${level} seed ${s}`).toBe(i === correct);
          });
        }
      } else {
        expect(Number.isInteger(q.answer.correct)).toBe(true);
        expect(q.answer.correct).toBeGreaterThanOrEqual(0);
        expect(String(q.answer.correct).length).toBeLessThanOrEqual(q.answer.maxDigits);
      }
      opts.extra?.(q);
    }
  }
}
