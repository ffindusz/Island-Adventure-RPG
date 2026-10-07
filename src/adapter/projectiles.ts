import type { ArrowView } from '../core';

/**
 * The things in the air, split by who shot them. The hero's arrows are drawn as sprites by the hero sprite, and the
 * projectile of a monster is an orb drawn with the monsters, so each drawing takes only its own side: a projectile
 * of a monster is never drawn as one of the hero's arrows. A third kind of shooter would be a compile error here.
 */
export function byShooter(arrows: readonly ArrowView[]): Record<ArrowView['shooter'], ArrowView[]> {
  const split: Record<ArrowView['shooter'], ArrowView[]> = { hero: [], monster: [] };
  for (const arrow of arrows) {
    split[arrow.shooter].push(arrow);
  }
  return split;
}
