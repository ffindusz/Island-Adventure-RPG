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
import { MENU_ENTRIES, selectableEntries } from './title-menu';
import type { MenuEntry, TitleMenu } from './title-menu';
import { INK, WINDOW_PADDING } from './ui-layer';

// The window of the title screen, apart from the scene that draws it: what it says in each state of the title, how high
// it is and where each of its rows goes on the 320 x 192 screen. In every state but one it stands under the name of the
// game, in the middle of the room that is left (title-layout.ts); while the list of the controls shows, it takes the
// middle of the whole screen and the name is left out. No Phaser in here.

const MENU_WINDOW_WIDTH = 200;
const ROW_GAP = 4;
/** A line of the menu is as high as the button behind the line the cursor is on, which is as wide as the line. */
const ENTRY_HEIGHT = 15;
const ENTRY_WIDTH = 112;

const ENTRY_LABELS: Readonly<Record<MenuEntry, string>> = {
  'new-game': 'NEW GAME',
  continue: 'CONTINUE',
  controls: 'CONTROLS',
};

/** A row of the window that has something to draw. */
export type TitleRow =
  /** Centred. */
  | { readonly kind: 'text'; readonly text: string; readonly colour: number }
  /** A line of the menu, centred. The button is behind it when the cursor is on it. */
  | { readonly kind: 'entry'; readonly text: string; readonly colour: number; readonly highlighted: boolean }
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
  const available = selectableEntries(canContinue).includes(entry);
  return {
    kind: 'entry',
    text: ENTRY_LABELS[entry],
    colour: highlighted ? INK.onButton : available ? INK.text : INK.dim,
    highlighted,
  };
}

/** What the window holds for the menu and the saved game as they stand, under the name of the game. */
function menuRows(menu: TitleMenu, saved: SavedGame): Row[] {
  if (menu.confirming) {
    return [
      { kind: 'text', text: 'REPLACE THE SAVED GAME?', colour: INK.warning },
      { kind: 'space', height: 0 },
      { kind: 'text', text: `${confirmKeyLabel()} TO REPLACE IT`, colour: INK.text },
      { kind: 'text', text: `${closePageKeyLabel()} TO KEEP IT`, colour: INK.text },
    ];
  }
  const rows: Row[] = MENU_ENTRIES.map((entry) => entryRow(entry, menu, saved.status === 'usable'));
  rows.push({ kind: 'space', height: 0 });
  const messages = messageRows(saved);
  if (messages.length > 0) {
    rows.push(...messages, { kind: 'space', height: 0 });
  }
  // The keys of the sound share a row, so that the window with a message still has room above the line of the audio.
  rows.push(
    { kind: 'text', text: 'W/S OR ARROWS TO CHOOSE', colour: INK.hint },
    { kind: 'text', text: `${confirmKeyLabel()} TO SELECT`, colour: INK.hint },
    {
      kind: 'text',
      text: `${audioKeyLabel('toggle-mute')} TO MUTE   ${audioKeyLabel('lower')} OR ${audioKeyLabel('raise')} FOR VOLUME`,
      colour: INK.hint,
    },
  );
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
      return ENTRY_HEIGHT;
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

/**
 * The window of the title for the menu and the saved game as they stand. The list of the controls is the same whatever
 * the saved game says, and so is every other window of the menu that does not tell of it.
 */
export function layoutTitleWindow(menu: TitleMenu, saved: SavedGame): TitleWindow {
  const list = menu.showingControls ? layoutControlsList(controlsList()) : null;
  const rows = list === null ? menuRows(menu, saved) : listRows(list);
  const width = list === null ? MENU_WINDOW_WIDTH : list.width + 2 * WINDOW_PADDING;
  const height = stackHeight(rows, ROW_RULES) + 2 * WINDOW_PADDING;
  const left = Math.floor((VIEW_WIDTH - width) / 2);
  const top = list === null ? windowTop(height) : Math.floor((VIEW_HEIGHT - height) / 2);
  const placed = stackRows(rows, top + WINDOW_PADDING, ROW_RULES).flatMap(({ row, top: rowTop }) => {
    if (row.kind === 'space') {
      return [];
    }
    const rowWidth = widthOf(row);
    const box = { left: left + Math.floor((width - rowWidth) / 2), top: rowTop, width: rowWidth, height: heightOf(row) };
    return [{ row, box } satisfies PlacedTitleRow];
  });
  return { showsName: list === null, left, top, width, height, rows: placed };
}
