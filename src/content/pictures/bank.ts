/**
 * Picture bank for the verbal (Picture Woods) questions.
 * Emoji are limited to Unicode 13 or earlier so older iPads show them.
 * Tags drive classification questions; an item only "belongs" to a category if it has the tag.
 */
export interface Item { e: string; w: string; tags: string[] }

const I = (e: string, w: string, ...tags: string[]): Item => ({ e, w, tags });

export const ITEMS: Item[] = [
  // fruit
  I('🍎', 'apple', 'fruit', 'food'), I('🍌', 'banana', 'fruit', 'food'), I('🍇', 'grapes', 'fruit', 'food'),
  I('🍓', 'strawberry', 'fruit', 'food'), I('🍊', 'orange', 'fruit', 'food'), I('🍐', 'pear', 'fruit', 'food'),
  I('🍉', 'watermelon', 'fruit', 'food'), I('🍒', 'cherries', 'fruit', 'food'), I('🍍', 'pineapple', 'fruit', 'food'),
  // vegetables
  I('🥕', 'carrot', 'veg', 'food'), I('🥦', 'broccoli', 'veg', 'food'), I('🌽', 'corn', 'veg', 'food'),
  I('🥔', 'potato', 'veg', 'food'), I('🍆', 'eggplant', 'veg', 'food'), I('🥒', 'cucumber', 'veg', 'food'),
  I('🧅', 'onion', 'veg', 'food'), I('🥬', 'lettuce', 'veg', 'food'),
  // sweet treats
  I('🍪', 'cookie', 'sweet', 'food'), I('🎂', 'cake', 'sweet', 'food'), I('🍩', 'donut', 'sweet', 'food'),
  I('🍭', 'lollipop', 'sweet', 'food'), I('🧁', 'cupcake', 'sweet', 'food'), I('🍦', 'ice cream', 'sweet', 'food', 'cold'),
  I('🍕', 'pizza', 'food'), I('🍔', 'burger', 'food'), I('🧀', 'cheese', 'food'),
  // flying things
  I('✈️', 'airplane', 'flies', 'nowheels'), I('🚁', 'helicopter', 'flies'), I('🚀', 'rocket', 'flies'), I('🪁', 'kite', 'flies'),
  I('🦅', 'eagle', 'flies', 'animal', 'wild', 'bird'), I('🐦', 'bird', 'flies', 'animal', 'bird'), I('🦉', 'owl', 'flies', 'animal', 'bird'),
  I('🦆', 'duck', 'flies', 'animal', 'bird', 'nofarm', 'nosea'),
  // sea
  I('🐟', 'fish', 'sea', 'animal'), I('🐙', 'octopus', 'sea', 'animal'), I('🦀', 'crab', 'sea', 'animal'),
  I('🐬', 'dolphin', 'sea', 'animal'), I('🐳', 'whale', 'sea', 'animal'), I('🦈', 'shark', 'sea', 'animal'),
  I('🦑', 'squid', 'sea', 'animal'), I('🐠', 'tropical fish', 'sea', 'animal'),
  // bugs
  I('🐜', 'ant', 'bug', 'animal'), I('🐛', 'caterpillar', 'bug', 'animal'), I('🐞', 'ladybug', 'bug', 'animal', 'flies'),
  I('🐝', 'bee', 'bug', 'animal', 'flies'), I('🦋', 'butterfly', 'bug', 'animal', 'flies'),
  // farm animals
  I('🐄', 'cow', 'farm', 'animal'), I('🐖', 'pig', 'farm', 'animal'), I('🐑', 'sheep', 'farm', 'animal'),
  I('🐐', 'goat', 'farm', 'animal'), I('🐴', 'horse', 'farm', 'animal'), I('🐓', 'rooster', 'farm', 'animal', 'noflies'),
  // wild animals
  I('🦁', 'lion', 'wild', 'animal'), I('🐯', 'tiger', 'wild', 'animal'), I('🐘', 'elephant', 'wild', 'animal'),
  I('🦒', 'giraffe', 'wild', 'animal'), I('🦓', 'zebra', 'wild', 'animal'), I('🐒', 'monkey', 'wild', 'animal'), I('🦛', 'hippo', 'wild', 'animal'),
  // pets
  I('🐶', 'dog', 'animal'), I('🐱', 'cat', 'animal'), I('🐰', 'rabbit', 'animal'), I('🐭', 'mouse', 'animal'),
  // clothing
  I('🧦', 'socks', 'clothing'), I('👕', 'shirt', 'clothing'), I('👖', 'pants', 'clothing'), I('🧢', 'cap', 'clothing'),
  I('👗', 'dress', 'clothing'), I('🧥', 'coat', 'clothing', 'nocold'), I('🧣', 'scarf', 'clothing', 'nocold'),
  I('🧤', 'gloves', 'clothing', 'nocold'), I('👟', 'sneaker', 'clothing'),
  // music
  I('🎸', 'guitar', 'music'), I('🥁', 'drum', 'music'), I('🎺', 'trumpet', 'music'), I('🎻', 'violin', 'music'),
  I('🎹', 'piano', 'music'), I('🎷', 'saxophone', 'music'),
  // balls
  I('⚽', 'soccer ball', 'ball'), I('🏀', 'basketball', 'ball'), I('🏈', 'football', 'ball'), I('⚾', 'baseball', 'ball'),
  I('🎾', 'tennis ball', 'ball'), I('🏐', 'volleyball', 'ball'),
  // tools
  I('🔨', 'hammer', 'tool'), I('🪛', 'screwdriver', 'tool'), I('🔧', 'wrench', 'tool'), I('🪚', 'saw', 'tool'),
  // wheels
  I('🚗', 'car', 'wheels'), I('🚌', 'bus', 'wheels'), I('🚲', 'bike', 'wheels'), I('🚚', 'truck', 'wheels'),
  I('🛴', 'scooter', 'wheels'), I('🚜', 'tractor', 'wheels'),
  // drawing
  I('✏️', 'pencil', 'draw'), I('🖍️', 'crayon', 'draw'), I('🖊️', 'pen', 'draw'), I('🖌️', 'paintbrush', 'draw'),
  // hot and cold
  I('❄️', 'snowflake', 'cold', 'weather'), I('🧊', 'ice', 'cold'), I('⛄', 'snowman', 'cold'),
  I('🔥', 'fire', 'hot'), I('☀️', 'sun', 'hot', 'weather'), I('☕', 'hot cocoa', 'hot'), I('🌋', 'volcano', 'hot'),
  // weather
  I('☁️', 'cloud', 'weather'), I('🌧️', 'rain', 'weather'), I('⚡', 'lightning', 'weather'), I('🌈', 'rainbow', 'weather'),
  // other things used as distractors
  I('🏠', 'house'), I('📚', 'books'), I('⏰', 'clock'), I('🔑', 'key'), I('🎁', 'present'), I('🪑', 'chair'),
  I('🛏️', 'bed'), I('📞', 'phone'), I('💡', 'light bulb'), I('🧸', 'teddy bear'), I('🌳', 'tree'), I('🌸', 'flower'),
];

