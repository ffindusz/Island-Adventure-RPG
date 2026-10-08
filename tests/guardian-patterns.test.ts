import { describe, expect, it } from 'vitest';
import type { Game } from '../src/core';
import { advance, face, monsterAction, monsterNamed, playingView, walk } from './fixtures';
import type { ArenaOptions } from './fixtures';
import {
  CHARGE_RECOVERY_STEPS,
  CHARGE_WIND_UP_STEPS,
  GUARDIAN_WALK_STEP,
  SMITE_RECOVERY_STEPS,
  SMITE_WIND_UP_STEPS,
  SWEEP_RECOVERY_STEPS,
  SWEEP_WIND_UP_STEPS,
  guardianAt,
  guardianField,
  guardianInOrder,
} from './guardian-fixtures';

// The three patterns of a Guardian, one at a time, on the Guardian of guardian-fixtures.ts. The hero begins at (6.5, 3.5)
// with a body 0.5 wide, walking 0.125 tile a step. A wind-up that begins in step 1 has its first of N steps then and
// ends in step N + 1, which is when the attack lands or the dash is launched.

const GUARDIAN = 'guardian-1';

// The sweep. In tile (5, 3) the Guardian stands at (5.5, 3.5): its body spans x 5 to 6 and y 3 to 4, and the hero's body
// lies a quarter of a tile to the right of it, within the 1 tile its sweep reaches. The zone is its body grown by 1 on
// every side. The hero is out of it with its left edge at x = 7 or more: after a walk of 6 steps to the right at the
// least, since it begins at x = 6.25.
const SWEEP_ZONE = { minX: 4, minY: 2, maxX: 7, maxY: 5 };
const sweeper = (options: ArenaOptions = {}): Game => guardianField([guardianAt(GUARDIAN, 5, 3)], options);

// The charge. In tile (2, 3) the Guardian stands at (2.5, 3.5): body x 2 to 3, y 3 to 4. The hero is in its row of space,
// 3.25 tiles from its front edge, and out of reach of the sweep. The lane to the right begins at x = 3, is as wide as the
// Guardian (y 3 to 4) and 6 tiles long, so it ends at x = 9. The dash is launched in step 37, makes a quarter of a tile in
// each step after that, and closes the 3.25 tiles to the hero's left edge (x = 6.25) with its 13th move, in step 50. The
// hero is out of the lane with its top edge at y = 3 or less: after a walk of 6 steps up at the least.
const CHARGE_LANE = { minX: 3, minY: 3, maxX: 9, maxY: 4 };
const charger = (options: ArenaOptions = {}): Game => guardianField([guardianAt(GUARDIAN, 2, 3)], options);

// The smite. In tile (2, 1) the Guardian stands at (2.5, 1.5): body x 2 to 3, y 1 to 2. The hero begins in tile (5, 3), at
// (5.5, 3.5): out of the sweep's reach, not in the lane (it runs along row 1), and within the 4 tiles the smite reaches.
// The square of the smite is 2 tiles wide and centred on where the hero stands when the wind-up begins. The hero is out of
// it with its left edge at x = 6.5 or more: after a walk of 10 steps to the right at the least.
const SMITE_ZONE = { minX: 4.5, minY: 2.5, maxX: 6.5, maxY: 4.5 };
const smiter = (options: ArenaOptions = {}): Game =>
  guardianField([guardianAt(GUARDIAN, 2, 1)], { start: { area: 'arena', tile: { col: 5, row: 3 } }, ...options });

const heroHealth = (game: Game): number => playingView(game).hero.health;

