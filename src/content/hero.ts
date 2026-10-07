import type { HeroDefinition } from '../core';

/** The hero with the starting Melee Weapon, a basic sword. Sizes are in tiles, speeds in tiles per second. */
export const hero: HeroDefinition = {
  size: 0.75,
  speedTilesPerSecond: 5,
  attack: 1,
  attackCooldownMs: 400,
  meleeWeapon: { reach: 0.75, width: 1 },
};
