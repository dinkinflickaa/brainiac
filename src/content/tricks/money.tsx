import type { BaseQ, TypeModule } from '../../engine/types';
import { uid, type Rng } from '../../engine/rng';
import { Tag, useTicker } from '../../ui/kit';
import { NumberLine } from '../speed/visuals';

export type CoinKind = 25 | 10 | 5 | 1;
export type MForm = { k: 'total'; coins: CoinKind[] } | { k: 'change'; have: number; cost: number; item: string };
export interface MoneyQ extends BaseQ { form: MForm; value: number }

const COIN: Record<CoinKind, { name: string; size: number; fill: string; edge: string }> = {
  25: { name: 'quarter', size: 74, fill: '#D8DCE3', edge: '#9AA1AE' },
  10: { name: 'dime', size: 52, fill: '#D8DCE3', edge: '#9AA1AE' },
  5: { name: 'nickel', size: 64, fill: '#C9CDD4', edge: '#8E95A2' },
  1: { name: 'penny', size: 56, fill: '#D48B52', edge: '#9C5A2A' },
};
const ITEMS = ['🍎', '✏️', '🍪', '🎈', '🧃', '🍭'];

export function Coin({ v, lit = true, glow = false }: { v: CoinKind; lit?: boolean; glow?: boolean }) {
  const c = COIN[v];
  return (
    <div role="img" aria-label={`${c.name}, ${v} cents`} style={{
      width: c.size, height: c.size, borderRadius: '50%', background: c.fill, border: `4px solid ${c.edge}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: lit ? 1 : 0.4,
      boxShadow: glow ? '0 0 0 6px #FFC233' : 'inset 0 -4px 0 rgba(0,0,0,0.12)', transition: 'box-shadow 300ms, opacity 300ms',
      fontFamily: 'var(--display)', fontWeight: 800, color: '#1D2445',
    }}>
      <span style={{ fontSize: c.size * 0.36, lineHeight: 1 }}>{v}¢</span>
    </div>
  );
}

export const valueOf = (f: MForm) => (f.k === 'total' ? f.coins.reduce((s, c) => s + c, 0) : f.have - f.cost);

function make(level: number, rng: Rng): MForm {
  if (level >= 5 && rng.chance(0.5)) {
    const have = rng.pick([25, 50, 75, 100]);
    const cost = rng.int(5, have - 3);
    return { k: 'change', have, cost, item: rng.pick(ITEMS) };
  }
  const kinds: CoinKind[] = level <= 1 ? [5, 1] : level === 2 ? [10, 5, 1] : [25, 10, 5, 1];
  const n = rng.int(3, level <= 2 ? 5 : 7);
  let coins: CoinKind[] = Array.from({ length: n }, () => rng.pick(kinds));
  if (level >= 3 && !coins.includes(25)) coins[0] = 25;
  while (coins.reduce((s, c) => s + c, 0) > 99) coins = coins.slice(1);
  return { k: 'total', coins: rng.shuffle(coins) };
}

function generate(level: number, rng: Rng): MoneyQ {
  const form = make(level, rng);
  const value = valueOf(form);
  const say = form.k === 'total' ? 'How much money is this? Count the coins.' : `You have ${form.have} cents. You buy something for ${form.cost} cents. How many cents are left?`;
  return {
    id: uid('mo'), type: 'money', level, say,
    text: form.k === 'change' ? `${form.have}¢ − ${form.cost}¢` : undefined,
    answer: { kind: 'number', correct: value, maxDigits: 3 },
    hint: form.k === 'total' ? 'Start with the biggest coins. Then count on the smaller ones.' : `Count up from ${form.cost} to ${form.have}.`,
    trick: 'money', form, value,
  };
}

const sorted = (coins: CoinKind[]) => [...coins].sort((a, b) => b - a);

function Stimulus({ q }: { q: MoneyQ }) {
  const f = q.form;
  if (f.k === 'change') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, background: '#fff', borderRadius: 24, padding: '18px 30px' }}>
        <div className="display" style={{ fontSize: 44 }}>You have {f.have}¢</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="emoji" style={{ fontSize: 60 }}>{f.item}</span>
          <Tag show>{f.cost}¢</Tag>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', background: '#fff', borderRadius: 24, padding: 22, maxWidth: 760 }}>
      {f.coins.map((c, i) => <Coin key={i} v={c} />)}
    </div>
  );
}

function wrongFeedback(q: MoneyQ, given: number): string | undefined {
  const f = q.form;
  if (f.k === 'total' && given === f.coins.length) return 'That is how many coins there are. Each coin is worth a different amount!';
  if (f.k === 'change' && given === f.have + f.cost) return 'You spent money, so you have less. Take away!';
  return undefined;
}

function solution(q: MoneyQ) {
  const f = q.form;
  if (f.k === 'change') return [
    { say: `You had ${f.have} cents and spent ${f.cost}.` },
    { say: `Count up from ${f.cost} to ${f.have}. That's ${q.value} cents left.` },
    { say: 'Trick: to find what is left, count up from the price to what you had.' },
  ];
  const s = sorted(f.coins);
  let run = 0;
  const counts = s.map((c) => (run += c));
  return [
    { say: 'Line up the coins from biggest to smallest.' },
    { say: `Count on: ${counts.join(', ')}.` },
    { say: `That's ${q.value} cents.` },
    { say: 'Trick: start with the biggest coins, then count on.' },
  ];
}

function Solution({ q, step }: { q: MoneyQ; step: number }) {
  const f = q.form;
  const s = f.k === 'total' ? sorted(f.coins) : [];
  const k = useTicker(s.length, 750, step === 1, 300);
  if (f.k === 'change') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Stimulus q={q} />
        <div style={{ background: '#fff', borderRadius: 24, padding: 16, width: 'min(680px, 90vw)' }}>
          <NumberLine key={step} from={f.cost} hops={[{ by: q.value, label: `+${q.value}¢`, color: '#177A4C' }]} played={step === 0 ? 0 : undefined} auto={step === 1} width={640} />
        </div>
        <Tag show={step >= 1} color="#0F5A37" bg="var(--green-soft)">{f.cost}¢ + {q.value}¢ = {f.have}¢</Tag>
      </div>
    );
  }
  const lit = step >= 2 ? s.length : step === 1 ? k : 0;
  let run = 0;
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end', background: '#fff', borderRadius: 24, padding: 22, maxWidth: 820 }}>
      {s.map((c, i) => {
        run += c;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Coin v={c} glow={i === lit - 1} lit={step === 0 || i < lit} />
            <Tag show={i < lit} style={{ fontSize: 16, padding: '2px 8px' }}>{run}¢</Tag>
          </div>
        );
      })}
    </div>
  );
}

export const money: TypeModule<MoneyQ> = {
  type: 'money', world: 'tricks', name: 'Money', testName: 'Money (achievement)',
  intro: 'Money! Count coins like a shopkeeper.', maxLevel: 6,
  tricks: [{ id: 'money', type: 'money', title: 'Biggest coins first', rule: 'Start with the biggest coins, then count on the smaller ones.', intro: 'Here is how shopkeepers count coins fast.' }],
  targetSeconds: 15, generate, Stimulus, wrongFeedback, solution, Solution,
};