describe('a Guardian with the hero within reach of its sweep', () => {
  it('starts winding up as soon as it has noticed the hero, and shows the zone it will strike', () => {
    const game = sweeper();

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 0, zone: SWEEP_ZONE });
  });

  it('hurts nothing before the wind-up ends, which takes the steps that its data says', () => {
    const game = sweeper();
    game.step();

    const events = advance(game, SWEEP_WIND_UP_STEPS - 1);

    expect(events).toEqual([]);
    expect(heroHealth(game)).toBe(10);
    expect(monsterAction(game, GUARDIAN)).toEqual({
      type: 'winding-up',
      progress: (SWEEP_WIND_UP_STEPS - 1) / SWEEP_WIND_UP_STEPS,
      zone: SWEEP_ZONE,
    });
  });

  it('strikes when the wind-up ends: the zone flashes, and the hero in it takes the damage of the sweep', () => {
    const game = sweeper();
    advance(game, SWEEP_WIND_UP_STEPS);

    const events = game.step();

    expect(events).toEqual([
      { type: 'monster-attacked', monsterId: GUARDIAN, zone: SWEEP_ZONE },
      { type: 'hero-hit', monsterId: GUARDIAN, damage: 4, health: 6 },
    ]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
  });

  it('takes the Defense of the hero off the damage of the sweep', () => {
    const game = sweeper({ hero: { defense: 2 } });
    advance(game, SWEEP_WIND_UP_STEPS);

    const events = game.step();

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: GUARDIAN, damage: 2, health: 8 });
  });

  it('fixes the zone when the wind-up begins: a hero who walks out of it takes no damage', () => {
    const game = sweeper();
    game.step();

    walk(game, 'right', 8);

    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 8 / SWEEP_WIND_UP_STEPS, zone: SWEEP_ZONE });
    advance(game, SWEEP_WIND_UP_STEPS - 9);
    expect(game.step()).toEqual([{ type: 'monster-attacked', monsterId: GUARDIAN, zone: SWEEP_ZONE }]);
    expect(heroHealth(game)).toBe(10);
  });

  it('hurts the hero who stays once, and rests for the recovery of the sweep, with no second hit', () => {
    const game = sweeper();
    advance(game, SWEEP_WIND_UP_STEPS + 1);

    expect(advance(game, SWEEP_RECOVERY_STEPS - 1)).toEqual([]);

    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
    expect(heroHealth(game)).toBe(6);
    game.step();
    expect(monsterAction(game, GUARDIAN)).toMatchObject({ type: 'winding-up', progress: 0 });
  });

  it('can be hit freely while it recovers, and the hit does not cut its recovery short', () => {
    const game = sweeper();
    advance(game, SWEEP_WIND_UP_STEPS + 1);
    face(game, 'left');

    const events = game.send({ type: 'attack' });

    expect(events).toContainEqual({ type: 'monster-hit', monsterId: GUARDIAN, damage: 1, health: 11 });
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
  });

  it('is not interrupted by a hit while it winds up: the strike lands on time', () => {
    const game = sweeper();
    game.step();
    face(game, 'left');

    const events = game.send({ type: 'attack' });

    expect(events).toContainEqual({ type: 'monster-hit', monsterId: GUARDIAN, damage: 1, health: 11 });
    expect(monsterAction(game, GUARDIAN)).toMatchObject({ type: 'winding-up', zone: SWEEP_ZONE });
    expect(advance(game, SWEEP_WIND_UP_STEPS - 1)).toEqual([]);
    expect(game.step()).toEqual([
      { type: 'monster-attacked', monsterId: GUARDIAN, zone: SWEEP_ZONE },
      { type: 'hero-hit', monsterId: GUARDIAN, damage: 4, health: 6 },
    ]);
  });
});

