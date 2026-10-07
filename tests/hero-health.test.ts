import { describe, expect, it } from 'vitest';
import { advance, arena, biterAt, fieldGame, newGame, playingView, walk } from './fixtures';

// The arena's hero has a base Health of 10 and a base Defense of 0 unless a test says otherwise.

describe("the hero's Health", () => {
  it('starts full: the current Health is the maximum Health, which the content gives the hero', () => {
    const game = newGame(arena({ hero: { health: 12 } }));

    const { hero } = playingView(game);

    expect(hero.health).toBe(12);
    expect(hero.maxHealth).toBe(12);
  });

  it('drops with a hit and never regenerates on its own, however long the hero waits', () => {
    // The biter beside the hero hits it on step 31, for 5 of its 10 Health. The hero then walks off, out of the biter's
    // noticing distance, and waits a whole minute: 3600 steps.
    const game = fieldGame([biterAt('biter-1', 7, 3)]);
    advance(game, 31);
    expect(playingView(game).hero).toMatchObject({ health: 5, maxHealth: 10 });
    walk(game, 'left', 42);

    const events = advance(game, 3600);

    expect(events).toEqual([]);
    expect(playingView(game).hero).toMatchObject({ health: 5, maxHealth: 10 });
  });
});
