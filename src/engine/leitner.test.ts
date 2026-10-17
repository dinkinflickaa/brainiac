import { describe, expect, it } from 'vitest';
import { review, pickNext, unlockedStrategies, automaticCount, type Deck } from './leitner';
import { FACTS_BY_STRATEGY, factKey, factAnswer } from '../content/speed/facts20';

describe('leitner', () => {
  it('moves fast right answers up and wrong answers back to box 1', () => {
    let d: Deck = {};
    d = review(d, '7+8', true, 2000, 100);
    expect(d['7+8'].box).toBe(2);
    d = review(d, '7+8', true, 2500, 101);
    expect(d['7+8'].box).toBe(3);
    d = review(d, '7+8', true, 5000, 104); // right but slow: stays
    expect(d['7+8'].box).toBe(3);
    d = review(d, '7+8', false, 1000, 105);
    expect(d['7+8'].box).toBe(1);
    expect(d['7+8'].due).toBe(105);
  });

  it('starts with the first trick and unlocks the next when it is learned', () => {
    let d: Deck = {};
    expect(unlockedStrategies(d)).toEqual(['countOn']);
    for (const f of FACTS_BY_STRATEGY.countOn) d = review(d, factKey(f), true, 1500, 1);
    expect(unlockedStrategies(d).slice(0, 2)).toEqual(['countOn', 'doubles']);
  });

  it('simulated learner: fluency grows and nothing repeats back to back', () => {
    let d: Deck = {};
    const recent: string[] = [];
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let day = 0; day < 30; day++) {
      for (let i = 0; i < 25; i++) {
        const f = pickNext(d, day, recent, rand);
        const k = factKey(f);
        expect(recent.slice(-3)).not.toContain(k);
        recent.push(k);
        // learner gets faster the more she has seen a fact
        const seen = d[k]?.seen ?? 0;
        const ms = Math.max(1200, 7000 - seen * 1500);
        const right = rand() < 0.85;
        expect(Number.isFinite(factAnswer(f))).toBe(true);
        d = review(d, k, right, ms, day);
      }
    }
    const { automatic, total } = automaticCount(d);
    expect(automatic).toBeGreaterThan(total * 0.3);
    expect(unlockedStrategies(d).length).toBeGreaterThan(4);
  });
});
