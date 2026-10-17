import { useEffect, useMemo, useRef, useState } from 'react';
import { setState, today } from '../state/store';
import { touchStreak } from '../state/actions';
import { say } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { useNav } from '../app/nav';
import { LINES } from '../speech/lines';
export { PROMPTS_SAY };
import { Confetti, Header, Icon, Pip } from '../ui/parts';

/** Creativity practice (like the drawing tasks on creativity tests): finish a squiggle, turn circles into many things. */
interface Prompt { id: string; say: string; short: string; draw: (c: CanvasRenderingContext2D, w: number, h: number) => void }

const squiggle = (pts: [number, number][]) => (c: CanvasRenderingContext2D, w: number, h: number) => {
  c.strokeStyle = '#1D2445';
  c.lineWidth = 6;
  c.lineCap = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h)));
  c.stroke();
};

const PROMPTS: Prompt[] = [
  { id: 'sq1', short: 'Finish the squiggle', say: 'Turn this squiggle into something amazing! What could it be? Add as much as you like.', draw: squiggle([[0.35, 0.55], [0.42, 0.42], [0.5, 0.5], [0.58, 0.38], [0.64, 0.5]]) },
  { id: 'sq2', short: 'Finish the curl', say: 'What can this curl become? Make it part of a picture nobody else would think of!', draw: (c, w, h) => { c.strokeStyle = '#1D2445'; c.lineWidth = 6; c.beginPath(); c.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.12, 0.2, Math.PI * 1.6); c.stroke(); } },
  { id: 'circles', short: 'Many circles', say: 'Turn each circle into something different. A ball? A face? Try to make every one a new idea!', draw: (c, w, h) => {
    c.strokeStyle = '#1D2445'; c.lineWidth = 5;
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(w * (0.14 + k * 0.24), h * (0.3 + r * 0.42), Math.min(w, h) * 0.09, 0, Math.PI * 2); c.stroke(); }
  } },
  { id: 'animal', short: 'New animal', say: 'Draw an animal that nobody has ever seen. Give it something special, like wheels or wings or ten legs!', draw: () => {} },
  { id: 'lines', short: 'Two lines', say: 'Here are two lines. What picture can you make with them?', draw: squiggle([[0.3, 0.7], [0.45, 0.35]]) },
];

const PROMPTS_SAY = (): string[] => PROMPTS.map((p) => p.say);
const COLORS = ['#1D2445', '#E8590C', '#FFC233', '#177A4C', '#1F5FAF', '#5B3FD6', '#D9342B', '#8C6A43'];

export function Studio() {
  const nav = useNav();
  const [pi, setPi] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const prompt = PROMPTS[pi];
  const canvas = useRef<HTMLCanvasElement>(null);
  const history = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLORS[1]);
  const [size, setSize] = useState(8);
  const [saved, setSaved] = useState(false);
  const dpr = useMemo(() => Math.min(2, window.devicePixelRatio || 1), []);

  const reset = () => {
    const cv = canvas.current!;
    const r = cv.getBoundingClientRect();
    cv.width = r.width * dpr;
    cv.height = r.height * dpr;
    const c = cv.getContext('2d')!;
    c.scale(dpr, dpr);
    c.fillStyle = '#fff';
    c.fillRect(0, 0, r.width, r.height);
    prompt.draw(c, r.width, r.height);
    history.current = [];
  };
  useEffect(() => {
    reset();
    setSaved(false);
    const t = setTimeout(() => say(prompt.say), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pi]);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent) => {
    const c = canvas.current!.getContext('2d')!;
    history.current = [...history.current, c.getImageData(0, 0, canvas.current!.width, canvas.current!.height)].slice(-20);
    drawing.current = true;
    canvas.current!.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    c.strokeStyle = color;
    c.lineWidth = size;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 0.1, y + 0.1);
    c.stroke();
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = canvas.current!.getContext('2d')!;
    const [x, y] = pos(e);
    c.lineTo(x, y);
    c.stroke();
  };
  const up = () => { drawing.current = false; };
  const undo = () => {
    const last = history.current.pop();
    if (last) canvas.current!.getContext('2d')!.putImageData(last, 0, 0);
  };
  const save = () => {
    // Store a small JPEG so it fits in the iPad's storage.
    const cv = canvas.current!;
    const small = document.createElement('canvas');
    const scale = 480 / cv.width;
    small.width = 480;
    small.height = Math.round(cv.height * scale);
    small.getContext('2d')!.drawImage(cv, 0, 0, small.width, small.height);
    const data = small.toDataURL('image/jpeg', 0.7);
    setState((p) => ({ ...p, drawings: [...p.drawings, { id: `d${Date.now()}`, prompt: prompt.short, data, date: today() }].slice(-24), stars: p.stars + 5 }));
    touchStreak();
    sfx.star();
    setSaved(true);
    say(LINES.studioSaved);
  };

  return (
    <div className="screen" style={{ gap: 12 }}>
      <Confetti run={saved} />
      <Header title="Idea Studio" onBack={nav.back} right={<button className="btn btn-white" style={{ minHeight: 48, fontSize: 18 }} onClick={() => setPi((pi + 1) % PROMPTS.length)}>New idea</button>} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 20, padding: '8px 14px' }}>
        <Pip size={50} />
        <div className="display" style={{ fontSize: 'clamp(18px, 3vh, 24px)', flex: 1 }}>{prompt.say}</div>
        <button className="icon-btn" aria-label="Hear it again" onClick={() => say(prompt.say)} style={{ color: 'var(--purple)' }}>{Icon.speaker()}</button>
      </div>
      <canvas
        ref={canvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ flex: 1, minHeight: 0, width: '100%', borderRadius: 24, background: '#fff', touchAction: 'none', boxShadow: '0 0 0 3px var(--line)' }}
        aria-label="Drawing area"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {COLORS.map((c) => (
          <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} style={{ width: 48, height: 48, borderRadius: '50%', background: c, border: color === c ? '5px solid #fff' : '3px solid #fff', boxShadow: color === c ? `0 0 0 4px ${c}` : '0 0 0 2px var(--line)', cursor: 'pointer' }} />
        ))}
        <button aria-label="Eraser" onClick={() => setColor('#FFFFFF')} className="btn btn-white" style={{ minHeight: 48, fontSize: 16, boxShadow: color === '#FFFFFF' ? '0 0 0 3px var(--ink)' : undefined }}>Eraser</button>
        {[5, 10, 22].map((s) => (
          <button key={s} aria-label={`Brush ${s}`} onClick={() => setSize(s)} className="icon-btn" style={{ boxShadow: size === s ? '0 0 0 3px var(--purple)' : undefined }}>
            <span style={{ width: s + 4, height: s + 4, borderRadius: '50%', background: 'var(--ink)' }} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="icon-btn" aria-label="Undo" onClick={undo}>{Icon.replay()}</button>
        <button className="btn btn-white" style={{ minHeight: 52, fontSize: 18 }} onClick={reset}>Start over</button>
        <button className="btn btn-sun" style={{ minHeight: 56 }} onClick={save} disabled={saved}>{saved ? 'Saved!' : "I'm done!"}</button>
      </div>
    </div>
  );
}
