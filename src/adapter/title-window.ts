import { VIEW_HEIGHT, VIEW_WIDTH } from './config';
import { audioKeyLabel, closePageKeyLabel, confirmKeyLabel, controlsList } from './controls';
import { layoutControlsList } from './controls-list';
import type { ControlsListLayout } from './controls-list';
import { TEXT_HEIGHT, textWidthOf } from './pixel-font';
import type { Rect } from './pixel-font';
import { stackHeight, stackRows } from './row-stack';
import type { RowRules } from './row-stack';
import type { SavedGame } from './save-store';
import { windowTop } from './title-layout';
import { QUIT_ENTRY, menuEntries, selectableEntries } from './title-menu';
import type { MenuEntry, TitleMenu } from './title-menu';
import { INK, WINDOW_PADDING } from './ui-layer';

// The window of the title screen, apart from the scene that draws it: what it says in each state of the title, how high
// it is and where each of its rows goes on the 320 x 192 screen. In every state but one it stands under the name of the
// game, in the middle of the room that is left (title-layout.ts); while the list of the controls shows, it takes the
// middle of the whole screen and the name is left out. The same window serves the paused screen, the start screen of a
// game that was put away with Esc: PAUSED and Resume on top of the lines of the title, its own question, and a window a
// little wider. In the desktop app both menus have Quit under their other lines, and their lines are a little lower, so that
// the line more fits the room. No Phaser in here.

const MENU_WINDOW_WIDTH = 200;
/**
 * The window of the paused screen is wider: the hint that Esc resumes shares a row with the hint of Enter, and that row,
 * ENTER TO SELECT   ESC TO RESUME, is 185 wide, which the 176 inside the other window do not hold.
 */
const PAUSED_WINDOW_WIDTH = 210;
const ROW_GAP = 4;
/** A line of the menu is as high as the button behind the line the cursor is on, which is as wide as the line. */
const ENTRY_HEIGHT = 15;
/**
 * A line of a menu with Quit is 2 lower, so that the line more fits: the window of the title with a message, 147 high
 * with lines of 15, and the paused menu, 147 too, are 139 and 137 with lines of 13, and the room above the line of the
 * audio is 139. The button keeps 3 pixels above and below its text.
 */
const QUITTING_ENTRY_HEIGHT = 13;
const ENTRY_WIDTH = 112;

const ENTRY_LABELS: Readonly<Record<MenuEntry, string>> = {
  resume: 'RESUME',
  'new-game': 'NEW GAME',
  continue: 'CONTINUE',
  controls: 'CONTROLS',
  quit: 'QUIT',
};

/** A row of the window that has something to draw. */
export type TitleRow =
  /** Centred. */
  | { readonly kind: 'text'; readonly text: string; readonly colour: number }
  /** A line of the menu, centred. The button is behind it when the cursor is on it. */
  | {
      readonly kind: 'entry';
      readonly text: string;
      readonly colour: number;
      readonly highlighted: boolean;
      readonly height: number;
    }
  /** The list of the controls, laid out by `layoutControlsList`, centred. */
  | { readonly kind: 'controls'; readonly layout: ControlsListLayout };

type Row =
  | TitleRow
  /** A little more room. */
  | { readonly kind: 'space'; readonly height: number };

/** A row and the box it is drawn in, in screen pixels: as wide as what it draws, and centred in the window. */
export interface PlacedTitleRow {
  readonly row: TitleRow;
  readonly box: Rect;
}

export interface TitleWindow {
  /** Whether the name of the game is drawn over the window. It is not while the list of the controls shows. */
  readonly showsName: boolean;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** The rows from the top down. The rooms between them are not rows. */
  readonly rows: readonly PlacedTitleRow[];
}

/** A message: the first line says what is wrong, and the others what follows from it. */
function message(...texts: readonly string[]): Row[] {
  return texts.map((text, at): Row => ({ kind: 'text', text, colour: at === 0 ? INK.warning : INK.hint }));
}

/** What the player is told about the saved game, when it is not one they can simply continue from. */
function messageRows(saved: SavedGame): Row[] {
  switch (saved.status) {
    case 'none':
    case 'usable':
      return [];
    case 'unavailable':
      return message('SAVING IS NOT AVAILABLE', 'PROGRESS WILL NOT BE KEPT.');
    case 'unusable':
      return saved.problem === 'damaged'
        ? message('THE SAVED GAME IS DAMAGED.', 'A NEW GAME WILL REPLACE IT.')
        : message('SAVE IS FROM ANOTHER VERSION.', 'A NEW GAME WILL REPLACE IT.');
  }
}

