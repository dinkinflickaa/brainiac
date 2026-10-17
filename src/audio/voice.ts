/**
 * Pip's voice.
 * Natural voice: every phrase the app can say was pre-recorded at build time (Kokoro "af_heart").
 * A line is played as recorded sentences or phrases, with numbers stitched in, using Web Audio
 * for gapless timing. Anything not recorded falls back to the device's speech engine.
 */
import { useEffect, useState } from 'react';
import { getState } from '../state/store';
import { chunks, clean, key, runs, sentences } from '../speech/normalize';

const BASE = './voice/af_heart/';

/** Clips are packed into a few bundle files: key -> [bundle index, byte offset, byte length]. */
interface Manifest { b: string[]; k: Record<string, [number, number, number]> }
let manifest: Manifest | null = null;
let manifestTried = false;
let ctx: AudioContext | null = null;
let speaking = false;
const listeners = new Set<(s: boolean) => void>();
const setSpeaking = (s: boolean) => { speaking = s; listeners.forEach((l) => l(s)); };

/* ---------------- loading ---------------- */

async function loadManifest() {
  if (manifestTried) return;
  manifestTried = true;
  try {
    const r = await fetch(BASE + 'manifest.json');
    if (r.ok) { manifest = await r.json(); warmVoice(); }
  } catch {
    manifest = null;
  }
}

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

const bundles = new Map<number, Promise<ArrayBuffer | null>>();
function bundle(i: number): Promise<ArrayBuffer | null> {
  let p = bundles.get(i);
  if (!p) {
    p = fetch(BASE + manifest!.b[i]).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
    bundles.set(i, p);
  }
  return p;
}
/** Download every voice bundle in the background (about 1-2 MB each), so the app also works offline. */
export function warmVoice() {
  if (!manifest) return;
  manifest.b.forEach((_, i) => setTimeout(() => bundle(i), 400 * i));
}

const buffers = new Map<string, Promise<AudioBuffer | null>>();
function load(k: string): Promise<AudioBuffer | null> {
  let p = buffers.get(k);
  if (!p) {
    const [bi, off, len] = manifest!.k[k];
    p = bundle(bi)
      .then((buf) => {
        if (!buf) throw new Error('no bundle');
        const slice = buf.slice(off, off + len);
        return new Promise<AudioBuffer>((res, rej) => audio()!.decodeAudioData(slice, res, rej));
      })
      .catch(() => null);
    buffers.set(k, p);
    if (buffers.size > 500) buffers.delete(buffers.keys().next().value as string);
  }
  return p;
}

/* ---------------- planning ---------------- */

type Piece = { file: string } | { tts: string } | { gap: number };

/** Break a line into recorded clips (whole sentence, then phrases, then word/number runs). */
export function plan(text: string): Piece[] {
  const out: Piece[] = [];
  const m = manifest?.k ?? {};
  const has = (k: string) => k in m;
  for (const s of sentences(text)) {
    const ks = key(s);
    if (has(ks)) { out.push({ file: ks }, { gap: 260 }); continue; }
    for (const c of chunks(s)) {
      const kc = key(c);
      if (has(kc)) { out.push({ file: kc }, { gap: 150 }); continue; }
      for (const r of runs(c)) {
        const kr = key(r);
        out.push(has(kr) ? { file: kr } : { tts: r }, { gap: 45 });
      }
      out.push({ gap: 120 });
    }
    out.push({ gap: 180 });
  }
  return out;
}

/** Start downloading the clips for a line so it plays instantly later. */
export function prefetch(text: string) {
  if (!useNatural()) return;
  for (const p of plan(text)) if ('file' in p) load(p.file);
}

const useNatural = () => getState().settings.voiceStyle !== 'device' && !!manifest;

/* ---------------- device voice (fallback) ---------------- */

