import type { Rect } from '../src/adapter/pixel-font';
import type { SavedGame } from '../src/adapter/save-store';
import type { TitleWindow } from '../src/adapter/title-window';
import { newGame } from './fixtures';

// What the tests of the two windows of the start screen have alike, the window of the title (title-window.test.ts) and
// the window of the paused game (paused-title-window.test.ts): the saved games a window can stand over, what the keys of
// the audio can say, and ways to read a window that is laid out.

export const NO_SAVE: SavedGame = { status: 'none' };
export const A_SAVE: SavedGame = { status: 'usable', snapshot: newGame().snapshot() };
export const NOT_AVAILABLE: SavedGame = { status: 'unavailable' };
export const DAMAGED: SavedGame = { status: 'unusable', problem: 'damaged', detail: 'The save could not be read.' };
export const FROM_ANOTHER_VERSION: SavedGame = {
  status: 'unusable',
  problem: 'incompatible',
  detail: 'The save is from version 3 of the game.',
};

/** What the keys of the audio can say: the narrowest line is SOUND ON, and the widest VOLUME 10/10. */
export const SAID = ['SOUND OFF', 'SOUND ON', ...Array.from({ length: 11 }, (_, volume) => `VOLUME ${volume}/10`)];

/** The lines of text of the window, the lines of the menu included, from the top down. */
export function textsOf(window: TitleWindow): string[] {
  return window.rows.flatMap(({ row }) => (row.kind === 'text' || row.kind === 'entry' ? [row.text] : []));
}

/** The lines of the menu in the window, from the top down. */
export function linesOf(window: TitleWindow) {
  return window.rows.flatMap(({ row }) => (row.kind === 'entry' ? [row] : []));
}

export function crosses(one: Rect, other: Rect): boolean {
  return (
    one.left < other.left + other.width &&
    other.left < one.left + one.width &&
    one.top < other.top + other.height &&
    other.top < one.top + one.height
  );
}
