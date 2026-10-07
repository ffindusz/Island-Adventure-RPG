import { describe, expect, it } from 'vitest';
import type { RangedMonsterDefinition } from '../src/core';
import { advance, monsterAction, monsterNamed, playingView, walk } from './fixtures';
import { enemyField, KEEPER, keeperAt, shooterAt } from './enemy-fixtures';

// A keeper in tile (2, 3) stands at (2.5, 3.5) and the hero at (6.5, 3.5), both with a body 0.5 wide: 4 tiles between
// their centres and so 3.5 between their bodies, which is farther than the 3 that the keeper likes. It notices the hero
// from 6 tiles, so it walks toward it, 0.0625 tile a step, and has made its 8 moves in step 8, when it stands at
// x = 3 with 3 tiles between the bodies. The wind-up begins in step 9 and the shot is fired in step 39.
//
// The distance is the gap between the bodies, counted along the axis on which the two are farther apart: the way the
// keeper walks, toward the hero or away from it.

describe('a ranged attacker that keeps its distance', () => {
  it('walks toward a hero that is farther away than it likes, and winds up when it is as near as it likes', () => {
    const game = enemyField([keeperAt('keeper-1', 2, 3)]);

    game.step();
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 2.5625, y: 3.5 }, action: { type: 'chasing' } });
    advance(game, 7); // step 8
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 3, y: 3.5 }, action: { type: 'chasing' } });

    game.step(); // step 9
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({
      position: { x: 3, y: 3.5 },
      action: { type: 'winding-up', progress: 0 },
    });
  });

  it('fires from where it has stopped', () => {
    const game = enemyField([keeperAt('keeper-1', 2, 3)]);

    expect(advance(game, 38)).toEqual([]);
    expect(game.step()).toEqual([{ type: 'monster-fired', monsterId: 'keeper-1', direction: 'right' }]);

    expect(playingView(game).arrows).toEqual([
      { position: { x: 3, y: 3.5 }, direction: 'right', size: 0.25, shooter: 'monster' },
    ]);
  });

  it('walks away from a hero that is nearer than it likes, and winds up when it is as far as it likes', () => {
    // From tile (4, 3) there is 1.5 tile between the bodies: 1.5 more are needed, which is 24 moves.
    const game = enemyField([keeperAt('keeper-1', 4, 3)]);

    game.step();
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 4.4375, y: 3.5 }, action: { type: 'chasing' } });
    advance(game, 23); // step 24
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 3, y: 3.5 }, action: { type: 'chasing' } });

    game.step(); // step 25
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({
      position: { x: 3, y: 3.5 },
      action: { type: 'winding-up', progress: 0 },
    });
  });

  it.each([
    // 0.375 tile more than it likes, which is 6 moves of 0.0625: 3.625 between the centres, 3 between the bodies.
    { what: 'a keeper 0.75 wide', keeper: { ...KEEPER, size: 0.75 }, hero: {}, moves: 6, x: 2.875 },
    // 0.25 tile more than it likes, which is 4 moves: 3.75 between the centres, 3 between the bodies.
    { what: 'a hero 1 wide', keeper: KEEPER, hero: { size: 1 }, moves: 4, x: 2.75 },
  ])('counts the distance between the bodies, not between the centres: $what', ({ keeper, hero, moves, x }) => {
    const game = enemyField([keeperAt('keeper-1', 2, 3)], { monsterTypes: { keeper }, hero });

    advance(game, moves);
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x, y: 3.5 }, action: { type: 'chasing' } });

    game.step();
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({
      position: { x, y: 3.5 },
      action: { type: 'winding-up', progress: 0 },
    });
  });

  it('walks only as far as it must: it stops at the distance it likes, and not a step past it', () => {
    // It likes 3.25 tiles here and walks 0.09375 tile a step. From tile (4, 3) it must walk 1.75 tile: 18 moves of
    // 0.09375 and then 0.0625.
    const keeper: RangedMonsterDefinition = {
      ...KEEPER,
      keepsDistance: { preferredDistance: 3.25, speedTilesPerSecond: 5.625 },
    };
    const game = enemyField([keeperAt('keeper-1', 4, 3)], { monsterTypes: { keeper } });

    advance(game, 18);
    expect(monsterNamed(game, 'keeper-1').position).toEqual({ x: 2.8125, y: 3.5 });
    game.step(); // step 19

    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 2.75, y: 3.5 }, action: { type: 'chasing' } });
    game.step(); // step 20
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({
      position: { x: 2.75, y: 3.5 },
      action: { type: 'winding-up', progress: 0 },
    });
  });

  it('keeps to the long way between itself and the hero: it walks away along the axis they are farther apart on', () => {
    // From tile (3, 1) the hero is 3 tiles across and 2 down: there are 2.5 tiles between the bodies. It walks away along
    // the row, to the left, and not along the column.
    const game = enemyField([keeperAt('keeper-1', 3, 1)]);

    advance(game, 8);
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 3, y: 1.5 }, action: { type: 'chasing' } });

    game.step(); // step 9
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({
      position: { x: 3, y: 1.5 },
      action: { type: 'winding-up', progress: 0 },
    });
  });

  it('winds up where it stands when it has no room to walk away: it is cornered', () => {
    // From tile (1, 3) it has 0.25 tile to the wall behind it, which it walks in 4 moves, and the hero in tile (3, 3) is
    // nearer than it likes. In step 5 it cannot move, and so it winds up.
    const game = enemyField([keeperAt('keeper-1', 1, 3)], { start: { area: 'arena', tile: { col: 3, row: 3 } } });

    advance(game, 4);
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 1.25, y: 3.5 }, action: { type: 'chasing' } });

    game.step(); // step 5
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({
      position: { x: 1.25, y: 3.5 },
      action: { type: 'winding-up', progress: 0 },
    });
    expect(advance(game, 29)).toEqual([]);
    expect(game.step()).toEqual([{ type: 'monster-fired', monsterId: 'keeper-1', direction: 'right' }]); // step 35
  });

  it('stands where it is while it winds up and while it rests after a shot, however near the hero comes', () => {
    const game = enemyField([keeperAt('keeper-1', 2, 3)]);
    advance(game, 9); // it has walked up to x = 3 and begins to wind up
    walk(game, 'left', 16); // steps 10 to 25: the hero stands 1 tile from its body, nearer than it likes
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 3, y: 3.5 }, action: { type: 'winding-up' } });

    advance(game, 14); // step 39: the shot is fired
    advance(game, 47); // step 86
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 3, y: 3.5 }, action: { type: 'recovering' } });

    game.step(); // step 87: the rest is over, and it walks away from the hero
    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 2.9375, y: 3.5 }, action: { type: 'chasing' } });
  });

  it('does not walk while it has not noticed the hero, however far that is from the distance it likes', () => {
    const game = enemyField([keeperAt('keeper-1', 2, 3)], { start: { area: 'arena', tile: { col: 12, row: 3 } } });

    expect(advance(game, 60)).toEqual([]);

    expect(monsterNamed(game, 'keeper-1')).toMatchObject({ position: { x: 2.5, y: 3.5 }, action: { type: 'idle' } });
  });
});

describe('a ranged attacker with no distance that it likes', () => {
  it.each([
    { hero: 'far away', col: 6 },
    { hero: 'right beside it', col: 3 },
  ])('stands where it is for good, with the hero $hero', ({ col }) => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], {
      start: { area: 'arena', tile: { col, row: 3 } },
      hero: { health: 100 },
    });

    advance(game, 200);

    expect(monsterNamed(game, 'shooter-1').position).toEqual({ x: 2.5, y: 3.5 });
    expect(monsterAction(game, 'shooter-1').type).not.toBe('chasing');
  });
});
