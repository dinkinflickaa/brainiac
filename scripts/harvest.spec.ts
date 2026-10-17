/**
 * Collects every sentence the app can speak, so the build can pre-record it with a natural voice.
 * Run: npx vitest run scripts/harvest  (writes scripts/out/speech.json)
 */
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeRng } from '../src/engine/rng';
import { MODULES, WORLDS, ALL_TRICKS } from '../src/content/registry';
import { LINES, spokenSteps } from '../src/speech/lines';
import { PROMPTS_SAY } from '../src/screens/Studio';
import { goalWords } from '../src/state/actions';
import { fresh } from '../src/state/store';

it('harvest', () => {
  const texts = new Map<string, number>();
  const add = (t: string | undefined, w = 1) => { if (t) texts.set(t, (texts.get(t) ?? 0) + w); };
  const SEEDS = Number(process.env.SEEDS ?? 400);
  for (const m of MODULES) {
    for (let level = 1; level <= m.maxLevel; level++) {
      for (let s = 0; s < SEEDS; s++) {
        const q = m.generate(level, makeRng(s * 104729 + level * 31 + 7));
        add(q.say); add(q.hint);
        add(`${q.say} ${q.hint}`);
        if (q.text) add(`${q.text} is ${q.answer.kind === 'number' ? q.answer.correct : ''}.`);
        if (q.text && (q.type === 'facts20' || q.type === 'mental100')) add(q.text);
        for (const st of spokenSteps(m, q)) add(st.say);
        if (m.wrongFeedback) {
          if (q.answer.kind === 'choice') q.answer.choices.forEach((_, i) => { if (i !== (q.answer as { correct: number }).correct) add(m.wrongFeedback!(q, i)); });
          else { const a = q.answer.correct; for (const g of [a + 1, a - 1, a + 10, a - 10, a * 2, 0]) add(m.wrongFeedback!(q, g)); }
        }
      }
    }
  }
  // tricks are also taught on fresh examples: covered above by generate(); lesson lines:
  for (const t of ALL_TRICKS) { add(LINES.lesson(t.title, t.intro)); add(t.rule); add(`Trick: ${t.rule}`); }
  for (const w of WORLDS) add(LINES.world(w.name));
  const flat = (o: unknown): void => {
    if (typeof o === 'string') add(o);
    else if (Array.isArray(o)) o.forEach(flat);
    else if (o && typeof o === 'object') Object.values(o).forEach(flat);
  };
  flat(LINES);
  for (const t of fresh().perks) { add(LINES.treasureReady(t.title)); add(goalWords(t.goal)); }
  for (const p of PROMPTS_SAY()) add(p);
  for (const h of LINES.headlines) for (const n of [0, 5, 10]) add(LINES.done(h, n, 10, 20, [], false));
  add(LINES.speedDone(20, 10)); add(LINES.speedDone(20, 10, 8)); add(LINES.speedDone(20, 10, 12));
  for (let i = 0; i <= 3; i++) add(String(i));
  mkdirSync('scripts/out', { recursive: true });
  writeFileSync('scripts/out/speech.json', JSON.stringify([...texts.entries()]));
  console.log('texts', texts.size);
}, 600000);
