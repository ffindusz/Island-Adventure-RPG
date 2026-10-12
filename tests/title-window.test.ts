import { describe, expect, it } from 'vitest';
import { audioLineBox } from '../src/adapter/audio-line';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../src/adapter/config';
import { controlsList, pageKeyLabel } from '../src/adapter/controls';
import { layoutControlsList } from '../src/adapter/controls-list';
import { panelFor } from '../src/adapter/overlay';
import { textWidthOf } from '../src/adapter/pixel-font';
import type { Rect } from '../src/adapter/pixel-font';
import type { SavedGame } from '../src/adapter/save-store';
import { TITLE_LINE_CORNER, logoLayout, paintedBounds } from '../src/adapter/title-layout';
import { openMenu } from '../src/adapter/title-menu';
import type { TitleMenu } from '../src/adapter/title-menu';
import { layoutTitleWindow } from '../src/adapter/title-window';
import type { TitleWindow } from '../src/adapter/title-window';
import { INK, WINDOW_PADDING } from '../src/adapter/ui-layer';
import { charactersTheFontLacks } from './drawn-text';
import { newGame, playingView } from './fixtures';

// The window of the title screen as the scene draws it, without the scene: what it says in each state of the title, how
// high it is, and the box of each of its rows on the 320 x 192 screen. A direct test of a pure function of the adapter,
// as ADR 0005 allows. Every number is worked out by hand: a text of n letters is 6n - 1 pixels wide and 7 tall, a line of
// the menu is 112 wide and 15 tall, there are 4 pixels between two rows (none between two lines of the menu), a space
// between two rows is 4 more of air, and a window has 12 of padding round its rows.

const NO_SAVE: SavedGame = { status: 'none' };
const A_SAVE: SavedGame = { status: 'usable', snapshot: newGame().snapshot() };
const NOT_AVAILABLE: SavedGame = { status: 'unavailable' };
const DAMAGED: SavedGame = { status: 'unusable', problem: 'damaged', detail: 'The save could not be read.' };
const FROM_ANOTHER_VERSION: SavedGame = {
  status: 'unusable',
  problem: 'incompatible',
  detail: 'The save is from version 3 of the game.',
};

const ASKING: TitleMenu = { cursor: 'new-game', confirming: true, showingControls: false };
const SHOWING_THE_LIST: TitleMenu = { cursor: 'controls', confirming: false, showingControls: true };

interface TitleState {
  readonly name: string;
  readonly menu: TitleMenu;
  readonly saved: SavedGame;
}

/** The states of the title in which the window stands under the name of the game, each with the menu as the title opens it. */
const MENU_STATES: readonly TitleState[] = [
  { name: 'no saved game', menu: openMenu(false), saved: NO_SAVE },
  { name: 'a saved game', menu: openMenu(true), saved: A_SAVE },
  { name: 'the question whether to replace the saved game', menu: ASKING, saved: A_SAVE },
  { name: 'saving not available', menu: openMenu(false), saved: NOT_AVAILABLE },
  { name: 'a damaged save', menu: openMenu(false), saved: DAMAGED },
  { name: 'a save from another version', menu: openMenu(false), saved: FROM_ANOTHER_VERSION },
];

/** The saved games the list of the controls can be shown over, which is all of them. */
const SAVED_GAMES: readonly SavedGame[] = [NO_SAVE, A_SAVE, NOT_AVAILABLE, DAMAGED, FROM_ANOTHER_VERSION];

/** What the keys of the audio can say: the narrowest line is SOUND ON, and the widest VOLUME 10/10. */
const SAID = ['SOUND OFF', 'SOUND ON', ...Array.from({ length: 11 }, (_, volume) => `VOLUME ${volume}/10`)];

/** The lines of text of the window, the lines of the menu included, from the top down. */
function textsOf(window: TitleWindow): string[] {
  return window.rows.flatMap(({ row }) => (row.kind === 'text' || row.kind === 'entry' ? [row.text] : []));
}

