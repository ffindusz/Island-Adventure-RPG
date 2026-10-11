import { describe, expect, it } from 'vitest';
import type { Game } from '../src/core';
import {
  ATTACK,
  advance,
  continuedFrom,
  face,
  monsterAction,
  monsterNamed,
  newGame,
  playingView,
  walk,
} from './fixtures';
import { enemyContent, enemyField, shooterAt, SNIPER, untilFired } from './enemy-fixtures';

// The timeline is that of ranged-attacker.test.ts: a shooter in tile (2, 3) and the hero at (6.5, 3.5), in the same row.
// The wind-up begins in step 1 and the shot is fired in step 31. It flies 0.0625 tile a step and meets a hero who stays
// where it is in step 89. The shot flies along the row of the shooter: its body, 0.25 wide, spans y 3.375 to 3.625. The
// hero walks 0.125 tile a step, and its body, 0.5 wide, is out of that row after three steps sideways.

describe('avoiding a shooter', () => {
  it.each(['up', 'down'] as const)('costs the hero nothing to step out of the line of fire %s during the wind-up', (side) => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    walk(game, side, 3); // steps 1 to 3

    const events = advance(game, 100); // steps 4 to 103

    expect(events).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' }]);
    expect(playingView(game).hero.health).toBe(10);
  });

  it('hurts a hero who has not left the line of fire altogether: two steps are not enough', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    walk(game, 'down', 2);

    const events = advance(game, 87); // steps 3 to 89

    expect(events).toEqual([
      { type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' },
      { type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 },
    ]);
  });

  it('lets the hero step aside from the shot in the air, until the last three steps before it arrives', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    advance(game, 86); // the shot has made 55 moves: its front edge is 0.1875 tile from the hero

    const events = walk(game, 'down', 3); // steps 87 to 89: the hero's body is out of its way when it arrives

    expect(events).toEqual([]);
    expect(playingView(game).hero.health).toBe(10);
  });

  it('hurts the hero who steps aside a step too late', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    advance(game, 87);

    const events = walk(game, 'down', 3); // steps 88 to 90: in step 89 the hero is still in the way

    expect(events).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]);
  });

  it('is aimed when it is fired and does not follow: a hero that walks into the line after the shot is hit', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    walk(game, 'down', 8); // steps 1 to 8: the hero is a tile below the row of the shooter
    advance(game, 23); // steps 9 to 31: the shot is fired along the row, and misses the hero where it stands
    expect(playingView(game).arrows).toHaveLength(1);

    walk(game, 'up', 8); // steps 32 to 39: the hero is back in the row
    const events = advance(game, 50); // steps 40 to 89

    expect(events).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]);
  });

  it('aims where the hero is when the wind-up ends, not where it was when the wind-up began', () => {
    // From tile (5, 1) the hero in tile (6, 3) is 1 across and 2 down: a shot would go down. The hero walks 3 tiles to
    // the right during the wind-up, and is 4 across and 2 down when the shot is fired.
    const game = enemyField([shooterAt('shooter-1', 5, 1)]);
    walk(game, 'right', 24);

    expect(advance(game, 7)).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' }]);
  });
});

describe('a shooter that stands in any direction from the hero', () => {
  // The hero is at (6.5, 3.5). A shot from the left or right takes 58 moves to reach it, one from above or below 26.
  it.each([
    { from: 'the left', tile: [2, 3], direction: 'right', moves: 58 },
    { from: 'the right', tile: [10, 3], direction: 'left', moves: 58 },
    { from: 'above', tile: [6, 1], direction: 'down', moves: 26 },
    { from: 'below', tile: [6, 5], direction: 'up', moves: 26 },
  ] as const)('fires at the hero that is to its side: $from, and hurts it when the shot arrives', ({ tile, direction, moves }) => {
    const game = enemyField([shooterAt('shooter-1', tile[0], tile[1])]);

    expect(untilFired(game)).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction }]);

    expect(advance(game, moves - 1)).toEqual([]);
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]);
  });
});