function entryRow(entry: MenuEntry, menu: TitleMenu, canContinue: boolean): Row {
  const highlighted = entry === menu.cursor;
  const canQuit = menu.canQuit === true;
  const available = selectableEntries(canContinue, menu.paused === true, canQuit).includes(entry);
  return {
    kind: 'entry',
    text: ENTRY_LABELS[entry],
    colour: highlighted ? INK.onButton : available ? INK.text : INK.dim,
    highlighted,
    height: canQuit ? QUITTING_ENTRY_HEIGHT : ENTRY_HEIGHT,
  };
}

/** The rows of the lines of the menu, top to bottom. */
function entryRows(menu: TitleMenu, saved: SavedGame): Row[] {
  return menuEntries(menu.paused === true, menu.canQuit === true).map((entry) =>
    entryRow(entry, menu, saved.status === 'usable'),
  );
}

/** A hint: a row of text in the colour of hints. */
function hint(text: string): Row {
  return { kind: 'text', text, colour: INK.hint };
}

const CHOOSE_HINT = 'W/S OR ARROWS TO CHOOSE';

/** The keys of the sound share a row, so that the window with a message still has room above the line of the audio. */
function soundKeysHint(): string {
  return `${audioKeyLabel('toggle-mute')} TO MUTE   ${audioKeyLabel('lower')} OR ${audioKeyLabel('raise')} FOR VOLUME`;
}

/** Whether the slot of the saved game holds something that the first save of a new game replaces: a saved game, usable or not. */
function holdsASavedGame(saved: SavedGame): boolean {
  return saved.status === 'usable' || saved.status === 'unusable';
}

/**
 * What the window holds for the paused menu: PAUSED over the lines, then the hints, the one of Enter sharing its row with
 * the one of Esc. It does not tell of the saved game, for there is no room: Continue is greyed all the same.
 */
function pausedMenuRows(menu: TitleMenu, saved: SavedGame): Row[] {
  return [
    { kind: 'text', text: 'PAUSED', colour: INK.title },
    ...entryRows(menu, saved),
    { kind: 'space', height: 0 },
    hint(CHOOSE_HINT),
    hint(`${confirmKeyLabel()} TO SELECT   ${closePageKeyLabel()} TO RESUME`),
    hint(soundKeysHint()),
  ];
}

/**
 * What the window holds for the question of a New Game on the paused screen: what is lost, the game in play always and the
 * saved game when there is one, and the key that starts it and the key that keeps the game.
 */
function pausedQuestionRows(saved: SavedGame): Row[] {
  return [
    ...message(
      'START A NEW GAME?',
      'THE GAME IN PLAY IS LOST.',
      ...(holdsASavedGame(saved) ? ['THE SAVED GAME IS REPLACED.'] : []),
    ),
    { kind: 'space', height: 0 },
    { kind: 'text', text: `${confirmKeyLabel()} TO START A NEW GAME`, colour: INK.text },
    { kind: 'text', text: `${closePageKeyLabel()} TO KEEP THE GAME`, colour: INK.text },
  ];
}

/**
 * What the window holds for the question of Quit on the paused screen: that the game in play is lost, and, when there is
 * a saved game to continue from, that it is kept; then the key that quits and the key that keeps the game.
 */
function quitQuestionRows(saved: SavedGame): Row[] {
  return [
    ...message(
      'QUIT THE GAME?',
      'THE GAME IN PLAY IS LOST.',
      ...(saved.status === 'usable' ? ['THE SAVED GAME IS KEPT.'] : []),
    ),
    { kind: 'space', height: 0 },
    { kind: 'text', text: `${confirmKeyLabel()} TO QUIT`, colour: INK.text },
    { kind: 'text', text: `${closePageKeyLabel()} TO KEEP THE GAME`, colour: INK.text },
  ];
}

