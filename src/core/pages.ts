import type { Content } from './content';
import { isPaused } from './pause';
import type { PageId, PlayState } from './state';

// Pages are shown over the game, one at a time, and the game waits while one is open (see pause.ts). Which page is
// open is state, not something the adapter keeps, so a game that is restored with a page open is still waiting.

/** Opens a page, unless the game is already waiting for the player: a page must be closed before another can open. */
export function openPage(state: PlayState, content: Content, page: PageId): void {
  if (!isPaused(state, content)) {
    state.page = page;
  }
}

/** Closes the page, if it is the one that is open. */
export function closePage(state: PlayState, page: PageId): void {
  if (state.page === page) {
    state.page = null;
  }
}
