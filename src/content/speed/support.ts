/**
 * The app tells Speed Lab how much picture support each trick needs right now
 * (0 = blocks/beads, 1 = dots, 2 = numbers only), based on how well she knows it.
 * Content modules read it at question time; tests use the default.
 */
type Stage = 0 | 1 | 2;
let resolver: (trickId: string) => Stage = () => 0;

export function setCraResolver(fn: (trickId: string) => Stage) {
  resolver = fn;
}
export function craFor(trickId: string): Stage {
  return resolver(trickId);
}

/** Picture support fades: first 4 correct answers with blocks, next 6 with dots, then numbers only. */
export function stageFromCorrect(correct: number): Stage {
  return correct < 4 ? 0 : correct < 10 ? 1 : 2;
}
