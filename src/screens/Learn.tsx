import { useMemo, useState } from 'react';
import type { WorldId } from '../engine/types';
import { makeRng } from '../engine/rng';
import { MOD, TRICKS, WORLDS, worldOf } from '../content/registry';
import { useProgress } from '../state/store';
import { markWatched, trickStage } from '../state/actions';
import { say } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { useNav } from '../app/nav';
import { Header, Icon, Pip, useSayOnMount } from '../ui/parts';
import { SolutionPlayer } from './SolutionPlayer';
import { StageChip } from './Home';
import { LINES } from '../speech/lines';

/** A trick lesson: intro, watch a worked example, then practice with help that fades away. */
export function Lesson({ trickId }: { trickId: string }) {
  const nav = useNav();
  const trick = TRICKS[trickId];
  const mod = MOD[trick.type];
  const world = worldOf(trick.type);
  const [phase, setPhase] = useState<'intro' | 'watch'>('intro');
  const example = useMemo(() => mod.generate(1, makeRng(), trickId), [mod, trickId]);
  useSayOnMount(LINES.lesson(trick.title, trick.intro), [trickId]);

  const practice = () => {
    markWatched(trickId);
    nav.go({ name: 'play', key: Date.now(), spec: { mode: 'lesson', title: trick.title, trickId, count: 5, guided: 2 } });
  };

  if (phase === 'watch') {
    return <SolutionPlayer q={example} title={`Trick: ${trick.title}`} closeLabel="Now I try!" onClose={practice} />;
  }
  return (
    <div className="screen">
      <Header title="Learn the trick" onBack={nav.back} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center' }}>
        <Pip size={140} />
        <div style={{ background: world.soft, color: world.color, borderRadius: 999, padding: '6px 16px', fontWeight: 800 }}>{mod.name}</div>
        <div className="display" style={{ fontSize: 'clamp(36px, 6vh, 54px)', lineHeight: 1.05 }}>{trick.title}</div>
        <div className="card" style={{ padding: '18px 26px', maxWidth: 720, background: 'var(--green-soft)' }}>
          <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0F5A37' }}>The trick</div>
          <div className="display" style={{ fontSize: 'clamp(22px, 3.6vh, 30px)', lineHeight: 1.25 }}>{trick.rule}</div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-primary" style={{ fontSize: 28, minHeight: 72 }} onClick={() => { sfx.tap(); setPhase('watch'); }}>{Icon.play(26)} Watch</button>
          <button className="btn btn-white" onClick={practice}>Skip to practice</button>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--muted)', fontWeight: 700 }}>
          <span>1. Watch</span>{Icon.next(18)}<span>2. Try with help</span>{Icon.next(18)}<span>3. Try alone</span>{Icon.next(18)}<span>4. Speed round</span>
        </div>
      </div>
    </div>
  );
}

/** Every trick she has found, how well she knows it, and how much faster she got. */
export function TrickBook() {
  const nav = useNav();
  const p = useProgress();
  const [tab, setTab] = useState<WorldId | 'all'>('all');
  useSayOnMount(LINES.trickBook);
  const list = Object.values(TRICKS).filter((t) => tab === 'all' || worldOf(t.type).id === tab);
  const found = Object.keys(TRICKS).filter((id) => trickStage(p, id) !== 'new').length;
  const speedy = Object.keys(TRICKS).filter((id) => trickStage(p, id) === 'speedy').length;
  return (
    <div className="screen">
      <Header title="My Trick Book" onBack={nav.back} right={<div style={{ display: 'flex', gap: 8 }}><div className="pill">{found} found</div><div className="pill" style={{ background: 'var(--orange-soft)', color: '#8A3A08' }}>{speedy} speedy</div></div>} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[{ id: 'all', name: 'All' }, ...WORLDS].map((w) => (
          <button key={w.id} onClick={() => { sfx.tap(); setTab(w.id as WorldId | 'all'); }} className="btn" style={{ minHeight: 46, fontSize: 17, padding: '0 16px', background: tab === w.id ? 'var(--ink)' : '#fff', color: tab === w.id ? '#fff' : 'var(--muted)' }}>{w.name}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
        {list.map((t) => {
          const st = trickStage(p, t.id);
          const w = worldOf(t.type);
          const tr = p.tricks[t.id];
          const speed = tr?.firstAvg !== undefined && tr.bestAvg !== undefined && tr.bestAvg < tr.firstAvg - 0.5
            ? `was ${tr.firstAvg.toFixed(0)}s, now ${tr.bestAvg.toFixed(0)}s` : tr?.correct ? `${tr.correct} solved` : 'not tried yet';
          return (
            <div key={t.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, borderTop: `6px solid ${w.color}`, opacity: st === 'new' ? 0.8 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div className="display" style={{ fontSize: 20, lineHeight: 1.1 }}>{t.title}</div>
                <StageChip stage={st} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', lineHeight: 1.35 }}>{t.rule}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{speed}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button className="btn btn-soft" style={{ minHeight: 44, fontSize: 16, padding: '0 14px' }} onClick={() => { say(t.rule); nav.go({ name: 'lesson', trickId: t.id }); }}>{Icon.play(16)} Watch</button>
                {(st === 'gotit' || st === 'speedy') && (
                  <button className="btn btn-white" style={{ minHeight: 44, fontSize: 16, padding: '0 14px' }} onClick={() => nav.go({ name: 'play', key: Date.now(), spec: { mode: 'speed', title: `Speed: ${t.title}`, trickId: t.id, count: 5 } })}>{Icon.bolt(16)} Speed round</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
