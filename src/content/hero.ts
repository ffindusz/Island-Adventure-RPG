import type { HeroDefinition } from '../core';

/** The hero, who begins with a basic sword and basic armor. Sizes are in tiles, speeds in tiles per second. */
export const hero: HeroDefinition = {
  size: 0.75,
  speedTilesPerSecond: 5,
  health: 10,
  defense: 1,
  attack: 1,
  attackCooldownMs: 400,
  meleeWeapon: { reach: 0.75, width: 1 },
  interactionReach: 0.5,
  startingGear: { 'melee-weapon': 'basic-sword', armor: 'basic-armor' },
};
