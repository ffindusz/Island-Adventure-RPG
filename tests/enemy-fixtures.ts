import type {
  ChargerMonsterDefinition,
  ContentDefinition,
  Game,
  MonsterPlacement,
  RangedMonsterDefinition,
} from '../src/core';
import { arena, FIELD_LAYOUT, newGame } from './fixtures';
import type { ArenaOptions } from './fixtures';

// The charger and the ranged attacker of the tests, in the wide field of fixtures.ts (14 x 7 tiles, walkable in
// columns 1 to 12 and rows 1 to 5, where the hero begins at (6.5, 3.5) with a body 0.5 wide). Their numbers are
// chosen, like the arena's, so that every expected value in the tests can be worked out by hand in exact fractions:
//
//   monster "charger"   a charger; body 0.5 tiles; Health 3; worth 8 Experience; damage 6; walks 3.75 tiles a second,
//                       which is 0.0625 tile a step, to line up with the hero; notices the hero within 5 tiles of its
//                       body; the wind-up lasts 500 ms (30 steps); its dash is 15 tiles a second, which is 0.25 tile a
//                       step (4 steps to cross one tile), for at most 6 tiles; the recovery lasts 800 ms (48 steps)
//   monster "shooter"   a ranged attacker that stands still; body 0.5 tiles; Health 3; worth 6 Experience; notices the
//                       hero within 6 tiles of its body; the wind-up lasts 500 ms (30 steps) and the recovery after a
//                       shot 800 ms (48 steps); its projectile does 4 damage, is 0.25 tile wide, flies 3.75 tiles a
//                       second, which is 0.0625 tile a step (16 steps to cross one tile, slower than the hero's walk
//                       of 0.125), and falls 5 tiles from the shooter's centre (80 steps)
//   monster "keeper"    the shooter, but it keeps 3 tiles between its body and the hero's: it walks 3.75 tiles a second,
//                       which is 0.0625 tile a step, toward the hero when it is farther than that and away when nearer

export const CHARGER: ChargerMonsterDefinition = {
  behavior: 'charger',
  health: 3,
  size: 0.5,
  experience: 8,
  damage: 6,
  speedTilesPerSecond: 3.75,
  noticingDistance: 5,
  windUpMs: 500,
  dashSpeedTilesPerSecond: 15,
  dashRange: 6,
  recoveryMs: 800,
};

export const SHOOTER: RangedMonsterDefinition = {
  behavior: 'ranged',
  health: 3,
  size: 0.5,
  experience: 6,
  noticingDistance: 6,
  windUpMs: 500,
  recoveryMs: 800,
  projectile: { damage: 4, speedTilesPerSecond: 3.75, range: 5, size: 0.25 },
};

export const KEEPER: RangedMonsterDefinition = {
  ...SHOOTER,
  keepsDistance: { preferredDistance: 3, speedTilesPerSecond: 3.75 },
};

export const WIND_UP_STEPS = 30;
export const CHARGER_RECOVERY_STEPS = 48;
export const DASH_STEP = 0.25;
export const SHOOTER_RECOVERY_STEPS = 48;
export const PROJECTILE_STEP = 0.0625;

export function chargerAt(id: string, col: number, row: number): MonsterPlacement {
  return { id, type: 'charger', tile: { col, row } };
}

export function shooterAt(id: string, col: number, row: number): MonsterPlacement {
  return { id, type: 'shooter', tile: { col, row } };
}

export function keeperAt(id: string, col: number, row: number): MonsterPlacement {
  return { id, type: 'keeper', tile: { col, row } };
}

/** The content of a wide field with the types of this file known, where the hero begins at (6.5, 3.5). */
export function enemyContent(monsters: readonly MonsterPlacement[], options: ArenaOptions = {}): ContentDefinition {
  return arena({
    layout: FIELD_LAYOUT,
    start: { area: 'arena', tile: { col: 6, row: 3 } },
    ...options,
    monsters,
    monsterTypes: { charger: CHARGER, shooter: SHOOTER, keeper: KEEPER, ...options.monsterTypes },
  });
}

/** A game in that field. */
export function enemyField(monsters: readonly MonsterPlacement[], options: ArenaOptions = {}): Game {
  return newGame(enemyContent(monsters, options));
}
