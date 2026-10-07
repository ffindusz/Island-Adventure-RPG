import type { GearDefinition } from '../core';

/**
 * Every piece of Gear in the game, by id. The basic sword and basic armor are what the hero begins with and add
 * nothing, so the hero's base numbers stand as they are. The upgrades are placeholders until the tuning pass.
 */
export const gear: Readonly<Record<string, GearDefinition>> = {
  'basic-sword': { name: 'Basic Sword', slot: 'melee-weapon', bonus: 0 },
  'basic-armor': { name: 'Basic Armor', slot: 'armor', bonus: 0 },
  'steel-sword': { name: 'Steel Sword', slot: 'melee-weapon', bonus: 1 },
  'chain-mail': { name: 'Chain Mail', slot: 'armor', bonus: 1 },
};
