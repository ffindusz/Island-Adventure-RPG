import { describe, expect, it } from 'vitest';
import { advance, monsterAction, monsterNamed, playingView, walk } from './fixtures';
import { SHOOTER, enemyField, shooterAt, untilFired } from './enemy-fixtures';

// A shooter in tile (2, 3) stands at (2.5, 3.5), so its body spans x 2.25 to 2.75 and y 3.25 to 3.75. The hero stands at
// (6.5, 3.5): its body spans x 6.25 to 6.75 and y 3.25 to 3.75, in the same row of space.
//
// The steps of such a shooter, counting from the first step of the game: the wind-up begins in step 1 and ends in step
// 31, when the shot is fired from the shooter's centre. The projectile flies 0.0625 tile in each of the steps after
// that, so it has made k moves in step 31 + k. Its body is 0.25 wide: its front edge is at x = 2.625 + 0.0625 k. The
// hero's left edge is at x = 6.25, so the two meet after 58 moves, in step 89.

const SHOOTER_BODY = { minX: 2.25, minY: 3.25, maxX: 2.75, maxY: 3.75 };

describe('a ranged attacker that has noticed the hero', () => {
  it('stands still while the hero is farther than it can notice', () => {
    // The hero's left edge is at x = 12.25, 9.5 tiles from the shooter's front edge: more than the 6 it notices.
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { start: { area: 'arena', tile: { col: 12, row: 3 } } });

    expect(advance(game, 60)).toEqual([]);

    expect(monsterAction(game, 'shooter-1')).toEqual({ type: 'idle' });
    expect(playingView(game).arrows).toEqual([]);
  });

  it('notices the hero when the hero comes within 6 tiles of its body, and starts to wind up', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { start: { area: 'arena', tile: { col: 12, row: 3 } } });

    // The hero's left edge reaches x = 8.75, 6 tiles from the shooter's front edge, after 28 steps: touching is not within.
    walk(game, 'left', 28);
    expect(monsterAction(game, 'shooter-1')).toEqual({ type: 'idle' });

    walk(game, 'left', 1);
    expect(monsterAction(game, 'shooter-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });

  it('notices from as near as its type says: a short-sighted shooter stands by a hero 3.5 tiles away', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], {
      monsterTypes: { shooter: { ...SHOOTER, noticingDistance: 3 } },
    });

    expect(advance(game, 40)).toEqual([]);

    expect(monsterAction(game, 'shooter-1')).toEqual({ type: 'idle' });
  });

  it('notices from as far as its type says: a far-sighted shooter winds up for a hero 9.5 tiles away', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], {
      start: { area: 'arena', tile: { col: 12, row: 3 } },
      monsterTypes: { shooter: { ...SHOOTER, noticingDistance: 10 } },
    });

    game.step();

    expect(monsterAction(game, 'shooter-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });

  it('starts winding up at once, and the telegraph is a flash on its own body', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, 'shooter-1')).toEqual({ type: 'winding-up', progress: 0, zone: SHOOTER_BODY });
  });

  it('flashes on the whole of its body, which is as large as its type says', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { monsterTypes: { shooter: { ...SHOOTER, size: 0.75 } } });

    game.step();

    expect(monsterAction(game, 'shooter-1')).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 2.125, minY: 3.125, maxX: 2.875, maxY: 3.875 },
    });
  });

  it('shows how far the wind-up has come, which is the share of its 30 steps that have passed', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    game.step(); // the wind-up starts

    advance(game, 15);
    expect(monsterAction(game, 'shooter-1')).toMatchObject({ type: 'winding-up', progress: 0.5 });

    advance(game, 14); // 29 of 30 steps
    expect(monsterAction(game, 'shooter-1')).toMatchObject({ type: 'winding-up', progress: 29 / 30 });
  });

  it('stays where it is while it winds up, and fires nothing yet', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);

    expect(advance(game, 30)).toEqual([]);

    expect(monsterNamed(game, 'shooter-1').position).toEqual({ x: 2.5, y: 3.5 });
    expect(playingView(game).arrows).toEqual([]);
  });
});

