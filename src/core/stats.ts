import type { Content } from './content';
import { GEAR_SLOT_STAT, STAT_IDS, WEAPON_SLOTS } from './definitions';
import type { GearSlot, GearStat, StatId, WeaponSlot } from './definitions';
import { equippedGear } from './gear';
import type { PlayState } from './state';

// The hero's stats as the rules use them, and the one place that works them out: a stat is its base number from the
// content plus what the hero's Stat Points add to it, plus, for Attack and Defense, what its equipped Gear adds. No
// rule reads a base number directly, so growth and Gear change only this file.

/** What the Stat Points the hero has put into a stat add to it. */
function statPointBonus(state: PlayState, content: Content, stat: StatId): number {
  return state.hero.statPoints[stat] * content.progression.statPointValue[stat];
}

/**
 * What the hero's equipped Gear adds to a stat: the bonuses of the pieces whose slots raise that stat. Of the weapons
 * only the one in `weapon` counts: the bonus of a bow is for arrows, and that of a sword is for strikes.
 */
function gearBonus(state: PlayState, content: Content, stat: GearStat, weapon: WeaponSlot): number {
  return equippedGear(state, content)
    .filter((gear) => GEAR_SLOT_STAT[gear.slot] === stat && (!isWeaponSlot(gear.slot) || gear.slot === weapon))
    .reduce((total, gear) => total + gear.bonus, 0);
}

function isWeaponSlot(slot: GearSlot): slot is WeaponSlot {
  return (WEAPON_SLOTS as readonly GearSlot[]).includes(slot);
}

/** The most Health the hero can have. Gear does not change it. */
export function heroMaxHealth(state: PlayState, content: Content): number {
  return content.hero.health + statPointBonus(state, content, 'health');
}

/**
 * How much damage each of the hero's attacks does to a monster, made with the weapon in the slot `weapon`. Without
 * one it is the Attack of the weapon in hand, which is what the pages show.
 */
export function heroAttack(state: PlayState, content: Content, weapon: WeaponSlot = state.hero.activeWeapon): number {
  return content.hero.attack + statPointBonus(state, content, 'attack') + gearBonus(state, content, 'attack', weapon);
}

/** How much each hit's damage is reduced by. */
export function heroDefense(state: PlayState, content: Content): number {
  const base = content.hero.defense + statPointBonus(state, content, 'defense');
  return base + gearBonus(state, content, 'defense', state.hero.activeWeapon);
}

/** A stat by name, for what treats the stats alike, such as the choice of where to put a Stat Point. */
export function heroStat(state: PlayState, content: Content, stat: StatId): number {
  switch (stat) {
    case 'health':
      return heroMaxHealth(state, content);
    case 'attack':
      return heroAttack(state, content);
    case 'defense':
      return heroDefense(state, content);
  }
}

/** The Level the hero's Experience has reached: 1 until the first threshold, and never above the highest Level. */
export function heroLevel(state: PlayState, content: Content): number {
  const { levelThresholds } = content.progression;
  return 1 + levelThresholds.filter((threshold) => state.hero.experience >= threshold).length;
}

/** The Stat Points the hero has earned and not yet assigned: one for each Level above 1, less those it has assigned. */
export function unassignedStatPoints(state: PlayState, content: Content): number {
  const assigned = STAT_IDS.reduce((total, stat) => total + state.hero.statPoints[stat], 0);
  return Math.max(0, heroLevel(state, content) - 1 - assigned);
}

/** The highest Level there is: one more than the number of Level thresholds. */
export function highestLevel(content: Content): number {
  return content.progression.levelThresholds.length + 1;
}

/** The Experience that raises the hero to the highest Level. Experience beyond it changes nothing. */
export function experienceCap(content: Content): number {
  return content.progression.levelThresholds.at(-1) ?? 0;
}

/**
 * How far the hero has come toward the next Level: the Experience earned since reaching the current Level, out of what
 * the next Level takes. Undefined at the highest Level, which has no next.
 */
export function experienceProgress(
  state: PlayState,
  content: Content,
): { earned: number; needed: number } | undefined {
  const { levelThresholds } = content.progression;
  const level = heroLevel(state, content);
  const next = levelThresholds[level - 1];
  if (next === undefined) {
    return undefined;
  }
  const reached = levelThresholds[level - 2] ?? 0;
  return { earned: state.hero.experience - reached, needed: next - reached };
}
