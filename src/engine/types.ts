import type { FC } from 'react';
import type { Rng } from './rng';

/** Every kind of question in the app. */
export type QType =
  // Shape Sky (CogAT nonverbal)
  | 'matrices'
  | 'folding'
  | 'figclass'
  // Number Mountain (CogAT quantitative)
  | 'numseries'
  | 'numanalogy'
  | 'numpuzzle'
  // Picture Woods (CogAT verbal)
  | 'picanalogy'
  | 'picclass'
  | 'sentence'
  // Speed Lab (mental math fluency)
  | 'facts20'
  | 'mental100'
  | 'skiparrays'
  // Trick Tower (achievement math + trick questions)
  | 'placevalue'
  | 'money'
  | 'time'
  | 'tricky';

export type WorldId = 'shapes' | 'numbers' | 'pictures' | 'speed' | 'tricks';

/** How the child answers. */
export type Answer =
  | { kind: 'choice'; choices: unknown[]; correct: number }
  | { kind: 'number'; correct: number; maxDigits: number };

export interface BaseQ {
  /** Unique per generated question. */
  id: string;
  type: QType;
  level: number;
  /** Full sentence read aloud when the question appears. Must make sense with no reading. */
  say: string;
  /** Optional short text shown big on screen (kept to a few words). */
  text?: string;
  answer: Answer;
  /** One-sentence nudge for THIS question. Read aloud. */
  hint: string;
  /** Which trick (general pattern) this question teaches. */
  trick: string;
  /** Speed Lab only: which math fact this is (for spaced review), e.g. "7+8". */
  fact?: string;
  /** Speed Lab only: how much picture support to show. 0 = blocks/beads, 1 = dots, 2 = numbers only. */
  cra?: 0 | 1 | 2;
}

/** One step of an animated solution. `say` is read aloud and shown as the caption. */
export interface Step {
  say: string;
}

export interface TypeModule<Q extends BaseQ = BaseQ> {
  type: QType;
  world: WorldId;
  /** Kid-facing name, e.g. "Paper folding". */
  name: string;
  /** Matching CogAT / test area label for the parent view. */
  testName: string;
  /** Short spoken intro for the type ("Let's fold some paper!"). */
  intro: string;
  maxLevel: number;
  /** The tricks (general patterns) this type teaches. Most types have exactly one, with id === type. */
  tricks: Trick[];
  /** Seconds a fast, confident answer takes. Used for Speedy. */
  targetSeconds: number;
  generate(level: number, rng: Rng, trickId?: string): Q;
  /** The question picture. Must fit a ~640x340 box and scale down nicely. */
  Stimulus: FC<{ q: Q }>;
  /** Renders one answer option (choice questions only). */
  Choice?: FC<{ q: Q; data: unknown; index: number }>;
  /** Targeted message when a specific wrong answer is given. */
  wrongFeedback?(q: Q, given: number): string | undefined;
  /** Narrated steps for the animated solution. Last step should state the trick rule. */
  solution(q: Q): Step[];
  /** Visual for a given solution step. Animate changes with CSS transitions. */
  Solution: FC<{ q: Q; step: number }>;
}

export interface Trick {
  id: string;
  type: QType;
  title: string;
  /** Rule shown on the card. Short, kid language. */
  rule: string;
  /** Spoken intro for the lesson. */
  intro: string;
}
