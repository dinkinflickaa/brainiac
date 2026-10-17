import { useState } from 'react';
import type { QType, WorldId } from '../engine/types';
import { MOD, TRICKS, WORLD, WORLDS } from '../content/registry';
import { automaticCount } from '../engine/leitner';
import { probeDue } from '../engine/speedcheck';
import { setState, today, useProgress } from '../state/store';
import { buildQuest, levelOf, perkProgress, trickStage } from '../state/actions';
import { say, unlock } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { APP_NAME, appName } from '../app/brand';
import { useNav, type Summary } from '../app/nav';
import { LINES } from '../speech/lines';
import { Bar, Confetti, Header, Icon, Pip, useSayOnMount } from '../ui/parts';

/* ---------------- first run ---------------- */

export function Onboarding() {
  const nav = useNav();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const lines = LINES.onboarding;
  const next = () => {
    sfx.tap();
    if (step === 0) unlock();
    const n = step + 1;
    if (n >= lines.length) {
      setState((p) => ({ ...p, name: name.trim() || p.name, onboarded: true }));
      nav.home();
      return;
    }
    setStep(n);
    say(lines[n]);
  };
  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 24, background: 'linear-gradient(#F2F7FF, #E3DEFF)' }}>
      <Pip size={180} mood={step === lines.length - 1 ? 'cheer' : 'happy'} />
      <div className="display" style={{ fontSize: 'clamp(30px, 5vh, 46px)', maxWidth: 760, lineHeight: 1.2 }}>
        {step === 0 ? APP_NAME : lines[step]}
      </div>
      {step === 1 && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name"
          style={{ fontFamily: 'var(--display)', fontSize: 36, fontWeight: 800, padding: '10px 24px', borderRadius: 20, border: '3px solid var(--line)', textAlign: 'center', width: 'min(420px, 90%)', userSelect: 'text', WebkitUserSelect: 'text' }}
        />
      )}
      {step === 2 && <div className="icon-btn" style={{ width: 80, height: 80, color: 'var(--purple)' }}>{Icon.speaker(40)}</div>}
      {step === 3 && (
        <div style={{ display: 'flex', gap: 12 }}>
          <span className="btn btn-white" style={{ pointerEvents: 'none' }}><span style={{ color: '#9A6400', display: 'flex' }}>{Icon.bulb()}</span>Hint</span>
          <span className="btn btn-soft" style={{ pointerEvents: 'none' }}>{Icon.book()}Learn the trick</span>
        </div>
      )}
      <button className="btn btn-sun" style={{ fontSize: 30, minHeight: 76, padding: '0 48px' }} onClick={next}>
        {step === 0 ? 'Start' : step === lines.length - 1 ? "Let's go!" : 'Next'}
      </button>
    </div>
  );
}

/* ---------------- home ---------------- */

