import type { GameView } from '../core';

/**
 * Whether the game waits for the player: a page is open, a Stat Point has to be assigned, or the question whether to
 * sail home is open. The Game core stands still for each of them. The play screen leaves the walk keys alone meanwhile,
 * because a menu uses them too, and takes the notice and the text of the area off the screen.
 */
export function gameIsWaiting(view: GameView): boolean {
  return view.phase === 'playing' && (view.page !== null || view.levelUp !== null || view.departure !== null);
}
