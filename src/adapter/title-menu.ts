import type { Effect } from './audio-manifest';

// The rules of the title screen's menu, apart from the scene that draws it: which line the cursor is on, whether the
// screen asks the player to confirm a New Game, whether it shows the list of the controls, what a key press starts, and
// what the player hears of it. The same menu serves the start screen of a game that was put away with Esc, the paused
// screen, which has a line more, Resume, on top. No Phaser in here.

/** The lines of the menu of the title, top to bottom. A line that is added here is a line of the title. */
export const MENU_ENTRIES = ['new-game', 'continue', 'controls'] as const;

/** The lines of the menu of the paused screen, top to bottom: those of the title, with Resume on top of them. */
export const PAUSED_ENTRIES = ['resume', ...MENU_ENTRIES] as const;

export type MenuEntry = (typeof PAUSED_ENTRIES)[number];

/**
 * Where the menu stands: the line the cursor is on, whether it asks the player to confirm a New Game, and whether it
 * shows the list of the controls. The question and the list are never both open. `paused` is there, and true, only on
 * the paused screen: the menu of the title has no such field.
 */
export interface TitleMenu {
  readonly cursor: MenuEntry;
  readonly confirming: boolean;
  readonly showingControls: boolean;
  readonly paused?: true;
}

/** What the keys did since the last look: a step up or down the lines, whether Enter was pressed, and Esc. */
export interface TitleKeys {
  readonly step: -1 | 0 | 1;
  readonly confirm: boolean;
  readonly cancel: boolean;
}

/**
 * What the player has chosen to start, or null while they are still choosing. Controls is not one: it shows the list, a
 * state of the menu, and starts nothing. Resume, on the paused screen only, brings the game in play back.
 */
export type TitleChoice = Exclude<MenuEntry, 'controls'> | null;

/**
 * The menu as the title opens: the cursor is on Continue when there is a saved game to continue from, so that Enter
 * goes on with it, and otherwise on New Game, so that Enter starts the adventure. The paused screen opens with the
 * cursor on Resume, with a saved game too, so that Enter brings the game in play back.
 */
export function openMenu(canContinue: boolean, paused = false): TitleMenu {
  if (paused) {
    return { cursor: 'resume', confirming: false, showingControls: false, paused: true };
  }
  return { cursor: canContinue ? 'continue' : 'new-game', confirming: false, showingControls: false };
}

/**
 * The lines the cursor can rest on: Continue is there only when there is a saved game to continue from, Controls
 * always is, and Resume is there on the paused screen only.
 */
export function selectableEntries(canContinue: boolean, paused = false): readonly MenuEntry[] {
  return (paused ? PAUSED_ENTRIES : MENU_ENTRIES).filter((entry) => entry !== 'continue' || canContinue);
}

/**
 * What the keys do to the menu, and which line they start. New Game over a saved game that can be continued from asks
 * first, and on the paused screen it always asks, because the game in play is lost whether or not there is a saved
 * game: Enter replaces it and Esc keeps it. Esc wins when both are pressed together, because declining must leave the
 * saved game as it was. Enter on Controls shows the list of the controls, which nothing but the keys that close it
 * answers. On the paused screen Esc at the menu, where the cursor is on any line, chooses Resume, and wins over an Enter
 * pressed with it, which could be a Continue that replaces the game in play.
 */
export function pressMenu(
  menu: TitleMenu,
  canContinue: boolean,
  keys: TitleKeys,
): { readonly menu: TitleMenu; readonly choice: TitleChoice } {
  if (menu.showingControls) {
    // Nothing of the menu answers while the list shows: its own keys close it, and the cursor keys do nothing.
    return { menu: keys.confirm || keys.cancel ? { ...menu, showingControls: false } : menu, choice: null };
  }
  if (menu.confirming) {
    if (keys.cancel) {
      return { menu: { ...menu, confirming: false }, choice: null };
    }
    return { menu, choice: keys.confirm ? 'new-game' : null };
  }
  const paused = menu.paused === true;
  const entries = selectableEntries(canContinue, paused);
  // A cursor left on a line that can no longer be chosen, Continue once its saved game is gone, goes back to the top.
  const cursor = entries.includes(menu.cursor) ? menu.cursor : (entries[0] ?? menu.cursor);
  if (paused && keys.cancel) {
    return { menu: { ...menu, cursor }, choice: 'resume' };
  }
  if (keys.confirm) {
    if (cursor === 'new-game' && (canContinue || paused)) {
      return { menu: { ...menu, cursor, confirming: true, showingControls: false }, choice: null };
    }
    if (cursor === 'controls') {
      return { menu: { ...menu, cursor, confirming: false, showingControls: true }, choice: null };
    }
    return { menu: { ...menu, cursor, confirming: false, showingControls: false }, choice: cursor };
  }
  const moved = entries[Math.min(Math.max(entries.indexOf(cursor) + keys.step, 0), entries.length - 1)] ?? cursor;
  return { menu: { ...menu, cursor: moved, confirming: false, showingControls: false }, choice: null };
}

/** The sounds of the audio that the menu asks for. */
export type MenuSound = Extract<Effect, 'confirm' | 'page-open' | 'page-close'>;

/**
 * What the player hears when a key press moved the menu from `before` to `after` and chose `choice`: a choice is
 * confirmed, except Resume, which closes the paused screen as a page closes, and the question whether to replace the
 * saved game and the list of the controls open and close like a page. A press that did neither is not heard.
 */
export function soundOfPress(before: TitleMenu, after: TitleMenu, choice: TitleChoice): MenuSound | null {
  if (choice === 'resume') {
    return 'page-close';
  }
  if (choice !== null) {
    return 'confirm';
  }
  const pageWasOpen = before.confirming || before.showingControls;
  const pageIsOpen = after.confirming || after.showingControls;
  if (pageIsOpen === pageWasOpen) {
    return null;
  }
  return pageIsOpen ? 'page-open' : 'page-close';
}
