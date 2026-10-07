import { describe, expect, it } from 'vitest';
import type { Game } from '../src/core';
import {
  advance,
  ARENA_LAYOUT,
  arena,
  biterAt,
  dummyAt,
  gameAtTitle,
  milestone,
  monsterNamed,
  newGame,
  playingView,
  throughStorage,
} from './fixtures';

// A milestone is a block of tiles that gives its reward the first time the hero's body overlaps it. In the arena the
// hero starts at (3.5, 3.5) with a body of 0.5 tiles, and it walks 0.125 tile a step.

/** The tile the hero starts on: the hero is in this zone before it has moved. */
const START_TILE = { col: 3, row: 3, width: 1, height: 1 };

/** Two tiles right of the start: walking right, the hero's body touches it after 10 steps and overlaps it at the 11th. */
const GATE_TILE = { col: 5, row: 3, width: 1, height: 1 };

/** The Experience the hero has earned toward its next Level, as the stat page shows it. */
function earned(game: Game): number | undefined {
  game.send({ type: 'open-page', page: 'stats' });
  const experience = playingView(game).page?.experience?.earned;
  game.send({ type: 'close-page', page: 'stats' });
  return experience;
}

describe('reaching a milestone', () => {
  it('happens when the hero first overlaps its zone, and gives the reward as Experience', () => {
    const game = newGame(arena({ milestones: [milestone('gate', GATE_TILE, 4)] }));
    game.send({ type: 'move', direction: 'right' });

    // After 10 steps the hero's body touches the zone along its edge, which is not yet overlapping it.
    expect(advance(game, 10)).toEqual([]);
    expect(advance(game, 1)).toEqual([
      { type: 'milestone-reached', milestoneId: 'gate' },
      { type: 'experience-gained', amount: 4 },
    ]);
    expect(earned(game)).toBe(4);
  });

  it('happens at the first step when the hero already stands in the zone', () => {
    const game = newGame(arena({ milestones: [milestone('here', START_TILE, 4)] }));

    expect(advance(game, 1)).toEqual([
      { type: 'milestone-reached', milestoneId: 'here' },
      { type: 'experience-gained', amount: 4 },
    ]);
  });

  it('gives its reward once, however often the hero comes back to the zone', () => {
    const game = newGame(arena({ milestones: [milestone('gate', GATE_TILE, 4)] }));
    game.send({ type: 'move', direction: 'right' });
    advance(game, 11);

    game.send({ type: 'move', direction: 'left' });
    advance(game, 24);
    game.send({ type: 'move', direction: 'right' });
    const events = advance(game, 40);

    expect(events).toEqual([]);
    expect(earned(game)).toBe(4);
  });

  it('does not happen for a zone in another Adventure Area than the hero is in', () => {
    const cellar = {
      id: 'cellar',
      name: 'Cellar',
      layout: ARENA_LAYOUT,
      monsters: [],
      milestones: [milestone('cellar-door', START_TILE, 4)],
    };
    const game = newGame(arena({ otherAreas: [cellar] }));

    expect(advance(game, 5)).toEqual([]);
  });

  it('gives the rewards of several milestones reached in one step in the order they are listed', () => {
    const above = { col: 3, row: 2, width: 1, height: 2 };
    const game = newGame(arena({ milestones: [milestone('first', START_TILE, 4), milestone('second', above, 3)] }));

    expect(advance(game, 1)).toEqual([
      { type: 'milestone-reached', milestoneId: 'first' },
      { type: 'experience-gained', amount: 4 },
      { type: 'milestone-reached', milestoneId: 'second' },
      { type: 'experience-gained', amount: 3 },
    ]);
  });
});

describe('the reward of a milestone', () => {
  it('is Experience like any other: enough of it raises the hero a Level, and the game waits', () => {
    const milestones = [milestone('here', START_TILE, 10)];
    const game = newGame(arena({ monsters: [dummyAt('dummy-1', 3, 4)], milestones }));

    expect(advance(game, 1)).toEqual([
      { type: 'milestone-reached', milestoneId: 'here' },
      { type: 'experience-gained', amount: 10 },
      { type: 'level-up', level: 2 },
    ]);
    expect(playingView(game).levelUp).toMatchObject({ level: 2, points: 1 });
    // The hero faces the dummy, is in reach of it and has no cooldown running: only the wait keeps it from striking.
    expect(game.send({ type: 'attack' })).toEqual([]);
    expect(monsterNamed(game, 'dummy-1').health).toBe(3);
    expect(advance(game, 5)).toEqual([]);
  });

  it('stops at the highest Level like any other Experience, with a Stat Point for every Level it raises', () => {
    const game = newGame(arena({ milestones: [milestone('windfall', START_TILE, 1000)] }));

    expect(advance(game, 1)).toEqual([
      { type: 'milestone-reached', milestoneId: 'windfall' },
      { type: 'experience-gained', amount: 100 },
      { type: 'level-up', level: 2 },
      { type: 'level-up', level: 3 },
      { type: 'level-up', level: 4 },
      { type: 'level-up', level: 5 },
      { type: 'level-up', level: 6 },
    ]);
    expect(playingView(game).levelUp).toMatchObject({ level: 2, points: 5 });
  });

  it('may be nothing: the milestone is reached and no Experience is gained', () => {
    const game = newGame(arena({ milestones: [milestone('marker', START_TILE, 0)] }));

    expect(advance(game, 1)).toEqual([{ type: 'milestone-reached', milestoneId: 'marker' }]);
    expect(advance(game, 5)).toEqual([]);
  });
});

describe('what the game remembers about milestones', () => {
  it('is not undone by a defeat: the hero returns to the start, in the zone, and it gives nothing again', () => {
    const game = newGame(
      arena({
        hero: { health: 5 },
        monsters: [biterAt('biter-1', 4, 3)],
        milestones: [milestone('here', START_TILE, 4)],
      }),
    );
    advance(game, 1);

    // The biter's blow lands at step 31 and takes all of the hero's Health.
    expect(advance(game, 30)).toContainEqual({ type: 'hero-defeated' });
    expect(advance(game, 5)).toEqual([]);
    expect(earned(game)).toBe(4);
  });

  it('is saved with the game: a continued game gives nothing again', () => {
    const content = arena({ milestones: [milestone('here', START_TILE, 4)] });
    const game = newGame(content);
    advance(game, 1);

    const continued = gameAtTitle(content);
    continued.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(advance(continued, 5)).toEqual([]);
    expect(earned(continued)).toBe(4);
  });
});
