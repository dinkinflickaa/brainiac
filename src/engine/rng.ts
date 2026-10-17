/** Small seeded random generator (mulberry32) so questions are reproducible in tests. */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
  chance(p: number): boolean;
}

export function makeRng(seed: number = Math.floor(Math.random() * 2 ** 31)): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    chance: (p) => next() < p,
  };
}

let counter = 0;
export const uid = (prefix = 'q') => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Shuffle the correct answer in among distractors, dropping duplicates by key.
 * Returns choices and the index of the correct one.
 */
export function buildChoices<T>(
  rng: Rng,
  correct: T,
  distractors: T[],
  count: number,
  key: (t: T) => string = (t) => JSON.stringify(t),
): { choices: T[]; correct: number } {
  const seen = new Set([key(correct)]);
  const picked: T[] = [];
  for (const d of distractors) {
    const k = key(d);
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push(d);
    if (picked.length >= count - 1) break;
  }
  const all = rng.shuffle([correct, ...picked]);
  return { choices: all, correct: all.findIndex((c) => key(c) === key(correct)) };
}
