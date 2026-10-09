import type { HealingPotionDefinition } from '../core';

/**
 * The Healing Potion. The tuning pass kept the number (docs/balance.md): a potion gives back half of the Health
 * the hero begins with, which is about what two hits of a crab take.
 */
export const healingPotion: HealingPotionDefinition = { restores: 5 };
