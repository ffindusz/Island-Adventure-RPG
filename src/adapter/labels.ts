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

/**
 * Health as the player reads it, "now/most": each number rounded up, so that a hero who is still standing never reads
 * as 0. The HUD and the pages show it so.
 */
export function healthText(health: number, maxHealth: number): string {
  return `${Math.ceil(health)}/${Math.ceil(maxHealth)}`;
}

/**
 * How full the bar of Experience is, from 0 to 1: the share of the way to the next Level. At the highest Level there is
 * no next one (the Experience is null), and the bar stays full.
 */
export function experienceShare(experience: { readonly earned: number; readonly needed: number } | null): number {
  return experience === null ? 1 : experience.earned / experience.needed;
}
