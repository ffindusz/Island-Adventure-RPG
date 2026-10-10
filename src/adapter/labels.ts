import type { ConsumableId, GearStat, StatId } from '../core';

// How the player reads the game's stats and numbers, for every part of the adapter that shows them.

/** The name of each stat. */
export const STAT_NAMES: Readonly<Record<StatId, string>> = { health: 'HEALTH', attack: 'ATTACK', defense: 'DEFENSE' };

/** The short name of each stat that Gear raises, for rows too narrow for the whole name. */
export const GEAR_STAT_ABBREVIATIONS: Readonly<Record<GearStat, string>> = { attack: 'ATK', defense: 'DEF' };

/** The name of each consumable the hero carries in counts. */
export const CONSUMABLE_NAMES: Readonly<Record<ConsumableId, string>> = {
  ammunition: 'AMMUNITION',
  'healing-potion': 'HEALING POTION',
};

/** A number as the player reads it: whole when it is whole, with no more than two decimals otherwise. */
export function numberText(value: number): string {
  return String(Math.round(value * 100) / 100);
}
