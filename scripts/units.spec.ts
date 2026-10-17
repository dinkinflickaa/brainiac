/**
 * Turns harvested text into the list of clips to record:
 * every number-free phrase (split at commas), every word run around numbers, and the numbers 0-1000.
 */
import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { sentences, chunks, runs, key } from '../src/speech/normalize';

it('units', () => {
  const texts: [string, number][] = JSON.parse(readFileSync('scripts/out/speech.json', 'utf8'));
  const units = new Map<string, string>();
  const put = (t: string) => { const k = key(t); if (k && k !== '?' && !units.has(k)) units.set(k, t); };
  for (const [t] of texts) for (const s of sentences(t)) {
    if (!/\d/.test(s) && !/[,:;]/.test(s)) { put(s); continue; }
    for (const c of chunks(s)) {
      if (!/\d/.test(c)) put(c);
      else for (const r of runs(c)) put(r);
    }
  }
  for (let n = 0; n <= 1000; n++) put(String(n));
  writeFileSync('scripts/out/units.json', JSON.stringify([...units.entries()]));
  console.log('units', units.size, 'chars', [...units.values()].reduce((s, x) => s + x.length, 0));
});
