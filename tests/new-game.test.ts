import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import { arena, dummyAt, fixedRandom, newGame, newGameWithMonsters, playingView } from './fixtures';

describe('starting a game', () => {
  it('is at the title until a game is started', () => {
    const game = createGame({ content: arena(), random: fixedRandom });

    expect(game.view()).toEqual({ phase: 'title' });
  });

  it('puts the hero in the middle of the start tile facing down, with every monster at full Health', () => {
    const game = newGameWithMonsters(dummyAt('dummy-1', 5, 3));

    const view = playingView(game);
    expect(view.hero).toEqual({ position: { x: 3.5, y: 3.5 }, size: 0.5, facing: 'down' });
    expect(view.monsters).toEqual([
      { id: 'dummy-1', type: 'dummy', position: { x: 5.5, y: 3.5 }, size: 0.5, health: 3, maxHealth: 3 },
    ]);
  });

  it('shows the Adventure Area and the kind of terrain on each of its tiles', () => {
    const view = playingView(newGame());

    expect(view.area).toEqual({
      id: 'arena',
      name: 'Arena',
      width: 7,
      height: 6,
      terrain: [
        ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
        ['wall', 'ground', 'ground', 'ground', 'ground', 'ground', 'wall'],
        ['wall', 'ground', 'water', 'ground', 'ground', 'ground', 'wall'],
        ['wall', 'ground', 'ground', 'ground', 'ground', 'ground', 'wall'],
        ['wall', 'ground', 'ground', 'ground', 'sand', 'ground', 'wall'],
        ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
      ],
    });
  });
});