describe('a ranged attacker firing', () => {
  it('fires when the wind-up ends: the shot leaves its centre, in the direction of the hero', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);

    const events = untilFired(game);

    expect(events).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' }]);
    expect(playingView(game).arrows).toEqual([
      { position: { x: 2.5, y: 3.5 }, direction: 'right', size: 0.25, shooter: 'monster' },
    ]);
  });

  it('fires toward the hero along the axis it is farther away on: here down, with the hero below it', () => {
    // The hero in tile (6, 3) is 1 tile across and 2 tiles down from the shooter in tile (5, 1).
    const game = enemyField([shooterAt('shooter-1', 5, 1)]);

    const events = untilFired(game);

    expect(events).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: 'down' }]);
    expect(playingView(game).arrows).toEqual([
      { position: { x: 5.5, y: 1.5 }, direction: 'down', size: 0.25, shooter: 'monster' },
    ]);
  });

  it.each([
    { where: 'below it, to its right', shooter: { col: 4, row: 1 }, direction: 'right' },
    { where: 'below it, to its left', shooter: { col: 8, row: 1 }, direction: 'left' },
    { where: 'above it, to its right', shooter: { col: 4, row: 5 }, direction: 'right' },
    { where: 'above it, to its left', shooter: { col: 8, row: 5 }, direction: 'left' },
  ] as const)('fires along its row when the hero is as far across as down: the hero is $where', (c) => {
    // The hero in tile (6, 3) is exactly 2 tiles across and 2 tiles down from each of these shooters.
    const game = enemyField([shooterAt('shooter-1', c.shooter.col, c.shooter.row)]);

    const events = untilFired(game);

    expect(events).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: c.direction }]);
  });
});

describe('a projectile in flight', () => {
  it('flies straight on in the direction it was fired in, at the speed of its type: 0.0625 tile in each step', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    untilFired(game);

    advance(game, 1);
    expect(playingView(game).arrows).toEqual([
      { position: { x: 2.5625, y: 3.5 }, direction: 'right', size: 0.25, shooter: 'monster' },
    ]);

    advance(game, 15);
    expect(playingView(game).arrows).toEqual([
      { position: { x: 3.5, y: 3.5 }, direction: 'right', size: 0.25, shooter: 'monster' },
    ]);
  });

  it('hurts the hero when it reaches it, for its damage, and is gone', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    untilFired(game);

    // 57 moves bring its front edge to x = 6.1875, 0.0625 from the hero.
    expect(advance(game, 57)).toEqual([]);
    expect(playingView(game).arrows).toHaveLength(1);

    expect(advance(game, 1)).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]);
    expect(playingView(game).arrows).toEqual([]);
    expect(playingView(game).hero.health).toBe(6);
  });

  it('hurts the hero once: nothing of that shot is left in the air after the hit', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)]);
    untilFired(game);
    advance(game, 58);

    // The shooter has rested since the shot and winds up again from step 79: its next shot is not fired until step 109.
    expect(advance(game, 19)).toEqual([]);

    expect(playingView(game).arrows).toEqual([]);
    expect(playingView(game).hero.health).toBe(6);
  });

  it("is reduced by the hero's Defense like any hit, down to the minimum damage", () => {
    const withDefense = (defense: number, minimumDamage?: number) => {
      const game = enemyField([shooterAt('shooter-1', 2, 3)], { hero: { defense }, minimumDamage });
      untilFired(game);
      return advance(game, 58);
    };

    expect(withDefense(1)).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 3, health: 7 }]);
    expect(withDefense(4)).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 1, health: 9 }]); // the default minimum
    expect(withDefense(9)).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 1, health: 9 }]);
    expect(withDefense(9, 2)).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 2, health: 8 }]);
  });
});
