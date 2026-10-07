import { describe, expect, it } from 'vitest';
import { gameWithPrizes } from './fixtures';

// The arena's Level thresholds are 10, 25, 45, 70 and 100 Experience, for Levels 2 to 6. A prize is a monster that
// falls to one strike and is worth whatever Experience the test says (see prizes in fixtures.ts); the first stands
// below the hero, where it faces, so the strike at step 0 defeats it.

describe('reaching a Level', () => {
  it('takes the Experience of its threshold: exactly 10 raises the hero to Level 2', () => {
    const game = gameWithPrizes(10);

    const events = game.send({ type: 'attack' });

    expect(events.slice(-2)).toEqual([
      { type: 'experience-gained', amount: 10 },
      { type: 'level-up', level: 2 },
    ]);
  });

  it('does not come with Experience just below the threshold: 9 leaves the hero at Level 1', () => {
    const game = gameWithPrizes(9);

    const events = game.send({ type: 'attack' });

    expect(events.map((event) => event.type)).toEqual([
      'hero-attacked',
      'monster-hit',
      'monster-defeated',
      'experience-gained',
    ]);
  });

  it('comes once for each threshold that one defeat passes, the lowest first', () => {
    // 25 is the threshold of Level 3, so it takes the hero past the threshold of Level 2 on the way.
    const game = gameWithPrizes(25);

    const events = game.send({ type: 'attack' });

    expect(events.slice(-3)).toEqual([
      { type: 'experience-gained', amount: 25 },
      { type: 'level-up', level: 2 },
      { type: 'level-up', level: 3 },
    ]);
  });
});
