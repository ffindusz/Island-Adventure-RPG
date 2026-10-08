import type {
  ContentDefinition,
  Game,
  GuardianChargeDefinition,
  GuardianMonsterDefinition,
  GuardianPatternDefinition,
  GuardianSmiteDefinition,
  GuardianSweepDefinition,
  InteractableDefinition,
  MonsterPlacement,
} from '../src/core';
import { arena, FIELD_LAYOUT, newGame } from './fixtures';
import type { ArenaOptions } from './fixtures';

// The Guardian of the tests, in the wide field of fixtures.ts (14 x 7 tiles, walkable in columns 1 to 12 and rows 1 to
// 5, where the hero begins at (6.5, 3.5) with a body 0.5 wide). Its numbers are chosen, like the arena's, so that every
// expected value in the tests can be worked out by hand in exact fractions:
//
//   monster "guardian"  a Guardian; body 1 tile; Health 12; worth 20 Experience; walks 3.75 tiles a second, which is
//                       0.0625 tile a step (16 steps to cross one tile); notices the hero within 6 tiles of its body;
//                       it makes three patterns in turn, and each pattern has a wind-up and a recovery of its own, so that
//                       a test can tell by the steps which pattern is going on:
//     sweep             hurts what is within 1 tile of its body, for 4; the wind-up lasts 500 ms (30 steps) and the
//                       recovery 400 ms (24 steps)
//     charge            dashes along the lane in front of it, as wide as its body and 6 tiles long at most, for 6; it dashes
//                       15 tiles a second, which is 0.25 tile a step; the wind-up lasts 600 ms (36 steps) and the
//                       recovery 800 ms (48 steps)
//     smite             hurts what is in a square 2 tiles wide, centred on where the hero stands when the wind-up begins,
//                       for 5, when the hero is within 4 tiles of its body; the wind-up lasts 800 ms (48 steps) and the
//                       recovery 600 ms (36 steps)

export const SWEEP_WIND_UP_STEPS = 30;
export const CHARGE_WIND_UP_STEPS = 36;
export const SMITE_WIND_UP_STEPS = 48;
export const SWEEP_RECOVERY_STEPS = 24;
export const CHARGE_RECOVERY_STEPS = 48;
export const SMITE_RECOVERY_STEPS = 36;
export const GUARDIAN_WALK_STEP = 0.0625;
export const GUARDIAN_DASH_STEP = 0.25;

export const SWEEP: GuardianSweepDefinition = { kind: 'sweep', damage: 4, reach: 1, windUpMs: 500, recoveryMs: 400 };
export const CHARGE: GuardianChargeDefinition = {
  kind: 'charge',
  damage: 6,
  dashSpeedTilesPerSecond: 15,
  dashRange: 6,
  windUpMs: 600,
  recoveryMs: 800,
};
export const SMITE: GuardianSmiteDefinition = { kind: 'smite', damage: 5, size: 2, range: 4, windUpMs: 800, recoveryMs: 600 };

export const GUARDIAN: GuardianMonsterDefinition = {
  behavior: 'guardian',
  health: 12,
  size: 1,
  experience: 20,
  speedTilesPerSecond: 3.75,
  noticingDistance: 6,
  patterns: [SWEEP, CHARGE, SMITE],
};

/** The Guardian of this file with its patterns in another order, named by kind. */
export function guardianInOrder(...kinds: GuardianPatternDefinition['kind'][]): GuardianMonsterDefinition {
  const patterns = kinds.map((kind) => {
    const pattern = GUARDIAN.patterns.find((candidate) => candidate.kind === kind);
    if (pattern === undefined) {
      throw new Error(`The Guardian of the tests has no ${kind}`);
    }
    return pattern;
  });
  return { ...GUARDIAN, patterns };
}

export function guardianAt(id: string, col: number, row: number): MonsterPlacement {
  return { id, type: 'guardian', tile: { col, row } };
}

/** A gate on the tile (col, row) that opens for good when the Guardian with this id is defeated. */
export function guardianGateAt(id: string, col: number, row: number, guardian: string): InteractableDefinition {
  return { kind: 'gate', id, tile: { col, row }, opensWhenDefeated: guardian };
}

/** The content of a wide field with the Guardian of this file known, where the hero begins at (6.5, 3.5). */
export function guardianContent(monsters: readonly MonsterPlacement[], options: ArenaOptions = {}): ContentDefinition {
  return arena({
    layout: FIELD_LAYOUT,
    start: { area: 'arena', tile: { col: 6, row: 3 } },
    ...options,
    monsters,
    monsterTypes: { guardian: GUARDIAN, ...options.monsterTypes },
  });
}

/** A game in that field. */
export function guardianField(monsters: readonly MonsterPlacement[], options: ArenaOptions = {}): Game {
  return newGame(guardianContent(monsters, options));
}
