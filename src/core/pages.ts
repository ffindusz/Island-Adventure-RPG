import type { PageId, PlayState } from './state';

// Pages are shown over the game, one at a time, and the game waits while one is open. Which page is open is state,
// not something the adapter keeps, so a game that is restored with a page open is still waiting.

/** True while the game waits for the player: nothing steps and the hero cannot strike. */
export function isPaused(state: PlayState): boolean {
  return state.page !== null;
}

/** Opens a page, unless one is open already: a page must be closed before another can open. */
export function openPage(state: PlayState, page: PageId): void {
  if (!isPaused(state)) {
    state.page = page;
  }
}

/** Closes the page, if it is the one that is open. */
export function closePage(state: PlayState, page: PageId): void {
  if (state.page === page) {
    state.page = null;
  }
}
