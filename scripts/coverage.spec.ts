/** After recording: how much of everything the app can say is covered by recorded clips? */
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sentences, chunks, runs, key } from '../src/speech/normalize';

it('coverage', () => {
  const m = JSON.parse(readFileSync('public/voice/af_heart/manifest.json', 'utf8')).k as Record<string, unknown>;
  const texts: [string, number][] = JSON.parse(readFileSync('scripts/out/speech.json', 'utf8'));
  let lines = 0, missLines = 0;
  const missing = new Map<string, number>();
  for (const [t] of texts) {
    lines++;
    let miss = false;
    for (const s of sentences(t)) {
      if (key(s) in m) continue;
      for (const c of chunks(s)) {
        if (key(c) in m) continue;
        for (const r of runs(c)) if (!(key(r) in m)) { miss = true; missing.set(r, (missing.get(r) ?? 0) + 1); }
      }
    }
    if (miss) missLines++;
  }
  console.log(`lines ${lines}, fully recorded ${lines - missLines}, missing pieces`, [...missing.entries()].slice(0, 20));
  expect(missLines).toBe(0);
});