/** What the window holds for the menu and the saved game as they stand, under the name of the game. */
function menuRows(menu: TitleMenu, saved: SavedGame): Row[] {
  if (menu.paused === true) {
    if (!menu.confirming) {
      return pausedMenuRows(menu, saved);
    }
    return menu.cursor === QUIT_ENTRY ? quitQuestionRows(saved) : pausedQuestionRows(saved);
  }
  if (menu.confirming) {
    return [
      { kind: 'text', text: 'REPLACE THE SAVED GAME?', colour: INK.warning },
      { kind: 'space', height: 0 },
      { kind: 'text', text: `${confirmKeyLabel()} TO REPLACE IT`, colour: INK.text },
      { kind: 'text', text: `${closePageKeyLabel()} TO KEEP IT`, colour: INK.text },
    ];
  }
  const rows: Row[] = entryRows(menu, saved);
  rows.push({ kind: 'space', height: 0 });
  const messages = messageRows(saved);
  if (messages.length > 0) {
    rows.push(...messages, { kind: 'space', height: 0 });
  }
  rows.push(hint(CHOOSE_HINT), hint(`${confirmKeyLabel()} TO SELECT`), hint(soundKeysHint()));
  return rows;
}

/** What the window holds while the list of the controls shows: the list of the Controls page in play, with its own hint to close it. */
function listRows(list: ControlsListLayout): Row[] {
  return [
    { kind: 'text', text: 'CONTROLS', colour: INK.title },
    { kind: 'space', height: 0 },
    { kind: 'controls', layout: list },
    { kind: 'space', height: 0 },
    { kind: 'text', text: `${closePageKeyLabel()} OR ${confirmKeyLabel()} TO CLOSE`, colour: INK.hint },
  ];
}

function heightOf(row: Row): number {
  switch (row.kind) {
    case 'text':
      return TEXT_HEIGHT;
    case 'entry':
      return row.height;
    case 'space':
      return row.height;
    case 'controls':
      return row.layout.height;
  }
}

function widthOf(row: TitleRow): number {
  switch (row.kind) {
    case 'text':
      return textWidthOf(row.text);
    case 'entry':
      return ENTRY_WIDTH;
    case 'controls':
      return row.layout.width;
  }
}

/** The space between two rows one under the other: none between lines of the menu, which have their own air. */
function gapBetween(above: Row, below: Row): number {
  return above.kind === 'entry' && below.kind === 'entry' ? 0 : ROW_GAP;
}

const ROW_RULES: RowRules<Row> = { heightOf, gapBetween };

/** What a kind of window settles for itself; `placeWindow` does the rest the same way for both. */
interface WindowShape {
  readonly rows: readonly Row[];
  /** Padding included. */
  readonly width: number;
  /** Where the window stands: its top, from its height. */
  readonly topOf: (height: number) => number;
  readonly showsName: boolean;
}

/** The menu, or the question that stands in for it: under the name of the game, in the middle of the room that is left. */
function menuShape(menu: TitleMenu, saved: SavedGame): WindowShape {
  const width = menu.paused === true ? PAUSED_WINDOW_WIDTH : MENU_WINDOW_WIDTH;
  return { rows: menuRows(menu, saved), width, topOf: windowTop, showsName: true };
}

/** The list of the controls: as wide as the list and its padding, in the middle of the whole screen, with no name over it. */
function listShape(list: ControlsListLayout): WindowShape {
  return {
    rows: listRows(list),
    width: list.width + 2 * WINDOW_PADDING,
    topOf: (height) => Math.floor((VIEW_HEIGHT - height) / 2),
    showsName: false,
  };
}

/** The window of a shape, with each of its rows in a box as wide as what it draws, centred in the window. */
function placeWindow({ rows, width, topOf, showsName }: WindowShape): TitleWindow {
  const height = stackHeight(rows, ROW_RULES) + 2 * WINDOW_PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  const top = topOf(height);
  const placed = stackRows(rows, top + WINDOW_PADDING, ROW_RULES).flatMap(({ row, top: rowTop }) => {
    if (row.kind === 'space') {
      return [];
    }
    const rowWidth = widthOf(row);
    const box = { left: left + Math.floor((width - rowWidth) / 2), top: rowTop, width: rowWidth, height: heightOf(row) };
    return [{ row, box } satisfies PlacedTitleRow];
  });
  return { showsName, left, top, width, height, rows: placed };
}

/**
 * The window of the title for the menu and the saved game as they stand. The list of the controls is the same whatever
 * the saved game says, and so is every other window of the menu that does not tell of it. The paused screen tells of it
 * only in its question, which says whether a saved game is replaced.
 */
export function layoutTitleWindow(menu: TitleMenu, saved: SavedGame): TitleWindow {
  return placeWindow(menu.showingControls ? listShape(layoutControlsList(controlsList())) : menuShape(menu, saved));
}