/** The lines of the menu in the window, from the top down. */
function linesOf(window: TitleWindow) {
  return window.rows.flatMap(({ row }) => (row.kind === 'entry' ? [row] : []));
}

function crosses(one: Rect, other: Rect): boolean {
  return (
    one.left < other.left + other.width &&
    other.left < one.left + one.width &&
    one.top < other.top + other.height &&
    other.top < one.top + one.height
  );
}

const LINES = ['NEW GAME', 'CONTINUE', 'CONTROLS'];
const HINTS = ['W/S OR ARROWS TO CHOOSE', 'ENTER TO SELECT', 'N TO MUTE   - OR + FOR VOLUME'];

describe('what the window of the title says', () => {
  it('is the three lines of the menu and three hints when there is no saved game', () => {
    expect(textsOf(layoutTitleWindow(openMenu(false), NO_SAVE))).toEqual([...LINES, ...HINTS]);
  });

  it('is the same when there is a saved game: Continue is only greyed when there is none', () => {
    expect(textsOf(layoutTitleWindow(openMenu(true), A_SAVE))).toEqual([...LINES, ...HINTS]);
  });

  it('is the question and its two answers, and nothing else, while it asks whether to replace the saved game', () => {
    expect(textsOf(layoutTitleWindow(ASKING, A_SAVE))).toEqual([
      'REPLACE THE SAVED GAME?',
      'ENTER TO REPLACE IT',
      'ESC TO KEEP IT',
    ]);
  });

  it('says, between the menu and the hints, that saving is not available and that the progress will not be kept', () => {
    expect(textsOf(layoutTitleWindow(openMenu(false), NOT_AVAILABLE))).toEqual([
      ...LINES,
      'SAVING IS NOT AVAILABLE',
      'PROGRESS WILL NOT BE KEPT.',
      ...HINTS,
    ]);
  });

  it('says, between the menu and the hints, that the saved game is damaged and that a New Game will replace it', () => {
    expect(textsOf(layoutTitleWindow(openMenu(false), DAMAGED))).toEqual([
      ...LINES,
      'THE SAVED GAME IS DAMAGED.',
      'A NEW GAME WILL REPLACE IT.',
      ...HINTS,
    ]);
  });

  it('says, between the menu and the hints, that the save is from another version and that a New Game will replace it', () => {
    expect(textsOf(layoutTitleWindow(openMenu(false), FROM_ANOTHER_VERSION))).toEqual([
      ...LINES,
      'SAVE IS FROM ANOTHER VERSION.',
      'A NEW GAME WILL REPLACE IT.',
      ...HINTS,
    ]);
  });

  it('puts the sound keys in one row of the hints, the key to mute and the keys of the volume side by side', () => {
    const hints = textsOf(layoutTitleWindow(openMenu(false), NO_SAVE)).slice(LINES.length);

    expect(hints).toHaveLength(3);
    expect(hints[2]).toBe('N TO MUTE   - OR + FOR VOLUME');
  });
});

describe('the height of the window of the title', () => {
  // Three lines of the menu are 3 x 15 = 45. Under them go the air of a space (4 + 4 = 8) and three hints (7 + 4 + 7 + 4 + 7
  // = 29): 82, and 24 of padding make 106. The question is a question, a space and two answers: 7 + 4 + 0 + 4 + 7 + 4 + 7 =
  // 33, and 24 more make 57. A message of two rows (7 + 4 + 7 = 18) goes between the menu and the hints with a space after it
  // (another 8): 45 + 8 + 18 + 8 + 29 = 108, and 132 with the padding, which is the height of all three of the states that
  // have one.
  it.each([
    ['no saved game', openMenu(false), NO_SAVE, 106],
    ['a saved game', openMenu(true), A_SAVE, 106],
    ['the question whether to replace the saved game', ASKING, A_SAVE, 57],
    ['saving not available', openMenu(false), NOT_AVAILABLE, 132],
    ['a damaged save', openMenu(false), DAMAGED, 132],
    ['a save from another version', openMenu(false), FROM_ANOTHER_VERSION, 132],
  ] as const)('is as worked out by hand for %s', (_state, menu, saved, height) => {
    expect(layoutTitleWindow(menu, saved).height).toBe(height);
  });

  it('is 200 wide, in the middle of the screen, in every state under the name', () => {
    for (const { name, menu, saved } of MENU_STATES) {
      const window = layoutTitleWindow(menu, saved);
      expect([window.left, window.width], name).toEqual([60, 200]);
    }
  });
});

