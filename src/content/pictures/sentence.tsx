import type { BaseQ, TypeModule } from '../../engine/types';
import { buildChoices, uid, type Rng } from '../../engine/rng';
import { Frame, Mark, Pic, Tag, useTicker } from '../../ui/kit';

export interface Opt { e: string; w: string }
interface Item { level: number; say: string; keys: string[]; ans: Opt; wrong: Opt[]; why: string }

const o = (e: string, w: string): Opt => ({ e, w });
const S = (level: number, say: string, keys: string[], ans: Opt, wrong: Opt[], why: string): Item => ({ level, say, keys, ans, wrong, why });

/** Hand-written bank. Every wrong option is clearly wrong for the question. */
export const BANK: Item[] = [
  // Level 1: what is it used for, simple facts
  S(1, 'Which one do you use to cut paper?', ['cut', 'paper'], o('✂️', 'scissors'), [o('✏️', 'pencil'), o('🥄', 'spoon'), o('🧸', 'teddy bear')], 'Scissors cut paper.'),
  S(1, 'Which animal has a very long neck?', ['long neck'], o('🦒', 'giraffe'), [o('🐷', 'pig'), o('🐢', 'turtle'), o('🐶', 'dog')], 'A giraffe has a very long neck.'),
  S(1, 'Which one do you wear on a rainy day to stay dry?', ['rainy', 'dry'], o('☂️', 'umbrella'), [o('🕶️', 'sunglasses'), o('🩳', 'shorts'), o('🧢', 'cap')], 'An umbrella keeps you dry in the rain.'),
  S(1, 'Which one can you sleep in?', ['sleep'], o('🛏️', 'bed'), [o('🚗', 'car'), o('📚', 'books'), o('🍎', 'apple')], 'You sleep in a bed.'),
  S(1, 'Which animal says moo?', ['moo'], o('🐄', 'cow'), [o('🐱', 'cat'), o('🐑', 'sheep'), o('🐔', 'chicken')], 'A cow says moo.'),
  S(1, 'Which one do you use to brush your teeth?', ['brush', 'teeth'], o('🪥', 'toothbrush'), [o('🖌️', 'paintbrush'), o('🍴', 'fork'), o('🔑', 'key')], 'A toothbrush cleans your teeth.'),
  S(1, 'Which one helps you see in the dark?', ['see', 'dark'], o('🔦', 'flashlight'), [o('🎈', 'balloon'), o('🧦', 'socks'), o('🍪', 'cookie')], 'A flashlight makes light.'),
  S(1, 'Which one would you find at the beach?', ['beach'], o('🐚', 'shell'), [o('⛄', 'snowman'), o('🛏️', 'bed'), o('🌵', 'cactus')], 'Shells wash up on the beach.'),
  S(1, 'Which one do you ride with pedals?', ['pedals'], o('🚲', 'bike'), [o('🚂', 'train'), o('🛶', 'canoe'), o('🐴', 'horse')], 'A bike has pedals.'),
  S(1, 'Which one tells you what time it is?', ['time'], o('⏰', 'clock'), [o('📞', 'phone'), o('🎁', 'present'), o('🪑', 'chair')], 'A clock shows the time.'),
  S(1, 'Which animal can hop and has a pouch?', ['hop', 'pouch'], o('🦘', 'kangaroo'), [o('🐸', 'frog'), o('🐰', 'rabbit'), o('🐻', 'bear')], 'A kangaroo hops and carries its baby in a pouch.'),
  S(1, 'Where do you put a letter to mail it?', ['letter', 'mail'], o('📮', 'mailbox'), [o('🍕', 'pizza'), o('🔨', 'hammer'), o('🧤', 'gloves')], 'Letters go in the mailbox.'),
  // Level 2
  S(2, 'Which one grows on a tree?', ['grows', 'tree'], o('🍎', 'apple'), [o('🥕', 'carrot'), o('🥚', 'egg'), o('🧀', 'cheese')], 'Apples grow on apple trees.'),
  S(2, 'Which one would keep your hands warm in the snow?', ['hands', 'warm'], o('🧤', 'gloves'), [o('👟', 'sneakers'), o('🧢', 'cap'), o('👓', 'glasses')], 'Gloves keep your hands warm.'),
  S(2, 'Which one can fly but is not an animal?', ['fly', 'not an animal'], o('✈️', 'airplane'), [o('🦅', 'eagle'), o('🚗', 'car'), o('🐝', 'bee')], 'An airplane flies, and it is a machine, not an animal.'),
  S(2, 'Which animal lives in the ocean?', ['ocean'], o('🐙', 'octopus'), [o('🐫', 'camel'), o('🐿️', 'squirrel'), o('🦁', 'lion')], 'An octopus lives in the ocean.'),
  S(2, 'Which one melts when it gets warm?', ['melts', 'warm'], o('🧊', 'ice'), [o('🪨', 'rock'), o('🔨', 'hammer'), o('🧸', 'teddy bear')], 'Ice melts into water when it is warm.'),
  S(2, 'Which one would a doctor use?', ['doctor'], o('🩺', 'stethoscope'), [o('🎸', 'guitar'), o('🧹', 'broom'), o('🎣', 'fishing rod')], 'A doctor uses a stethoscope to listen to your heart.'),
  S(2, 'Which one do you need to bake a cake?', ['bake', 'cake'], o('🥚', 'eggs'), [o('🧦', 'socks'), o('⚽', 'ball'), o('🔦', 'flashlight')], 'Cakes are made with eggs.'),
  S(2, 'Which one makes music when you hit it?', ['music', 'hit'], o('🥁', 'drum'), [o('🎺', 'trumpet'), o('📚', 'books'), o('🍌', 'banana')], 'You hit a drum to make music. You blow a trumpet.'),
  S(2, 'Which one has eight legs?', ['eight legs'], o('🕷️', 'spider'), [o('🐜', 'ant'), o('🐶', 'dog'), o('🐦', 'bird')], 'A spider has eight legs. An ant has six.'),
  S(2, 'Which one do you plant in the ground to grow a flower?', ['plant', 'grow'], o('🌱', 'seed'), [o('🥄', 'spoon'), o('🎈', 'balloon'), o('🧀', 'cheese')], 'A seed grows into a plant.'),
  S(2, 'Which one would you see at night?', ['night'], o('🌙', 'moon'), [o('🌈', 'rainbow'), o('☀️', 'sun'), o('🌻', 'sunflower')], 'You see the moon at night.'),
  S(2, 'Which animal is the slowest?', ['slowest'], o('🐌', 'snail'), [o('🐆', 'cheetah'), o('🐇', 'rabbit'), o('🐎', 'horse')], 'A snail is very, very slow.'),
  // Level 3: comparisons, purpose
  S(3, 'Which one is the biggest?', ['biggest'], o('🐳', 'whale'), [o('🐶', 'dog'), o('🐭', 'mouse'), o('🐈', 'cat')], 'A whale is the biggest.'),
  S(3, 'Which one is the hottest?', ['hottest'], o('🔥', 'fire'), [o('🧊', 'ice'), o('☁️', 'cloud'), o('🍦', 'ice cream')], 'Fire is the hottest.'),
  S(3, 'Which one is the lightest? You could lift it with one finger.', ['lightest'], o('🪶', 'feather'), [o('🪨', 'rock'), o('🚗', 'car'), o('🐘', 'elephant')], 'A feather is very light.'),
  S(3, 'Which one could fit inside a shoe?', ['fit inside', 'shoe'], o('🧦', 'sock'), [o('🪑', 'chair'), o('🚲', 'bike'), o('🐴', 'horse')], 'A sock fits inside a shoe.'),
  S(3, 'Which one gives us milk?', ['milk'], o('🐄', 'cow'), [o('🐔', 'chicken'), o('🐝', 'bee'), o('🐖', 'pig')], 'Cows give us milk.'),
  S(3, 'Which one would you use to fix a loose screw?', ['fix', 'screw'], o('🪛', 'screwdriver'), [o('🖍️', 'crayon'), o('🍴', 'fork'), o('🧽', 'sponge')], 'A screwdriver turns screws.'),
  S(3, 'Which one do bees make?', ['bees make'], o('🍯', 'honey'), [o('🥛', 'milk'), o('🥚', 'egg'), o('🧀', 'cheese')], 'Bees make honey.'),
  S(3, 'Which one is used to measure how long something is?', ['measure', 'long'], o('📏', 'ruler'), [o('⏰', 'clock'), o('🔦', 'flashlight'), o('🎈', 'balloon')], 'A ruler measures length. A clock measures time.'),
  S(3, 'Which one would float on water?', ['float'], o('🦆', 'duck'), [o('🪨', 'rock'), o('🔨', 'hammer'), o('🔑', 'key')], 'A duck floats. Rocks, hammers and keys sink.'),
  S(3, 'Which one is a baby animal?', ['baby'], o('🐣', 'chick'), [o('🐓', 'rooster'), o('🐄', 'cow'), o('🐘', 'elephant')], 'A chick is a baby chicken.'),
  S(3, 'Which one has the most wheels?', ['most wheels'], o('🚚', 'truck'), [o('🚲', 'bike'), o('🛴', 'scooter'), o('🛹', 'skateboard')], 'A truck has more wheels than a bike, a scooter or a skateboard.'),
  S(3, 'Which one would you use to see something far away?', ['far away'], o('🔭', 'telescope'), [o('👂', 'ear'), o('🧲', 'magnet'), o('📏', 'ruler')], 'A telescope helps you see far away.'),
  // Level 4: NOT questions and two clues
  S(4, 'Which one is NOT something you eat?', ['NOT', 'eat'], o('🧦', 'sock'), [o('🍎', 'apple'), o('🍞', 'bread'), o('🥕', 'carrot'), o('🍌', 'banana')], 'You cannot eat a sock!'),
  S(4, 'Which one is NOT an animal?', ['NOT', 'animal'], o('🌳', 'tree'), [o('🐸', 'frog'), o('🐌', 'snail'), o('🐦', 'bird'), o('🐝', 'bee')], 'A tree is a plant, not an animal.'),
  S(4, 'Which one does NOT need batteries or a plug?', ['NOT', 'batteries'], o('🪁', 'kite'), [o('📱', 'phone'), o('🔦', 'flashlight'), o('💻', 'computer'), o('📺', 'TV')], 'A kite only needs wind.'),
  S(4, 'Which animal has feathers and cannot fly?', ['feathers', 'cannot fly'], o('🐧', 'penguin'), [o('🦅', 'eagle'), o('🦉', 'owl'), o('🐦', 'bird'), o('🦇', 'bat')], 'A penguin has feathers but swims instead of flying.'),
  S(4, 'Which one is round and you can eat it?', ['round', 'eat'], o('🍊', 'orange'), [o('⚽', 'ball'), o('🍌', 'banana'), o('🥕', 'carrot'), o('⏰', 'clock')], 'An orange is round and you can eat it.'),
  S(4, 'Which one is cold and sweet?', ['cold', 'sweet'], o('🍦', 'ice cream'), [o('🧊', 'ice'), o('🍪', 'cookie'), o('☕', 'hot cocoa'), o('❄️', 'snowflake')], 'Ice cream is cold AND sweet. Ice is cold but not sweet.'),
  S(4, 'Which one lives in water and has a shell?', ['water', 'shell'], o('🦀', 'crab'), [o('🐟', 'fish'), o('🐢', 'tortoise'), o('🐌', 'snail'), o('🐬', 'dolphin')], 'A crab lives in the water and has a hard shell.'),
  S(4, 'Which one has wings but is not a bird?', ['wings', 'not a bird'], o('🦋', 'butterfly'), [o('🦆', 'duck'), o('🦉', 'owl'), o('🐧', 'penguin'), o('🐔', 'chicken')], 'A butterfly has wings, but it is a bug, not a bird.'),
  S(4, 'Which one is NOT a fruit?', ['NOT', 'fruit'], o('🥦', 'broccoli'), [o('🍇', 'grapes'), o('🍓', 'strawberry'), o('🍐', 'pear'), o('🍒', 'cherries')], 'Broccoli is a vegetable.'),
  S(4, 'Which one makes a loud noise to wake you up?', ['loud', 'wake'], o('⏰', 'alarm clock'), [o('🛏️', 'bed'), o('🌙', 'moon'), o('🧸', 'teddy bear'), o('🪶', 'feather')], 'An alarm clock rings to wake you up.'),
  // Level 5: reasoning, order, size between
  S(5, 'Which one is bigger than a dog, but smaller than a house?', ['bigger than a dog', 'smaller than a house'], o('🐴', 'horse'), [o('🐭', 'mouse'), o('🐜', 'ant'), o('🐳', 'whale'), o('🐈', 'cat')], 'A horse is bigger than a dog but smaller than a house.'),
  S(5, 'Which one comes first: before the chick, before the hen?', ['first'], o('🥚', 'egg'), [o('🐣', 'chick'), o('🐔', 'hen'), o('🍗', 'drumstick')], 'First the egg, then the chick, then the hen.'),
  S(5, 'Which one would you need to make a snowman?', ['snowman'], o('❄️', 'snow'), [o('🏖️', 'sand'), o('💧', 'water'), o('🌧️', 'rain'), o('🔥', 'fire')], 'You build a snowman out of snow.'),
  S(5, 'Which one is heavier than a person but can still fly?', ['heavier', 'fly'], o('✈️', 'airplane'), [o('🎈', 'balloon'), o('🦋', 'butterfly'), o('🚗', 'car'), o('🪶', 'feather')], 'An airplane is very heavy, but it can fly.'),
  S(5, 'Which one grows under the ground?', ['under the ground'], o('🥕', 'carrot'), [o('🍎', 'apple'), o('🍌', 'banana'), o('🍒', 'cherries'), o('🍇', 'grapes')], 'A carrot grows under the ground. The others grow on trees or vines.'),
  S(5, 'Which one has hands but cannot clap?', ['hands', 'cannot clap'], o('⏰', 'clock'), [o('🐒', 'monkey'), o('🤖', 'robot'), o('🧸', 'teddy bear'), o('🦀', 'crab')], 'A clock has hands that point to the time. It is a riddle!'),
  S(5, 'Which one could you use to carry water at the beach and in the garden?', ['kitchen', 'beach'], o('🪣', 'bucket'), [o('🍳', 'frying pan'), o('🐚', 'shell'), o('🥄', 'spoon'), o('🏐', 'volleyball')], 'A bucket carries water anywhere.'),
  S(5, 'Which one lives the longest?', ['longest'], o('🐢', 'tortoise'), [o('🦋', 'butterfly'), o('🐭', 'mouse'), o('🐛', 'caterpillar'), o('🐜', 'ant')], 'Tortoises can live more than 100 years!'),
  S(5, 'Which one is a tool AND makes a sound?', ['tool', 'sound'], o('🔨', 'hammer'), [o('🎺', 'trumpet'), o('📏', 'ruler'), o('🪛', 'screwdriver'), o('🥁', 'drum')], 'A hammer is a tool and it bangs loudly. The trumpet and drum are instruments, not tools.'),
  // Level 6: harder riddles and multi-clue
  S(6, 'Which one has keys but cannot open a door?', ['keys', 'cannot open'], o('🎹', 'piano'), [o('🔑', 'key'), o('🚪', 'door'), o('🔒', 'lock'), o('🏠', 'house')], 'A piano has keys you play. It is a riddle!'),
  S(6, 'Which animal is a mammal that can fly?', ['mammal', 'fly'], o('🦇', 'bat'), [o('🦅', 'eagle'), o('🦋', 'butterfly'), o('🐝', 'bee'), o('🦉', 'owl')], 'A bat is a mammal, like a dog or a person, and it can fly.'),
  S(6, 'Which one is the odd one out: it is the only one that is alive?', ['only', 'alive'], o('🌻', 'sunflower'), [o('🪨', 'rock'), o('🧸', 'teddy bear'), o('🚗', 'car'), o('💡', 'light bulb')], 'A sunflower is a living plant.'),
  S(6, 'If you were very thirsty in the desert, which one would help you most?', ['thirsty', 'desert'], o('💧', 'water'), [o('🍪', 'cookie'), o('🏖️', 'sand'), o('🧣', 'scarf'), o('🔦', 'flashlight')], 'When you are thirsty, you need water.'),
  S(6, 'Which one has a neck but no head?', ['neck', 'no head'], o('🧴', 'bottle'), [o('🦒', 'giraffe'), o('🦢', 'swan'), o('🐴', 'horse')], 'A bottle has a neck at the top. It is a riddle!'),
  S(6, 'Which one has teeth but cannot bite?', ['teeth', 'cannot bite'], o('🪚', 'saw'), [o('🦈', 'shark'), o('🐊', 'crocodile'), o('🐶', 'dog'), o('🦁', 'lion')], 'A saw has sharp teeth for cutting wood, but it cannot bite. It is a riddle!'),
  S(6, 'Which one is full of holes but still holds water?', ['holes', 'holds water'], o('🧽', 'sponge'), [o('🪣', 'bucket'), o('🥛', 'glass'), o('🛁', 'bathtub'), o('🫖', 'teapot')], 'A sponge is full of holes but soaks up water. It is a riddle!'),
  S(6, 'Which one travels around the world but stays in a corner?', ['corner'], o('✉️', 'a stamp on a letter'), [o('✈️', 'airplane'), o('🚢', 'ship'), o('🌍', 'globe'), o('🚂', 'train')], 'A stamp sits in the corner of a letter while it travels. It is a riddle!'),
];

