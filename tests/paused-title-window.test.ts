import { describe, expect, it } from 'vitest';
import { audioLineBox } from '../src/adapter/audio-line';
import { VIEW_HEIGHT } from '../src/adapter/config';
import { textWidthOf } from '../src/adapter/pixel-font';
import type { SavedGame } from '../src/adapter/save-store';
import { TITLE_LINE_CORNER, logoLayout, paintedBounds } from '../src/adapter/title-layout';
import { openMenu } from '../src/adapter/title-menu';
import type { TitleMenu } from '../src/adapter/title-menu';
import { layoutTitleWindow } from '../src/adapter/title-window';
import { INK, WINDOW_PADDING } from '../src/adapter/ui-layer';
import { charactersTheFontLacks } from './drawn-text';
import {
  A_SAVE,
  DAMAGED,
  FROM_ANOTHER_VERSION,
  NO_SAVE,
  NOT_AVAILABLE,
  SAID,
  crosses,
  linesOf,
  textsOf,
} from './title-window-fixtures';

// The window of the start screen while the game is paused (Esc in play), as the scene draws it, without the scene: what it
// says, how high and wide it is, and the box of each of its rows on the 320 x 192 screen. The window of the title, which is
// not paused, is in title-window.test.ts and does not change. A direct test of a pure function of the adapter, as ADR 0005
// allows. Every number is worked out by hand: a text of n letters is 6n - 1 pixels wide and 7 tall, a line of the menu is
// 112 wide and 15 tall, there are 4 pixels between two rows (none between two lines of the menu), a space between two rows
// is 4 more of air, and a window has 12 of padding round its rows. The room under the name of the game runs from 36 to
// 188, so that a window of height h stands at 36 + floor((152 - h) / 2), and the line of the audio, in the bottom right
// corner, starts at 169, so that no row of a window may end below that.

/** The saved games the window can be over, each with whether a New Game would replace something in the slot. */
const SAVED_GAMES: readonly { readonly saved: SavedGame; readonly replaced: boolean }[] = [
  { saved: NO_SAVE, replaced: false },
  { saved: A_SAVE, replaced: true },
  { saved: NOT_AVAILABLE, replaced: false },
  { saved: DAMAGED, replaced: true },
  { saved: FROM_ANOTHER_VERSION, replaced: true },
];

const PAUSED_MENU = openMenu(false, true);
const ASKING: TitleMenu = { cursor: 'new-game', confirming: true, showingControls: false, paused: true };
const SHOWING_THE_LIST: TitleMenu = { cursor: 'controls', confirming: false, showingControls: true, paused: true };

/** The list of the controls on the title, which is not paused: the paused screen shows the very same one. */
const THE_TITLES_LIST: TitleMenu = { cursor: 'controls', confirming: false, showingControls: true };

const PAUSED_LINES = ['RESUME', 'NEW GAME', 'CONTINUE', 'CONTROLS'];
const HINTS = ['W/S OR ARROWS TO CHOOSE', 'ENTER TO SELECT   ESC TO RESUME', 'N TO MUTE   - OR + FOR VOLUME'];

/** The question of a New Game on the paused screen over a saved game that would be replaced, and over none. */
const QUESTION_OVER_A_SAVE = [
  'START A NEW GAME?',
  'THE GAME IN PLAY IS LOST.',
  'THE SAVED GAME IS REPLACED.',
  'ENTER TO START A NEW GAME',
  'ESC TO KEEP THE GAME',
];
const QUESTION_OVER_NONE = [
  'START A NEW GAME?',
  'THE GAME IN PLAY IS LOST.',
  'ENTER TO START A NEW GAME',
  'ESC TO KEEP THE GAME',
];

