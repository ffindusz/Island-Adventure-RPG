import type { Content } from './content';

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
