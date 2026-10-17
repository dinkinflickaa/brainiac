import { it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sentences, chunks, key } from '../src/speech/normalize';
it('units2', () => {
  const texts: [string, number][] = JSON.parse(readFileSync('scripts/out/speech.json', 'utf8'));
  const noNumChunks = new Map<string, number>();
  const sents = new Set<string>();
  for (const [t] of texts) for (const s of sentences(t)) if (!/\d/.test(s)) { sents.add(key(s)); for (const c of chunks(s)) noNumChunks.set(key(c), (noNumChunks.get(key(c)) ?? 0) + 1); }
  console.log('noNum sentences', sents.size, 'noNum chunks', noNumChunks.size);
  // what kinds of sentences explode: group by first 3 words
  const groups = new Map<string, number>();
  for (const s of sents) { const g = s.split(' ').slice(0, 3).join(' '); groups.set(g, (groups.get(g) ?? 0) + 1); }
  console.log([...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([g, n]) => `${n} ${g}`).join('\n'));
});
