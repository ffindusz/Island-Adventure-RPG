import { describe, expect, it } from 'vitest';
import { openMenu, pressMenu, selectableEntries, soundOfPress } from '../src/adapter/title-menu';
import type { TitleKeys, TitleMenu } from '../src/adapter/title-menu';
import { layoutTitleWindow } from '../src/adapter/title-window';
import { WINDOW_PADDING } from '../src/adapter/ui-layer';
import { charactersTheFontLacks } from './drawn-text';
import { A_SAVE, DAMAGED, FROM_ANOTHER_VERSION, NO_SAVE, NOT_AVAILABLE, linesOf, textsOf } from './title-window-fixtures';

// Quit on the title and on the paused screen, as the desktop app has it, without the scene that draws it: where the line
// goes, that the title quits at once and the paused screen asks first, and that the windows with the line more still fit
// the room above the line of the audio. The browser build has no Quit, and the other title tests, which open the menu
// without it, pin that nothing of theirs changes. Every number is worked out by hand as in paused-title-window.test.ts,
// with the lines of a menu with Quit 13 high instead of 15.

const SAVED = true;
const NO_SAVED_GAME = false;
const PAUSED = true;
const QUITS = true;

const TITLE = openMenu(SAVED, false, QUITS);
const PAUSED_MENU = openMenu(SAVED, PAUSED, QUITS);
const ON_QUIT: TitleMenu = { ...TITLE, cursor: 'quit' };
const PAUSED_ON_QUIT: TitleMenu = { ...PAUSED_MENU, cursor: 'quit' };
const ASKING_TO_QUIT: TitleMenu = { ...PAUSED_ON_QUIT, confirming: true };

const SAVED_GAMES = [NO_SAVE, A_SAVE, NOT_AVAILABLE, DAMAGED, FROM_ANOTHER_VERSION];

/** One look at the keys, with nothing pressed but what is given. */
function press(menu: TitleMenu, canContinue: boolean, keys: Partial<TitleKeys> = {}) {
  return pressMenu(menu, canContinue, { step: 0, confirm: false, cancel: false, ...keys });
}

describe('the menu with Quit', () => {
  it('opens where the menu without it opens, and says that it can quit', () => {
    expect(TITLE).toEqual({ cursor: 'continue', confirming: false, showingControls: false, canQuit: true });
    expect(PAUSED_MENU).toEqual({
      cursor: 'resume',
      confirming: false,
      showingControls: false,
      paused: true,
      canQuit: true,
    });
    expect(openMenu(SAVED, PAUSED)).not.toHaveProperty('canQuit');
  });

  it('has Quit under every other line, on the title and on the paused screen', () => {
    expect(selectableEntries(SAVED, false, QUITS)).toEqual(['new-game', 'continue', 'controls', 'quit']);
    expect(selectableEntries(NO_SAVED_GAME, false, QUITS)).toEqual(['new-game', 'controls', 'quit']);
    expect(selectableEntries(SAVED, PAUSED, QUITS)).toEqual(['resume', 'new-game', 'continue', 'controls', 'quit']);
  });

  it('goes down to Quit from Controls, and no further', () => {
    const onControls: TitleMenu = { ...TITLE, cursor: 'controls' };

    expect(press(onControls, SAVED, { step: 1 }).menu.cursor).toBe('quit');
    expect(press(ON_QUIT, SAVED, { step: 1 }).menu.cursor).toBe('quit');
    expect(press(ON_QUIT, SAVED, { step: -1 }).menu.cursor).toBe('controls');
  });

  it('quits at once from the title, with a saved game or none: nothing in play is lost', () => {
    expect(press(ON_QUIT, SAVED, { confirm: true }).choice).toBe('quit');
    expect(press(ON_QUIT, NO_SAVED_GAME, { confirm: true }).choice).toBe('quit');
    expect(soundOfPress(ON_QUIT, ON_QUIT, 'quit')).toBe('confirm');
  });

  it('asks first on the paused screen, where the game in play is lost', () => {
    const asked = press(PAUSED_ON_QUIT, SAVED, { confirm: true });

    expect(asked).toEqual({ menu: ASKING_TO_QUIT, choice: null });
    expect(soundOfPress(PAUSED_ON_QUIT, asked.menu, asked.choice)).toBe('page-open');
  });

  it('quits when Enter answers the question, and keeps the game, still paused and on Quit, when Esc does', () => {
    expect(press(ASKING_TO_QUIT, SAVED, { confirm: true }).choice).toBe('quit');
    expect(press(ASKING_TO_QUIT, SAVED, { cancel: true })).toEqual({ menu: PAUSED_ON_QUIT, choice: null });
    // Esc wins over an Enter pressed with it, as it does at the question of a New Game.
    expect(press(ASKING_TO_QUIT, SAVED, { confirm: true, cancel: true }).choice).toBeNull();
  });

  it('still asks about a New Game, and Enter there starts one, not a Quit', () => {
    const asking: TitleMenu = { ...PAUSED_MENU, cursor: 'new-game', confirming: true };

    expect(press(asking, SAVED, { confirm: true }).choice).toBe('new-game');
  });

  it('resumes with Esc on the paused screen, the cursor on Quit too', () => {
    expect(press(PAUSED_ON_QUIT, SAVED, { cancel: true }).choice).toBe('resume');
  });
});