let deviceVoice: SpeechSynthesisVoice | null = null;
function chooseDeviceVoice() {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const rank = (v: SpeechSynthesisVoice) =>
    (/premium/i.test(v.name) ? 40 : /enhanced/i.test(v.name) ? 30 : 0) +
    (/^(Ava|Zoe|Samantha|Allison|Susan|Nicky|Evan)/.test(v.name) ? 10 : 0) + (v.lang === 'en-US' ? 5 : 0) + (v.localService ? 1 : 0);
  deviceVoice = voices.sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

function deviceSay(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    if (!deviceVoice) chooseDeviceVoice();
    if (deviceVoice) u.voice = deviceVoice;
    u.lang = 'en-US';
    u.rate = getState().settings.rate;
    u.pitch = 1.1;
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    u.onend = fin;
    u.onerror = fin;
    setTimeout(fin, 1500 + text.length * 95);
    window.speechSynthesis.speak(u);
  });
}

/* ---------------- public API ---------------- */

export function initVoice() {
  if (typeof window === 'undefined') return;
  loadManifest();
  if (window.speechSynthesis) {
    chooseDeviceVoice();
    window.speechSynthesis.onvoiceschanged = chooseDeviceVoice;
  }
  // iPad only allows sound after a tap. The first tap anywhere wakes the audio and replays a line that was missed.
  const wake = () => {
    const c = audio();
    if (c && c.state !== 'running') c.resume().then(() => { if (pending) { const p = pending; pending = null; say(p.text, p.onEnd); } });
  };
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('touchend', wake, { passive: true });
}

export const voiceAvailable = () => typeof window !== 'undefined' && (!!window.AudioContext || !!window.speechSynthesis);

/** Call from a tap the first time (start screen). */
export function unlock() {
  const c = audio();
  c?.resume();
  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

let seq = 0;
let current: AudioBufferSourceNode | null = null;
let pending: { text: string; onEnd?: () => void } | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Speak a line. Cancels anything already playing. `onEnd` fires when finished (or after a pause if voice is off). */
export function say(text: string, onEnd?: () => void) {
  const id = ++seq;
  stopCurrent();
  const st = getState().settings;
  if (!text || !st.voice) {
    if (onEnd) setTimeout(onEnd, Math.min(4500, 600 + (text?.length ?? 0) * 45));
    return;
  }
  void run(id, text, onEnd);
}

async function run(id: number, text: string, onEnd?: () => void) {
  await loadManifest();
  if (id !== seq) return;
  const finish = () => { if (id === seq) { setSpeaking(false); onEnd?.(); } };

  if (!useNatural()) {
    setSpeaking(true);
    await deviceSay(clean(text));
    return finish();
  }
  const c = audio();
  if (!c) { await deviceSay(clean(text)); return finish(); }
  if (c.state !== 'running') {
    await c.resume().catch(() => {});
    if ((c.state as string) !== 'running') { pending = { text, onEnd }; return; } // plays on the next tap
  }
  const pieces = plan(text);
  // start every download at once, then play in order
  for (const p of pieces) if ('file' in p) load(p.file);
  setSpeaking(true);
  const rate = Math.max(0.85, Math.min(1.15, getState().settings.rate / 0.95));
  for (const p of pieces) {
    if (id !== seq) return;
    if ('gap' in p) { await sleep(p.gap / rate); continue; }
    if ('tts' in p) { await deviceSay(p.tts); continue; }
    const buf = await load(p.file);
    if (id !== seq) return;
    if (!buf) continue;
    await new Promise<void>((resolve) => {
      const src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      src.connect(c.destination);
      src.onended = () => resolve();
      current = src;
      src.start();
      setTimeout(resolve, (buf.duration / rate) * 1000 + 400); // safety net
    });
  }
  finish();
}

function stopCurrent() {
  try { current?.stop(); } catch { /* already stopped */ }
  current = null;
  pending = null;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function stopVoice() {
  seq++;
  stopCurrent();
  setSpeaking(false);
}

export function useSpeaking(): boolean {
  const [s, setS] = useState(speaking);
  useEffect(() => {
    listeners.add(setS);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}
