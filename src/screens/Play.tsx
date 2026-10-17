import { useEffect, useMemo, useRef, useState } from 'react';
import type { BaseQ, QType } from '../engine/types';
import { makeRng } from '../engine/rng';
import { pickNext, dayNumber } from '../engine/leitner';
import { MOD, TRICKS, worldOf } from '../content/registry';
import { makeFactQ } from '../content/speed/facts20';
import { getState, useProgress } from '../state/store';
import { finishQuest, levelOf, recordAnswer, saveSession, starsFor, touchStreak, markWatched } from '../state/actions';
import { prefetch, say, stopVoice } from '../audio/voice';
import { spokenSteps } from '../speech/lines';
import { sfx } from '../audio/sfx';
import { useNav, type SessionSpec } from '../app/nav';
import { Confetti, Icon, NumberPad, Pip, SpeakButton } from '../ui/parts';
import { Fit } from '../ui/kit';
import { SolutionPlayer } from './SolutionPlayer';
import { LINES } from '../speech/lines';

const PRAISE = LINES.praise;
const LETTERS = 'ABCDE';

type Phase = 'ask' | 'wrong' | 'right' | 'solution' | 'trick';

/** Make the next question for this session. */
function nextQuestion(spec: SessionSpec, index: number, recentFacts: string[]): BaseQ {
  const p = getState();
  const rng = makeRng();
  const fact = () => makeFactQ(pickNext(p.deck, dayNumber(), recentFacts), levelOf(p, 'facts20'));
  if (spec.mode === 'sprint') return fact();
  if (spec.mode === 'quest') {
    const t = spec.types![index % spec.types!.length];
    return t === 'facts20' ? fact() : MOD[t].generate(levelOf(p, t), rng);
  }
  if (spec.mode === 'practice') {
    const t = spec.type!;
    return t === 'facts20' ? fact() : MOD[t].generate(levelOf(p, t), rng);
  }
  // lesson / speed: one trick
  const trick = TRICKS[spec.trickId!];
  const mod = MOD[trick.type];
  const lvl = spec.mode === 'lesson' ? Math.max(1, Math.min(3, levelOf(p, trick.type))) : levelOf(p, trick.type);
  return mod.generate(lvl, rng, trick.id);
}

