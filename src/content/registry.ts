import type { BaseQ, QType, Trick, TypeModule, WorldId } from '../engine/types';
import { matrices } from './shapes/matrices';
import { folding } from './shapes/folding';
import { figclass } from './shapes/figclass';
import { numseries } from './numbers/numseries';
import { numanalogy } from './numbers/numanalogy';
import { numpuzzle } from './numbers/numpuzzle';
import { picanalogy } from './pictures/picanalogy';
import { picclass } from './pictures/picclass';
import { sentence } from './pictures/sentence';
import { facts20 } from './speed/facts20';
import { mental100 } from './speed/mental100';
import { skiparrays } from './speed/skiparrays';
import { tricky } from './tricks/tricky';
import { placevalue } from './tricks/placevalue';
import { money } from './tricks/money';
import { time } from './tricks/time';

export const MODULES = [
  matrices, folding, figclass,
  numseries, numanalogy, numpuzzle,
  picanalogy, picclass, sentence,
  facts20, mental100, skiparrays,
  tricky, placevalue, money, time,
] as unknown as TypeModule<BaseQ>[];

export const MOD = Object.fromEntries(MODULES.map((m) => [m.type, m])) as Record<QType, TypeModule<BaseQ>>;

export interface World {
  id: WorldId;
  name: string;
  tagline: string;
  /** What the parent view calls it. */
  area: string;
  color: string;
  soft: string;
  types: QType[];
}

export const WORLDS: World[] = [
  { id: 'shapes', name: 'Shape Sky', tagline: 'Folding, shape grids, odd one out', area: 'CogAT Nonverbal', color: '#B4500F', soft: '#FFE1D3', types: ['folding', 'matrices', 'figclass'] },
  { id: 'numbers', name: 'Number Mountain', tagline: 'Bead patterns, pairs, balance', area: 'CogAT Quantitative', color: '#5B3FD6', soft: '#E3DEFF', types: ['numseries', 'numanalogy', 'numpuzzle'] },
  { id: 'pictures', name: 'Picture Woods', tagline: 'Picture pairs, teams, listening', area: 'CogAT Verbal', color: '#177A4C', soft: '#D8F3E6', types: ['picanalogy', 'picclass', 'sentence'] },
  { id: 'speed', name: 'Speed Lab', tagline: 'Mental math tricks, super fast', area: 'Math fluency', color: '#E8590C', soft: '#FFF0E6', types: ['facts20', 'mental100', 'skiparrays'] },
  { id: 'tricks', name: 'Trick Tower', tagline: 'Sneaky puzzles, money, time', area: 'Math achievement', color: '#9A6400', soft: '#FFF1C7', types: ['tricky', 'placevalue', 'money', 'time'] },
];
export const WORLD = Object.fromEntries(WORLDS.map((w) => [w.id, w])) as Record<WorldId, World>;
export const worldOf = (t: QType) => WORLDS.find((w) => w.types.includes(t))!;

/** Every trick in the app, by id. */
export const TRICKS: Record<string, Trick> = Object.fromEntries(MODULES.flatMap((m) => m.tricks.map((t) => [t.id, t])));
export const ALL_TRICKS: Trick[] = Object.values(TRICKS);
