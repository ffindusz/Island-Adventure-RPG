import { describe, expect, it } from 'vitest';
import type { Game } from '../src/core';
import { advance, chestAt, dummyAt, face, monsterAction, monsterNamed, playingView, walk } from './fixtures';
import { chargerAt, CHARGER_RECOVERY_STEPS, enemyField } from './enemy-fixtures';

// A charger in tile (2, 3) stands at (2.5, 3.5), so its body spans x 2.25 to 2.75 and y 3.25 to 3.75. The hero stands at
// (6.5, 3.5): its body spans x 6.25 to 6.75 and y 3.25 to 3.75, in the same row of space. The charger's lane to the
// right begins at its front edge, x = 2.75, is as wide as its body, and is 6 tiles long: x 2.75 to 8.75.
//
// The steps of such a charger, counting from the first step of the game: the wind-up begins in step 1 and ends in step
// 31, when the dash is launched. The dash moves 0.25 tile in each of the steps after that, so it has made k moves in
// step 31 + k. The hero's left edge is at x = 6.25 and the charger's right edge is at its centre + 0.25: the two meet
// after 14 moves, in step 45.

const LANE_RIGHT = { minX: 2.75, minY: 3.25, maxX: 8.75, maxY: 3.75 };

/**
 * Plays a game up to step 31, the one in which the charger launches its dash, with the hero having stepped aside: it
 * walked up by half a tile during the wind-up, which puts its body just outside the lane.
 */
function launchedDashPastHero(game: Game): Game {
  game.step(); // the wind-up begins, with the hero in the lane
  walk(game, 'up', 4);
  advance(game, 26);
  return game;
}

describe('a charger with the hero in its line', () => {
  it('starts winding up as soon as it has noticed the hero, and shows the lane it will dash along', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'winding-up', progress: 0, zone: LANE_RIGHT });
  });

  it('shows how far the wind-up has come, which is the share of its 30 steps that have passed', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    game.step(); // the wind-up starts

    advance(game, 15);
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 0.5 });

    advance(game, 14); // 29 of 30 steps
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 29 / 30 });
  });

  it('locks the lane when the wind-up starts: it does not follow a hero who walks away', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    game.step(); // the wind-up starts

    walk(game, 'down', 8); // the hero ends a tile lower, at (6.5, 4.5), out of the lane

    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'winding-up', progress: 8 / 30, zone: LANE_RIGHT });
  });

  it('shows a lane that ends where solid terrain would stop the dash', () => {
    // The charger in tile (9, 3) has the wall of column 13 ahead of it: its lane ends at x = 13, 3.25 tiles from its front edge.
    const game = enemyField([chargerAt('charger-1', 9, 3)], { start: { area: 'arena', tile: { col: 12, row: 3 } } });

    game.step();

    expect(monsterAction(game, 'charger-1')).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 9.75, minY: 3.25, maxX: 13, maxY: 3.75 },
    });
  });

  it('shows a lane that ends where a chest would stop the dash', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)], { interactables: [chestAt('chest-1', 8, 3, 'iron-sword')] });

    game.step();

    expect(monsterAction(game, 'charger-1')).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 2.75, minY: 3.25, maxX: 8, maxY: 3.75 },
    });
  });
});

describe('a charger dashing', () => {
  it('launches the dash when the wind-up ends: the lane flashes as the attack, and the charger has not moved yet', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    advance(game, 30);
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up' });

    const events = game.step();

    expect(events).toEqual([{ type: 'monster-attacked', monsterId: 'charger-1', zone: LANE_RIGHT }]);
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'dashing', direction: 'right' });
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 2.5, y: 3.5 });
  });

  it('dashes straight along its lane, a quarter of a tile in each step', () => {
    const game = launchedDashPastHero(enemyField([chargerAt('charger-1', 2, 3)]));

    advance(game, 1);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 2.75, y: 3.5 });

    advance(game, 3);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 3.5, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'dashing', direction: 'right' });
  });

  it('stops at the end of its lane, when nothing was in the way, and recovers', () => {
    const game = launchedDashPastHero(enemyField([chargerAt('charger-1', 2, 3)]));

    advance(game, 23); // 23 of the 24 moves that the 6 tiles of the lane take
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 8.25, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'dashing', direction: 'right' });

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 8.5, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
  });

  it('hurts the hero in its path where they meet, and stops flush against the hero without pushing it', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    advance(game, 31);

    expect(advance(game, 13)).toEqual([]); // the charger's right edge is a quarter of a tile short of the hero
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 5.75, y: 3.5 });

    const events = game.step();

    expect(events).toEqual([{ type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 4 }]);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 6, y: 3.5 });
    expect(playingView(game).hero.position).toEqual({ x: 6.5, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
  });

  it('stops flush against solid terrain at the end of the lane that was shown', () => {
    const game = enemyField([chargerAt('charger-1', 9, 3)], { start: { area: 'arena', tile: { col: 12, row: 3 } } });
    game.step();
    walk(game, 'up', 4);
    advance(game, 26); // step 31: the dash is launched

    advance(game, 12);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 12.5, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'dashing', direction: 'right' });

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 12.75, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
  });

  it('stops flush against a chest at the end of the lane that was shown', () => {
    const game = launchedDashPastHero(
      enemyField([chargerAt('charger-1', 2, 3)], { interactables: [chestAt('chest-1', 8, 3, 'iron-sword')] }),
    );

    advance(game, 20);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 7.5, y: 3.5 });

    advance(game, 1);

    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 7.75, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
  });

  it('stops flush against another monster in its way, which shields the hero behind it', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3), dummyAt('dummy-1', 4, 3)]);
    advance(game, 31);

    const events = advance(game, 20); // far longer than the 14 moves that would have met the hero

    expect(events).toEqual([]);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 4, y: 3.5 });
    expect(monsterNamed(game, 'dummy-1').health).toBe(3);
    expect(playingView(game).hero.health).toBe(10);
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
  });
});

describe('a charger recovering', () => {
  it('rests for the recovery time after its dash, and then looks for the hero again', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    advance(game, 45); // the dash meets the hero in step 45

    expect(advance(game, CHARGER_RECOVERY_STEPS - 1)).toEqual([]);
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });

    game.step();

    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });

  it('can be hit freely while it recovers, and the hit does not cut its recovery short', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    advance(game, 45);
    face(game, 'left'); // the hero turns to the charger, which is flush against it
    advance(game, 24); // the attack cooldown

    const events = game.send({ type: 'attack' });

    expect(events).toContainEqual({ type: 'monster-hit', monsterId: 'charger-1', damage: 1, health: 2 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
  });
});
