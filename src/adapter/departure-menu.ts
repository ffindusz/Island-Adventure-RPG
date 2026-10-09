import type { Command, GameView } from '../core';
import type { MenuInput } from './player-input';

/**
 * Enter at the question whether to sail home is the answer yes. The answer no is Esc, which `PlayerInput` turns into a
 * command by itself, as it does every key that is not a menu's. The Game core ignores both when no question is open,
 * so what is left to settle here is only whether Enter is for the question or for something else. It is for the
 * question when the question is what the player sees: a page or a Stat Point in front of it would take the key.
 * The view is the one from before the frame's commands, so that Interact and Enter pressed in the same frame do not
 * open the question and answer it at once.
 */
export function departureAnswer(view: GameView, input: MenuInput): Command[] {
  if (view.phase !== 'playing' || view.departure === null || view.page !== null || view.levelUp !== null) {
    return [];
  }
  return input.confirm ? [{ type: 'confirm-departure' }] : [];
}