describe('a Guardian with the hero in the lane of its charge', () => {
  it('winds up at once, and shows the lane of the dash, as wide as the Guardian', () => {
    const game = charger();

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 0, zone: CHARGE_LANE });
  });

  it('dashes only when the wind-up ends, which takes the steps that its data says: the lane flashes, nothing has moved', () => {
    const game = charger();
    game.step();

    expect(advance(game, CHARGE_WIND_UP_STEPS - 1)).toEqual([]);
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 2.5, y: 3.5 });

    const events = game.step();

    expect(events).toEqual([{ type: 'monster-attacked', monsterId: GUARDIAN, zone: CHARGE_LANE }]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'dashing', direction: 'right' });
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 2.5, y: 3.5 });
  });

  it('hurts the hero in its way once, where they meet, for the damage of the charge, and stops flush against it', () => {
    const game = charger();
    advance(game, CHARGE_WIND_UP_STEPS + 1);

    expect(advance(game, 12)).toEqual([]); // the right edge of the Guardian is a quarter of a tile short of the hero
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 5.5, y: 3.5 });

    const events = game.step();

    expect(events).toEqual([{ type: 'hero-hit', monsterId: GUARDIAN, damage: 6, health: 4 }]);
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 5.75, y: 3.5 });
    expect(playingView(game).hero.position).toEqual({ x: 6.5, y: 3.5 });
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
  });

  it('fixes the lane when the wind-up begins: a hero who steps out of it takes no damage, and the dash runs on to its end', () => {
    const game = charger();
    game.step();
    walk(game, 'up', 8);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 8 / CHARGE_WIND_UP_STEPS, zone: CHARGE_LANE });
    advance(game, CHARGE_WIND_UP_STEPS - 9);

    game.step(); // the dash is launched
    const events = advance(game, 24); // the 6 tiles of the lane, a quarter of a tile at a time

    expect(events).toEqual([]);
    expect(heroHealth(game)).toBe(10);
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 8.5, y: 3.5 });
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
  });

  it('fixes the direction of the dash when the wind-up begins, even when the hero has gone where another side is nearer', () => {
    const game = guardianField([guardianAt(GUARDIAN, 2, 3)], { start: { area: 'arena', tile: { col: 4, row: 3 } } });
    game.step();
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 0, zone: CHARGE_LANE });
    walk(game, 'up', 18); // to (4.5, 1.25): further above the Guardian than beside it
    advance(game, CHARGE_WIND_UP_STEPS - 19);

    const launched = game.step();
    const events = advance(game, 24);

    expect(launched).toEqual([{ type: 'monster-attacked', monsterId: GUARDIAN, zone: CHARGE_LANE }]);
    expect(events).toEqual([]);
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 8.5, y: 3.5 });
    expect(heroHealth(game)).toBe(10);
  });

  it('rests for the recovery of the charge after its dash, and can be hit freely meanwhile', () => {
    const game = charger();
    advance(game, CHARGE_WIND_UP_STEPS + 14); // the dash meets the hero in step 50
    face(game, 'left');

    const events = game.send({ type: 'attack' });

    expect(events).toContainEqual({ type: 'monster-hit', monsterId: GUARDIAN, damage: 1, health: 11 });
    expect(advance(game, CHARGE_RECOVERY_STEPS - 1)).toEqual([]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
    game.step();
    expect(monsterAction(game, GUARDIAN)).toMatchObject({ type: 'winding-up', progress: 0 });
  });
});

describe('a Guardian with the hero within reach of its smite', () => {
  it('winds up and shows a square centred on where the hero stands, as wide as its data says', () => {
    const game = smiter();

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 0, zone: SMITE_ZONE });
  });

  it('hurts nothing before the wind-up ends, which takes the steps that its data says', () => {
    const game = smiter();
    game.step();

    expect(advance(game, SMITE_WIND_UP_STEPS - 1)).toEqual([]);

    expect(heroHealth(game)).toBe(10);
    expect(monsterAction(game, GUARDIAN)).toMatchObject({ type: 'winding-up', progress: (SMITE_WIND_UP_STEPS - 1) / SMITE_WIND_UP_STEPS });
  });

  it('strikes when the wind-up ends: the square flashes, and the hero in it takes the damage of the smite', () => {
    const game = smiter();
    advance(game, SMITE_WIND_UP_STEPS);

    const events = game.step();

    expect(events).toEqual([
      { type: 'monster-attacked', monsterId: GUARDIAN, zone: SMITE_ZONE },
      { type: 'hero-hit', monsterId: GUARDIAN, damage: 5, health: 5 },
    ]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
  });

  it('fixes the square when the wind-up begins: it does not follow a hero who walks out of it, who takes no damage', () => {
    const game = smiter();
    game.step();

    walk(game, 'right', 12);

    expect(monsterAction(game, GUARDIAN)).toMatchObject({ type: 'winding-up', zone: SMITE_ZONE });
    advance(game, SMITE_WIND_UP_STEPS - 13);
    expect(game.step()).toEqual([{ type: 'monster-attacked', monsterId: GUARDIAN, zone: SMITE_ZONE }]);
    expect(heroHealth(game)).toBe(10);
  });

  it('rests for the recovery of the smite, and can be hit freely meanwhile', () => {
    // The smite comes first in the order of this Guardian, so it is the pattern that reaches the hero standing beside it.
    const game = sweeper({ monsterTypes: { guardian: guardianInOrder('smite', 'sweep', 'charge') } });
    advance(game, SMITE_WIND_UP_STEPS + 1);
    face(game, 'left');

    const events = game.send({ type: 'attack' });

    expect(events).toContainEqual({ type: 'monster-hit', monsterId: GUARDIAN, damage: 1, health: 11 });
    expect(advance(game, SMITE_RECOVERY_STEPS - 1)).toEqual([]);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
    game.step();
    expect(monsterAction(game, GUARDIAN)).toMatchObject({ type: 'winding-up', progress: 0 });
  });
});

