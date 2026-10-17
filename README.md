# Brainiac

An iPad-first web app for a 2nd grader: CogAT-style puzzles, speed math tricks, and real-life prizes.
Everything is read aloud, so a child can use it alone.

- **Shape Sky** (CogAT nonverbal): paper folding, figure matrices, figure classification
- **Number Mountain** (CogAT quantitative): number series (abacus), number analogies, number puzzles (scale, trains, equations)
- **Picture Woods** (CogAT verbal): picture analogies (2x2), picture classification, listen-and-pick
- **Speed Lab** (fluency): fact tricks within 20 with spaced review (Leitner), 2-digit mental math, skip counting and arrays, 2-minute speed check
- **Trick Tower** (achievement): trick questions, place value, money, time
- **Idea Studio** (creativity): drawing prompts

Every question has a hint, a "learn the trick" lesson (shown on a different example), and an animated narrated solution.

## Develop

```
npm install
npm run dev      # local dev server
npm test         # generator tests: every question has exactly one right answer
npm run build    # static site in dist/
```

Progress is stored on the device (localStorage). Grown-ups corner has backup/restore.
Hidden preview page for testing: `#qa=<type>:<level>:<seed>:<step>` (step -1 = question).
