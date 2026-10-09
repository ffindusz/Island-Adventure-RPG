import type { Content } from './content';
import type { GameEvent } from './interface';
import { isPaused } from './pause';
import type { PageId, PlayState } from './state';

// Pages are shown over the game, one at a time, and the game waits while one is open (see pause.ts). Which page is
// open is state, not something the adapter keeps, so a game that is restored with a page open is still waiting.

/**
 * Opens a page, unless the game is already waiting for the player: a page must be closed before another can open.
 * Returns what happened: the page opened, or nothing when the game was waiting.
 */
export function openPage(state: PlayState, content: Content, page: PageId): GameEvent[] {
  if (isPaused(state, content)) {
    return [];
  }
  state.page = page;
  return [{ type: 'page-opened', page }];
}

/** Closes the page, if it is the one that is open. Returns what happened: the page closed, or nothing for any other page. */
export function closePage(state: PlayState, page: PageId): GameEvent[] {
  if (state.page !== page) {
    return [];
  }
  state.page = null;
  return [{ type: 'page-closed', page }];
}
