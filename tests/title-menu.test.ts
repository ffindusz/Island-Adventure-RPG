import { describe, expect, it } from 'vitest';
import { MENU_ENTRIES, openMenu, pressMenu, selectableEntries, soundOfPress } from '../src/adapter/title-menu';
import type { TitleKeys, TitleMenu } from '../src/adapter/title-menu';

// The menu of the title screen without the scene that draws it: where the cursor stands, when the screen asks before it
// replaces a saved game, when it shows the list of the controls, which line a key press starts, and what the player
// hears of it. Each case is worked out by hand from the rules in title-menu.ts.

const SAVED = true;
const NO_SAVE = false;

const ON_NEW_GAME: TitleMenu = { cursor: 'new-game', confirming: false, showingControls: false };
const ON_CONTINUE: TitleMenu = { cursor: 'continue', confirming: false, showingControls: false };
const ON_CONTROLS: TitleMenu = { cursor: 'controls', confirming: false, showingControls: false };
const ASKING: TitleMenu = { cursor: 'new-game', confirming: true, showingControls: false };
const SHOWING_CONTROLS: TitleMenu = { cursor: 'controls', confirming: false, showingControls: true };

/** One look at the keys, with nothing pressed but what is given. */
function press(menu: TitleMenu, canContinue: boolean, keys: Partial<TitleKeys> = {}) {
  return pressMenu(menu, canContinue, { step: 0, confirm: false, cancel: false, ...keys });
}

describe('the menu as the title opens', () => {
  it('has the cursor on Continue when there is a saved game, so that Enter goes on with it', () => {
    expect(openMenu(SAVED)).toEqual(ON_CONTINUE);
  });

  it('has the cursor on New Game when there is none, and asks nothing', () => {
    expect(openMenu(NO_SAVE)).toEqual(ON_NEW_GAME);
  });
});

describe('the lines of the menu', () => {
  it('are New Game, Continue and Controls, top to bottom', () => {
    expect(MENU_ENTRIES).toEqual(['new-game', 'continue', 'controls']);
  });
});

describe('the lines the cursor can rest on', () => {
  it('are New Game, Continue and Controls, top to bottom, when there is a saved game', () => {
    expect(selectableEntries(SAVED)).toEqual(['new-game', 'continue', 'controls']);
  });

  it('are New Game and Controls when there is none, because Continue is greyed and Controls can always be chosen', () => {
    expect(selectableEntries(NO_SAVE)).toEqual(['new-game', 'controls']);
  });
});

