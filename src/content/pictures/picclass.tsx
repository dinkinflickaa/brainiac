import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Frame, Mark, Pic, Tag, useTicker } from '../../ui/kit';
import { CATEGORIES, ITEMS, has, type Category, type Item } from './bank';

export interface PicClassQ extends BaseQ {
  cat: Category;
  examples: Item[];
}

export const belongs = (it: Item, cat: Category) => it.tags.includes(cat.tag);
const usable = (it: Item, cat: Category) => !cat.avoid || !it.tags.includes(cat.avoid);

/** Tags every example shares (a child could notice any of them). */
export function commonTags(examples: Item[]): string[] {
  return examples[0].tags.filter((t) => !t.startsWith('no') && examples.every((e) => e.tags.includes(t)));
}

function generate(level: number, rng: Rng): PicClassQ {
  const cats = CATEGORIES.filter((c) => c.level <= level && c.level >= Math.max(1, level - 3));
  for (let tries = 0; tries < 100; tries++) {
    const cat = rng.pick(cats);
    const members = rng.shuffle(ITEMS.filter((i) => belongs(i, cat) && usable(i, cat)));
    const examples = members.slice(0, 3);
    const common = commonTags(examples);
    // The answer must share everything the examples share, so there is only one fair rule.
    const answer = members.slice(3).find((m) => common.every((t) => m.tags.includes(t)));
    if (!answer) continue;
    const outsiders = ITEMS.filter((i) => usable(i, cat) && !common.some((t) => i.tags.includes(t)));
    const near = cat.near && level >= 3 ? outsiders.filter((i) => i.tags.includes(cat.near!)) : [];
    const far = outsiders.filter((i) => !near.includes(i));
    const pool = [...rng.shuffle(near).slice(0, level >= 5 ? 4 : 2), ...rng.shuffle(far)];
    const count = level <= 2 ? 4 : 5;
    const { choices, correct } = buildChoices(rng, answer, pool, count, (i) => i.e);
    if (choices.length < count) continue;
    const named = level <= 3 ? `: ${examples.map((e) => e.w).join(', ')}` : '';
    return {
      id: uid('pc'),
      type: 'picclass',
      level,
      say: `These three pictures go together${named}. Which picture below goes with them?`,
      answer: { kind: 'choice', choices, correct },
      hint: 'How are the three pictures the same? Say it out loud. Then find the one that is the same way.',
      trick: 'picclass',
      cat,
      examples,
    };
  }
  throw new Error('picclass: could not generate');
}

const S = 'clamp(90px, 15vh, 130px)';

function Examples({ q, glow }: { q: PicClassQ; glow?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 24, background: glow ? 'var(--green-soft)' : 'transparent', transition: 'background 400ms' }}>
      {q.examples.map((it, i) => (
        <Frame key={i} w={S} h={S} highlight={glow ? 'var(--green)' : undefined}>
          <Pic e={it.e} label={it.w} size={64} />
        </Frame>
      ))}
    </div>
  );
}

function Stimulus({ q }: { q: PicClassQ }) {
  return <Examples q={q} />;
}

function Choice({ data }: { q: PicClassQ; data: unknown; index: number }) {
  const it = data as Item;
  return <Pic e={it.e} label={it.w} size={56} />;
}

function wrongFeedback(q: PicClassQ, given: number): string | undefined {
  if (q.answer.kind !== 'choice') return;
  const it = q.answer.choices[given] as Item;
  return `A ${it.w}? Hmm. Are the three pictures ${q.cat.label}? Is a ${it.w}?`;
}

function solution(q: PicClassQ) {
  const ans = q.answer.kind === 'choice' ? (q.answer.choices[q.answer.correct] as Item) : q.examples[0];
  return [
    { say: `Look at the three pictures: ${q.examples.map((e) => e.w).join(', ')}. How are they the same?` },
    { say: `They are all ${q.cat.label}.` },
    { say: 'Now check each picture below. Is it one of those too?' },
    { say: `The ${ans.w}! It is also one of the ${q.cat.label}.` },
    { say: 'Trick: say what all three have in common. Then pick the one that fits too.' },
  ];
}

function Solution({ q, step }: { q: PicClassQ; step: number }) {
  const choices = q.answer.kind === 'choice' ? (q.answer.choices as Item[]) : [];
  const ticks = useTicker(choices.length, 700, step === 2);
  const shown = step >= 3 ? choices.length : step === 2 ? ticks : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ minHeight: 38 }}><Tag show={step >= 1} color="#0F5A37" bg="var(--green-soft)">all {q.cat.short}</Tag></div>
      <Examples q={q} glow={step <= 1} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', opacity: step >= 2 ? 1 : 0.35, transition: 'opacity 400ms' }}>
        {choices.map((it, i) => {
          const isAns = q.answer.kind === 'choice' && i === q.answer.correct;
          return (
            <div key={i} style={{ position: 'relative', opacity: step >= 3 && !isAns ? 0.35 : 1, transition: 'opacity 400ms' }}>
              <Frame w="clamp(76px, 12vh, 104px)" h="clamp(76px, 12vh, 104px)" highlight={step >= 3 && isAns ? 'var(--green)' : undefined}>
                <Pic e={it.e} label={it.w} size={48} />
              </Frame>
              <div style={{ position: 'absolute', top: -10, right: -10 }}><Mark ok={has(it.e, q.cat.tag)} show={i < shown} size={30} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const picclass: TypeModule<PicClassQ> = {
  type: 'picclass',
  world: 'pictures',
  name: 'What belongs',
  testName: 'Picture Classification',
  intro: 'What belongs? Three pictures are a team. Find who else is on the team.',
  maxLevel: 6,
  tricks: [
    {
      id: 'picclass',
      type: 'picclass',
      title: 'What do they share?',
      rule: 'Say what all three have in common. Pick the one that fits too.',
      intro: 'Here is the trick for picture teams. Say out loud what makes them a team.',
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
