import { describe, expect, it } from 'vitest';
import { defeatPrize, gameWithPrizes, newGame, playingView } from './fixtures';

// The in-play HUD shows the hero's Level and Experience without a page being open, so the playing view carries them.
// They are only a projection of the state that the stat page already reads from.

describe("the hero's progress in the playing view", () => {
  it('starts at Level 1 with no Experience earned toward Level 2', () => {
    expect(playingView(newGame()).progress).toEqual({ level: 1, experience: { earned: 0, needed: 10 } });
  });

  it('shows the Experience earned toward the next Level', () => {
    const game = gameWithPrizes(4);

    defeatPrize(game, 1);

    expect(playingView(game).progress).toEqual({ level: 1, experience: { earned: 4, needed: 10 } });
  });

  it('counts from the Level the hero has reached, once it has reached one', () => {
    const game = gameWithPrizes(12);

    defeatPrize(game, 1);

    expect(playingView(game).progress).toEqual({ level: 2, experience: { earned: 2, needed: 15 } });
  });

  it('has no Experience to show at the highest Level, which has no next', () => {
    const game = gameWithPrizes(1000);

    defeatPrize(game, 1);

    expect(playingView(game).progress).toEqual({ level: 6, experience: null });
  });
});
