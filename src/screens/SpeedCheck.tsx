import { useEffect, useMemo, useRef, useState } from 'react';
import { makeProbe, scoreProbe, PROBE_SECONDS, type ProbeResult } from '../engine/speedcheck';
import { setState, today, useProgress } from '../state/store';
import { touchStreak } from '../state/actions';
import { say, stopVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { useNav } from '../app/nav';
import { LINES } from '../speech/lines';
import { Confetti, Header, Icon, NumberPad, Pip, useNow } from '../ui/parts';

/** Fixed 2-minute fluency probe. No hints and no feedback while it runs, so scores are comparable over time. */
export function SpeedCheck() {
  const nav = useNav();
  const p = useProgress();
  const form = p.probes.length;
  const items = useMemo(() => makeProbe(form), [form]);
  const [phase, setPhase] = useState<'intro' | 'count' | 'run' | 'done'>('intro');
  const [count, setCount] = useState(3);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState('');
  const answers = useRef<(number | null)[]>(items.map(() => null));
  const startAt = useRef(0);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const now = useNow(250);
  const left = phase === 'run' ? Math.max(0, PROBE_SECONDS - (now - startAt.current) / 1000) : PROBE_SECONDS;

  useEffect(() => {
    if (phase === 'intro') say(LINES.speedIntro);
    return () => stopVoice();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'count') return;
    if (count === 0) { say(LINES.go); startAt.current = Date.now(); setPhase('run'); return; }
    say(String(count));
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [phase, count]);

  const finish = () => {
    const r = scoreProbe(items, answers.current, form, today());
    setResult(r);
    setState((x) => ({ ...x, probes: [...x.probes, r] }));
    touchStreak();
    setPhase('done');
    const prev = p.probes[p.probes.length - 1];
    say(LINES.speedDone(r.correct, r.perMinute, prev?.perMinute));
    sfx.levelUp();
  };

  useEffect(() => {
    if (phase === 'run' && left <= 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase]);

  const submit = (skip = false) => {
    answers.current[i] = skip || !typed ? null : parseInt(typed, 10);
    setTyped('');
    sfx.tap();
    if (i + 1 >= items.length) finish();
    else setI(i + 1);
  };

  if (phase === 'intro' || phase === 'count') {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center' }}>
        <Header title="Speed check" onBack={nav.back} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <Pip size={150} />
          {phase === 'count' ? <div className="display pop" key={count} style={{ fontSize: 140, color: 'var(--flame)' }}>{count || 'Go!'}</div> : (
            <>
              <div className="display" style={{ fontSize: 40, maxWidth: 700, lineHeight: 1.15 }}>Answer as many as you can in 2 minutes!</div>
              <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 18 }}>Too hard? Tap skip. No hints this time, just your speedy brain.</div>
              <button className="btn btn-sun" style={{ fontSize: 30, minHeight: 76 }} onClick={() => { sfx.tap(); setPhase('count'); }}>I'm ready!</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'done' && result) {
    const prev = p.probes.length > 1 ? p.probes[p.probes.length - 2] : null;
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center', background: 'var(--purple)', color: '#fff' }}>
        <Confetti run />
        <Pip size={140} mood="cheer" />
        <div className="display" style={{ fontSize: 54 }}>{result.correct} right!</div>
        <div className="display" style={{ fontSize: 30 }}>{result.perMinute} per minute{prev ? ` (last time ${prev.perMinute})` : ''}</div>
        <button className="btn btn-sun" onClick={nav.home}>Home</button>
      </div>
    );
  }

  const it = items[i];
  return (
    <div className="screen" style={{ gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: 'var(--flame)' }}>{Icon.bolt(34)}</span>
        <div style={{ flex: 1, height: 16, borderRadius: 99, background: 'var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${(left / PROBE_SECONDS) * 100}%`, height: '100%', background: left < 20 ? 'var(--flame)' : 'var(--purple)', transition: 'width 250ms linear' }} />
        </div>
        <div className="display" style={{ fontSize: 28, minWidth: 70, textAlign: 'right' }}>{Math.ceil(left)}s</div>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div className="display" style={{ fontSize: 'clamp(70px, 14vh, 120px)', background: '#fff', borderRadius: 28, padding: '20px 44px' }}>{it.text}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <NumberPad value={typed} onChange={setTyped} onSubmit={() => submit(false)} maxDigits={3} submitLabel="Next" />
          <button className="btn btn-white" onClick={() => submit(true)}>Skip</button>
        </div>
      </div>
    </div>
  );
}
