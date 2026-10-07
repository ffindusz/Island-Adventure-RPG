import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import {
  ARENA_LAYOUT,
  arena,
  dummyAt,
  face,
  fixedRandom,
  newGame,
  newGameWithMonsters,
  playingView,
  walk,
} from './fixtures';

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

describe('the world of each Adventure Area', () => {
  // Were they in the arena, the cellar's monsters would be right where the hero strikes and right where it walks.
  const cellar = {
    id: 'cellar',
    name: 'Cellar',
    layout: ARENA_LAYOUT,
    monsters: [dummyAt('in-reach', 4, 3), dummyAt('in-the-way', 3, 4)],
  };

  it('holds only its own monsters: those of another area are not shown, not struck and not in the way', () => {
    const game = newGame(arena({ monsters: [dummyAt('local', 3, 1)], otherAreas: [cellar] }));

    expect(playingView(game).monsters.map((monster) => monster.id)).toEqual(['local']);

    face(game, 'right');
    expect(game.send({ type: 'attack' }).map((event) => event.type)).toEqual(['hero-attacked']);

    walk(game, 'down', 8);
    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 4.5 });
  });
});
