import { describe, expect, it } from 'vitest';
import { checkModule } from '../testkit';
import { facts20, FACTS_BY_STRATEGY, CURRICULUM, factAnswer, strategyOf, allFacts } from './facts20';
import { makeRng } from '../../engine/rng';

describe('facts20', () => {
  it('generates valid questions', () => {
    checkModule(facts20, {
      extra: (q) => {
        expect(q.answer.kind).toBe('number');
        if (q.answer.kind === 'number') expect(q.answer.correct).toBe(factAnswer(q.f));
        expect(q.answer.correct >= 0 && q.answer.correct <= 20).toBe(true);
      },
    });
  });
  it('every trick has facts and generate honors trick ids', () => {
    for (const s of CURRICULUM) {
      expect(FACTS_BY_STRATEGY[s].length, s).toBeGreaterThan(2);
      const q = facts20.generate(3, makeRng(5), s);
      expect(q.strategy).toBe(s);
    }
  });
  it('every fact within 20 gets a trick whose story adds up', () => {
    for (const f of allFacts()) {
      const s = strategyOf(f);
      const ans = factAnswer(f);
      if (s === 'make10') {
        const hi = Math.max(f.a, f.b), lo = Math.min(f.a, f.b);
        expect(lo - (10 - hi)).toBeGreaterThan(0);
        expect(10 + lo - (10 - hi)).toBe(ans);
      }
      if (s === 'backThrough10') {
        expect(f.a).toBeGreaterThan(10);
        expect(f.b - (f.a - 10)).toBeGreaterThan(0);
        expect(10 - (f.b - (f.a - 10))).toBe(ans);
      }
      if (s === 'nearDoubles') expect(Math.min(f.a, f.b) * 2 + 1).toBe(ans);
      if (s === 'plus9') expect(Math.max(f.a, f.b)).toBe(9);
    }
  });
});
