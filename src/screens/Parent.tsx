import { useMemo, useRef, useState } from 'react';
import { MOD, WORLDS } from '../content/registry';
import { automaticCount } from '../engine/leitner';
import { fresh, getState, replaceState, setState, today, useProgress, type PerkGoal } from '../state/store';
import { addPerk, goalWords, perkProgress, removePerk, restartPerk, updatePerk } from '../state/actions';
import { say, stopVoice } from '../audio/voice';
import { useNav } from '../app/nav';
import { LINES } from '../speech/lines';
import { Bar, Header, NumberPad } from '../ui/parts';

type Tab = 'progress' | 'help' | 'prizes' | 'settings' | 'backup' | 'drawings';

export function Parent() {
  const nav = useNav();
  const [ok, setOk] = useState(false);
  const gate = useMemo(() => ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }), []);
  const [v, setV] = useState('');
  const [bad, setBad] = useState(false);
  const [tab, setTab] = useState<Tab>('progress');
  useMemo(() => stopVoice(), []);

  if (!ok) {
    return (
      <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Header title="Grown-ups only" onBack={nav.back} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="display" style={{ fontSize: 40 }}>What is {gate.a} × {gate.b}?</div>
          <NumberPad value={v} onChange={(x) => { setV(x); setBad(false); }} maxDigits={2} onSubmit={() => (parseInt(v, 10) === gate.a * gate.b ? setOk(true) : (setBad(true), setV('')))} />
          {bad && <div style={{ color: 'var(--orange)', fontWeight: 800 }}>Not quite. Ask a grown-up!</div>}
        </div>
      </div>
    );
  }

  const tabs: [Tab, string][] = [['progress', 'Progress'], ['help', 'Independence'], ['prizes', 'Prizes'], ['settings', 'Settings'], ['drawings', 'Drawings'], ['backup', 'Backup']];
  return (
    <div className="screen" style={{ background: '#F6F7FA' }}>
      <Header title="Grown-ups corner" onBack={nav.back} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="btn" style={{ minHeight: 44, fontSize: 16, padding: '0 16px', fontFamily: 'var(--body)', background: tab === id ? 'var(--ink)' : '#fff', color: tab === id ? '#fff' : 'var(--muted)', boxShadow: 'none', border: '1px solid var(--line)' }}>{label}</button>
        ))}
      </div>
      {tab === 'progress' && <ProgressTab />}
      {tab === 'help' && <HelpTab />}
      {tab === 'prizes' && <PrizesTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'drawings' && <DrawingsTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  );
}

const panel: React.CSSProperties = { background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 16 };
const h2: React.CSSProperties = { fontWeight: 800, fontSize: 17, marginBottom: 10 };
const small: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--muted)' };

function lastDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(today(d)); }
  return out;
}

