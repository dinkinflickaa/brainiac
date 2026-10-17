import type { BaseQ, QType } from '../engine/types';
import { MOD, WORLDS, TRICKS } from '../content/registry';
import { review, automaticCount, dayNumber } from '../engine/leitner';
import { stageFromCorrect } from '../content/speed/support';
import { getState, setState, today, type Perk, type PerkGoal, type Progress, type Session, type TrickStat, type TypeStat } from './store';

export const blankType = (): TypeStat => ({ level: 1, attempts: 0, correct: 0, firstTry: 0, streak: 0, misses: 0, recent: [] });
export const blankTrick = (): TrickStat => ({ watched: false, solo: 0, correct: 0, times: [] });

export const levelOf = (p: Progress, t: QType) => p.types[t]?.level ?? 1;

/* ---------------- answering ---------------- */

export interface AnswerEvent {
  q: BaseQ;
  /** true if right on the first try */
  firstTry: boolean;
  /** true if eventually right (without watching the solution) */
  right: boolean;
  usedHelp: boolean;
  seconds: number;
}

/** Stars for one question: 3 = right first try with no help, 2 = right with help or on try 2, 1 = finished with the solution. */
export const starsFor = (e: AnswerEvent) => (e.firstTry && !e.usedHelp ? 3 : e.right ? 2 : 1);

export function recordAnswer(e: AnswerEvent) {
  setState((p) => {
    const t = e.q.type;
    const s = { ...(p.types[t] ?? blankType()) };
    const max = MOD[t].maxLevel;
    s.attempts++;
    if (e.right) s.correct++;
    if (e.firstTry) s.firstTry++;
    s.recent = [...s.recent, e.firstTry && !e.usedHelp].slice(-30);
    s.lastPlayed = today();
    // Adaptive difficulty: 3 clean answers in a row -> harder; 2 misses in a row -> easier.
    if (e.firstTry && !e.usedHelp) {
      s.streak++;
      s.misses = 0;
      if (s.streak >= 3 && s.level < max) { s.level++; s.streak = 0; }
    } else if (!e.firstTry) {
      s.misses++;
      s.streak = 0;
      if (s.misses >= 2 && s.level > 1) { s.level--; s.misses = 0; }
    }
    // Trick progress
    const tr = { ...(p.tricks[e.q.trick] ?? blankTrick()) };
    if (e.firstTry && !e.usedHelp) {
      tr.solo++;
      tr.correct++;
      tr.times = [...tr.times, e.seconds].slice(-10);
      if (tr.times.length >= 3) {
        const avg = tr.times.slice(-3).reduce((a, b) => a + b, 0) / 3;
        if (tr.firstAvg === undefined) tr.firstAvg = avg;
        tr.bestAvg = Math.min(tr.bestAvg ?? avg, avg);
      }
    } else if (!e.firstTry) {
      tr.solo = 0;
    }
    // Speed Lab facts: spaced review
    let deck = p.deck;
    if (e.q.fact) deck = review(deck, e.q.fact, e.firstTry, e.seconds * 1000, dayNumber());
    const d = today();
    const day = p.days[d] ?? { answered: 0, correct: 0, seconds: 0 };
    return {
      ...p,
      types: { ...p.types, [t]: s },
      tricks: { ...p.tricks, [e.q.trick]: tr },
      deck,
      stars: p.stars + starsFor(e),
      totalCorrect: p.totalCorrect + (e.right ? 1 : 0),
      days: { ...p.days, [d]: { answered: day.answered + 1, correct: day.correct + (e.firstTry ? 1 : 0), seconds: day.seconds + Math.min(120, e.seconds) } },
    };
  });
}

/** Called whenever she finishes anything: keeps the daily streak. */
export function touchStreak() {
  setState((p) => {
    const d = today();
    if (p.streak.last === d) return p;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const count = p.streak.last === today(y) ? p.streak.count + 1 : 1;
    return { ...p, streak: { count, last: d, best: Math.max(p.streak.best, count) } };
  });
}

export function markWatched(trickId: string) {
  setState((p) => ({ ...p, tricks: { ...p.tricks, [trickId]: { ...(p.tricks[trickId] ?? blankTrick()), watched: true } } }));
}

export function saveSession(s: Session) {
  setState((p) => ({ ...p, sessions: [...p.sessions, s].slice(-80) }));
}

export function finishQuest() {
  setState((p) => {
    const d = today();
    return { ...p, quests: { ...p.quests, [d]: (p.quests[d] ?? 0) + 1 }, questDone: p.questDone + 1, stars: p.stars + 10 };
  });
}

/* ---------------- tricks ---------------- */

export type Stage = 'new' | 'learning' | 'gotit' | 'speedy';

export function trickStage(p: Progress, trickId: string): Stage {
  const tr = p.tricks[trickId];
  if (!tr || (!tr.watched && tr.correct === 0)) return 'new';
  if (tr.solo < 3 && tr.correct < 5) return 'learning';
  const target = MOD[TRICKS[trickId]?.type]?.targetSeconds ?? 10;
  const recent = tr.times.slice(-3);
  if (recent.length >= 3 && recent.reduce((a, b) => a + b, 0) / 3 <= target) return 'speedy';
  return 'gotit';
}

