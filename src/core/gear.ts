import { gearOf } from './content';
import type { Content } from './content';
import { GEAR_SLOT_STAT, GEAR_SLOTS } from './definitions';
import type { GearInfo, GearView } from './interface';
import type { PlayState } from './state';

// Gear: what the hero carries and what it has equipped. What the equipped Gear is worth in Attack and Defense is
// worked out in stats.ts, like every other number of the hero.

/** A piece of Gear as the player is told about it. */
export function describeGear(content: Content, id: string): GearInfo {
  const gear = gearOf(content, id);
  return { id, name: gear.name, slot: gear.slot, stat: GEAR_SLOT_STAT[gear.slot], bonus: gear.bonus };
}

/** Everything the hero carries: by slot in the order of the slots, and within a slot in the order the hero found it. */
export function carriedGear(state: PlayState, content: Content): GearView[] {
  const equipped = Object.values(state.hero.equipped);
  const carried = state.hero.gear.map((id) => ({ ...describeGear(content, id), equipped: equipped.includes(id) }));
  return GEAR_SLOTS.flatMap((slot) => carried.filter((gear) => gear.slot === slot));
}