export interface SentenceQ extends BaseQ {
  item: Item;
}

function generate(level: number, rng: Rng): SentenceQ {
  const pool = BANK.filter((b) => b.level <= level && b.level >= Math.max(1, level - 2));
  const item = rng.pick(pool);
  const count = level <= 2 ? 4 : 5;
  const { choices, correct } = buildChoices(rng, item.ans, rng.shuffle(item.wrong), Math.min(count, item.wrong.length + 1), (x) => x.e);
  return {
    id: uid('sc'),
    type: 'sentence',
    level,
    say: item.say,
    text: item.say,
    answer: { kind: 'choice', choices, correct },
    hint: `Listen for the key words: ${item.keys.join(', ')}. Check each picture.`,
    trick: 'sentence',
    item,
  };
}

function Stimulus({ q }: { q: SentenceQ }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, background: '#fff', padding: '22px 30px', borderRadius: 26, maxWidth: 860 }}>
      <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="var(--purple-soft)" />
        <path d="M16 9c1.5 1.5 1.5 4.5 0 6M19 6c3 3 3 9 0 12" />
      </svg>
      <div className="display" style={{ fontSize: 'clamp(26px, 4.4vh, 38px)', lineHeight: 1.2 }}>{q.item.say}</div>
    </div>
  );
}

