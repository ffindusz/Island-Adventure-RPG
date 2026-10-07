import type { ConsumableId } from './definitions';
import type { GameEvent } from './interface';
import type { PlayState } from './state';

/** The hero takes an amount of a consumable and now has it. Returns what happened. */
export function grantConsumable(state: PlayState, consumable: ConsumableId, amount: number): GameEvent[] {
  state.hero.consumables[consumable] += amount;
  return [{ type: 'pickup', item: { kind: 'consumable', id: consumable, amount } }];
}
