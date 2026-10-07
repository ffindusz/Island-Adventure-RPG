import { gearOf } from './content';
import type { Content } from './content';
import { GEAR_SLOT_STAT, GEAR_SLOTS } from './definitions';
import type { GearDefinition } from './definitions';
import type { GameEvent, GearInfo, GearView } from './interface';
import type { PlayState } from './state';

// Gear: what the hero carries and what it has equipped. What the equipped Gear is worth in Attack and Defense is
// worked out in stats.ts, like every other number of the hero.

/** A piece of Gear as the player is told about it. */
export function describeGear(content: Content, id: string): GearInfo {
  const gear = gearOf(content, id);
  return { id, name: gear.name, slot: gear.slot, stat: GEAR_SLOT_STAT[gear.slot], bonus: gear.bonus };
}

/** The hero picks up a piece of Gear. It is carried, not equipped, and the hero can carry any number of pieces. */
export function grantGear(state: PlayState, content: Content, id: string): GameEvent[] {
  state.hero.gear.push(id);
  return [{ type: 'pickup', item: { kind: 'gear', ...describeGear(content, id) } }];
}

/**
 * The hero equips a piece of Gear it carries, in place of the one equipped in its slot, and only from the inventory
 * page. Anything else is ignored: Gear the hero does not carry, or has equipped already. Returns what happened.
 */
export function equipGear(state: PlayState, content: Content, id: string): GameEvent[] {
  if (state.page !== 'inventory' || !state.hero.gear.includes(id) || equippedIds(state).includes(id)) {
    return [];
  }
  const { slot } = gearOf(content, id);
  state.hero.equipped[slot] = id;
  return [{ type: 'gear-equipped', gearId: id, slot }];
}

/** The ids of the Gear the hero has equipped: at most one piece for each slot. */
function equippedIds(state: PlayState): string[] {
  return GEAR_SLOTS.flatMap((slot) => state.hero.equipped[slot] ?? []);
}

/** The Gear the hero has equipped. */
export function equippedGear(state: PlayState, content: Content): GearDefinition[] {
  return equippedIds(state).map((id) => gearOf(content, id));
}

/** Everything the hero carries: by slot in the order of the slots, and within a slot in the order the hero found it. */
export function carriedGear(state: PlayState, content: Content): GearView[] {
  const equipped = equippedIds(state);
  const carried = state.hero.gear.map((id) => ({ ...describeGear(content, id), equipped: equipped.includes(id) }));
  return GEAR_SLOTS.flatMap((slot) => carried.filter((gear) => gear.slot === slot));
}