describe('what the window of the paused screen says', () => {
  it('is PAUSED over Resume, New Game, Continue and Controls, and three hints, the second telling that Esc resumes', () => {
    expect(textsOf(layoutTitleWindow(PAUSED_MENU, NO_SAVE))).toEqual(['PAUSED', ...PAUSED_LINES, ...HINTS]);
  });

  it('does not tell of the saved game, whatever it says: Continue is greyed or not, and nothing more', () => {
    for (const { saved } of SAVED_GAMES) {
      expect(textsOf(layoutTitleWindow(PAUSED_MENU, saved)), saved.status).toEqual(['PAUSED', ...PAUSED_LINES, ...HINTS]);
    }
  });

  it('writes PAUSED in the colour of titles, in the first row, and the hints in the colour of hints', () => {
    const rows = layoutTitleWindow(PAUSED_MENU, A_SAVE).rows.map(({ row }) => row);

    expect(rows[0]).toEqual({ kind: 'text', text: 'PAUSED', colour: INK.title });
    expect(rows.slice(-3)).toEqual(HINTS.map((text) => ({ kind: 'text', text, colour: INK.hint })));
  });

  it('is the question and its facts and two answers, and nothing else, while it asks whether to start a New Game', () => {
    expect(textsOf(layoutTitleWindow(ASKING, A_SAVE))).toEqual(QUESTION_OVER_A_SAVE);
  });

  it('says that the saved game is replaced when a saved game is in the slot, usable or not, and not when none is', () => {
    for (const { saved, replaced } of SAVED_GAMES) {
      const expected = replaced ? QUESTION_OVER_A_SAVE : QUESTION_OVER_NONE;
      expect(textsOf(layoutTitleWindow(ASKING, saved)), saved.status).toEqual(expected);
    }
  });

  it('warns in the first line of the question, tells the facts as hints and gives the keys as text', () => {
    const rows = layoutTitleWindow(ASKING, A_SAVE).rows.map(({ row }) => row);

    expect(rows.map((row) => (row.kind === 'text' ? row.colour : null))).toEqual([
      INK.warning,
      INK.hint,
      INK.hint,
      INK.text,
      INK.text,
    ]);
  });

  it('is the list of the controls of the title over every saved game, and no other', () => {
    const onTitle = layoutTitleWindow(THE_TITLES_LIST, A_SAVE);

    for (const { saved } of SAVED_GAMES) {
      expect(layoutTitleWindow(SHOWING_THE_LIST, saved), saved.status).toEqual(onTitle);
    }
    expect(textsOf(onTitle)).toEqual(['CONTROLS', 'ESC OR ENTER TO CLOSE']);
  });

  it('is not what the title says: the title has no PAUSED and no Resume, and the paused menu is not marked on it', () => {
    for (const { saved } of SAVED_GAMES) {
      const texts = textsOf(layoutTitleWindow(openMenu(saved.status === 'usable'), saved));
      expect(texts, saved.status).not.toContain('PAUSED');
      expect(texts, saved.status).not.toContain('RESUME');
    }
  });
});

describe('the height of the window of the paused screen', () => {
  // The menu is the row of PAUSED (7), a gap (4), four lines of 15 (60), the air of a space (4 + 4 = 8) and three hints
  // (7 + 4 + 7 + 4 + 7 = 29): 108, and 24 of padding make 132. That is the window of the title with a message about the saved
  // game, which is 106 + 15 for Resume + 11 for PAUSED, and it is the same over every saved game, for the window does not
  // tell of it. The question over a saved game is three rows (7 + 4 + 7 + 4 + 7 = 29), the air of a space (4 + 4 = 8) and
  // two answers (7 + 4 + 7 = 18): 55, and 79 with the padding; with one row of a fact less it is 11 less: 44, and 68.
  it.each([
    ['no saved game', NO_SAVE],
    ['a saved game', A_SAVE],
    ['saving not available', NOT_AVAILABLE],
    ['a damaged save', DAMAGED],
    ['a save from another version', FROM_ANOTHER_VERSION],
  ] as const)('is 132 for the menu over %s', (_state, saved) => {
    expect(layoutTitleWindow(PAUSED_MENU, saved).height).toBe(132);
  });

  it.each([
    ['a saved game', A_SAVE, 79],
    ['a damaged save', DAMAGED, 79],
    ['a save from another version', FROM_ANOTHER_VERSION, 79],
    ['no saved game', NO_SAVE, 68],
    ['saving not available', NOT_AVAILABLE, 68],
  ] as const)('is as worked out by hand for the question over %s', (_state, saved, height) => {
    expect(layoutTitleWindow(ASKING, saved).height).toBe(height);
  });

  it('is at most 139, which is what the room leaves above the line of the audio, in every state under the name', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING]) {
        expect(layoutTitleWindow(menu, saved).height, saved.status).toBeLessThanOrEqual(139);
      }
    }
  });

  // The hint that shares a row with Enter, ENTER TO SELECT   ESC TO RESUME, is 31 letters, 6 x 31 - 1 = 185 wide, and the
  // window of the title is 200 wide with 24 of padding: 176 inside, which is 4 pixels short. The window of the paused screen
  // is 210 wide, 186 inside, and stands at (320 - 210) / 2 = 55 from the left, the middle of the screen as the title's is.
  it('is 210 wide, in the middle of the screen, in every state under the name', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING]) {
        const window = layoutTitleWindow(menu, saved);
        expect([window.left, window.width], saved.status).toEqual([55, 210]);
      }
    }
  });

  it('takes the middle of the whole screen, as the list of the title does, and is the list of the title in size', () => {
    const window = layoutTitleWindow(SHOWING_THE_LIST, A_SAVE);

    expect([window.left, window.top, window.width, window.height, window.showsName]).toEqual([34, 5, 252, 181, false]);
  });
});

