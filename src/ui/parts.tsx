import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { say, useSpeaking } from '../audio/voice';
import { sfx } from '../audio/sfx';

/* ---------------- Pip the owl ---------------- */

export function Pip({ size = 120, mood = 'happy', talking, style }: { size?: number; mood?: 'happy' | 'cheer' | 'think'; talking?: boolean; style?: CSSProperties }) {
  const speaking = useSpeaking();
  const talk = talking ?? speaking;
  return (
    <svg width={size} height={size * 1.07} viewBox="0 0 150 160" aria-hidden="true" style={{ animation: mood === 'cheer' ? 'bob 0.6s ease infinite' : undefined, flexShrink: 0, ...style }}>
      <ellipse cx="75" cy="95" rx="58" ry="62" fill="#FFC233" />
      <path d="M30 45 L45 15 L60 42 Z" fill="#FFC233" />
      <path d="M90 42 L105 15 L120 45 Z" fill="#FFC233" />
      <ellipse cx="75" cy="128" rx="32" ry="22" fill="#FFE08A" />
      {mood === 'cheer' ? (
        <>
          <path d="M38 80 Q52 64 66 80" fill="none" stroke="#1D2445" strokeWidth="6" strokeLinecap="round" />
          <path d="M84 80 Q98 64 112 80" fill="none" stroke="#1D2445" strokeWidth="6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="52" cy="78" r="22" fill="#fff" />
          <circle cx="98" cy="78" r="22" fill="#fff" />
          <circle cx={mood === 'think' ? 60 : 56} cy={mood === 'think' ? 72 : 80} r="10" fill="#1D2445" />
          <circle cx={mood === 'think' ? 102 : 94} cy={mood === 'think' ? 72 : 80} r="10" fill="#1D2445" />
          <circle cx={mood === 'think' ? 63 : 59} cy={mood === 'think' ? 69 : 76} r="3" fill="#fff" />
          <circle cx={mood === 'think' ? 105 : 97} cy={mood === 'think' ? 69 : 76} r="3" fill="#fff" />
        </>
      )}
      <g style={{ transformOrigin: '75px 100px', animation: talk ? 'speak 0.32s ease infinite' : undefined }}>
        <path d="M66 98 L84 98 L75 112 Z" fill="#E8590C" />
      </g>
    </svg>
  );
}

/* ---------------- icons ---------------- */

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  speaker: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 9c1.5 1.5 1.5 4.5 0 6M19 6c3 3 3 9 0 12" /></svg>,
  bulb: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" /></svg>,
  book: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></svg>,
  play: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>,
  pause: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
  back: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={3} aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>,
  next: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={3} aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>,
  close: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={3} aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  replay: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>,
  lock: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  star: (s = 22, color = '#FFC233') => <svg width={s} height={s} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.5l7.1-.6z" /></svg>,
  flame: (s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="#E8590C" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4 0-6 1-9z" /></svg>,
  chest: (s = 28) => <svg width={s} height={s * 0.85} viewBox="0 0 40 34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="12" width="34" height="19" rx="3" /><path d="M3 12c0-6 5-9 17-9s17 3 17 9M20 12v19M15 18h10" /></svg>,
  check: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={3.2} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>,
  del: (s = 30) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M9 6h11v12H9l-6-6z" /><path d="M12.5 9.5l5 5M17.5 9.5l-5 5" /></svg>,
  pencil: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} aria-hidden="true"><path d="M4 20l1-5L16 4l4 4L9 19z" /><path d="M14 6l4 4" /></svg>,
  bolt: (s = 26) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>,
};

/* ---------------- speak button ---------------- */

export function SpeakButton({ text, onPress, size = 64, label = 'Hear it again' }: { text: string; onPress?: () => void; size?: number; label?: string }) {
  const speaking = useSpeaking();
  return (
    <button
      className="icon-btn"
      aria-label={label}
      onClick={() => { onPress?.(); say(text); }}
      style={{ width: size, height: size, borderRadius: size / 3, background: speaking ? 'var(--purple)' : '#fff', color: speaking ? '#fff' : 'var(--purple)', transition: 'background 200ms' }}
    >
      {speaking ? (
        <span style={{ display: 'flex', gap: 3, alignItems: 'center', height: 26 }}>
          {[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 4, height: 22, background: '#fff', borderRadius: 2, animation: `speak 0.5s ease ${i * 0.12}s infinite` }} />)}
        </span>
      ) : Icon.speaker(30)}
    </button>
  );
}

