import { describe, expect, it } from 'vitest';
import { keyHolder } from './dodging-bot';
import { advance, arena, newGame, playingView } from './fixtures';

// The bot of dodging-bot.ts plays by a player's keys. What it finds out in the fights is pinned by fights.test.ts and
// guardian-balance.test.ts; here is how it holds its keys. The hero stands at (3.5, 3.5) and walks 0.125 tile a step,
// so four steps are half a tile.

describe('the keys that the bot holds', () => {
  it('walk the hero the way they point: a new key lets go of the one before, and no key leaves the hero standing', () => {
    const game = newGame(arena());
    const hold = keyHolder(game);

    hold('right');
    advance(game, 4);
    expect(playingView(game).hero).toMatchObject({ position: { x: 4, y: 3.5 }, facing: 'right' });

    hold('up');
    advance(game, 4);
    expect(playingView(game).hero).toMatchObject({ position: { x: 4, y: 3 }, facing: 'up' });

    hold(null);
    advance(game, 4);
    expect(playingView(game).hero).toMatchObject({ position: { x: 4, y: 3 }, facing: 'up' });
  });
});
