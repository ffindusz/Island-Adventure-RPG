import { describe, expect, it } from 'vitest';
import type { ChargerMonsterDefinition, Game, Snapshot } from '../src/core';
import {
  advance,
  face,
  gameAtTitle,
  monsterAction,
  monsterNamed,
  newGame,
  playingView,
  throughStorage,
  walk,
} from './fixtures';
import { CHARGER, chargerAt, enemyContent, enemyField } from './enemy-fixtures';

// The timeline is that of charger.test.ts: a charger in tile (2, 3) and the hero at (6.5, 3.5), in the same row. The
// wind-up begins in step 1 and the dash is launched in step 31. The dash meets a hero who stays in step 45, and when
// nothing is in its way it ends in step 55. The hero walks 0.125 tile a step, so it takes four steps to get its body
// from the middle of the lane to just outside it.

const ATTACK = { type: 'attack' } as const;

describe('avoiding a charger', () => {
  it.each(['up', 'down'] as const)('costs the hero nothing to step out of the lane %s during the wind-up', (side) => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    game.step(); // the wind-up begins
    walk(game, side, 4);

    const events = advance(game, 50); // to step 55, when the dash comes to the end of its lane

    expect(events.map((event) => event.type)).toEqual(['monster-attacked']);
    expect(playingView(game).hero.health).toBe(10);
    expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 8.5, y: 3.5 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
  });

  it('lets the hero leave at the very last moment of the wind-up', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    advance(game, 27);
    walk(game, 'up', 4); // steps 28 to 31: the hero is out of the lane when the dash is launched

    expect(advance(game, 24)).toEqual([]); // steps 32 to 55
    expect(playingView(game).hero.health).toBe(10);
  });

  it('lets the hero leave even after the dash is on its way, as long as it is not too late', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    advance(game, 41);

    const events = walk(game, 'up', 4); // steps 42 to 45: the hero is out of the lane when the charger would reach it

    expect(events).toEqual([]);
    expect(playingView(game).hero.health).toBe(10);
  });

  it('hurts the hero who leaves too late: the dash reaches it before its body is out of the lane', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    advance(game, 42);

    const events = walk(game, 'up', 4); // steps 43 to 46: in step 45 the hero is still 0.125 tile inside the lane

    expect(events).toEqual([{ type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 4 }]);
  });

  it('does not hurt a hero who stands right beside the lane', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    walk(game, 'up', 4); // before the charger has done anything: the hero's body just clears the lane

    const events = advance(game, 60);

    expect(events.map((event) => event.type)).not.toContain('hero-hit');
    expect(playingView(game).hero.health).toBe(10);
  });
});

describe('what a charger does to a hero in its path', () => {
  it('hurts it by the damage that its Defense leaves', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)], { hero: { defense: 2 } });

    const events = advance(game, 45);

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit']);
    expect(events[1]).toEqual({ type: 'hero-hit', monsterId: 'charger-1', damage: 4, health: 6 });
  });

  it('defeats a hero whose last Health it takes, and the fight starts over', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)], { hero: { health: 6 } });

    const events = advance(game, 45);

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);
    expect(playingView(game).hero).toMatchObject({ position: { x: 6.5, y: 3.5 }, health: 6 });
    expect(monsterNamed(game, 'charger-1')).toMatchObject({
      position: { x: 2.5, y: 3.5 },
      health: 3,
      action: { type: 'idle' },
    });
    game.step();
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });

  it('is not interrupted by a hit: the wind-up and the dash go on as they would have', () => {
    const game = enemyField([chargerAt('charger-1', 5, 3)]); // half a tile between its body and the hero's
    game.step(); // the wind-up begins
    face(game, 'left');
    expect(game.send(ATTACK)).toContainEqual({ type: 'monster-hit', monsterId: 'charger-1', damage: 1, health: 2 });
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 0 });
    expect(advance(game, 29)).toEqual([]); // steps 2 to 30

    expect(game.step().map((event) => event.type)).toEqual(['monster-attacked']); // step 31
    expect(game.send(ATTACK)).toContainEqual({ type: 'monster-hit', monsterId: 'charger-1', damage: 1, health: 1 });
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'dashing', direction: 'right' });
    expect(game.step()).toEqual([]); // step 32: the first move
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 4 }]); // step 33
  });
});