/** Picture support level for Speed Lab tricks (blocks -> dots -> numbers). */
export function craStage(trickId: string) {
  return stageFromCorrect(getState().tricks[trickId]?.correct ?? 0);
}

/* ---------------- perks ---------------- */

export function goalValue(p: Progress, g: PerkGoal): number {
  switch (g.kind) {
    case 'streak': return p.streak.count;
    case 'stars': return p.stars;
    case 'quests': return p.questDone;
    case 'correct': return p.totalCorrect;
    case 'speedy': return Object.keys(TRICKS).filter((id) => trickStage(p, id) === 'speedy').length;
    case 'automatic': return automaticCount(p.deck).automatic;
  }
}
/** Counters that only go up start from when the perk was added. Streaks and skills count as they are. */
const cumulative = (g: PerkGoal) => g.kind === 'stars' || g.kind === 'quests' || g.kind === 'correct';

export function perkProgress(p: Progress, perk: Perk): { have: number; need: number; ready: boolean } {
  const raw = goalValue(p, perk.goal);
  const have = Math.max(0, cumulative(perk.goal) ? raw - perk.base : raw);
  return { have: Math.min(have, perk.goal.target), need: perk.goal.target, ready: have >= perk.goal.target };
}

export function goalWords(g: PerkGoal): string {
  switch (g.kind) {
    case 'streak': return `Play ${g.target} days in a row`;
    case 'stars': return `Earn ${g.target} stars`;
    case 'quests': return `Finish ${g.target} daily quests`;
    case 'correct': return `Solve ${g.target} puzzles`;
    case 'speedy': return `Get ${g.target} tricks to Speedy`;
    case 'automatic': return `Know ${g.target} math facts by heart`;
  }
}

export function addPerk(perk: Omit<Perk, 'id' | 'base' | 'status'>) {
  setState((p) => ({
    ...p,
    perks: [...p.perks, { ...perk, id: `perk${Date.now()}`, base: cumulative(perk.goal) ? goalValue(p, perk.goal) : 0, status: 'active' }],
  }));
}
export function updatePerk(id: string, fn: (x: Perk) => Perk) {
  setState((p) => ({ ...p, perks: p.perks.map((x) => (x.id === id ? fn(x) : x)) }));
}
export function removePerk(id: string) {
  setState((p) => ({ ...p, perks: p.perks.filter((x) => x.id !== id) }));
}
/** After a perk is approved, she can earn it again: reset its starting point. */
export function restartPerk(id: string) {
  setState((p) => ({
    ...p,
    perks: p.perks.map((x) => (x.id === id ? { ...x, status: 'active', base: cumulative(x.goal) ? goalValue(p, x.goal) : 0, claimedAt: undefined } : x)),
  }));
}

/* ---------------- daily quest ---------------- */

/** Weakest types first, so practice goes where it helps most. */
export function weakness(p: Progress, t: QType): number {
  const s = p.types[t];
  if (!s || s.recent.length < 3) return 0.5;
  const acc = s.recent.filter(Boolean).length / s.recent.length;
  const stale = s.lastPlayed && s.lastPlayed !== today() ? 0.1 : 0;
  return 1 - acc + stale;
}

/**
 * Today's quest: a mix across all areas, weighted to what needs work.
 * Shapes 3, Numbers 3, Pictures 2, Speed 1, Tricks 1 (for 10 questions).
 */
export function buildQuest(p: Progress, size = p.settings.questSize): QType[] {
  const plan: [string, number][] = [['shapes', 3], ['numbers', 3], ['pictures', 2], ['speed', 1], ['tricks', 1]];
  const scale = size / 10;
  const out: QType[] = [];
  for (const [w, n] of plan) {
    const world = WORLDS.find((x) => x.id === w)!;
    const ranked = [...world.types].sort((a, b) => weakness(p, b) - weakness(p, a) + (Math.random() - 0.5) * 0.3);
    const count = Math.max(1, Math.round(n * scale));
    for (let i = 0; i < count; i++) out.push(ranked[i % ranked.length]);
  }
  // Interleave so the same world doesn't come twice in a row.
  return interleave(out);
}

function interleave(xs: QType[]): QType[] {
  const byWorld = new Map<string, QType[]>();
  for (const t of xs) {
    const w = WORLDS.find((x) => x.types.includes(t))!.id;
    byWorld.set(w, [...(byWorld.get(w) ?? []), t]);
  }
  const out: QType[] = [];
  let last = '';
  while (out.length < xs.length) {
    const options = [...byWorld.entries()].filter(([w, list]) => list.length && w !== last).sort((a, b) => b[1].length - a[1].length);
    const pick = options[0] ?? [...byWorld.entries()].find(([, l]) => l.length)!;
    out.push(pick[1].shift()!);
    last = pick[0];
  }
  return out;
}
