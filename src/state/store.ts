import { useSyncExternalStore } from 'react';
import type { QType } from '../engine/types';
import type { Deck } from '../engine/leitner';
import type { ProbeResult } from '../engine/speedcheck';

/* ---------------- types ---------------- */

export interface TypeStat {
  level: number;
  attempts: number;
  correct: number;
  firstTry: number;
  /** right-first-time in a row (for leveling up) */
  streak: number;
  /** misses in a row (for leveling down) */
  misses: number;
  /** last 30 answers, true = right first time */
  recent: boolean[];
  lastPlayed?: string;
}

export interface TrickStat {
  watched: boolean;
  /** right-first-time answers without help, in a row */
  solo: number;
  correct: number;
  /** seconds for recent right answers */
  times: number[];
  firstAvg?: number;
  bestAvg?: number;
}

export interface Session {
  id: string;
  start: string;
  mode: string;
  answered: number;
  correct: number;
  hints: number;
  tricks: number;
  solutions: number;
  replays: number;
  seconds: number;
}

export type PerkGoal =
  | { kind: 'streak'; target: number }
  | { kind: 'stars'; target: number }
  | { kind: 'quests'; target: number }
  | { kind: 'correct'; target: number }
  | { kind: 'speedy'; target: number } // number of tricks at Speedy
  | { kind: 'automatic'; target: number }; // facts known by heart

export interface Perk {
  id: string;
  title: string;
  emoji: string;
  cost: string;
  goal: PerkGoal;
  /** counter value when the perk was added, so progress starts at 0 */
  base: number;
  status: 'active' | 'claimed' | 'approved';
  claimedAt?: string;
}

export interface Drawing { id: string; prompt: string; data: string; date: string }

export interface Settings {
  appName: string;
  voice: boolean;
  /** 'natural' = recorded voice, 'device' = the iPad's own speech engine */
  voiceStyle: 'natural' | 'device';
  rate: number;
  sound: boolean;
  questSize: number;
}

export interface Progress {
  v: 1;
  name: string;
  onboarded: boolean;
  createdAt: string;
  stars: number;
  streak: { count: number; last: string; best: number };
  days: Record<string, { answered: number; correct: number; seconds: number }>;
  types: Partial<Record<QType, TypeStat>>;
  tricks: Record<string, TrickStat>;
  deck: Deck;
  sessions: Session[];
  perks: Perk[];
  probes: ProbeResult[];
  quests: Record<string, number>;
  questDone: number;
  totalCorrect: number;
  drawings: Drawing[];
  /** times a grown-up had to step in, by day (logged in Grown-ups corner) */
  adultHelp: Record<string, number>;
  settings: Settings;
}

/* ---------------- defaults ---------------- */

export const today = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

const DEFAULT_PERKS: Omit<Perk, 'id' | 'base' | 'status'>[] = [
  { title: 'Ice cream trip', emoji: '🍦', cost: '~$6', goal: { kind: 'streak', target: 7 } },
  { title: 'Pick a new book', emoji: '📚', cost: '~$8', goal: { kind: 'quests', target: 10 } },
  { title: 'Slime kit', emoji: '🧪', cost: '~$8', goal: { kind: 'stars', target: 500 } },
  { title: 'Movie night pick + popcorn', emoji: '🍿', cost: '~$3', goal: { kind: 'speedy', target: 3 } },
  { title: 'Gel pen set', emoji: '🖊️', cost: '~$9', goal: { kind: 'automatic', target: 40 } },
  { title: 'Mini LEGO set', emoji: '🧱', cost: '~$10', goal: { kind: 'correct', target: 400 } },
];

export function fresh(): Progress {
  return {
    v: 1,
    name: '',
    onboarded: false,
    createdAt: new Date().toISOString(),
    stars: 0,
    streak: { count: 0, last: '', best: 0 },
    days: {},
    types: {},
    tricks: {},
    deck: {},
    sessions: [],
    perks: DEFAULT_PERKS.map((p, i) => ({ ...p, id: `perk${i}`, base: 0, status: 'active' })),
    probes: [],
    quests: {},
    questDone: 0,
    totalCorrect: 0,
    drawings: [],
    adultHelp: {},
    settings: { appName: 'Brainiac', voice: true, voiceStyle: 'natural', rate: 0.95, sound: true, questSize: 10 },
  };
}

/* ---------------- persistence ---------------- */

const KEY = 'puzzle-peaks-progress-v1';
let state: Progress = load();
const listeners = new Set<() => void>();

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const f = fresh(); const saved = JSON.parse(raw); return { ...f, ...saved, settings: { ...f.settings, ...saved.settings } }; }
  } catch {
    /* storage blocked: run in memory */
  }
  return fresh();
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage full (usually drawings). Drop the oldest drawings and try again.
      if (state.drawings.length > 3) {
        state = { ...state, drawings: state.drawings.slice(-3) };
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* give up quietly */ }
      }
    }
  }, 150);
}

export function getState(): Progress {
  return state;
}
export function setState(fn: (p: Progress) => Progress) {
  state = fn(state);
  save();
  listeners.forEach((l) => l());
}
export function replaceState(p: Progress) {
  state = { ...fresh(), ...p };
  save();
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Ask the browser to keep our data (helps on iPad home-screen apps). */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
}
