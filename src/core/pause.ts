import type { Content } from './content';
import type { PlayState } from './state';
import { unassignedStatPoints } from './stats';

/**
 * True while the game waits for the player: a page is open, or a Stat Point waits to be assigned. Nothing steps and the
 * hero cannot strike until the player has closed the page or made the choice.
 */
export function isPaused(state: PlayState, content: Content): boolean {
  return state.page !== null || unassignedStatPoints(state, content) > 0;
}
