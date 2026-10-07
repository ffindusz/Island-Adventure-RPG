import { describe, expect, it } from 'vitest';
import { arena, newGame, playingView } from './fixtures';

// The arena's hero has a base Health of 10 and a base Defense of 0 unless a test says otherwise.

describe("the hero's Health", () => {
  it('starts full: the current Health is the maximum Health, which the content gives the hero', () => {
    const game = newGame(arena({ hero: { health: 12 } }));

    const { hero } = playingView(game);

    expect(hero.health).toBe(12);
    expect(hero.maxHealth).toBe(12);
  });
});