describe('a shooter that has been hit', () => {
  // The hero in tile (3, 3) stands 0.5 tile from the shooter in tile (2, 3), in its line of fire, with Health to spare.
  // The shot meets the hero in step 41.
  function besideTheShooter(): Game {
    return enemyField([shooterAt('shooter-1', 2, 3)], {
      start: { area: 'arena', tile: { col: 3, row: 3 } },
      hero: { health: 100 },
    });
  }

  it('is not interrupted in its wind-up: the shot is fired when it would have been', () => {
    const game = besideTheShooter();
    game.step(); // the wind-up begins
    face(game, 'left');
    expect(game.send(ATTACK)).toContainEqual({ type: 'monster-hit', monsterId: 'shooter-1', damage: 1, health: 2 });
    expect(monsterAction(game, 'shooter-1')).toMatchObject({ type: 'winding-up', progress: 0 });

    expect(advance(game, 29)).toEqual([]); // steps 2 to 30
    expect(game.step()).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' }]); // step 31
  });

  it('can be hit freely while it rests after a shot, and winds up again when the rest is over', () => {
    const game = besideTheShooter();
    advance(game, 31); // the shot is fired
    face(game, 'left');
    expect(game.send(ATTACK)).toContainEqual({ type: 'monster-hit', monsterId: 'shooter-1', damage: 1, health: 2 });
    expect(monsterAction(game, 'shooter-1')).toEqual({ type: 'recovering' });

    advance(game, 47); // step 78: the rest of 48 steps has one step to go
    expect(monsterAction(game, 'shooter-1')).toEqual({ type: 'recovering' });
    game.step(); // step 79
    expect(monsterAction(game, 'shooter-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });
});

describe('a tougher shooter is a change of data', () => {
  // The sniper fires in step 19 and its shot makes 29 moves to the hero, so it arrives in step 48. The rest is over in
  // step 43, when the sniper winds up again.
  it('winds up, shoots, hurts and rests by its own numbers, with no code of its own', () => {
    const game = enemyField([{ id: 'sniper-1', type: 'sniper', tile: { col: 2, row: 3 } }], {
      monsterTypes: { sniper: SNIPER },
    });
    expect(monsterNamed(game, 'sniper-1')).toMatchObject({ health: 6, maxHealth: 6 });

    expect(advance(game, 18)).toEqual([]);
    expect(game.step()).toEqual([{ type: 'monster-fired', monsterId: 'sniper-1', direction: 'right' }]); // step 19
    expect(advance(game, 28)).toEqual([]); // steps 20 to 47
    expect(playingView(game).arrows).toEqual([
      { position: { x: 6, y: 3.5 }, direction: 'right', size: 0.25, shooter: 'monster' },
    ]);
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'sniper-1', damage: 6, health: 4 }]); // step 48

    expect(monsterAction(game, 'sniper-1')).toMatchObject({ type: 'winding-up', progress: 5 / 18 });
  });
});

describe('the snapshot of a shooter', () => {
  const content = enemyContent([shooterAt('shooter-1', 2, 3)], { hero: { health: 20 } });

  it.each([
    { stage: 'wind-up', steps: 10 },
    { stage: 'shot in the air', steps: 50 },
    { stage: 'second wind-up', steps: 95 },
  ])('restores a shooter in its $stage, and the game plays on exactly as it would have', ({ steps }) => {
    const original = newGame(content);
    advance(original, steps);

    const restored = continuedFrom(content, original.snapshot());

    expect(restored.view()).toEqual(original.view());
    expect(advance(restored, 100)).toEqual(advance(original, 100));
    expect(restored.view()).toEqual(original.view());
  });

  it('restores the shot in the air as a monster’s, with its shooter and what is left of its range', () => {
    const original = newGame(content);
    advance(original, 50);

    const restored = continuedFrom(content, original.snapshot());

    expect(playingView(restored).arrows).toEqual([
      { position: { x: 3.6875, y: 3.5 }, direction: 'right', size: 0.25, shooter: 'monster' },
    ]);
    expect(advance(restored, 39)).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 16 }]);
  });
});
