import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Arrow, Frame, Pic, QuestionBox, Tag } from '../../ui/kit';
import { ITEMS } from './bank';

export interface Pair { a: string; aw: string; b: string; bw: string; stem: string; end: string }
export interface Relation {
  id: string; tag: string; level: number; pairs: Pair[];
  /** Random distractors with these bank tags or emoji could ALSO be right, so never use them. */
  avoidTags?: string[]; avoidEmoji?: string[];
}

/** [a emoji, a word, b emoji, b word, sentence stem, sentence end] */
type Row = [string, string, string, string, string, string];
const R = (id: string, tag: string, level: number, rows: Row[], avoidTags: string[] = [], avoidEmoji: string[] = []): Relation => ({
  id, tag, level, pairs: rows.map(([a, aw, b, bw, stem, end]) => ({ a, aw, b, bw, stem, end })), avoidTags, avoidEmoji,
});

export const RELATIONS: Relation[] = [
  R('eats', 'eats', 1, [
    ['🐰', 'rabbit', '🥕', 'carrot', 'A rabbit eats', 'carrots'],
    ['🐒', 'monkey', '🍌', 'banana', 'A monkey eats', 'bananas'],
    ['🐶', 'dog', '🦴', 'bone', 'A dog chews on', 'a bone'],
    ['🐭', 'mouse', '🧀', 'cheese', 'A mouse eats', 'cheese'],
    ['🐄', 'cow', '🌾', 'hay', 'A cow eats', 'hay'],
    ['🐿️', 'squirrel', '🥜', 'nuts', 'A squirrel eats', 'nuts'],
  ], ['food', 'fruit', 'veg', 'sweet'], ['🌸', '🌳']),
  R('usedwith', 'goes with', 1, [
    ['🔑', 'key', '🔒', 'lock', 'A key opens', 'a lock'],
    ['⚽', 'soccer ball', '🥅', 'goal', 'You kick a soccer ball into', 'a goal'],
    ['🎣', 'fishing rod', '🐟', 'fish', 'A fishing rod catches', 'a fish'],
    ['🪥', 'toothbrush', '🦷', 'tooth', 'A toothbrush cleans', 'your teeth'],
    ['🖌️', 'paintbrush', '🎨', 'paint', 'A paintbrush goes in', 'the paint'],
    ['✉️', 'letter', '📮', 'mailbox', 'A letter goes in', 'a mailbox'],
    ['🪡', 'needle', '🧵', 'thread', 'A needle uses', 'thread'],
  ]),
  R('makes', 'makes', 2, [
    ['🐝', 'bee', '🍯', 'honey', 'A bee makes', 'honey'],
    ['🐔', 'chicken', '🥚', 'egg', 'A chicken lays', 'eggs'],
    ['🕷️', 'spider', '🕸️', 'web', 'A spider makes', 'a web'],
    ['🐑', 'sheep', '🧶', 'wool', 'A sheep gives us', 'wool'],
    ['🐄', 'cow', '🥛', 'milk', 'A cow gives us', 'milk'],
  ], ['food', 'sweet'], []),
  R('travels', 'moves on', 2, [
    ['🚂', 'train', '🛤️', 'tracks', 'A train rides on', 'tracks'],
    ['🚗', 'car', '🛣️', 'road', 'A car drives on', 'a road'],
    ['⛵', 'sailboat', '🌊', 'water', 'A sailboat floats on', 'water'],
    ['✈️', 'airplane', '☁️', 'sky', 'An airplane flies in', 'the sky'],
  ], [], ['🌧️', '⚡', '🌈']),
  R('wornon', 'goes on your', 3, [
    ['🧤', 'glove', '✋', 'hand', 'A glove goes on', 'your hand'],
    ['🧦', 'sock', '🦶', 'foot', 'A sock goes on', 'your foot'],
    ['👓', 'glasses', '👀', 'eyes', 'Glasses go over', 'your eyes'],
    ['👟', 'sneaker', '🦶', 'foot', 'A sneaker goes on', 'your foot'],
  ]),
  R('livesin', 'lives in', 3, [
    ['🐧', 'penguin', '🧊', 'ice', 'A penguin lives on', 'the ice'],
    ['🐫', 'camel', '🏜️', 'desert', 'A camel lives in', 'the desert'],
    ['🐠', 'fish', '🌊', 'ocean', 'A fish lives in', 'the ocean'],
    ['🐒', 'monkey', '🌴', 'palm tree', 'A monkey lives in', 'the trees'],
  ], [], ['🌳', '🌴', '🏠', '❄️', '⛄']),
  R('weather', 'you need', 3, [
    ['🌧️', 'rain', '☂️', 'umbrella', 'When it rains, you need', 'an umbrella'],
    ['☀️', 'sun', '🕶️', 'sunglasses', 'When it is sunny, you need', 'sunglasses'],
    ['❄️', 'snow', '🧣', 'scarf', 'When it snows, you need', 'a scarf'],
    ['💨', 'wind', '🪁', 'kite', 'When it is windy, you can fly', 'a kite'],
  ], ['clothing'], ['☕', '🔥']),
  R('becomes', 'turns into', 4, [
    ['🥚', 'egg', '🐣', 'chick', 'An egg turns into', 'a chick'],
    ['🐛', 'caterpillar', '🦋', 'butterfly', 'A caterpillar turns into', 'a butterfly'],
    ['🌱', 'sprout', '🌳', 'tree', 'A sprout grows into', 'a tree'],
    ['🧊', 'ice', '💧', 'water', 'Ice melts into', 'water'],
  ], [], ['🌸', '🌳', '🐦']),
  R('opposite', 'is the opposite of', 5, [
    ['☀️', 'sun', '🌙', 'moon', 'Day and night: the sun goes with', 'the moon'],
    ['🔥', 'fire', '🧊', 'ice', 'Hot and cold: fire goes with', 'ice'],
    ['🐘', 'elephant', '🐭', 'mouse', 'Big and small: an elephant goes with', 'a mouse'],
    ['⬆️', 'up', '⬇️', 'down', 'Up is the opposite of', 'down'],
    ['😀', 'happy', '😢', 'sad', 'Happy is the opposite of', 'sad'],
  ]),
  R('partof', 'is part of', 5, [
    ['🚪', 'door', '🏠', 'house', 'A door is part of', 'a house'],
    ['⌨️', 'keyboard', '💻', 'computer', 'A keyboard is part of', 'a computer'],
    ['🪶', 'feather', '🐦', 'bird', 'A feather is part of', 'a bird'],
    ['🍃', 'leaf', '🌳', 'tree', 'A leaf is part of', 'a tree'],
  ], [], ['🪑', '🛏️', '💡', '🌸']),
];

