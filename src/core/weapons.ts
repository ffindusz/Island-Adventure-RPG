import type { WeaponSlot } from './definitions';
import type { GameEvent } from './interface';
import type { PlayState } from './state';

/**
 * Takes the other weapon in hand: the bow, when the hero has one equipped, and the sword again from the bow. The
 * hero always has the sword to go back to (a hero without one strikes bare-handed). Switching takes no time, so it
 * neither starts the attack cooldown nor waits for it.
 */
export function switchWeapon(state: PlayState): GameEvent[] {
  const weapon: WeaponSlot = state.hero.activeWeapon === 'melee-weapon' ? 'ranged-weapon' : 'melee-weapon';
  if (weapon === 'ranged-weapon' && state.hero.equipped['ranged-weapon'] === undefined) {
    return [];
  }
  state.hero.activeWeapon = weapon;
  return [{ type: 'weapon-switched', weapon }];
}
