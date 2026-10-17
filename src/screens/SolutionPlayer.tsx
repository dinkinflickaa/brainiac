import { useEffect, useRef, useState } from 'react';
import type { BaseQ } from '../engine/types';
import { MOD, TRICKS } from '../content/registry';
import { say, stopVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { Icon, Pip } from '../ui/parts';
import { Fit } from '../ui/kit';
import { spokenSteps } from '../speech/lines';

/**
 * Plays a narrated, animated solution step by step.
 * Each step is spoken; when the voice finishes, it moves on by itself (she can pause, go back, or replay).
 */
export function SolutionPlayer({ q, onClose, title = "Let's see how", closeLabel = 'Got it!', autoStart = true }: {
  q: BaseQ; onClose: () => void; title?: string; closeLabel?: string; autoStart?: boolean;
}) {
  const mod = MOD[q.type];
  const steps = spokenSteps(mod, q);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(autoStart);
  const [finished, setFinished] = useState(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const Sol = mod.Solution;
  const trick = TRICKS[q.trick];
  const last = steps.length - 1;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!playing) return;
    say(steps[step].say, () => {
      if (!playingRef.current) return;
      timer = setTimeout(() => {
        if (step < last) setStep((s) => s + 1);
        else { setPlaying(false); setFinished(true); }
      }, 1100);
    });
    return () => { if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, playing]);

  useEffect(() => () => stopVoice(), []);

  const go = (s: number) => {
    sfx.tap();
    stopVoice();
    setStep(Math.max(0, Math.min(last, s)));
    setPlaying(true);
    if (s >= last) setFinished(true);
  };
  const isRule = step === last;

  return (
    <div className="screen" style={{ background: 'var(--bg)', zIndex: 30, gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="display" style={{ fontSize: 'clamp(24px, 4vh, 32px)' }}>{title}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {steps.map((_, i) => (
            <span key={i} style={{ width: 'clamp(16px, 3vw, 34px)', height: 10, borderRadius: 99, background: i <= step ? 'var(--purple)' : 'var(--line)', transition: 'background 300ms' }} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
        <div key={q.id} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Fit><Sol q={q} step={step} /></Fit>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: isRule ? 'var(--green-soft)' : '#fff', borderRadius: 24, padding: '14px 18px', transition: 'background 300ms', minHeight: 96 }}>
        <Pip size={64} mood={isRule ? 'cheer' : 'happy'} />
        <div style={{ flex: 1 }}>
          {isRule && trick && <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0F5A37' }}>Trick: {trick.title}</div>}
          <div className="display" style={{ fontSize: 'clamp(20px, 3.4vh, 28px)', lineHeight: 1.25 }}>{steps[step].say}</div>
        </div>
      </div>

      <div className="sol-controls" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="icon-btn" aria-label="Previous step" onClick={() => go(step - 1)} disabled={step === 0}>{Icon.back()}</button>
        <button className="btn btn-white" style={{ minWidth: 140 }} onClick={() => { if (playing) { stopVoice(); setPlaying(false); } else if (finished && step === last) { go(0); setFinished(false); } else setPlaying(true); }}>
          {playing ? Icon.pause() : finished && step === last ? Icon.replay() : Icon.play()}
          {playing ? 'Pause' : finished && step === last ? 'Again' : 'Play'}
        </button>
        <button className="icon-btn" aria-label="Next step" onClick={() => go(step + 1)} disabled={step === last}>{Icon.next()}</button>
        <div style={{ flex: 1 }} />
        <button className={`btn ${finished || step === last ? 'btn-sun' : 'btn-white'}`} onClick={() => { stopVoice(); sfx.tap(); onClose(); }}>{closeLabel}</button>
      </div>
    </div>
  );
}
