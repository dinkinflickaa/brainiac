import { useMemo } from 'react';
import type { QType } from '../engine/types';
import { makeRng } from '../engine/rng';
import { MOD } from '../content/registry';

/** Hidden preview page for testing: #qa=type:level:seed:step (step -1 = question view). */
export function QA() {
  const [type, level, seed, step] = location.hash.replace('#qa=', '').split(':');
  const mod = MOD[type as QType];
  const q = useMemo(() => mod.generate(Number(level) || 1, makeRng(Number(seed) || 1)), [mod, level, seed]);
  const st = Number(step ?? -1);
  const S = mod.Stimulus, C = mod.Choice, Sol = mod.Solution;
  return (
    <div className="screen" style={{ gap: 16 }}>
      <div style={{ fontWeight: 800 }}>{type} L{level} seed {seed} step {st} · {q.say}</div>
      {st < 0 ? (
        <>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><S q={q} /></div>
          {q.answer.kind === 'choice' && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${q.answer.choices.length}, 1fr)`, gap: 12 }}>
              {q.answer.choices.map((c, i) => <div key={i} className={`choice ${i === (q.answer as { correct: number }).correct ? 'right' : ''}`}>{C ? <C q={q} data={c} index={i} /> : String(c)}</div>)}
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sol q={q} step={st} /></div>
      )}
      <div style={{ fontWeight: 700 }}>{st >= 0 ? mod.solution(q)[st]?.say : `hint: ${q.hint}`}</div>
    </div>
  );
}