describe('a Guardian that has noticed the hero but has no pattern that reaches it', () => {
  // The hero stands in tile (8, 3), at (8.5, 3.5): 5.25 tiles from the Guardian in tile (2, 1), which is within the 6 tiles
  // it notices from, but beyond the 4 of its smite, and not in its lane, which runs along row 1.
  const walker = (): Game =>
    guardianField([guardianAt(GUARDIAN, 2, 1)], { start: { area: 'arena', tile: { col: 8, row: 3 } } });

  it('walks toward the hero, a sixteenth of a tile in each step', () => {
    const game = walker();

    expect(advance(game, 16)).toEqual([]);

    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'chasing' });
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 2.5 + 16 * GUARDIAN_WALK_STEP, y: 1.5 });
  });

  it('winds up the smite as soon as the hero is within its reach, in the 22nd step, with its square on the hero', () => {
    const game = walker();

    advance(game, 21);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'chasing' });

    game.step();

    expect(monsterAction(game, GUARDIAN)).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 7.5, minY: 2.5, maxX: 9.5, maxY: 4.5 },
    });
  });

  it('stands still when the hero is beyond its notice: idle, unmoved', () => {
    const game = guardianField([guardianAt(GUARDIAN, 1, 1)], { start: { area: 'arena', tile: { col: 12, row: 5 } } });

    expect(advance(game, 30)).toEqual([]);

    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'idle' });
    expect(monsterNamed(game, GUARDIAN).position).toEqual({ x: 1.5, y: 1.5 });
  });
});

describe('a Guardian choosing its patterns in turn', () => {
  // The hero stands where the sweep, the charge and the smite all reach it, a quarter of a tile from the Guardian's
  // right edge, and has Health to spare. The Guardian makes each pattern once, in the order of its data, then begins again.
  // The sweep lands in step 31, and its recovery of 24 steps ends in step 55, where the charge winds up for 36 steps: the
  // dash is launched in step 91 and meets the hero in step 92, a quarter of a tile on, which leaves the Guardian at
  // x = 5.75; the recovery of 48 steps ends in step 140, where the smite winds up for 48 steps and lands in step 188; its
  // recovery of 36 steps ends in step 224, where the sweep winds up again.
  const SWEEP_RIGHT_AFTER = { minX: 4.25, minY: 2, maxX: 7.25, maxY: 5 };
  const CHARGE_LANE_BESIDE = { minX: 6, minY: 3, maxX: 12, maxY: 4 };
  const SMITE_ON_HERO = { minX: 5.5, minY: 2.5, maxX: 7.5, maxY: 4.5 };

  it('goes through the sweep, the charge and the smite, and then the sweep again', () => {
    const game = sweeper({ hero: { health: 100 } });

    const attacks = advance(game, 188).filter((event) => event.type === 'monster-attacked');

    expect(attacks.map(({ zone }) => zone)).toEqual([SWEEP_ZONE, CHARGE_LANE_BESIDE, SMITE_ON_HERO]);
    advance(game, 35);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });
    game.step();
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 0, zone: SWEEP_RIGHT_AFTER });
  });

  it('goes on with the pattern after the last one it made, even where an earlier one reaches the hero too', () => {
    // The sweep does not reach the hero at the start, so the charge is the first. Its dash ends flush against the hero,
    // where the sweep reaches it, but the smite comes next in the order, and so it is the smite that winds up.
    const game = charger();
    advance(game, CHARGE_WIND_UP_STEPS + 14 + CHARGE_RECOVERY_STEPS - 1);
    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'recovering' });

    game.step();

    expect(monsterAction(game, GUARDIAN)).toEqual({ type: 'winding-up', progress: 0, zone: SMITE_ON_HERO });
  });

  it('skips a pattern that does not reach the hero: the first of this Guardian is the smite when the sweep and the charge miss', () => {
    const game = smiter();

    game.step();

    expect(monsterAction(game, GUARDIAN)).toMatchObject({ type: 'winding-up', zone: SMITE_ZONE });
  });
});