export interface PicAnalogyQ extends BaseQ {
  rel: Relation;
  top: Pair;
  bottom: Pair;
}

export interface Opt { e: string; w: string }

/** Everything that correctly completes "C -> ?" for this relation. */
export const validFor = (rel: Relation, a: string) => rel.pairs.filter((p) => p.a === a).map((p) => p.b);

function generate(level: number, rng: Rng): PicAnalogyQ {
  const rels = RELATIONS.filter((r) => r.level <= level && r.level >= level - 3);
  for (let tries = 0; tries < 200; tries++) {
    const rel = rng.pick(rels);
    const [top, bottom] = rng.shuffle(rel.pairs).slice(0, 2);
    if (!top || !bottom || top.a === bottom.a || top.b === bottom.b || top.b === bottom.a || top.a === bottom.b) continue;
    const valid = new Set(validFor(rel, bottom.a));
    const all = RELATIONS.flatMap((r) => r.pairs);
    // Traps: things the bottom picture goes with in a DIFFERENT way, other answers of this relation, the top answer.
    const otherWay = all.filter((p) => p.a === bottom.a && !valid.has(p.b)).map((p) => ({ e: p.b, w: p.bw }));
    const sameRel = rel.pairs.filter((p) => !valid.has(p.b) && p.b !== top.b).map((p) => ({ e: p.b, w: p.bw }));
    const topAns = { e: top.b, w: top.bw };
    const randoms = ITEMS.filter(
      (i) => !valid.has(i.e) && !rel.avoidTags?.some((t) => i.tags.includes(t)) && !rel.avoidEmoji?.includes(i.e),
    ).map((i) => ({ e: i.e, w: i.w }));
    const pool: Opt[] = [
      ...otherWay,
      ...(level >= 2 ? [topAns] : []),
      ...rng.shuffle(sameRel).slice(0, level >= 4 ? 3 : 1),
      ...rng.shuffle(randoms),
    ].filter((o) => !valid.has(o.e) && o.e !== bottom.a);
    const count = level <= 2 ? 4 : 5;
    const { choices, correct } = buildChoices(rng, { e: bottom.b, w: bottom.bw }, pool, count, (o) => o.e);
    if (choices.length < count) continue;
    return {
      id: uid('pa'),
      type: 'picanalogy',
      level,
      say: `The ${top.aw} goes with the ${top.bw}. What goes with the ${bottom.aw}, in the same way?`,
      answer: { kind: 'choice', choices, correct },
      hint: 'Make a sentence about the top two pictures. Then try the same sentence with the bottom picture.',
      trick: 'picanalogy',
      rel,
      top,
      bottom,
    };
  }
  throw new Error('picanalogy: could not generate');
}

