import { areaOf } from './content';
import type { Content } from './content';
import { grantConsumable } from './consumables';
import { overlaps } from './geometry';
import type { GameEvent } from './interface';
import { heroBody, interactableStateOf } from './state';
import type { PlayState } from './state';

/**
 * The hero takes each pickup of its Adventure Area that its body overlaps and that it has not taken before, which is
 * what walking onto one does. A pickup is taken once, for good. Returns what happened, in order: for each pickup, the
 * hero taking what it holds.
 */
export function collectPickups(state: PlayState, content: Content): GameEvent[] {
  const body = heroBody(state, content);
  const events: GameEvent[] = [];
  for (const interactable of areaOf(content, state.areaId).interactables) {
    if (interactable.kind === 'pickup' && overlaps(body, interactable.body)) {
      const pickupState = interactableStateOf(state, interactable);
      if (!pickupState.collected) {
        pickupState.collected = true;
        events.push(...grantConsumable(state, interactable.consumable, interactable.amount));
      }
    }
  }
  return events;
}