describe('the cursor', () => {
  it('goes down from New Game to Continue and on to Controls, and up again, over a saved game', () => {
    expect(press(ON_NEW_GAME, SAVED, { step: 1 })).toEqual({ menu: ON_CONTINUE, choice: null });
    expect(press(ON_CONTINUE, SAVED, { step: 1 })).toEqual({ menu: ON_CONTROLS, choice: null });
    expect(press(ON_CONTROLS, SAVED, { step: -1 })).toEqual({ menu: ON_CONTINUE, choice: null });
    expect(press(ON_CONTINUE, SAVED, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('skips Continue, which is greyed, when there is no saved game: New Game and Controls are next to each other', () => {
    expect(press(ON_NEW_GAME, NO_SAVE, { step: 1 })).toEqual({ menu: ON_CONTROLS, choice: null });
    expect(press(ON_CONTROLS, NO_SAVE, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('stops at New Game and at Controls, the first and the last line, and does not go round', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      expect(press(ON_NEW_GAME, canContinue, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
      expect(press(ON_CONTROLS, canContinue, { step: 1 })).toEqual({ menu: ON_CONTROLS, choice: null });
    }
  });

  it('stays where it is when no key is pressed', () => {
    expect(press(ON_NEW_GAME, SAVED)).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_CONTINUE, SAVED)).toEqual({ menu: ON_CONTINUE, choice: null });
    expect(press(ON_CONTROLS, SAVED)).toEqual({ menu: ON_CONTROLS, choice: null });
  });

  it('goes back to New Game when it was left on Continue and the saved game is gone', () => {
    expect(press(ON_CONTINUE, NO_SAVE)).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('stays on Controls when the saved game is gone, because Controls can always be chosen', () => {
    expect(press(ON_CONTROLS, NO_SAVE)).toEqual({ menu: ON_CONTROLS, choice: null });
  });

  it('is on New Game, not Continue, for the Enter that follows when the saved game is gone', () => {
    expect(press(ON_CONTINUE, NO_SAVE, { confirm: true })).toEqual({ menu: ON_NEW_GAME, choice: 'new-game' });
  });
});

describe('Enter on a line', () => {
  it('starts Continue from the line of Continue, and asks nothing', () => {
    expect(press(ON_CONTINUE, SAVED, { confirm: true })).toEqual({ menu: ON_CONTINUE, choice: 'continue' });
  });

  it('starts New Game at once when there is no saved game to replace', () => {
    expect(press(ON_NEW_GAME, NO_SAVE, { confirm: true })).toEqual({ menu: ON_NEW_GAME, choice: 'new-game' });
  });

  it('asks first, and starts nothing yet, when New Game would replace a saved game', () => {
    expect(press(ON_NEW_GAME, SAVED, { confirm: true })).toEqual({ menu: ASKING, choice: null });
  });

  it('shows the list of the controls from the line of Controls, with or without a saved game, and starts nothing', () => {
    expect(press(ON_CONTROLS, SAVED, { confirm: true })).toEqual({ menu: SHOWING_CONTROLS, choice: null });
    expect(press(ON_CONTROLS, NO_SAVE, { confirm: true })).toEqual({ menu: SHOWING_CONTROLS, choice: null });
  });

  it('is not answered by Esc when no question is open', () => {
    expect(press(ON_NEW_GAME, SAVED, { cancel: true })).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_CONTINUE, SAVED, { cancel: true })).toEqual({ menu: ON_CONTINUE, choice: null });
    expect(press(ON_CONTROLS, SAVED, { cancel: true })).toEqual({ menu: ON_CONTROLS, choice: null });
  });
});

describe.each([
  ['over a saved game', SAVED],
  ['with no saved game', NO_SAVE],
])('the list of the controls, %s', (_case, canContinue) => {
  it('is closed by Esc: the menu is back as it was, the cursor on Controls, and nothing starts', () => {
    expect(press(SHOWING_CONTROLS, canContinue, { cancel: true })).toEqual({ menu: ON_CONTROLS, choice: null });
  });

  it('is closed by Enter, the key that opened it: the menu is back, the cursor on Controls, and no game starts', () => {
    expect(press(SHOWING_CONTROLS, canContinue, { confirm: true })).toEqual({ menu: ON_CONTROLS, choice: null });
  });

  it('is closed when Enter and Esc come together, and nothing starts', () => {
    expect(press(SHOWING_CONTROLS, canContinue, { confirm: true, cancel: true })).toEqual({
      menu: ON_CONTROLS,
      choice: null,
    });
  });

  it('stays shown, and starts nothing, while no key is pressed', () => {
    expect(press(SHOWING_CONTROLS, canContinue)).toEqual({ menu: SHOWING_CONTROLS, choice: null });
  });

  it('does not answer the cursor keys: the cursor stays on Controls and the list stays shown', () => {
    expect(press(SHOWING_CONTROLS, canContinue, { step: -1 })).toEqual({ menu: SHOWING_CONTROLS, choice: null });
    expect(press(SHOWING_CONTROLS, canContinue, { step: 1 })).toEqual({ menu: SHOWING_CONTROLS, choice: null });
  });

  it('is shown again by the next Enter on Controls after it was closed, and not by the Enter that closed it', () => {
    const closed = press(SHOWING_CONTROLS, canContinue, { confirm: true }).menu;

    expect(press(closed, canContinue)).toEqual({ menu: ON_CONTROLS, choice: null });
    expect(press(closed, canContinue, { confirm: true })).toEqual({ menu: SHOWING_CONTROLS, choice: null });
  });
});

describe('the question whether to replace the saved game', () => {
  it('is answered yes by Enter: New Game starts', () => {
    expect(press(ASKING, SAVED, { confirm: true }).choice).toBe('new-game');
  });

  it('is answered no by Esc: it closes, nothing starts and the cursor stays on New Game', () => {
    expect(press(ASKING, SAVED, { cancel: true })).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('is answered no when Enter and Esc come together, because declining must leave the saved game as it was', () => {
    expect(press(ASKING, SAVED, { confirm: true, cancel: true })).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('stays open, and starts nothing, while no key is pressed or the cursor keys are', () => {
    expect(press(ASKING, SAVED)).toEqual({ menu: ASKING, choice: null });
    expect(press(ASKING, SAVED, { step: 1 })).toEqual({ menu: ASKING, choice: null });
    expect(press(ASKING, SAVED, { step: -1 })).toEqual({ menu: ASKING, choice: null });
  });

  it('is asked again by the next Enter on New Game after Esc kept the saved game', () => {
    const declined = press(ASKING, SAVED, { cancel: true }).menu;

    expect(press(declined, SAVED, { confirm: true })).toEqual({ menu: ASKING, choice: null });
  });
});

/** What the player hears of one look at the keys. */
function heard(menu: TitleMenu, canContinue: boolean, keys: Partial<TitleKeys> = {}) {
  const { menu: after, choice } = press(menu, canContinue, keys);
  return soundOfPress(menu, after, choice);
}

describe('what the player hears of a key press', () => {
  it('is a page opening when Enter shows the list of the controls, with or without a saved game', () => {
    expect(heard(ON_CONTROLS, SAVED, { confirm: true })).toBe('page-open');
    expect(heard(ON_CONTROLS, NO_SAVE, { confirm: true })).toBe('page-open');
  });

  it('is a page closing when Esc closes the list of the controls, and when Enter does', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      expect(heard(SHOWING_CONTROLS, canContinue, { cancel: true })).toBe('page-close');
      expect(heard(SHOWING_CONTROLS, canContinue, { confirm: true })).toBe('page-close');
    }
  });

  it('is nothing while the list of the controls stays shown, whichever cursor key is pressed', () => {
    expect(heard(SHOWING_CONTROLS, SAVED)).toBeNull();
    expect(heard(SHOWING_CONTROLS, SAVED, { step: -1 })).toBeNull();
    expect(heard(SHOWING_CONTROLS, SAVED, { step: 1 })).toBeNull();
  });

  it('is a page opening when the question whether to replace the saved game opens, and a page closing when Esc turns it down', () => {
    expect(heard(ON_NEW_GAME, SAVED, { confirm: true })).toBe('page-open');
    expect(heard(ASKING, SAVED, { cancel: true })).toBe('page-close');
  });

  it('is a confirmation when a game starts, from Continue, from New Game and from the question, and not a page', () => {
    expect(heard(ON_CONTINUE, SAVED, { confirm: true })).toBe('confirm');
    expect(heard(ON_NEW_GAME, NO_SAVE, { confirm: true })).toBe('confirm');
    expect(heard(ASKING, SAVED, { confirm: true })).toBe('confirm');
  });

  it('is nothing for a step of the cursor, for Esc when nothing is open, and for no key at all', () => {
    expect(heard(ON_NEW_GAME, SAVED, { step: 1 })).toBeNull();
    expect(heard(ON_CONTROLS, SAVED, { step: -1 })).toBeNull();
    expect(heard(ON_CONTINUE, SAVED, { cancel: true })).toBeNull();
    expect(heard(ON_CONTINUE, SAVED)).toBeNull();
    expect(heard(ASKING, SAVED)).toBeNull();
  });
});

describe('a whole visit to the title, a key at a time', () => {
  it('goes from the saved game up to New Game, through the question and Esc, to a New Game that replaces it', () => {
    const opened = openMenu(SAVED);
    const onNewGame = press(opened, SAVED, { step: -1 }).menu;
    const asked = press(onNewGame, SAVED, { confirm: true });
    const declined = press(asked.menu, SAVED, { cancel: true });
    const askedAgain = press(declined.menu, SAVED, { confirm: true });
    const answered = press(askedAgain.menu, SAVED, { confirm: true });

    expect([onNewGame, asked.menu, declined.menu, askedAgain.menu]).toEqual([ON_NEW_GAME, ASKING, ON_NEW_GAME, ASKING]);
    expect([asked.choice, declined.choice, askedAgain.choice, answered.choice]).toEqual([null, null, null, 'new-game']);
  });

  it('goes from the saved game down to Controls, through the list and its two ways out, and up to a New Game that still asks', () => {
    const onContinue = openMenu(SAVED);
    const onControls = press(onContinue, SAVED, { step: 1 }).menu;
    const listed = press(onControls, SAVED, { confirm: true });
    const keptOut = press(listed.menu, SAVED, { step: -1 });
    const escaped = press(keptOut.menu, SAVED, { cancel: true });
    const listedAgain = press(escaped.menu, SAVED, { confirm: true });
    const entered = press(listedAgain.menu, SAVED, { confirm: true });
    const upToContinue = press(entered.menu, SAVED, { step: -1 }).menu;
    const upToNewGame = press(upToContinue, SAVED, { step: -1 }).menu;
    const asked = press(upToNewGame, SAVED, { confirm: true });

    expect([onControls, listed.menu, keptOut.menu, escaped.menu]).toEqual([
      ON_CONTROLS,
      SHOWING_CONTROLS,
      SHOWING_CONTROLS,
      ON_CONTROLS,
    ]);
    expect([listedAgain.menu, entered.menu, upToContinue, upToNewGame, asked.menu]).toEqual([
      SHOWING_CONTROLS,
      ON_CONTROLS,
      ON_CONTINUE,
      ON_NEW_GAME,
      ASKING,
    ]);
    expect([listed, keptOut, escaped, listedAgain, entered, asked].map(({ choice }) => choice)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });
});
