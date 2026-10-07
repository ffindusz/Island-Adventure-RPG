import type { Content } from './content';
import type { GameEvent } from './interface';
import type { PlayState } from './state';
import { heroMaxHealth } from './stats';

// Healing Potions: the only way the hero gets Health back between Checkpoints. Health never regenerates on its own,
// and a potion is never used on the hero's behalf: the player uses it from the inventory page.

/**
 * The hero uses a Healing Potion, from the inventory page only. It gets back the Health the content says, but never
 * above its maximum Health as it is now, and the potion is used up even when less than that fits. With no potion, or
 * at full Health where it would be wasted, nothing happens and the hero keeps what it has. Returns what happened.
 */
export function useHealingPotion(state: PlayState, content: Content): GameEvent[] {
  const { hero } = state;
  const room = heroMaxHealth(state, content) - hero.health;
  if (state.page !== 'inventory' || hero.consumables['healing-potion'] < 1 || room <= 0) {
    return [];
  }
  const restored = Math.min(content.healingPotion.restores, room);
  hero.consumables['healing-potion'] -= 1;
  hero.health += restored;
  return [{ type: 'healing-potion-used', restored, health: hero.health }];
}
