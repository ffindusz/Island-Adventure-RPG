// The rules of the title screen's menu, apart from the scene that draws it: which line the cursor is on, whether the
// screen asks the player to confirm a New Game, whether it shows the list of the controls, and what a key press starts.
// No Phaser in here.

/** The lines of the menu, top to bottom. A line that is added here is a line of the title. */
export const MENU_ENTRIES = ['new-game', 'continue', 'controls'] as const;

export type MenuEntry = (typeof MENU_ENTRIES)[number];

/**
 * Where the menu stands: the line the cursor is on, whether it asks the player to confirm a New Game, and whether it
 * shows the list of the controls. The question and the list are never both open.
 */
export interface TitleMenu {
  readonly cursor: MenuEntry;
  readonly confirming: boolean;
  readonly showingControls: boolean;
}

/** What the keys did since the last look: a step up or down the lines, whether Enter was pressed, and Esc. */
export interface TitleKeys {
  readonly step: -1 | 0 | 1;
  readonly confirm: boolean;
  readonly cancel: boolean;
}

/**
 * What the player has chosen to start, or null while they are still choosing. Controls is not one: it shows the list, a
 * state of the menu, and starts nothing.
 */
export type TitleChoice = Exclude<MenuEntry, 'controls'> | null;

/**
 * The menu as the title opens: the cursor is on Continue when there is a saved game to continue from, so that Enter
 * goes on with it, and otherwise on New Game, so that Enter starts the adventure.
 */
export function openMenu(canContinue: boolean): TitleMenu {
  return { cursor: canContinue ? 'continue' : 'new-game', confirming: false, showingControls: false };
}

/**
 * The lines the cursor can rest on: Continue is there only when there is a saved game to continue from, and Controls
 * always is.
 */
export function selectableEntries(canContinue: boolean): readonly MenuEntry[] {
  return MENU_ENTRIES.filter((entry) => entry !== 'continue' || canContinue);
}

/**
 * What the keys do to the menu, and which line they start. New Game over a saved game that can be continued from asks
 * first: Enter replaces it and Esc keeps it. Esc wins when both are pressed together, because declining must leave the
 * saved game as it was. Enter on Controls shows the list of the controls, which nothing but the keys that close it
 * answers.
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
  const entries = selectableEntries(canContinue);
  // A cursor left on a line that can no longer be chosen, Continue once its saved game is gone, goes back to the top.
  const cursor = entries.includes(menu.cursor) ? menu.cursor : (entries[0] ?? menu.cursor);
  if (keys.confirm) {
    if (cursor === 'new-game' && canContinue) {
      return { menu: { cursor, confirming: true, showingControls: false }, choice: null };
    }
    if (cursor === 'controls') {
      return { menu: { cursor, confirming: false, showingControls: true }, choice: null };
    }
    return { menu: { cursor, confirming: false, showingControls: false }, choice: cursor };
  }
  const moved = entries[Math.min(Math.max(entries.indexOf(cursor) + keys.step, 0), entries.length - 1)] ?? cursor;
  return { menu: { cursor: moved, confirming: false, showingControls: false }, choice: null };
}