describe('a charger that stands in any direction from the hero', () => {
  it.each([
    { to: 'right', charger: [2, 3], hero: [6, 3], lane: { minX: 2.75, minY: 3.25, maxX: 8.75, maxY: 3.75 } },
    { to: 'left', charger: [10, 3], hero: [6, 3], lane: { minX: 4.25, minY: 3.25, maxX: 10.25, maxY: 3.75 } },
    { to: 'down', charger: [6, 1], hero: [6, 5], lane: { minX: 6.25, minY: 1.75, maxX: 6.75, maxY: 6 } },
    { to: 'up', charger: [6, 5], hero: [6, 1], lane: { minX: 6.25, minY: 1, maxX: 6.75, maxY: 5.25 } },
  ] as const)('dashes $to at the hero, along a lane that ends where the wall does', ({ to, charger, hero, lane }) => {
    const game = enemyField([chargerAt('charger-1', charger[0], charger[1])], {
      start: { area: 'arena', tile: { col: hero[0], row: hero[1] } },
    });

    game.step();
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'winding-up', progress: 0, zone: lane });

    expect(advance(game, 30)).toEqual([{ type: 'monster-attacked', monsterId: 'charger-1', zone: lane }]);
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'dashing', direction: to });
    expect(advance(game, 14)).toEqual([{ type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 4 }]);
  });
});

describe('a tougher charger is a change of data', () => {
  // The heavy charger has 6 Health, hits for 8, winds up for 300 ms (18 steps), dashes at 22.5 tiles a second (0.375
  // tile a step) and recovers for 400 ms (24 steps). Its dash is launched in step 19 and has made 9 moves in step 28,
  // when its right edge is 0.125 tile short of the hero. The tenth move meets the hero, in step 29.
  const HEAVY: ChargerMonsterDefinition = {
    ...CHARGER,
    health: 6,
    damage: 8,
    windUpMs: 300,
    dashSpeedTilesPerSecond: 22.5,
    recoveryMs: 400,
  };

  it('winds up, dashes, hits and recovers by its own numbers, with no code of its own', () => {
    const game = enemyField([{ id: 'heavy-1', type: 'heavy', tile: { col: 2, row: 3 } }], {
      monsterTypes: { heavy: HEAVY },
    });
    expect(monsterNamed(game, 'heavy-1')).toMatchObject({ health: 6, maxHealth: 6 });

    expect(advance(game, 19).map((event) => event.type)).toEqual(['monster-attacked']);
    expect(advance(game, 9)).toEqual([]);
    expect(monsterNamed(game, 'heavy-1').position).toEqual({ x: 5.875, y: 3.5 });
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'heavy-1', damage: 8, health: 2 }]); // step 29
    expect(monsterNamed(game, 'heavy-1').position).toEqual({ x: 6, y: 3.5 });

    expect(advance(game, 23)).toEqual([]); // steps 30 to 52 are recovery
    expect(monsterAction(game, 'heavy-1')).toEqual({ type: 'recovering' });
    game.step(); // step 53
    expect(monsterAction(game, 'heavy-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });
});

describe('the snapshot of a charger', () => {
  const content = enemyContent([chargerAt('charger-1', 2, 3)], { hero: { health: 20 } });

  function continuedFrom(snapshot: Snapshot): Game {
    const game = gameAtTitle(content);
    game.send({ type: 'continue', snapshot: throughStorage(snapshot) });
    return game;
  }

  it.each([
    { stage: 'wind-up', steps: 10 },
    { stage: 'dash', steps: 38 },
    { stage: 'recovery', steps: 60 },
  ])('restores a charger in its $stage, and the game plays on exactly as it would have', ({ steps }) => {
    const original = newGame(content);
    advance(original, steps);

    const restored = continuedFrom(original.snapshot());

    expect(restored.view()).toEqual(original.view());
    expect(advance(restored, 100)).toEqual(advance(original, 100));
    expect(restored.view()).toEqual(original.view());
  });

  it('restores a dash with what is left of its lane, so that it ends where it would have', () => {
    const original = newGame(content);
    original.step();
    walk(original, 'up', 4);
    advance(original, 36); // step 41: ten moves into a dash of 24, with the charger at x = 5

    const restored = continuedFrom(original.snapshot());
    advance(restored, 14);

    expect(monsterNamed(restored, 'charger-1').position).toEqual({ x: 8.5, y: 3.5 });
    expect(monsterAction(restored, 'charger-1')).toEqual({ type: 'recovering' });
  });
});
