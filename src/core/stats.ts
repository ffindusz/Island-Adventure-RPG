import type { Content } from './content';
import type { PlayState } from './state';

// The hero's stats as the rules use them. For now they are the base numbers of the content. Levels, Stat Points and
// Gear will add to them here, so no rule reads a base number directly and growth changes only this file.

/** The most Health the hero can have. */
export function heroMaxHealth(content: Content): number {
  return content.hero.health;
}

/** How much each hit's damage is reduced by. */
export function heroDefense(content: Content): number {
  return content.hero.defense;
}

/** The Level the hero's Experience has reached: 1 until the first threshold, and never above the highest Level. */
export function heroLevel(state: PlayState, content: Content): number {
  const { levelThresholds } = content.progression;
  return 1 + levelThresholds.filter((threshold) => state.hero.experience >= threshold).length;
}

/** The highest Level there is: one more than the number of Level thresholds. */
export function highestLevel(content: Content): number {
  return content.progression.levelThresholds.length + 1;
}

/** The Experience that raises the hero to the highest Level. Experience beyond it changes nothing. */
export function experienceCap(content: Content): number {
  return content.progression.levelThresholds.at(-1) ?? 0;
}
