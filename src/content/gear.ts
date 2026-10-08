import type { GearDefinition } from '../core';

/**
 * Every piece of Gear in the game, by id. The basic sword and basic armor are what the hero begins with and add
 * nothing, so the hero's base numbers stand as they are. The hero begins without a bow: it finds the short bow, which
 * adds to the Attack of its arrows, and may find the long bow, which adds more, behind the locked door of the cabin in
 * the woods. It may find the Chain Mail in the woods too, and the Plate Armor, which adds one more Defense than the
 * Chain Mail, in an alcove of the mountain a few steps off the trail. In the cave it may find the Katana, which adds
 * one more Attack than the Steel Sword, in the pocket behind the gate that a lever opens. In the old castle it may find
 * the Knight's Armor, which adds one more Defense than the Plate Armor, in the armory beside the long hall, a few steps
 * off the route. The upgrades are placeholders until the tuning pass.
 */
export const gear: Readonly<Record<string, GearDefinition>> = {
  'basic-sword': { name: 'Basic Sword', slot: 'melee-weapon', bonus: 0 },
  'basic-armor': { name: 'Basic Armor', slot: 'armor', bonus: 0 },
  'steel-sword': { name: 'Steel Sword', slot: 'melee-weapon', bonus: 1 },
  katana: { name: 'Katana', slot: 'melee-weapon', bonus: 2 },
  'chain-mail': { name: 'Chain Mail', slot: 'armor', bonus: 1 },
  'plate-armor': { name: 'Plate Armor', slot: 'armor', bonus: 2 },
  'knight-armor': { name: "Knight's Armor", slot: 'armor', bonus: 3 },
  'short-bow': { name: 'Short Bow', slot: 'ranged-weapon', bonus: 1 },
  'long-bow': { name: 'Long Bow', slot: 'ranged-weapon', bonus: 2 },
};