describe('the window of the title with Quit', () => {
  // Four lines of 13 are 52; with the air of a space (8) and three hints (29) that is 89, and 113 with the padding. A
  // message of two rows and its space add 18 + 8: 115, and 139, which is all the room there is above the line of the audio.
  it.each([
    ['no saved game', openMenu(false, false, QUITS), NO_SAVE, 113],
    ['a saved game', TITLE, A_SAVE, 113],
    ['saving not available', openMenu(false, false, QUITS), NOT_AVAILABLE, 139],
    ['a damaged save', openMenu(false, false, QUITS), DAMAGED, 139],
  ] as const)('is as worked out by hand for %s', (_state, menu, saved, height) => {
    expect(layoutTitleWindow(menu, saved).height).toBe(height);
  });

  // The window of 113 stands at 36 + floor((152 - 113) / 2) = 55, its rows from 67, a line every 13.
  it('shows QUIT under the other lines, every line 112 by 13', () => {
    const lines = linesOf(layoutTitleWindow(TITLE, A_SAVE));

    expect(lines.map((line) => line.text)).toEqual(['NEW GAME', 'CONTINUE', 'CONTROLS', 'QUIT']);
    expect(layoutTitleWindow(TITLE, A_SAVE).rows.filter(({ row }) => row.kind === 'entry').map(({ box }) => box)).toEqual(
      [
        { left: 104, top: 67, width: 112, height: 13 },
        { left: 104, top: 80, width: 112, height: 13 },
        { left: 104, top: 93, width: 112, height: 13 },
        { left: 104, top: 106, width: 112, height: 13 },
      ],
    );
  });
});

describe('the window of the paused screen with Quit', () => {
  // PAUSED (7), a gap (4), five lines of 13 (65), the air of a space (8) and three hints (29): 113, and 137 with the padding.
  it('is 137 high over every saved game, which fits the 139 above the line of the audio', () => {
    for (const saved of SAVED_GAMES) {
      expect(layoutTitleWindow(PAUSED_MENU, saved).height, saved.status).toBe(137);
    }
  });

  it('shows QUIT under the other lines', () => {
    expect(linesOf(layoutTitleWindow(PAUSED_ON_QUIT, A_SAVE)).map((line) => [line.text, line.highlighted])).toEqual([
      ['RESUME', false],
      ['NEW GAME', false],
      ['CONTINUE', false],
      ['CONTROLS', false],
      ['QUIT', true],
    ]);
  });

  it('asks whether to quit, and says that a saved game to continue from is kept', () => {
    expect(textsOf(layoutTitleWindow(ASKING_TO_QUIT, A_SAVE))).toEqual([
      'QUIT THE GAME?',
      'THE GAME IN PLAY IS LOST.',
      'THE SAVED GAME IS KEPT.',
      'ENTER TO QUIT',
      'ESC TO KEEP THE GAME',
    ]);
    for (const saved of [NO_SAVE, NOT_AVAILABLE, DAMAGED, FROM_ANOTHER_VERSION]) {
      expect(textsOf(layoutTitleWindow(ASKING_TO_QUIT, saved)), saved.status).toEqual([
        'QUIT THE GAME?',
        'THE GAME IN PLAY IS LOST.',
        'ENTER TO QUIT',
        'ESC TO KEEP THE GAME',
      ]);
    }
  });

  it('keeps every row inside the padding, in the 210 of the window, and draws only what the pixel font has', () => {
    for (const saved of SAVED_GAMES) {
      for (const menu of [PAUSED_MENU, ASKING_TO_QUIT, TITLE]) {
        const window = layoutTitleWindow(menu, saved);
        expect(charactersTheFontLacks(textsOf(window).join(''))).toEqual([]);
        for (const { box } of window.rows) {
          expect(box.left).toBeGreaterThanOrEqual(window.left + WINDOW_PADDING);
          expect(box.left + box.width).toBeLessThanOrEqual(window.left + window.width - WINDOW_PADDING);
          expect(box.top + box.height).toBeLessThanOrEqual(window.top + window.height - WINDOW_PADDING);
        }
      }
    }
  });
});
