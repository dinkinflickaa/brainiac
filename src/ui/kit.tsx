import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/** Rounded white box used to frame pictures in questions and solutions. */
export function Frame({
  children,
  w,
  h,
  style,
  highlight,
  dashed,
}: {
  children?: ReactNode;
  w?: number | string;
  h?: number | string;
  style?: CSSProperties;
  highlight?: string;
  dashed?: boolean;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: '#fff',
        borderRadius: 18,
        border: dashed ? '3px dashed #C9D3EA' : `3px solid ${highlight ?? 'var(--line)'}`,
        boxShadow: highlight ? `0 0 0 5px ${highlight}33` : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 300ms, box-shadow 300ms',
        position: 'relative',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small rounded label, e.g. "+2" or "gets bigger". */
export function Tag({ children, color = 'var(--purple)', bg = 'var(--purple-soft)', show = true, style }: {
  children: ReactNode; color?: string; bg?: string; show?: boolean; style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color,
        borderRadius: 999,
        padding: '4px 12px',
        fontFamily: 'var(--display)',
        fontWeight: 800,
        fontSize: 18,
        whiteSpace: 'nowrap',
        opacity: show ? 1 : 0,
        transform: show ? 'scale(1)' : 'scale(0.7)',
        transition: 'opacity 350ms, transform 350ms cubic-bezier(.3,1.6,.5,1)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Right-pointing arrow. */
export function Arrow({ size = 34, color = '#9AA3C0', down = false }: { size?: number; color?: string; down?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ transform: down ? 'rotate(90deg)' : undefined, flexShrink: 0 }} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Big "?" placeholder box. */
export function QuestionBox({ w = 120, h = 120 }: { w?: number | string; h?: number | string }) {
  return (
    <Frame w={w} h={h} dashed>
      <span className="display" style={{ fontSize: 48, color: '#9AA3C0' }}>?</span>
    </Frame>
  );
}

/**
 * Returns false on first render and true right after mount.
 * Use it to trigger a CSS transition when a solution step appears.
 */
export function useEntered(delayMs = 60): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return on;
}

/** Counts up 0..n over time, for "one at a time" reveals. Restarts when `key` changes. */
export function useTicker(n: number, everyMs: number, run = true, startDelay = 300): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (!run || n <= 0) return;
    let k = 0;
    let iv: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      iv = setInterval(() => {
        k += 1;
        setI(k);
        if (k >= n && iv) clearInterval(iv);
      }, everyMs);
    }, startDelay);
    return () => {
      clearTimeout(t);
      if (iv) clearInterval(iv);
    };
  }, [n, everyMs, run, startDelay]);
  return i;
}

/** A big emoji picture in a card. Used by the picture (verbal) questions. */
export function Pic({ e, size = 64, label, style }: { e: string; size?: number; label?: string; style?: CSSProperties }) {
  return (
    <span role="img" aria-label={label ?? e} className="emoji" style={{ fontSize: size, display: 'inline-block', ...style }}>
      {e}
    </span>
  );
}

/** Check / cross badge used in solutions. */
export function Mark({ ok, show = true, size = 34 }: { ok: boolean; show?: boolean; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: ok ? 'var(--green)' : 'var(--orange)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: show ? 1 : 0,
        transform: show ? 'scale(1)' : 'scale(0.4)',
        transition: 'opacity 300ms, transform 350ms cubic-bezier(.3,1.6,.5,1)',
      }}
      aria-label={ok ? 'yes' : 'no'}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ok ? <path d="M5 12.5l4.5 4.5L19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
    </span>
  );
}

/** Horizontal row with gap, centered. */
export function Row({ children, gap = 16, style, wrap }: { children: ReactNode; gap?: number; style?: CSSProperties; wrap?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap, flexWrap: wrap ? 'wrap' : undefined, ...style }}>{children}</div>;
}

/** Vertical stack with gap, centered. */
export function Col({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap, ...style }}>{children}</div>;
}
