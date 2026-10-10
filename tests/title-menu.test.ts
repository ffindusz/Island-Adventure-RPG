import { describe, expect, it } from 'vitest';
import { openMenu, pressMenu, selectableEntries } from '../src/adapter/title-menu';
import type { TitleKeys, TitleMenu } from '../src/adapter/title-menu';

// The menu of the title screen without the scene that draws it: where the cursor stands, when the screen asks before it
// replaces a saved game, and which line a key press starts. Each case is worked out by hand from the rules in
// title-menu.ts.

const SAVED = true;
const NO_SAVE = false;

const ON_NEW_GAME: TitleMenu = { cursor: 'new-game', confirming: false };
const ON_CONTINUE: TitleMenu = { cursor: 'continue', confirming: false };
const ASKING: TitleMenu = { cursor: 'new-game', confirming: true };

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

describe('the lines the cursor can rest on', () => {
  it('are New Game and then Continue when there is a saved game', () => {
    expect(selectableEntries(SAVED)).toEqual(['new-game', 'continue']);
  });

  it('are New Game alone when there is none, because Continue is greyed', () => {
    expect(selectableEntries(NO_SAVE)).toEqual(['new-game']);
  });
});

describe('the cursor', () => {
  it('goes down from New Game to Continue and up again, over a saved game', () => {
    expect(press(ON_NEW_GAME, SAVED, { step: 1 })).toEqual({ menu: ON_CONTINUE, choice: null });
    expect(press(ON_CONTINUE, SAVED, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('stops at the first and the last line, and does not go round', () => {
    expect(press(ON_NEW_GAME, SAVED, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_CONTINUE, SAVED, { step: 1 })).toEqual({ menu: ON_CONTINUE, choice: null });
  });

  it('stays where it is when no key is pressed', () => {
    expect(press(ON_NEW_GAME, SAVED)).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_CONTINUE, SAVED)).toEqual({ menu: ON_CONTINUE, choice: null });
  });

  it('cannot leave New Game when there is no saved game, whichever way it is stepped', () => {
    expect(press(ON_NEW_GAME, NO_SAVE, { step: 1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_NEW_GAME, NO_SAVE, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('goes back to New Game when it was left on Continue and the saved game is gone', () => {
    expect(press(ON_CONTINUE, NO_SAVE)).toEqual({ menu: ON_NEW_GAME, choice: null });
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

  it('is not answered by Esc when no question is open', () => {
    expect(press(ON_NEW_GAME, SAVED, { cancel: true })).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_CONTINUE, SAVED, { cancel: true })).toEqual({ menu: ON_CONTINUE, choice: null });
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
});