function ProgressTab() {
  const p = useProgress();
  const nav = useNav();
  const week = lastDays(7);
  const wk = week.map((d) => p.days[d] ?? { answered: 0, correct: 0, seconds: 0 });
  const mins = Math.round(wk.reduce((s, d) => s + d.seconds, 0) / 60);
  const answered = wk.reduce((s, d) => s + d.answered, 0);
  const correct = wk.reduce((s, d) => s + d.correct, 0);
  const auto = automaticCount(p.deck);
  const maxProbe = Math.max(10, ...p.probes.map((x) => x.perMinute));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[
          ['This week', `${mins} min`],
          ['Puzzles', `${answered}`],
          ['First-try accuracy', answered ? `${Math.round((correct / answered) * 100)}%` : '—'],
          ['Streak', `${p.streak.count} days (best ${p.streak.best})`],
        ].map(([a, b]) => <div key={a} style={panel}><div style={small}>{a}</div><div className="display" style={{ fontSize: 28 }}>{b}</div></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 12 }}>
        {WORLDS.map((w) => (
          <div key={w.id} style={panel}>
            <div style={{ ...h2, color: w.color }}>{w.name} <span style={small}>· {w.area}</span></div>
            {w.types.map((t) => {
              const s = p.types[t];
              const acc = s && s.recent.length ? Math.round((s.recent.filter(Boolean).length / s.recent.length) * 100) : null;
              return (
                <div key={t} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                    <span>{MOD[t].testName}</span>
                    <span>Lv {s?.level ?? 1}/6 · {acc === null ? 'not started' : `${acc}%`} · {s?.attempts ?? 0} done</span>
                  </div>
                  <Bar value={acc ?? 0} max={100} color={acc === null ? '#DDE3F0' : acc >= 80 ? 'var(--green)' : acc >= 60 ? 'var(--purple)' : 'var(--flame)'} height={8} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={panel}>
        <div style={h2}>Speed math</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Facts within 20 known by heart (answered right in 3 seconds or less, twice in a row): {auto.automatic} of {auto.total}</div>
        <Bar value={auto.automatic} max={auto.total} color="var(--flame)" />
        <div style={{ ...h2, marginTop: 16 }}>2-minute speed check (correct answers per minute)</div>
        {p.probes.length === 0 ? <div style={small}>No speed check yet. It runs on day 1, then every 4 weeks.</div> : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 140 }}>
            {p.probes.map((r, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 56px' }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{r.perMinute}</div>
                <div style={{ width: 36, height: (r.perMinute / maxProbe) * 100, background: i === 0 ? '#A3ABC6' : 'var(--flame)', borderRadius: '6px 6px 0 0' }} />
                <div style={small}>{r.date.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
        {p.probes.length > 1 && <div style={{ ...small, marginTop: 6 }}>Baseline {p.probes[0].perMinute}/min → latest {p.probes[p.probes.length - 1].perMinute}/min.</div>}
        <button className="btn btn-white" style={{ marginTop: 10, fontSize: 16, minHeight: 44 }} onClick={() => nav.go({ name: 'speedcheck' })}>Run a speed check now</button>
      </div>
    </div>
  );
}

function HelpTab() {
  const p = useProgress();
  const d = today();
  const sessions = [...p.sessions].reverse().slice(0, 15);
  const recent = p.sessions.slice(-10);
  const q = recent.reduce((s, x) => s + x.answered, 0);
  const helps = recent.reduce((s, x) => s + x.hints + x.tricks + x.solutions, 0);
  const adultWeek = lastDays(7).reduce((s, x) => s + (p.adultHelp[x] ?? 0), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={panel}>
        <div style={h2}>Did she need a grown-up today?</div>
        <div style={{ ...small, marginBottom: 10 }}>The goal is zero. Tap each time you had to step in, so you can see the trend.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="display" style={{ fontSize: 40 }}>{p.adultHelp[d] ?? 0}</div>
          <button className="btn btn-white" style={{ minHeight: 44, fontSize: 16 }} onClick={() => setState((x) => ({ ...x, adultHelp: { ...x.adultHelp, [d]: (x.adultHelp[d] ?? 0) + 1 } }))}>+ I helped</button>
          <button className="btn btn-white" style={{ minHeight: 44, fontSize: 16 }} onClick={() => setState((x) => ({ ...x, adultHelp: { ...x.adultHelp, [d]: Math.max(0, (x.adultHelp[d] ?? 0) - 1) } }))}>Undo</button>
          <div style={small}>Last 7 days: {adultWeek}</div>
        </div>
      </div>
      <div style={panel}>
        <div style={h2}>In-app help per session</div>
        <div style={{ ...small, marginBottom: 8 }}>Hints, tricks and solutions are healthy. Watch for a trend down over weeks. Last 10 sessions: {q ? (helps / q).toFixed(2) : '—'} helps per puzzle.</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}>{['When', 'Type', 'Puzzles', 'Right 1st', 'Hints', 'Tricks', 'Solutions', 'Replays', 'Minutes'].map((h) => <th key={h} style={{ padding: '6px 8px' }}>{h}</th>)}</tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 8px' }}>{new Date(s.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {new Date(s.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</td>
                  <td style={{ padding: '6px 8px' }}>{s.mode}</td>
                  <td style={{ padding: '6px 8px' }}>{s.answered}</td>
                  <td style={{ padding: '6px 8px' }}>{s.correct}</td>
                  <td style={{ padding: '6px 8px' }}>{s.hints}</td>
                  <td style={{ padding: '6px 8px' }}>{s.tricks}</td>
                  <td style={{ padding: '6px 8px' }}>{s.solutions}</td>
                  <td style={{ padding: '6px 8px' }}>{s.replays}</td>
                  <td style={{ padding: '6px 8px' }}>{Math.round(s.seconds / 60)}</td>
                </tr>
              ))}
              {!sessions.length && <tr><td colSpan={9} style={{ padding: 8, color: 'var(--muted)' }}>No sessions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const GOALS: { kind: PerkGoal['kind']; label: string }[] = [
  { kind: 'streak', label: 'Days in a row' }, { kind: 'quests', label: 'Daily quests' }, { kind: 'stars', label: 'Stars' },
  { kind: 'correct', label: 'Puzzles solved' }, { kind: 'speedy', label: 'Tricks at Speedy' }, { kind: 'automatic', label: 'Facts by heart' },
];

function PrizesTab() {
  const p = useProgress();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [cost, setCost] = useState('');
  const [kind, setKind] = useState<PerkGoal['kind']>('streak');
  const [target, setTarget] = useState('7');
  const claimed = p.perks.filter((x) => x.status === 'claimed');
  const input: React.CSSProperties = { fontSize: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', fontFamily: 'var(--body)', fontWeight: 700, userSelect: 'text', WebkitUserSelect: 'text' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={panel}>
        <div style={h2}>Waiting for your OK</div>
        {!claimed.length && <div style={small}>Nothing claimed right now.</div>}
        {claimed.map((x) => (
          <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
            <span className="emoji" style={{ fontSize: 30 }}>{x.emoji}</span>
            <div style={{ flex: 1, fontWeight: 800 }}>{x.title} <span style={small}>· {goalWords(x.goal)} · claimed {x.claimedAt}</span></div>
            <button className="btn btn-white" style={{ minHeight: 40, fontSize: 15 }} onClick={() => updatePerk(x.id, (y) => ({ ...y, status: 'active' }))}>Not yet</button>
            <button className="btn btn-green" style={{ minHeight: 40, fontSize: 15 }} onClick={() => updatePerk(x.id, (y) => ({ ...y, status: 'approved' }))}>Approve</button>
          </div>
        ))}
      </div>
      <div style={panel}>
        <div style={h2}>Prize list (keep each under about $10)</div>
        {p.perks.map((x) => {
          const pr = perkProgress(p, x);
          return (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <span className="emoji" style={{ fontSize: 26 }}>{x.emoji}</span>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontWeight: 800 }}>{x.title} <span style={small}>{x.cost}</span></div>
                <div style={small}>{goalWords(x.goal)} · {pr.have}/{pr.need} · {x.status}</div>
              </div>
              {x.status === 'approved' && <button className="btn btn-white" style={{ minHeight: 38, fontSize: 14 }} onClick={() => restartPerk(x.id)}>Earn again</button>}
              <ConfirmButton label="Remove" onConfirm={() => removePerk(x.id)} />
            </div>
          );
        })}
      </div>
      <div style={panel}>
        <div style={h2}>Add a prize</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input style={{ ...input, width: 64, textAlign: 'center' }} value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" />
          <input style={{ ...input, flex: '1 1 200px' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Prize, e.g. Trip to the park" aria-label="Prize name" />
          <input style={{ ...input, width: 90 }} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="~$5" aria-label="Cost" />
          <select style={input} value={kind} onChange={(e) => setKind(e.target.value as PerkGoal['kind'])} aria-label="Goal type">
            {GOALS.map((g) => <option key={g.kind} value={g.kind}>{g.label}</option>)}
          </select>
          <input style={{ ...input, width: 80 }} value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-label="Goal amount" />
          <button className="btn btn-primary" style={{ minHeight: 44, fontSize: 16 }} disabled={!title || !target} onClick={() => {
            addPerk({ title, emoji: emoji || '🎁', cost, goal: { kind, target: parseInt(target, 10) } as PerkGoal });
            setTitle(''); setCost('');
          }}>Add</button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const p = useProgress();
  const set = (patch: Partial<typeof p.settings>) => setState((x) => ({ ...x, settings: { ...x.settings, ...patch } }));
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--line)', flexWrap: 'wrap' };
  return (
    <div style={panel}>
      <div style={row}>
        <span style={{ fontWeight: 800 }}>Child's name</span>
        <input value={p.name} onChange={(e) => setState((x) => ({ ...x, name: e.target.value }))} style={{ fontSize: 16, padding: 8, borderRadius: 10, border: '1px solid var(--line)', userSelect: 'text', WebkitUserSelect: 'text' }} />
      </div>
      <div style={row}>
        <span style={{ fontWeight: 800 }}>Read everything aloud</span>
        <input type="checkbox" checked={p.settings.voice} onChange={(e) => set({ voice: e.target.checked })} style={{ width: 26, height: 26 }} />
      </div>
      <div style={row}>
        <span style={{ fontWeight: 800 }}>Pip's voice</span>
        <div style={{ display: 'flex', gap: 6 }}>{([['natural', 'Natural (recorded)'], ['device', 'iPad voice']] as const).map(([v, l]) => <button key={v} className="btn" onClick={() => { set({ voiceStyle: v }); setTimeout(() => say(LINES.voiceTest), 100); }} style={{ minHeight: 40, fontSize: 15, background: p.settings.voiceStyle === v ? 'var(--ink)' : '#fff', color: p.settings.voiceStyle === v ? '#fff' : 'var(--ink)', border: '1px solid var(--line)' }}>{l}</button>)}</div>
      </div>
      <div style={row}>
        <span style={{ fontWeight: 800 }}>Voice speed ({p.settings.rate.toFixed(2)})</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="range" min={0.7} max={1.15} step={0.05} value={p.settings.rate} onChange={(e) => set({ rate: parseFloat(e.target.value) })} />
          <button className="btn btn-white" style={{ minHeight: 40, fontSize: 15 }} onClick={() => say(LINES.voiceTest)}>Test</button>
        </div>
      </div>
      <div style={row}>
        <span style={{ fontWeight: 800 }}>Sound effects</span>
        <input type="checkbox" checked={p.settings.sound} onChange={(e) => set({ sound: e.target.checked })} style={{ width: 26, height: 26 }} />
      </div>
      <div style={row}>
        <span style={{ fontWeight: 800 }}>Daily quest length</span>
        <div style={{ display: 'flex', gap: 6 }}>{[6, 10, 15].map((n) => <button key={n} className="btn" onClick={() => set({ questSize: n })} style={{ minHeight: 40, fontSize: 15, background: p.settings.questSize === n ? 'var(--ink)' : '#fff', color: p.settings.questSize === n ? '#fff' : 'var(--ink)', border: '1px solid var(--line)' }}>{n} puzzles</button>)}</div>
      </div>
      <div style={{ ...small, marginTop: 10 }}>
        Tip: on the iPad, open this page in Safari, tap Share, then "Add to Home Screen". It then opens full screen like an app, works offline, and keeps progress saved. Pip's natural voice is recorded ahead of time and downloads in the background on first launch (about 10 MB), then works offline.
      </div>
    </div>
  );
}

function DrawingsTab() {
  const p = useProgress();
  if (!p.drawings.length) return <div style={panel}><div style={small}>No drawings yet. They appear here after Idea Studio sessions.</div></div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {[...p.drawings].reverse().map((d) => (
        <div key={d.id} style={panel}>
          <img src={d.data} alt={d.prompt} style={{ width: '100%', borderRadius: 10, background: '#fff' }} />
          <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6 }}>{d.prompt}</div>
          <div style={small}>{d.date}</div>
        </div>
      ))}
    </div>
  );
}

function BackupTab() {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const exportIt = () => {
    const blob = new Blob([JSON.stringify(getState())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `progress-${today()}.json`;
    a.click();
    setMsg('Saved a backup file.');
  };
  const importIt = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        if (data.v !== 1) throw new Error('bad');
        replaceState(data);
        setMsg('Progress restored.');
      } catch {
        setMsg('That file did not look like a backup.');
      }
    };
    r.readAsText(f);
  };
  return (
    <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={small}>Progress lives on this iPad. Save a backup now and then (it goes to Files), or to move to a new device.</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" style={{ minHeight: 48, fontSize: 17 }} onClick={exportIt}>Save backup</button>
        <button className="btn btn-white" style={{ minHeight: 48, fontSize: 17 }} onClick={() => file.current?.click()}>Restore from backup</button>
        <input ref={file} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && importIt(e.target.files[0])} />
        <ConfirmButton label="Reset everything" confirmLabel="Tap again: erase ALL progress" big onConfirm={() => { replaceState(fresh()); setMsg('Everything was reset.'); }} />
      </div>
      {msg && <div style={{ fontWeight: 800 }}>{msg}</div>}
    </div>
  );
}

/** Two-tap confirm (no pop-up dialogs, which some browsers block). */
function ConfirmButton({ label, confirmLabel = 'Tap again to confirm', onConfirm, big }: { label: string; confirmLabel?: string; onConfirm: () => void; big?: boolean }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      className="btn btn-white"
      style={{ minHeight: big ? 48 : 38, fontSize: big ? 17 : 14, color: armed ? '#fff' : 'var(--orange)', background: armed ? 'var(--orange)' : '#fff' }}
      onClick={() => { if (armed) { setArmed(false); onConfirm(); } else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