describe('the rows of the window of the title', () => {
  it('stand where they were worked out by hand when there is no saved game', () => {
    // The window is 106 high and stands at 36 + (152 - 106) / 2 = 59, its rows from 59 + 12 = 71. The lines of the menu stand
    // at 71, 86 and 101, 112 wide at 60 + (200 - 112) / 2 = 104. The space after them is at 101 + 15 + 4 = 120, and the first
    // hint 4 below it, at 124; the others follow at 135 and 146, which ends at 153, 12 above the foot of the window (165).
    // The hints are 137, 89 and 173 wide: 60 + (200 - 137) / 2 = 91, 60 + (200 - 89) / 2 = 115, 60 + (200 - 173) / 2 = 73.
    const window = layoutTitleWindow(openMenu(false), NO_SAVE);

    expect([window.left, window.top, window.width, window.height]).toEqual([60, 59, 200, 106]);
    expect(window.rows.map(({ box }) => box)).toEqual([
      { left: 104, top: 71, width: 112, height: 15 },
      { left: 104, top: 86, width: 112, height: 15 },
      { left: 104, top: 101, width: 112, height: 15 },
      { left: 91, top: 124, width: 137, height: 7 },
      { left: 115, top: 135, width: 89, height: 7 },
      { left: 73, top: 146, width: 173, height: 7 },
    ]);
  });

  it('stand where they were worked out by hand when the save is from another version', () => {
    // The window is 132 high and stands at 36 + (152 - 132) / 2 = 46, its rows from 58: the lines of the menu at 58, 73 and
    // 88, the space after them at 107, the message at 111 and 122, the space after it at 133, and the hints at 137, 148
    // and 159, which ends at 166, 12 above the foot of the window (178). The message is 173 and 161 wide: 73 and 79 from the
    // left of the screen.
    const window = layoutTitleWindow(openMenu(false), FROM_ANOTHER_VERSION);

    expect([window.left, window.top, window.width, window.height]).toEqual([60, 46, 200, 132]);
    expect(window.rows.map(({ box }) => box)).toEqual([
      { left: 104, top: 58, width: 112, height: 15 },
      { left: 104, top: 73, width: 112, height: 15 },
      { left: 104, top: 88, width: 112, height: 15 },
      { left: 73, top: 111, width: 173, height: 7 },
      { left: 79, top: 122, width: 161, height: 7 },
      { left: 91, top: 137, width: 137, height: 7 },
      { left: 115, top: 148, width: 89, height: 7 },
      { left: 73, top: 159, width: 173, height: 7 },
    ]);
  });

  it('end 12 pixels above the foot of the window, in every state under the name', () => {
    for (const { name, menu, saved } of MENU_STATES) {
      const window = layoutTitleWindow(menu, saved);
      const last = window.rows[window.rows.length - 1];

      expect((last?.box.top ?? 0) + (last?.box.height ?? 0), name).toBe(window.top + window.height - WINDOW_PADDING);
    }
  });

  it('are whole inside the padding of the window, in every state', () => {
    for (const { name, menu, saved } of [...MENU_STATES, { name: 'the list', menu: SHOWING_THE_LIST, saved: NO_SAVE }]) {
      const window = layoutTitleWindow(menu, saved);
      for (const { box } of window.rows) {
        expect(box.left, name).toBeGreaterThanOrEqual(window.left + WINDOW_PADDING);
        expect(box.left + box.width, name).toBeLessThanOrEqual(window.left + window.width - WINDOW_PADDING);
        expect(box.top, name).toBeGreaterThanOrEqual(window.top + WINDOW_PADDING);
        expect(box.top + box.height, name).toBeLessThanOrEqual(window.top + window.height - WINDOW_PADDING);
      }
    }
  });
});