export function Play({ spec }: { spec: SessionSpec }) {
  const nav = useNav();
  const progress = useProgress();
  const recentFacts = useRef<string[]>([]);
  const [index, setIndex] = useState(0);
  const [q, setQ] = useState<BaseQ>(() => nextQuestion(spec, 0, []));
  const [phase, setPhase] = useState<Phase>('ask');
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [tries, setTries] = useState(0);
  const [helped, setHelped] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [wiggle, setWiggle] = useState(0);
  const [trickExample, setTrickExample] = useState<BaseQ | null>(null);
  const started = useRef(Date.now());
  const sessionStart = useRef(Date.now());
  const stats = useRef({ answered: 0, firstTry: 0, stars: 0, hints: 0, tricks: 0, solutions: 0, replays: 0, levelUps: [] as string[], speedTimes: [] as number[] });
  const levelsBefore = useRef<Record<string, number>>({});

  const mod = MOD[q.type];
  const world = worldOf(q.type);
  (window as unknown as { __q: BaseQ }).__q = q; // lets automated tests read the current question
  const fast = spec.mode === 'sprint' || spec.mode === 'speed';
  const guided = (spec.guided ?? 0) > index;
  const isNumber = q.answer.kind === 'number';

  // Read the question aloud when it appears. Guided questions open the hint by themselves.
  useEffect(() => {
    started.current = Date.now();
    if (!(q.type in levelsBefore.current)) levelsBefore.current[q.type] = levelOf(getState(), q.type);
    const text = fast ? (q.text ?? q.say) : q.say;
    const t = setTimeout(() => say(guided ? `${q.say} ${q.hint}` : text), 300);
    if (guided) setHintOpen(true);
    // Download the hint and solution narration in the background so they play instantly.
    const pre = setTimeout(() => { prefetch(q.hint); spokenSteps(MOD[q.type], q).forEach((st) => prefetch(st.say)); }, 1500);
    return () => { clearTimeout(t); clearTimeout(pre); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  useEffect(() => () => stopVoice(), []);

  const finishSession = () => {
    const s = stats.current;
    const secs = Math.round((Date.now() - sessionStart.current) / 1000);
    saveSession({
      id: `s${sessionStart.current}`, start: new Date(sessionStart.current).toISOString(), mode: spec.mode,
      answered: s.answered, correct: s.firstTry, hints: s.hints, tricks: s.tricks, solutions: s.solutions, replays: s.replays, seconds: secs,
    });
    touchStreak();
    if (spec.mode === 'quest') finishQuest();
    if (spec.mode === 'lesson' && spec.trickId) markWatched(spec.trickId);
    const p = getState();
    const ups = Object.entries(levelsBefore.current).filter(([t, l]) => levelOf(p, t as QType) > l).map(([t]) => MOD[t as QType].name);
    const times = s.speedTimes;
    nav.go({
      name: 'done',
      summary: { spec, answered: s.answered, firstTry: s.firstTry, stars: s.stars + (spec.mode === 'quest' ? 10 : 0), levelUps: ups, seconds: secs, avgSeconds: times.length ? times.reduce((a, b) => a + b, 0) / times.length : undefined },
    });
  };

  const advance = () => {
    stopVoice();
    if (index + 1 >= spec.count) return finishSession();
    if (q.fact) recentFacts.current = [...recentFacts.current, q.fact].slice(-5);
    const n = nextQuestion(spec, index + 1, recentFacts.current);
    setIndex(index + 1);
    setQ(n);
    setPhase('ask');
    setPicked(null);
    setTyped('');
    setTries(0);
    setHelped(false);
    setHintOpen(false);
    setMessage('');
  };

  const record = (firstTry: boolean, right: boolean) => {
    const seconds = (Date.now() - started.current) / 1000;
    const e = { q, firstTry, right, usedHelp: helped || guided, seconds };
    recordAnswer(e);
    stats.current.answered++;
    if (firstTry) stats.current.firstTry++;
    stats.current.stars += starsFor(e);
    if (right && firstTry) stats.current.speedTimes.push(seconds);
  };

  const check = (given: number) => {
    const correct = q.answer.kind === 'choice' ? given === q.answer.correct : given === q.answer.correct;
    if (correct) {
      sfx.right();
      record(tries === 0, true);
      setPhase('right');
      const m = fast ? LINES.fastRight : PRAISE[Math.floor(Math.random() * PRAISE.length)];
      setMessage(m);
      say(m);
      if (fast) setTimeout(advance, 650);
      return;
    }
    sfx.wrong();
    setWiggle((w) => w + 1);
    if (fast) {
      record(false, false);
      setPhase('wrong');
      const ans = q.answer.kind === 'number' ? q.answer.correct : '';
      setMessage(`It's ${ans}.`);
      say(`${q.text ?? ''} is ${ans}.`);
      return;
    }
    if (tries === 0) {
      setTries(1);
      setPhase('wrong');
      const fb = mod.wrongFeedback?.(q, given) ?? LINES.tryOrWatch;
      setMessage(fb);
      say(fb);
    } else {
      record(false, false);
      stats.current.solutions++;
      setMessage(LINES.solveTogether);
      say(LINES.solveTogether, () => setPhase('solution'));
      setTimeout(() => setPhase((p) => (p === 'wrong' || p === 'ask' ? 'solution' : p)), 2500);
      setPhase('wrong');
    }
  };

  const submit = () => {
    if (phase === 'right' || phase === 'solution') return;
    if (isNumber) {
      if (!typed) return;
      check(parseInt(typed, 10));
    } else if (picked !== null) {
      check(picked);
    }
  };

  // Speed rounds: check as soon as enough digits are typed.
  useEffect(() => {
    if (!fast || !isNumber || phase !== 'ask') return;
    const need = String((q.answer as { correct: number }).correct).length;
    if (typed.length >= need) check(parseInt(typed, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const openHint = () => {
    sfx.tap();
    setHelped(true);
    setHintOpen(true);
    stats.current.hints++;
    say(q.hint);
  };
  const openTrick = () => {
    sfx.tap();
    setHelped(true);
    stats.current.tricks++;
    // The trick is shown on a DIFFERENT example, so it teaches without giving away this answer.
    const ex = MOD[q.type].generate(Math.max(1, q.level - 1), makeRng(), q.trick);
    setTrickExample(ex);
    setPhase('trick');
  };
  const showSolution = () => {
    sfx.tap();
    stopVoice();
    if (phase === 'wrong' && tries > 0) { record(false, false); }
    stats.current.solutions++;
    setPhase('solution');
  };

  const tryAgain = () => {
    sfx.tap();
    stopVoice();
    setPhase('ask');
    setPicked(null);
    setTyped('');
    setMessage('');
  };

  const choices = q.answer.kind === 'choice' ? q.answer.choices : [];
  const Choice = mod.Choice;
  const Stim = mod.Stimulus;

  if (phase === 'solution') {
    return <SolutionPlayer q={q} onClose={advance} closeLabel={index + 1 >= spec.count ? 'Finish' : 'Next puzzle'} />;
  }
  if (phase === 'trick' && trickExample) {
    const tr = TRICKS[q.trick];
    return <SolutionPlayer q={trickExample} title={`Trick: ${tr?.title ?? 'Learn the trick'}`} closeLabel="Back to my puzzle" onClose={() => { setPhase('ask'); setTimeout(() => say(q.say), 300); }} />;
  }

  const dots = Array.from({ length: spec.count }, (_, i) => i);
  const answered = phase === 'right';

  return (
    <div className="screen" style={{ gap: 12 }}>
      <Confetti run={answered && tries === 0 && !fast} />
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button className="icon-btn" aria-label="Stop and go home" onClick={() => { stopVoice(); if (stats.current.answered > 0) touchStreak(); nav.back(); }}>{Icon.close()}</button>
        <div className="hide-phone" style={{ background: world.soft, color: world.color, borderRadius: 999, padding: '6px 14px', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap' }}>{mod.name}</div>
        <div className="display only-phone" style={{ flex: 1, textAlign: 'center', fontSize: 18, color: 'var(--muted)' }}>{index + 1} / {spec.count}</div>
        <div className="hide-phone" style={{ flex: 1, display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
          {dots.map((i) => <span key={i} style={{ width: spec.count > 12 ? 12 : 22, height: 10, borderRadius: 99, background: i < index ? 'var(--purple)' : i === index ? 'var(--sun)' : 'var(--line)' }} />)}
        </div>
        <div className="pill">{Icon.star(20)} {progress.stars}</div>
      </div>

      {/* question prompt */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <SpeakButton text={q.say} onPress={() => { stats.current.replays++; }} />
        <div className="display" style={{ fontSize: 'clamp(19px, 3vh, 26px)', lineHeight: 1.25, color: 'var(--ink-2)' }}>{fast || q.type === 'sentence' ? '' : q.say}</div>
      </div>

      {/* main area */}
      <div className="play-main" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: isNumber ? 'wrap' : 'nowrap', flexDirection: isNumber ? 'row' : 'column' }}>
        <div style={{ flex: isNumber ? '999 1 420px' : 1, minHeight: 0, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }} className={`play-stim ${wiggle && phase === 'wrong' ? 'wiggle' : ''}`} key={`stim${q.id}${wiggle}`}>
          <Fit><Stim q={q} /></Fit>
        </div>

        {isNumber ? (
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <NumberPad value={typed} onChange={setTyped} onSubmit={submit} maxDigits={q.answer.kind === 'number' ? q.answer.maxDigits : 3} disabled={phase === 'right' || (fast && phase === 'wrong')} />
          </div>
        ) : (
          <div className={choices.length > 3 ? "choice-grid four" : "choice-grid"} style={{ ["--n" as string]: choices.length, display: 'grid', gap: 'clamp(8px, 1.5vw, 16px)', flexShrink: 0 }}>
            {choices.map((c, i) => {
              const cls = ['choice'];
              if (picked === i && phase === 'ask') cls.push('selected');
              if (answered && q.answer.kind === 'choice' && i === q.answer.correct) cls.push('right');
              if (phase === 'wrong' && picked === i) cls.push('wrong');
              if (answered && q.answer.kind === 'choice' && i !== q.answer.correct) cls.push('dim');
              return (
                <button key={i} className={cls.join(' ')} aria-label={`Answer ${LETTERS[i]}`} disabled={answered}
                  onClick={() => { if (phase === 'wrong') tryAgain(); sfx.tap(); setPicked(i); }}
                  style={{ minHeight: 'clamp(96px, 16vh, 150px)' }}>
                  <span className="choice-letter">{LETTERS[i]}</span>
                  <Fit>{Choice ? <Choice q={q} data={c} index={i} /> : <span className="display" style={{ fontSize: 32 }}>{String(c)}</span>}</Fit>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* hint bubble */}
      {hintOpen && phase === 'ask' && (
        <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--sun-soft)', borderRadius: 20, padding: '10px 16px', flexShrink: 0 }}>
          <Pip size={46} mood="think" />
          <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 2.5vh, 20px)', color: '#5C3D00' }}>{q.hint}</div>
        </div>
      )}

      {/* bottom bar: helpers, feedback, check */}
      <div className="play-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, minHeight: 64 }}>
        {phase === 'ask' && !fast && (
          <>
            <button className="btn btn-white" onClick={openHint} style={{ fontSize: 20 }}><span style={{ color: '#9A6400', display: 'flex' }}>{Icon.bulb()}</span>Hint</button>
            <button className="btn btn-soft" aria-label="Learn the trick" onClick={openTrick} style={{ fontSize: 20 }}>{Icon.book()}<span className="hide-phone">Learn the trick</span><span className="only-phone">Trick</span></button>
            <div style={{ flex: 1 }} />
            {!isNumber && <button className="btn btn-primary" disabled={picked === null} onClick={submit} style={{ minWidth: 160, fontSize: 26 }}>Check</button>}
          </>
        )}
        {phase === 'ask' && fast && <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: 'var(--muted)' }}>{spec.mode === 'speed' ? 'Speed round: answer as fast as you can!' : 'Fact sprint: quick as you can!'}</div>}
        {phase === 'wrong' && (
          <div className="fade-up banner" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '3px solid var(--orange)', borderRadius: 22, padding: '10px 14px' }}>
            <Pip size={50} mood="think" />
            <div className="msg" style={{ flex: 1, fontWeight: 800, fontSize: 'clamp(16px, 2.6vh, 21px)', color: '#5C2800' }}>{message}</div>
            {fast ? (
              <div className="acts" style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-soft" onClick={openTrick} style={{ fontSize: 18 }}>{Icon.book()}Trick</button>
                <button className="btn btn-primary" onClick={advance}>Next</button>
              </div>
            ) : tries === 1 ? (
              <div className="acts" style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-white" onClick={tryAgain}>Try again</button>
                <button className="btn btn-orange" onClick={showSolution}>Show me how</button>
              </div>
            ) : null}
          </div>
        )}
        {phase === 'right' && !fast && (
          <div className="fade-up banner" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--green)', color: '#fff', borderRadius: 22, padding: '10px 14px' }}>
            <Pip size={54} mood="cheer" />
            <div className="msg" style={{ flex: 1 }}>
              <div className="display" style={{ fontSize: 'clamp(22px, 3.6vh, 30px)', lineHeight: 1.1 }}>{message}</div>
              <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>{Array.from({ length: tries === 0 && !helped && !guided ? 3 : 2 }).map((_, i) => <span key={i}>{Icon.star(22)}</span>)}</div>
            </div>
            <div className="acts" style={{ display: 'flex', gap: 10 }}>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 19 }} onClick={() => { stats.current.solutions++; sfx.tap(); setPhase('solution'); }}>See how</button>
              <button className="btn btn-sun" onClick={advance} autoFocus>{index + 1 >= spec.count ? 'Finish' : 'Next'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Helper for screens that start sessions. */
export function usePlaySpec(spec: SessionSpec) {
  return useMemo(() => spec, [spec]);
}
