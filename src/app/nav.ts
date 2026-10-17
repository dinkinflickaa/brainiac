import { createContext, useContext } from 'react';
import type { QType, WorldId } from '../engine/types';

export interface SessionSpec {
  mode: 'quest' | 'practice' | 'sprint' | 'lesson' | 'speed';
  title: string;
  /** quest: the exact list of types to ask */
  types?: QType[];
  /** practice: one type */
  type?: QType;
  /** lesson / speed: one trick */
  trickId?: string;
  count: number;
  /** first N questions get automatic help (worked-example fading) */
  guided?: number;
}

export interface Summary {
  spec: SessionSpec;
  answered: number;
  firstTry: number;
  stars: number;
  levelUps: string[];
  seconds: number;
  /** speed round: average seconds per right answer */
  avgSeconds?: number;
}

export type Route =
  | { name: 'onboarding' }
  | { name: 'home' }
  | { name: 'world'; id: WorldId }
  | { name: 'play'; spec: SessionSpec; key: number }
  | { name: 'lesson'; trickId: string }
  | { name: 'trickbook' }
  | { name: 'treasure' }
  | { name: 'parent' }
  | { name: 'speedcheck' }
  | { name: 'studio' }
  | { name: 'done'; summary: Summary };

export interface Nav {
  go: (r: Route) => void;
  back: () => void;
  home: () => void;
}
export const NavContext = createContext<Nav>({ go: () => {}, back: () => {}, home: () => {} });
export const useNav = () => useContext(NavContext);