export function Home() {
  const nav = useNav();
  const p = useProgress();
  const doneToday = p.quests[today()] ?? 0;
  const greet = p.name ? `Hi, ${p.name}!` : 'Hi, Explorer!';
  useSayOnMount(doneToday ? LINES.homeDone : LINES.homeNew);
  const readyPerk = p.perks.find((x) => x.status === 'active' && perkProgress(p, x).ready);
  const nextPerk = p.perks.filter((x) => x.status === 'active').map((x) => ({ x, pr: perkProgress(p, x) })).sort((a, b) => b.pr.have / b.pr.need - a.pr.have / a.pr.need)[0];
  const speedDue = probeDue(p.probes, new Date());
  const startQuest = () => {
    sfx.tap();
    nav.go({ name: 'play', key: Date.now(), spec: { mode: 'quest', title: "Today's quest", types: buildQuest(p), count: p.settings.questSize } });
  };
  const learned = Object.keys(TRICKS).filter((id) => trickStage(p, id) !== 'new').length;

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFC233" aria-hidden="true"><path d="M3 20l6-10 4 6 3-4 5 8z" /><circle cx="17" cy="6" r="2.5" /></svg>
          </div>
          <div className="display" style={{ fontSize: 28 }}>{appName()}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pill" aria-label={`${p.streak.count} day streak`}>{Icon.flame()} {p.streak.count}</div>
          <div className="pill" aria-label={`${p.stars} stars`}>{Icon.star()} {p.stars}</div>
          <button className="btn btn-sun" style={{ minHeight: 46, fontSize: 18, padding: '0 16px' }} onClick={() => nav.go({ name: 'treasure' })}>
            {Icon.chest(26)} {readyPerk ? 'Prize ready!' : 'Prizes'}
          </button>
          <button className="icon-btn" aria-label="Grown-ups" style={{ width: 46, height: 46, color: 'var(--muted)' }} onClick={() => nav.go({ name: 'parent' })}>{Icon.lock()}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '3 1 440px', background: 'var(--purple)', color: '#fff', borderRadius: 28, padding: '20px 26px', display: 'flex', alignItems: 'center', gap: 22 }}>
          <Pip size={120} mood={doneToday ? 'cheer' : 'happy'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="display" style={{ fontSize: 'clamp(30px, 5vh, 42px)', lineHeight: 1 }}>{greet}</div>
            <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.95 }}>
              {doneToday ? `Quest done today! ${p.streak.count} day streak.` : `Today's quest: ${p.settings.questSize} puzzles from every world.`}
            </div>
            <button className="btn btn-sun" style={{ alignSelf: 'flex-start', fontSize: 26, minHeight: 66, marginTop: 4 }} onClick={startQuest}>
              {Icon.play(24)} {doneToday ? 'Play another quest' : "Start today's quest"}
            </button>
          </div>
        </div>
        <div style={{ flex: '2 1 280px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {speedDue && p.questDone > 0 ? (
            <button onClick={() => nav.go({ name: 'speedcheck' })} className="card" style={{ border: 0, textAlign: 'left', padding: 18, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', boxShadow: '0 0 0 3px var(--flame)' }}>
              <span style={{ color: 'var(--flame)' }}>{Icon.bolt(40)}</span>
              <div><div className="display" style={{ fontSize: 22 }}>2-minute speed check</div><div style={{ fontWeight: 700, color: 'var(--muted)' }}>See how fast your brain is!</div></div>
            </button>
          ) : (
            <button onClick={() => nav.go({ name: 'trickbook' })} className="card" style={{ border: 0, textAlign: 'left', padding: 18, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ color: 'var(--green)' }}>{Icon.book(40)}</span>
              <div><div className="display" style={{ fontSize: 22 }}>My Trick Book</div><div style={{ fontWeight: 700, color: 'var(--muted)' }}>{learned} tricks found so far</div></div>
            </button>
          )}
          {nextPerk && (
            <button onClick={() => nav.go({ name: 'treasure' })} className="card" style={{ border: 0, textAlign: 'left', padding: 16, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
              <span className="emoji" style={{ fontSize: 40 }}>{nextPerk.x.emoji}</span>
              <div style={{ flex: 1 }}>
                <div className="display" style={{ fontSize: 20 }}>{nextPerk.x.title}</div>
                <Bar value={nextPerk.pr.have} max={nextPerk.pr.need} color="var(--sun-dark)" />
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="display" style={{ fontSize: 24, marginBottom: -6 }}>Pick a world</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        {WORLDS.map((w) => {
          const lv = w.types.reduce((s, t) => s + levelOf(p, t), 0) / w.types.length;
          return (
            <button key={w.id} onClick={() => { sfx.tap(); nav.go({ name: 'world', id: w.id }); }} className="card" style={{ border: 0, padding: 16, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', boxShadow: '0 5px 0 var(--line)' }}>
              <WorldBadge id={w.id} />
              <div className="display" style={{ fontSize: 22, lineHeight: 1.05 }}>{w.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)', minHeight: 36 }}>{w.tagline}</div>
              <Bar value={lv} max={6} color={w.color} height={10} />
            </button>
          );
        })}
        <button onClick={() => { sfx.tap(); nav.go({ name: 'studio' }); }} className="card" style={{ border: 0, padding: 16, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer', boxShadow: '0 5px 0 var(--line)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.pencil(30)}</div>
          <div className="display" style={{ fontSize: 22, lineHeight: 1.05 }}>Idea Studio</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)', minHeight: 36 }}>Draw and imagine</div>
        </button>
      </div>
    </div>
  );
}

export function WorldBadge({ id, size = 54 }: { id: WorldId; size?: number }) {
  const w = WORLD[id];
  const icon = {
    shapes: <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke={w.color} strokeWidth={2.4} strokeLinejoin="round"><path d="M3 4h9v16H3z" /><path d="M12 4l9 3v16l-9-3" /><circle cx="16.5" cy="11" r="1.6" fill={w.color} /></svg>,
    numbers: <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke={w.color} strokeWidth={2.4} strokeLinecap="round"><path d="M6 3v18M12 3v18M18 3v18" /><circle cx="6" cy="17" r="2.4" fill={w.color} /><circle cx="12" cy="17" r="2.4" fill={w.color} /><circle cx="12" cy="12" r="2.4" fill={w.color} /><circle cx="18" cy="17" r="2.4" fill={w.color} /><circle cx="18" cy="12" r="2.4" fill={w.color} /><circle cx="18" cy="7" r="2.4" fill={w.color} /></svg>,
    pictures: <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke={w.color} strokeWidth={2.4} strokeLinejoin="round"><path d="M12 3l7 11H5z" /><path d="M12 14v7" /></svg>,
    speed: <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill={w.color}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>,
    tricks: <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke={w.color} strokeWidth={2.6} strokeLinecap="round"><circle cx="10" cy="10" r="6" /><path d="M15 15l5 5" /></svg>,
  }[id];
  return <div style={{ width: size, height: size, borderRadius: size * 0.3, background: w.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden="true">{icon}</div>;
}

/* ---------------- world ---------------- */

const STAGE_LABEL = { new: 'New', learning: 'Learning', gotit: 'Got it', speedy: 'Speedy' } as const;
const STAGE_COLOR = { new: ['#EEF1F8', '#5A6385'], learning: ['#E3DEFF', '#3F2A9E'], gotit: ['#D8F3E6', '#0F5A37'], speedy: ['#FFF0E6', '#8A3A08'] } as const;

export function StageChip({ stage }: { stage: keyof typeof STAGE_LABEL }) {
  const [bg, fg] = STAGE_COLOR[stage];
  return <span style={{ background: bg, color: fg, borderRadius: 999, padding: '3px 10px', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>{STAGE_LABEL[stage]}</span>;
}

export function WorldScreen({ id }: { id: WorldId }) {
  const nav = useNav();
  const p = useProgress();
  const w = WORLD[id];
  useSayOnMount(LINES.world(w.name), [id]);
  const play = (t: QType) => nav.go({ name: 'play', key: Date.now(), spec: { mode: 'practice', title: MOD[t].name, type: t, count: 8 } });
  const auto = automaticCount(p.deck);

  return (
    <div className="screen">
      <Header title={w.name} onBack={nav.back} color={w.color} right={<WorldBadge id={id} size={50} />} />
      {id === 'speed' && (
        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', boxShadow: `0 0 0 3px ${w.color}` }}>
          <span style={{ color: w.color }}>{Icon.bolt(44)}</span>
          <div style={{ flex: '1 1 240px' }}>
            <div className="display" style={{ fontSize: 26 }}>Fact sprint</div>
            <div style={{ fontWeight: 700, color: 'var(--muted)' }}>{auto.automatic} of {auto.total} facts known by heart. Facts you miss come back sooner.</div>
            <div style={{ marginTop: 8 }}><Bar value={auto.automatic} max={auto.total} color={w.color} /></div>
          </div>
          <button className="btn btn-primary" style={{ background: w.color, boxShadow: '0 6px 0 #9C3A06' }} onClick={() => nav.go({ name: 'play', key: Date.now(), spec: { mode: 'sprint', title: 'Fact sprint', count: 15 } })}>{Icon.play(22)} Sprint</button>
          <button className="btn btn-white" onClick={() => nav.go({ name: 'speedcheck' })}>Speed check</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {w.types.map((t) => {
          const m = MOD[t];
          const lv = levelOf(p, t);
          const st = p.types[t];
          const acc = st && st.recent.length ? Math.round((st.recent.filter(Boolean).length / st.recent.length) * 100) : null;
          return (
            <div key={t} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div className="display" style={{ fontSize: 26 }}>{m.name}</div>
                <div style={{ fontWeight: 800, color: w.color }}>Level {lv}</div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>{Array.from({ length: m.maxLevel }).map((_, i) => <span key={i}>{Icon.star(20, i < lv ? '#FFC233' : '#DDE3F0')}</span>)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>{acc === null ? 'Not played yet' : `${acc}% right the first time lately`}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {m.tricks.slice(0, 6).map((tr) => (
                  <button key={tr.id} onClick={() => nav.go({ name: 'lesson', trickId: tr.id })} style={{ border: 0, background: '#F2F7FF', borderRadius: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, cursor: 'pointer', minHeight: 40 }}>
                    {tr.title} <StageChip stage={trickStage(p, tr.id)} />
                  </button>
                ))}
                {m.tricks.length > 6 && <button onClick={() => nav.go({ name: 'trickbook' })} style={{ border: 0, background: 'transparent', color: 'var(--purple)', fontWeight: 800, cursor: 'pointer', minHeight: 40 }}>+{m.tricks.length - 6} more</button>}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                <button className="btn btn-soft" style={{ fontSize: 20 }} onClick={() => nav.go({ name: 'lesson', trickId: m.tricks[0].id })}>{Icon.book()} Learn</button>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: 22 }} onClick={() => play(t)}>{Icon.play(20)} Play</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- done ---------------- */

export function Done({ summary }: { summary: Summary }) {
  const nav = useNav();
  const p = useProgress();
  const ready = p.perks.find((x) => x.status === 'active' && perkProgress(p, x).ready);
  const s = summary;
  const headline = s.spec.mode === 'quest' ? 'Quest complete!' : s.spec.mode === 'lesson' ? 'Trick learned!' : s.spec.mode === 'speed' ? 'Speed round done!' : 'Great practice!';
  useSayOnMount(LINES.done(headline, s.firstTry, s.answered, s.stars, s.levelUps, !!ready));
  const again = () => nav.go({ name: 'play', key: Date.now(), spec: s.spec.mode === 'quest' ? { ...s.spec, types: buildQuest(p) } : s.spec });
  return (
    <div className="screen" style={{ background: 'var(--purple)', color: '#fff', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
      <Confetti run />
      <Pip size={150} mood="cheer" />
      <div className="display" style={{ fontSize: 'clamp(40px, 7vh, 60px)', lineHeight: 1 }}>{headline}</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Stat big={`${s.firstTry}/${s.answered}`} small="right first try" />
        <Stat big={`+${s.stars}`} small="stars" icon={Icon.star(30)} />
        <Stat big={`${p.streak.count}`} small="day streak" icon={Icon.flame(30)} />
        {s.avgSeconds !== undefined && s.spec.mode !== 'quest' && <Stat big={`${s.avgSeconds.toFixed(1)}s`} small="per answer" />}
      </div>
      {s.levelUps.length > 0 && <div className="pill" style={{ color: 'var(--purple-dark)', fontSize: 20 }}>Level up: {s.levelUps.join(', ')}</div>}
      {ready && (
        <button className="btn btn-sun" style={{ fontSize: 24 }} onClick={() => nav.go({ name: 'treasure' })}>
          <span className="emoji">{ready.emoji}</span> You unlocked: {ready.title}!
        </button>
      )}
      <div style={{ display: 'flex', gap: 14 }}>
        <button className="btn btn-white" onClick={nav.home}>Home</button>
        <button className="btn btn-sun" onClick={again}>Play again</button>
      </div>
    </div>
  );
}

function Stat({ big, small, icon }: { big: string; small: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', color: 'var(--ink)', borderRadius: 22, padding: '14px 22px', minWidth: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {icon}
      <div className="display" style={{ fontSize: 36, lineHeight: 1 }}>{big}</div>
      <div style={{ fontWeight: 700, color: 'var(--muted)' }}>{small}</div>
    </div>
  );
}