function Choice({ data }: { q: SentenceQ; data: unknown; index: number }) {
  const x = data as Opt;
  return <Pic e={x.e} label={x.w} size={58} />;
}

function wrongFeedback(q: SentenceQ, given: number): string | undefined {
  if (q.answer.kind !== 'choice') return;
  const x = q.answer.choices[given] as Opt;
  return `A ${x.w}? Listen again: ${q.item.say}`;
}

function solution(q: SentenceQ) {
  const letter = 'ABCDE'[q.answer.kind === 'choice' ? q.answer.correct : 0];
  return [
    { say: `Listen again. ${q.item.say}` },
    { say: `The key words are: ${q.item.keys.join(', and ')}.` },
    { say: 'Now check each picture with the key words.' },
    { say: `${q.item.why} The answer is ${letter}.` },
    { say: 'Trick: listen for the key words, then check every picture before you pick.' },
  ];
}

function Solution({ q, step }: { q: SentenceQ; step: number }) {
  const choices = q.answer.kind === 'choice' ? (q.answer.choices as Opt[]) : [];
  const ticks = useTicker(choices.length, 700, step === 2);
  const shown = step >= 3 ? choices.length : step === 2 ? ticks : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <Stimulus q={q} />
      <div style={{ display: 'flex', gap: 8, minHeight: 38, flexWrap: 'wrap', justifyContent: 'center' }}>
        {q.item.keys.map((k, i) => <Tag key={i} show={step >= 1}>{k}</Tag>)}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {choices.map((x, i) => {
          const isAns = q.answer.kind === 'choice' && i === q.answer.correct;
          return (
            <div key={i} style={{ position: 'relative', opacity: step >= 3 && !isAns ? 0.35 : 1, transition: 'opacity 400ms' }}>
              <Frame w="clamp(76px, 12vh, 104px)" h="clamp(76px, 12vh, 104px)" highlight={step >= 3 && isAns ? 'var(--green)' : undefined}>
                <Pic e={x.e} label={x.w} size={48} />
              </Frame>
              <div style={{ position: 'absolute', top: -10, right: -10 }}><Mark ok={isAns} show={i < shown} size={30} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const sentence: TypeModule<SentenceQ> = {
  type: 'sentence',
  world: 'pictures',
  name: 'Listen and pick',
  testName: 'Sentence Completion',
  intro: 'Listen and pick! Listen carefully, then tap the picture that fits.',
  maxLevel: 6,
  tricks: [
    {
      id: 'sentence',
      type: 'sentence',
      title: 'Listen for key words',
      rule: 'Listen for the key words. Check every picture before you pick.',
      intro: 'Here is the listening trick. Find the key words, then test each picture.',
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