describe('the lines of the menu in the window of the title', () => {
  it.each([
    ['new-game', [true, false, false]],
    ['continue', [false, true, false]],
    ['controls', [false, false, true]],
  ] as const)('have the cursor on %s: highlighted are %j', (cursor, highlighted) => {
    const menu: TitleMenu = { cursor, confirming: false, showingControls: false };

    expect(linesOf(layoutTitleWindow(menu, A_SAVE)).map((line) => line.highlighted)).toEqual(highlighted);
  });

  it('grey Continue, and only Continue, when there is no saved game', () => {
    const onControls: TitleMenu = { cursor: 'controls', confirming: false, showingControls: false };

    expect(linesOf(layoutTitleWindow(onControls, NO_SAVE)).map((line) => line.colour)).toEqual([
      INK.text,
      INK.dim,
      INK.onButton,
    ]);
  });

  it('grey none of them when there is a saved game to continue from, Controls never being greyed', () => {
    const onNewGame: TitleMenu = { cursor: 'new-game', confirming: false, showingControls: false };

    expect(linesOf(layoutTitleWindow(onNewGame, A_SAVE)).map((line) => line.colour)).toEqual([
      INK.onButton,
      INK.text,
      INK.text,
    ]);
  });

  it('grey Continue in the states where the saved game cannot be continued from, whatever it says', () => {
    for (const saved of [NOT_AVAILABLE, DAMAGED, FROM_ANOTHER_VERSION]) {
      const lines = linesOf(layoutTitleWindow(openMenu(false), saved));
      expect(lines.map((line) => line.colour), saved.status).toEqual([INK.onButton, INK.dim, INK.text]);
    }
  });
});

describe('the room of the window of the title under the name', () => {
  const name = paintedBounds(logoLayout());

  it('is clear of the name of the game and above the foot of the screen, in every state under the name', () => {
    for (const { name: state, menu, saved } of MENU_STATES) {
      const window = layoutTitleWindow(menu, saved);
      expect(window.showsName, state).toBe(true);
      expect(window.top, state).toBeGreaterThanOrEqual(name.bottom);
      expect(window.top + window.height, state).toBeLessThanOrEqual(VIEW_HEIGHT - 4);
    }
  });

  it('is made of lines that fit between its paddings, so that every one is shown whole', () => {
    for (const { name: state, menu, saved } of MENU_STATES) {
      const window = layoutTitleWindow(menu, saved);
      for (const text of textsOf(window)) {
        expect(textWidthOf(text), `${text} in the state: ${state}`).toBeLessThanOrEqual(window.width - 2 * WINDOW_PADDING);
      }
    }
  });

  it('is made of text the pixel font can draw', () => {
    for (const { name: state, menu, saved } of MENU_STATES) {
      for (const text of textsOf(layoutTitleWindow(menu, saved))) {
        expect(charactersTheFontLacks(text), `${text} in the state: ${state}`).toEqual([]);
      }
    }
  });

  it('has no row covered by the line of the audio, in the corner the title gives it, in any state', () => {
    for (const { name: state, menu, saved } of MENU_STATES) {
      const window = layoutTitleWindow(menu, saved);
      for (const said of SAID) {
        const line = audioLineBox(said, TITLE_LINE_CORNER);
        for (const { box } of window.rows) {
          expect(crosses(box, line), `${said} over a row of the state: ${state}`).toBe(false);
        }
      }
    }
  });
});

