import type { BaseQ, TypeModule } from '../engine/types';

/** Every fixed thing Pip says outside of questions. Templates take values so the recorder can pre-record them. */
export const LINES = {
  onboarding: [
    "Hi! I'm Pip, the puzzle owl. Welcome to Brainiac! Tap the big button to start.",
    'What is your name? Type it, then tap Next.',
    'I will read every puzzle out loud. Tap the speaker any time to hear it again.',
    'Stuck? Tap the light bulb for a hint. Want to learn a secret trick? Tap Learn the trick.',
    "Every day there's a new quest. Let's go!",
  ],
  praise: ['Yes! You got it!', 'Amazing!', 'Super smart!', 'Nailed it!', 'Wow, great thinking!', 'That is right!', 'Brilliant!', 'You are on fire!'],
  fastRight: 'Yes!',
  tryOrWatch: 'Not yet. Try again, or watch how to solve it.',
  solveTogether: "Let's solve it together.",
  homeNew: "Hi there! Ready for today's quest?",
  homeDone: "Hi there! You finished today's quest. Want to play more?",
  world: (name: string) => `${name}! Pick a game. Tap Play, or learn the trick first.`,
  trickBook: 'Your Trick Book! Tap a trick to watch it again, or try a speed round.',
  lesson: (title: string, intro: string) => `${title}! ${intro} Tap Watch to see how.`,
  speedIntro: 'Speed check! Answer as many as you can in two minutes. If one is too hard, tap skip. Ready?',
  go: 'Go!',
  speedDone: (correct: number, perMin: number, prev?: number) =>
    `Time! You got ${correct} right. That is ${perMin} a minute.${prev === undefined ? ' This is your starting score. Next time, try to beat it!' : perMin > prev ? ' Faster than last time!' : ' Keep practicing your tricks!'}`,
  treasureEmpty: 'Your treasure chest! Keep playing to unlock real prizes.',
  treasureReady: (title: string) => `You unlocked ${title}! Tap claim, then show a grown-up.`,
  claimed: 'Claimed! Go show a grown-up. They will say yes in Grown-ups corner.',
  studioSaved: 'What a creative idea! I saved it. Want to try another one?',
  voiceTest: 'Hi! This is how I sound. Is this a good speed?',
  done: (headline: string, firstTry: number, answered: number, stars: number, levelUps: string[], prize: boolean) =>
    `${headline} You got ${firstTry} out of ${answered} right the first time, and earned ${stars} stars.${levelUps.length ? ` You leveled up in ${levelUps.join(' and ')}!` : ''}${prize ? ' And you unlocked a prize!' : ''}`,
  headlines: ['Quest complete!', 'Trick learned!', 'Speed round done!', 'Great practice!'],
};

/** Solution steps as spoken. Answer letters are not on screen during a solution, so say it plainly. */
export function spokenSteps(mod: TypeModule<BaseQ>, q: BaseQ): { say: string }[] {
  return mod.solution(q).map((st) => ({
    say: st.say
      .replace(/The answer is [A-E]([.!])/g, "That's the answer$1")
      .replace(/That's [A-E]!/g, "That's it!")
      .replace(/Only [A-E] follows the rule\./g, 'Only one picture follows the rule.')
      .replace(/The answer is [A-E]\b/g, "That's the answer"),
  }));
}
