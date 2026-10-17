import { describe, it } from 'vitest';
import { checkModule } from '../testkit';
import { matrices } from './matrices';
import { figKey, type Fig } from '../../ui/Figure';

describe('matrices', () => {
  it('generates valid questions with exactly one right answer', () => {
    checkModule(matrices, {
      key: (c) => figKey(c as Fig),
      isCorrect: (q, c) => figKey(c as Fig) === figKey(q.d),
      minChoices: 4,
    });
  });
});