/** The panel that the overlay draws when the Controls page is open, with the game in focus. */
function controlsPageOnTheOverlay() {
  const game = newGame();
  game.send({ type: 'open-page', page: 'controls' });
  const panel = panelFor(playingView(game), true, 0);
  if (panel === null) {
    throw new Error('The overlay draws nothing for the Controls page.');
  }
  return panel;
}

describe('the list of the controls on the title', () => {
  const list = layoutTitleWindow(SHOWING_THE_LIST, A_SAVE);

  it('has its heading, then the list laid out, then the hint to close it, and nothing of the menu', () => {
    expect(list.rows.map(({ row }) => row.kind)).toEqual(['text', 'controls', 'text']);
    expect(textsOf(list)).toEqual(['CONTROLS', 'ESC OR ENTER TO CLOSE']);
  });

  it('is the list of the Controls page in play, from the same tables, laid out the same', () => {
    const onTitle = list.rows.filter(({ row }) => row.kind === 'controls').map(({ row }) => row);
    const inPlay = controlsPageOnTheOverlay().rows.filter((row) => row.kind === 'controls');

    expect(onTitle).toEqual([{ kind: 'controls', layout: layoutControlsList(controlsList()) }]);
    expect(onTitle).toEqual(inPlay);
  });

  it('closes with the keys the title answers, Esc and Enter, and does not name the key of the page in play', () => {
    const hint = textsOf(list)[1] ?? '';
    const words = hint.split(' ');

    expect(words).toContain('ESC');
    expect(words).toContain('ENTER');
    expect(words).not.toContain(pageKeyLabel('controls'));
  });

  it('is shown whole, the same, over every saved game, and not over the question or the message', () => {
    for (const saved of SAVED_GAMES) {
      expect(layoutTitleWindow(SHOWING_THE_LIST, saved), saved.status).toEqual(list);
    }
  });

  // The window is as wide as the list and its padding, 228 + 24 = 252, and as high as the heading, the list and the hint with
  // a space on each side of the list: 7 + 4 + 0 + 4 + 127 + 4 + 0 + 4 + 7 = 157, and 181 with the padding, the same window as
  // the Controls page in play. It takes the whole screen, so it is in the middle of it: (320 - 252) / 2 = 34 from the left
  // and (192 - 181) / 2 = 5 from the top, the name of the game being left out, for the 152 pixels of room under it are not
  // enough.
  it('takes the middle of the screen as a window as wide as the list and as tall as it is with its heading and hint', () => {
    expect([list.left, list.top, list.width, list.height]).toEqual([34, 5, 252, 181]);
    expect(list.showsName).toBe(false);
    expect(list.rows.map(({ box }) => box)).toEqual([
      { left: 136, top: 17, width: 47, height: 7 },
      { left: 46, top: 32, width: 228, height: 127 },
      { left: 97, top: 167, width: 125, height: 7 },
    ]);
  });

  it('is whole on the screen', () => {
    expect(list.left).toBeGreaterThanOrEqual(0);
    expect(list.left + list.width).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(list.top).toBeGreaterThanOrEqual(0);
    expect(list.top + list.height).toBeLessThanOrEqual(VIEW_HEIGHT);
  });

  it('is made of text the pixel font can draw, in lines that fit the window', () => {
    for (const text of textsOf(list)) {
      expect(charactersTheFontLacks(text), text).toEqual([]);
      expect(textWidthOf(text), text).toBeLessThanOrEqual(list.width - 2 * WINDOW_PADDING);
    }
  });

  it('has no row covered by the line of the audio, which the keys of the sound still show while the list shows', () => {
    for (const said of SAID) {
      const line = audioLineBox(said, TITLE_LINE_CORNER);
      for (const { box } of list.rows) {
        expect(crosses(box, line), said).toBe(false);
      }
    }
  });
});