export const byEmoji = new Map(ITEMS.map((i) => [i.e, i]));
export const word = (e: string) => byEmoji.get(e)?.w ?? e;
export const has = (e: string, tag: string) => !!byEmoji.get(e)?.tags.includes(tag);

export interface Category {
  tag: string;
  /** Spoken: "These are all ___." */
  label: string;
  /** Short on-screen tag. */
  short: string;
  level: number;
  /** Items with this tag are left out completely (too ambiguous for this category). */
  avoid?: string;
  /** Distractors at higher levels come from this "nearby" group (harder). */
  near?: string;
}

export const CATEGORIES: Category[] = [
  { tag: 'fruit', label: 'fruits', short: 'fruits', level: 1, near: 'food' },
  { tag: 'veg', label: 'vegetables', short: 'vegetables', level: 2, near: 'food' },
  { tag: 'clothing', label: 'things you wear', short: 'you wear them', level: 1 },
  { tag: 'ball', label: 'balls you play sports with', short: 'sports balls', level: 1 },
  { tag: 'music', label: 'things that make music', short: 'make music', level: 1 },
  { tag: 'sea', label: 'animals that live in the sea', short: 'live in the sea', level: 2, near: 'animal', avoid: 'nosea' },
  { tag: 'wheels', label: 'things with wheels', short: 'have wheels', level: 2, avoid: 'nowheels' },
  { tag: 'tool', label: 'tools for building and fixing', short: 'tools', level: 3 },
  { tag: 'draw', label: 'things you draw or paint with', short: 'draw with them', level: 3 },
  { tag: 'farm', label: 'farm animals', short: 'farm animals', level: 3, near: 'animal', avoid: 'nofarm' },
  { tag: 'wild', label: 'wild animals', short: 'wild animals', level: 3, near: 'animal' },
  { tag: 'bug', label: 'bugs', short: 'bugs', level: 3, near: 'animal' },
  { tag: 'sweet', label: 'sweet treats', short: 'sweet treats', level: 4, near: 'food' },
  { tag: 'flies', label: 'things that can fly', short: 'can fly', level: 4, near: 'animal', avoid: 'noflies' },
  { tag: 'cold', label: 'cold things', short: 'cold', level: 5, avoid: 'nocold' },
  { tag: 'hot', label: 'hot things', short: 'hot', level: 5 },
  { tag: 'weather', label: 'kinds of weather', short: 'weather', level: 5 },
];