const S = 'clamp(92px, 16vh, 140px)';

function Grid({ q, fourth, glowTop, glowBottom, showTag }: { q: PicAnalogyQ; fourth: React.ReactNode; glowTop?: boolean; glowBottom?: boolean; showTag?: boolean }) {
  const arrow = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 70 }}>
      {showTag !== undefined && <Tag show={showTag} color="#0F5A37" bg="var(--green-soft)" style={{ fontSize: 14, padding: '2px 8px', whiteSpace: 'normal', textAlign: 'center' }}>{q.rel.tag}</Tag>}
      <Arrow />
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${S} 70px ${S}`, gridTemplateRows: `${S} ${S}`, gap: 14, alignItems: 'center', justifyItems: 'center' }}>
      <Frame w={S} h={S} highlight={glowTop ? 'var(--green)' : undefined}><Pic e={q.top.a} label={q.top.aw} size={66} /></Frame>
      {arrow}
      <Frame w={S} h={S} highlight={glowTop ? 'var(--green)' : undefined}><Pic e={q.top.b} label={q.top.bw} size={66} /></Frame>
      <Frame w={S} h={S} highlight={glowBottom ? 'var(--sun)' : undefined}><Pic e={q.bottom.a} label={q.bottom.aw} size={66} /></Frame>
      {arrow}
      {fourth}
    </div>
  );
}

function Stimulus({ q }: { q: PicAnalogyQ }) {
  return <Grid q={q} fourth={<QuestionBox w={S} h={S} />} />;
}

function Choice({ data }: { q: PicAnalogyQ; data: unknown; index: number }) {
  const o = data as Opt;
  return <Pic e={o.e} label={o.w} size={56} />;
}

function wrongFeedback(q: PicAnalogyQ, given: number): string | undefined {
  if (q.answer.kind !== 'choice') return;
  const o = q.answer.choices[given] as Opt;
  if (o.e === q.top.b) return 'That picture is already on top. Find the one that goes with the bottom picture.';
  const other = RELATIONS.flatMap((r) => r.pairs.map((p) => ({ p, r }))).find(({ p }) => p.a === q.bottom.a && p.b === o.e);
  if (other) return `True, ${other.p.stem.toLowerCase()} ${other.p.end}! But is that the same way as the top pair?`;
  return `Say the top pair as a sentence: ${q.top.stem} ${q.top.end}. Now try it with the ${q.bottom.aw}.`;
}

function solution(q: PicAnalogyQ) {
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  return [
    { say: `Make a sentence about the top pair. ${q.top.stem} ${q.top.end}.` },
    { say: `Now use the same sentence for the ${q.bottom.aw}. ${q.bottom.stem}...` },
    { say: `${q.bottom.end}! ${q.bottom.stem} ${q.bottom.end}. The answer is ${letter}.` },
    { say: 'Trick: say the top pair as a sentence. Then use the same sentence for the new picture.' },
  ];
}

function Solution({ q, step }: { q: PicAnalogyQ; step: number }) {
  const reveal = step >= 2;
  const fourth = reveal ? (
    <Frame w={S} h={S} highlight="var(--green)" style={{ animation: 'pop 420ms ease' }}><Pic e={q.bottom.b} label={q.bottom.bw} size={66} /></Frame>
  ) : (
    <QuestionBox w={S} h={S} />
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div className="display" style={{ fontSize: 26, minHeight: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
        {step === 0 && `${q.top.stem} ${q.top.end}.`}
        {step === 1 && `${q.bottom.stem} ...`}
        {step >= 2 && `${q.bottom.stem} ${q.bottom.end}.`}
      </div>
      <Grid q={q} fourth={fourth} glowTop={step === 0} glowBottom={step === 1} showTag={step >= 0} />
    </div>
  );
}

export const picanalogy: TypeModule<PicAnalogyQ> = {
  type: 'picanalogy',
  world: 'pictures',
  name: 'Picture pairs',
  testName: 'Picture Analogies',
  intro: 'Picture pairs! The top two pictures go together. Find a partner for the bottom picture.',
  maxLevel: 6,
  tricks: [
    {
      id: 'picanalogy',
      type: 'picanalogy',
      title: 'Say it in a sentence',
      rule: 'Say the top pair as a sentence. Use the same sentence for the new picture.',
      intro: 'Here is the picture pairs trick. Turn the pictures into a sentence.',
    },
  ],
  targetSeconds: 10,
  generate,
  Stimulus,
  Choice,
  wrongFeedback,
  solution,
  Solution,
};