describe('the rows of the window of the paused screen', () => {
  it('stand where they were worked out by hand for the menu', () => {
    // The window is 132 high and stands at 36 + (152 - 132) / 2 = 46, its rows from 46 + 12 = 58. PAUSED is 6 letters, 35
    // wide: 55 + (210 - 35) / 2 = 55 + 87 = 142, at 58. The four lines of the menu follow 4 below it, at 69, 84, 99 and 114,
    // 112 wide at 55 + (210 - 112) / 2 = 104, which ends at 129. The space is at 129 + 4 = 133, and the first hint 4 below
    // it, at 137, the others at 148 and 159, which ends at 166, 12 above the foot of the window (178). The hints are 137,
    // 185 and 173 wide: 55 + 36 = 91, 55 + 12 = 67 and 55 + 18 = 73.
    const window = layoutTitleWindow(PAUSED_MENU, A_SAVE);

    expect([window.left, window.top, window.width, window.height]).toEqual([55, 46, 210, 132]);
    expect(window.rows.map(({ box }) => box)).toEqual([
      { left: 142, top: 58, width: 35, height: 7 },
      { left: 104, top: 69, width: 112, height: 15 },
      { left: 104, top: 84, width: 112, height: 15 },
      { left: 104, top: 99, width: 112, height: 15 },
      { left: 104, top: 114, width: 112, height: 15 },
      { left: 91, top: 137, width: 137, height: 7 },
      { left: 67, top: 148, width: 185, height: 7 },
      { left: 73, top: 159, width: 173, height: 7 },
    ]);
  });

  it('stand where they were worked out by hand for the question over a saved game', () => {
    // The window is 79 high and stands at 36 + floor((152 - 79) / 2) = 36 + 36 = 72, its rows from 84. The question, 17
    // letters and 101 wide, is at 84, the two facts, 25 letters (149 wide) and 27 letters (161 wide), at 95 and 106, the
    // space at 117 and the answers, 25 letters (149 wide) and 20 letters (119 wide), at 121 and 132, which ends at 139, 12
    // above the foot of the window (151). Their lefts are 55 + 54 = 109, 55 + 30 = 85, 55 + 24 = 79, 85 and 55 + 45 = 100.
    const window = layoutTitleWindow(ASKING, A_SAVE);

    expect([window.left, window.top, window.width, window.height]).toEqual([55, 72, 210, 79]);
    expect(window.rows.map(({ box }) => box)).toEqual([
      { left: 109, top: 84, width: 101, height: 7 },
      { left: 85, top: 95, width: 149, height: 7 },
      { left: 79, top: 106, width: 161, height: 7 },
      { left: 85, top: 121, width: 149, height: 7 },
      { left: 100, top: 132, width: 119, height: 7 },
    ]);
  });

  it('stand where they were worked out by hand for the question over no saved game', () => {
    // The window is 68 high and stands at 36 + (152 - 68) / 2 = 78, its rows from 90: the question at 90, the one fact at
    // 101, the space at 112 and the answers at 116 and 127, which ends at 134, 12 above the foot of the window (146).
    const window = layoutTitleWindow(ASKING, NO_SAVE);

    expect([window.left, window.top, window.width, window.height]).toEqual([55, 78, 210, 68]);
    expect(window.rows.map(({ box }) => box)).toEqual([
      { left: 109, top: 90, width: 101, height: 7 },
      { left: 85, top: 101, width: 149, height: 7 },
      { left: 85, top: 116, width: 149, height: 7 },
      { left: 100, top: 127, width: 119, height: 7 },
    ]);
  });

  it('end 12 pixels above the foot of the window, in every state under the name', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING]) {
        const window = layoutTitleWindow(menu, saved);
        const last = window.rows[window.rows.length - 1];

        expect((last?.box.top ?? 0) + (last?.box.height ?? 0), saved.status).toBe(window.top + window.height - WINDOW_PADDING);
      }
    }
  });

  it('are whole inside the padding of the window, in every state', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING, SHOWING_THE_LIST]) {
        const window = layoutTitleWindow(menu, saved);
        for (const { box } of window.rows) {
          expect(box.left, saved.status).toBeGreaterThanOrEqual(window.left + WINDOW_PADDING);
          expect(box.left + box.width, saved.status).toBeLessThanOrEqual(window.left + window.width - WINDOW_PADDING);
          expect(box.top, saved.status).toBeGreaterThanOrEqual(window.top + WINDOW_PADDING);
          expect(box.top + box.height, saved.status).toBeLessThanOrEqual(window.top + window.height - WINDOW_PADDING);
        }
      }
    }
  });
});

