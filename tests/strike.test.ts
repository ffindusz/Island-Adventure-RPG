import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/core';
import { dummyAt, face, newGameWithMonsters, playingView, walk } from './fixtures';

// The hero stands at (3.5, 3.5) with a body 0.5 wide, so its body spans 3.25 to 3.75 each way. Its strike reaches
// 1 tile beyond the body and is 1 tile wide, centred on the hero. Its Attack is 1 and a dummy has Health 3.
// Monsters stand in the middle of their tile, and a dummy's body is 0.5 wide.

function types(events: readonly GameEvent[]): string[] {
  return events.map((event) => event.type);
}

describe('striking', () => {
  it.each([
    { facing: 'right', dummy: { col: 4, row: 3 }, zone: { minX: 3.75, minY: 3, maxX: 4.75, maxY: 4 } },
    { facing: 'left', dummy: { col: 2, row: 3 }, zone: { minX: 2.25, minY: 3, maxX: 3.25, maxY: 4 } },
    { facing: 'up', dummy: { col: 3, row: 2 }, zone: { minX: 3, minY: 2.25, maxX: 4, maxY: 3.25 } },
    { facing: 'down', dummy: { col: 3, row: 4 }, zone: { minX: 3, minY: 3.75, maxX: 4, maxY: 4.75 } },
  ] as const)('a strike facing $facing hits the monster directly in front of the hero', ({ facing, dummy, zone }) => {
    const game = newGameWithMonsters(dummyAt('dummy-1', dummy.col, dummy.row));
    face(game, facing);

    const events = game.send({ type: 'attack' });

    expect(events).toEqual([
      { type: 'hero-attacked', direction: facing, zone },
      { type: 'monster-hit', monsterId: 'dummy-1', damage: 1, health: 2 },
    ]);
    expect(playingView(game).monsters[0]?.health).toBe(2);
  });

  it('hits nothing behind or beside the hero', () => {
    // Facing right, the strike covers x 3.75 to 4.75 and y 3 to 4: none of these dummies is in it.
    const game = newGameWithMonsters(
      dummyAt('behind', 2, 3),
      dummyAt('above', 3, 2),
      dummyAt('below', 3, 4),
      dummyAt('ahead-and-above', 4, 2),
      dummyAt('ahead-and-below', 4, 4),
    );
    face(game, 'right');

    const events = game.send({ type: 'attack' });

    expect(types(events)).toEqual(['hero-attacked']);
    expect(playingView(game).monsters.map((monster) => monster.health)).toEqual([3, 3, 3, 3, 3]);
  });

  it('misses a monster that is just beyond the reach of the strike', () => {
    const game = newGameWithMonsters(dummyAt('dummy-1', 5, 3)); // its body starts at x = 5.25
    walk(game, 'right', 3); // the hero is at x = 3.875, so its strike ends at x = 5.125

    const events = game.send({ type: 'attack' });

    expect(types(events)).toEqual(['hero-attacked']);
  });

  it('hits a monster that is just within the reach of the strike', () => {
    const game = newGameWithMonsters(dummyAt('dummy-1', 5, 3)); // its body starts at x = 5.25
    walk(game, 'right', 5); // the hero is at x = 4.125, so its strike ends at x = 5.375

    const events = game.send({ type: 'attack' });

    expect(types(events)).toEqual(['hero-attacked', 'monster-hit']);
  });

  it('hits a monster that is only partly in front of the hero', () => {
    const game = newGameWithMonsters(dummyAt('dummy-1', 4, 3)); // its body spans y = 3.25 to 3.75
    walk(game, 'down', 4); // the hero is at y = 4, so its strike covers y = 3.5 to 4.5
    face(game, 'right');

    const events = game.send({ type: 'attack' });

    expect(types(events)).toEqual(['hero-attacked', 'monster-hit']);
  });

  it('hits every monster in front of the hero, not only the first', () => {
    const game = newGameWithMonsters(dummyAt('upper', 4, 2), dummyAt('lower', 4, 3));
    walk(game, 'up', 4); // the hero is at y = 3, so its strike covers y = 2.5 to 3.5: both bodies reach into it
    face(game, 'right');

    const events = game.send({ type: 'attack' });

    expect(types(events)).toEqual(['hero-attacked', 'monster-hit', 'monster-hit']);
    expect(playingView(game).monsters.map((monster) => monster.health)).toEqual([2, 2]);
  });
});
