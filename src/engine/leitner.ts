/**
 * Spaced review of math facts (Leitner boxes).
 * - Fast and right (3 seconds or less): the fact moves up a box and comes back later.
 * - Right but slow: it stays in its box.
 * - Wrong, or very slow: back to box 1, and it comes back again in the same session.
 * A fact in box 3 or higher counts as "automatic" (known by heart).
 */
import { CURRICULUM, FACTS_BY_STRATEGY, factKey, type Fact, type Strategy } from '../content/speed/facts20';

export interface Card { box: number; due: number; seen: number; right: number; lastMs: number }
export type Deck = Record<string, Card>;

export const FAST_MS = 3000;
export const SLOW_MS = 6000;
/** Days until review, by box (index = box). */
export const BOX_DAYS = [0, 0, 1, 3, 7, 14];
export const AUTOMATIC_BOX = 3;

export function review(deck: Deck, key: string, correct: boolean, ms: number, today: number): Deck {
  const c = deck[key] ?? { box: 1, due: today, seen: 0, right: 0, lastMs: ms };
  let box = c.box;
  if (!correct || ms > SLOW_MS) box = 1;
  else if (ms <= FAST_MS) box = Math.min(5, box + 1);
  return { ...deck, [key]: { box, due: today + BOX_DAYS[box], seen: c.seen + 1, right: c.right + (correct ? 1 : 0), lastMs: ms } };
}

/** A trick is unlocked when the one before it is mostly learned (70% of its facts seen and out of box 1). */
export function unlockedStrategies(deck: Deck): Strategy[] {
  const out: Strategy[] = [];
  for (let i = 0; i < CURRICULUM.length; i++) {
    const s = CURRICULUM[i];
    out.push(s);
    const facts = FACTS_BY_STRATEGY[s];
    const learned = facts.filter((f) => (deck[factKey(f)]?.box ?? 0) >= 2).length;
    if (learned / facts.length < 0.7) break;
  }
  return out;
}

export function automaticCount(deck: Deck): { automatic: number; total: number } {
  const all = CURRICULUM.flatMap((s) => FACTS_BY_STRATEGY[s]);
  return { automatic: all.filter((f) => (deck[factKey(f)]?.box ?? 0) >= AUTOMATIC_BOX).length, total: all.length };
}

/**
 * Pick the next fact to practice.
 * Order: facts due for review (lowest box first), then a new fact from the newest unlocked trick,
 * then the weakest known fact. Never repeats one of the last few facts.
 */
export function pickNext(deck: Deck, today: number, recent: string[], rand: () => number = Math.random): Fact {
  const unlocked = unlockedStrategies(deck);
  const pool = unlocked.flatMap((s) => FACTS_BY_STRATEGY[s]);
  const notRecent = (f: Fact) => !recent.slice(-3).includes(factKey(f));
  const due = pool.filter((f) => deck[factKey(f)] && deck[factKey(f)].due <= today && notRecent(f));
  if (due.length) {
    due.sort((x, y) => deck[factKey(x)].box - deck[factKey(y)].box || deck[factKey(x)].due - deck[factKey(y)].due);
    const lowest = deck[factKey(due[0])].box;
    const tied = due.filter((f) => deck[factKey(f)].box === lowest);
    // Mix in a new fact now and then so there is always something fresh.
    if (!(lowest >= 2 && rand() < 0.3)) return tied[Math.floor(rand() * tied.length)];
  }
  for (let i = unlocked.length - 1; i >= 0; i--) {
    const fresh = FACTS_BY_STRATEGY[unlocked[i]].filter((f) => !deck[factKey(f)] && notRecent(f));
    if (fresh.length) return fresh[Math.floor(rand() * fresh.length)];
  }
  const known = pool.filter(notRecent).sort((x, y) => (deck[factKey(x)]?.box ?? 0) - (deck[factKey(y)]?.box ?? 0));
  return known[Math.floor(rand() * Math.min(5, known.length))];
}

/** Day number (local time) for spacing. */
export const dayNumber = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
