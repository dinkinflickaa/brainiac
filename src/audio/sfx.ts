/** Tiny synthesized sound effects (no audio files to download). */
import { getState } from '../state/store';

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (!getState().settings.sound) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  tap: () => tone(660, 0, 0.06, 'triangle', 0.08),
  right: () => { tone(784, 0, 0.18, 'triangle'); tone(1047, 0.1, 0.3, 'triangle'); },
  wrong: () => { tone(330, 0, 0.18, 'sine', 0.14); tone(262, 0.12, 0.25, 'sine', 0.12); },
  star: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.25, 'triangle', 0.1)),
  levelUp: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.12)),
  unlock: () => ac(),
};