/* ---------------- number pad ---------------- */

export function NumberPad({ value, onChange, onSubmit, maxDigits = 3, disabled, submitLabel = 'Check' }: {
  value: string; onChange: (v: string) => void; onSubmit?: () => void; maxDigits?: number; disabled?: boolean; submitLabel?: string;
}) {
  const press = (d: string) => {
    if (disabled || value.length >= maxDigits) return;
    sfx.tap();
    onChange(value === '0' ? d : value + d);
  };
  const key = (label: ReactNode, onClick: () => void, aria?: string, extra?: CSSProperties) => (
    <button
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      style={{
        border: 0, borderRadius: 18, background: '#EEF1F8', minHeight: 'clamp(54px, 8.5vh, 76px)', fontFamily: 'var(--display)', fontWeight: 800,
        fontSize: 'clamp(28px, 4.5vh, 38px)', color: 'var(--ink)', boxShadow: '0 4px 0 #C9D3EA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', ...extra,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
      <div className="display" style={{
        height: 'clamp(64px, 10vh, 92px)', borderRadius: 20, background: '#fff', border: '3px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 'clamp(40px, 7vh, 60px)', color: value ? 'var(--ink)' : '#9AA3C0',
      }}>{value || '?'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => key(d, () => press(d), undefined))}
        {key(Icon.del(), () => !disabled && onChange(value.slice(0, -1)), 'Delete')}
        {key('0', () => press('0'))}
        {key(Icon.check(34), () => !disabled && value && onSubmit?.(), submitLabel, { background: value ? 'var(--purple)' : '#DDE3F0', color: '#fff', boxShadow: value ? '0 4px 0 var(--purple-dark)' : 'none' })}
      </div>
    </div>
  );
}

/* ---------------- confetti ---------------- */

export function Confetti({ run }: { run: boolean }) {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.3, dur: 1.1 + Math.random() * 0.8, rot: Math.random() * 360,
    color: ['#FFC233', '#5B3FD6', '#E8590C', '#177A4C', '#1F5FAF'][i % 5], size: 8 + Math.random() * 8,
  })), [run]);
  if (!run) return null;
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 }}>
      <style>{'@keyframes fall { from { transform: translateY(-20px) rotate(0deg); opacity: 1 } to { transform: translateY(105vh) rotate(720deg); opacity: 0.7 } }'}</style>
      {bits.map((b, i) => (
        <span key={i} style={{ position: 'absolute', top: 0, left: `${b.left}%`, width: b.size, height: b.size * 0.6, background: b.color, borderRadius: 2, animation: `fall ${b.dur}s ease-in ${b.delay}s forwards`, transform: `rotate(${b.rot}deg)` }} />
      ))}
    </div>
  );
}

/* ---------------- misc ---------------- */

export function Header({ title, onBack, right, color }: { title: ReactNode; onBack?: () => void; right?: ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {onBack && <button className="icon-btn" aria-label="Back" onClick={() => { sfx.tap(); onBack(); }}>{Icon.back()}</button>}
        <div className="display" style={{ fontSize: 'clamp(24px, 4vh, 34px)', color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

export function Bar({ value, max, color = 'var(--purple)', height = 12 }: { value: number; max: number; color?: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: 99, background: '#EEF1F8', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%`, height, borderRadius: 99, background: color, transition: 'width 600ms ease' }} />
    </div>
  );
}

/** Says `text` once when the component appears. */
export function useSayOnMount(text: string, deps: unknown[] = []) {
  useEffect(() => {
    const t = setTimeout(() => say(text), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useNow(everyMs = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setN(Date.now()), everyMs);
    return () => clearInterval(iv);
  }, [everyMs]);
  return n;
}
