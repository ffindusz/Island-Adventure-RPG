import type { Content } from './content';
import { STAT_IDS } from './definitions';
import type { StatId } from './definitions';
import type { PlayState } from './state';

// The hero's stats as the rules use them, and the one place that works them out: a stat is its base number from the
// content plus what the hero's Stat Points add to it. Gear will add to them here too, so no rule reads a base number
// directly and growth changes only this file.

/** What the Stat Points the hero has put into a stat add to it. */
function statPointBonus(state: PlayState, content: Content, stat: StatId): number {
  return state.hero.statPoints[stat] * content.progression.statPointValue[stat];
}

/** The most Health the hero can have. */
export function heroMaxHealth(state: PlayState, content: Content): number {
  return content.hero.health + statPointBonus(state, content, 'health');
}

/** How much damage each of the hero's strikes does to a monster. */
export function heroAttack(state: PlayState, content: Content): number {
  return content.hero.attack + statPointBonus(state, content, 'attack');
}

/** How much each hit's damage is reduced by. */
export function heroDefense(state: PlayState, content: Content): number {
  return content.hero.defense + statPointBonus(state, content, 'defense');
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