describe('the lines of the menu in the window of the paused screen', () => {
  it.each([
    ['resume', [true, false, false, false]],
    ['new-game', [false, true, false, false]],
    ['continue', [false, false, true, false]],
    ['controls', [false, false, false, true]],
  ] as const)('have the cursor on %s: highlighted are %j', (cursor, highlighted) => {
    const menu: TitleMenu = { cursor, confirming: false, showingControls: false, paused: true };

    expect(linesOf(layoutTitleWindow(menu, A_SAVE)).map((line) => line.highlighted)).toEqual(highlighted);
  });

  it('are Resume, New Game, Continue and Controls, and the cursor opens on Resume', () => {
    const lines = linesOf(layoutTitleWindow(PAUSED_MENU, A_SAVE));

    expect(lines.map((line) => line.text)).toEqual(PAUSED_LINES);
    expect(lines.map((line) => line.highlighted)).toEqual([true, false, false, false]);
  });

  it('grey Continue, and only Continue, when there is no saved game', () => {
    expect(linesOf(layoutTitleWindow(PAUSED_MENU, NO_SAVE)).map((line) => line.colour)).toEqual([
      INK.onButton,
      INK.text,
      INK.dim,
      INK.text,
    ]);
  });

  it('grey none of them when there is a saved game to continue from', () => {
    expect(linesOf(layoutTitleWindow(PAUSED_MENU, A_SAVE)).map((line) => line.colour)).toEqual([
      INK.onButton,
      INK.text,
      INK.text,
      INK.text,
    ]);
  });

  it('grey Continue in the states where the saved game cannot be continued from, though the window does not tell of it', () => {
    for (const saved of [NOT_AVAILABLE, DAMAGED, FROM_ANOTHER_VERSION]) {
      const colours = linesOf(layoutTitleWindow(PAUSED_MENU, saved)).map((line) => line.colour);
      expect(colours, saved.status).toEqual([INK.onButton, INK.text, INK.dim, INK.text]);
    }
  });
});

describe('the room of the window of the paused screen under the name', () => {
  const name = paintedBounds(logoLayout());

  it('is clear of the name of the game and above the foot of the screen, in every state under the name', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING]) {
        const window = layoutTitleWindow(menu, saved);
        expect(window.showsName, saved.status).toBe(true);
        expect(window.top, saved.status).toBeGreaterThanOrEqual(name.bottom);
        expect(window.top + window.height, saved.status).toBeLessThanOrEqual(VIEW_HEIGHT - 4);
      }
    }
  });

  it('is made of lines that fit between its paddings, so that every one is shown whole', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING]) {
        const window = layoutTitleWindow(menu, saved);
        for (const text of textsOf(window)) {
          expect(textWidthOf(text), `${text} over ${saved.status}`).toBeLessThanOrEqual(window.width - 2 * WINDOW_PADDING);
        }
      }
    }
  });

  it('is made of text the pixel font can draw', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING]) {
        for (const text of textsOf(layoutTitleWindow(menu, saved))) {
          expect(charactersTheFontLacks(text), `${text} over ${saved.status}`).toEqual([]);
        }
      }
    }
  });

  it('has no row covered by the line of the audio, in the corner the title gives it, in any state', () => {
    for (const { saved } of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING]) {
        const window = layoutTitleWindow(menu, saved);
        for (const said of SAID) {
          const line = audioLineBox(said, TITLE_LINE_CORNER);
          for (const { box } of window.rows) {
            expect(crosses(box, line), `${said} over a row of the window over ${saved.status}`).toBe(false);
          }
        }
      }
    }
  });
});
