import { describe, expect, it } from 'vitest';
import { openMenu, PAUSED_ENTRIES, pressMenu, selectableEntries, soundOfPress } from '../src/adapter/title-menu';
import type { TitleKeys, TitleMenu } from '../src/adapter/title-menu';

// The menu of the start screen while the game is paused (Esc in play), without the scene that draws it: RESUME is on top
// and the cursor opens on it, Esc resumes, NEW GAME always asks, and the list of the controls closes without resuming.
// The menu of the title, which is not paused, is in title-menu.test.ts and does not change. Each case is worked out by
// hand from the rules in title-menu.ts.

const SAVED = true;
const NO_SAVE = false;
const PAUSED = true;

const ON_RESUME: TitleMenu = { cursor: 'resume', confirming: false, showingControls: false, paused: true };
const ON_NEW_GAME: TitleMenu = { cursor: 'new-game', confirming: false, showingControls: false, paused: true };
const ON_CONTINUE: TitleMenu = { cursor: 'continue', confirming: false, showingControls: false, paused: true };
const ON_CONTROLS: TitleMenu = { cursor: 'controls', confirming: false, showingControls: false, paused: true };
const ASKING: TitleMenu = { cursor: 'new-game', confirming: true, showingControls: false, paused: true };
const SHOWING_CONTROLS: TitleMenu = { cursor: 'controls', confirming: false, showingControls: true, paused: true };
const ON_LINES: readonly TitleMenu[] = [ON_RESUME, ON_NEW_GAME, ON_CONTINUE, ON_CONTROLS];

/** One look at the keys, with nothing pressed but what is given. */
function press(menu: TitleMenu, canContinue: boolean, keys: Partial<TitleKeys> = {}) {
  return pressMenu(menu, canContinue, { step: 0, confirm: false, cancel: false, ...keys });
}

describe('the paused menu as the start screen opens it', () => {
  it('has the cursor on Resume when there is a saved game, where the title has it on Continue', () => {
    expect(openMenu(SAVED, PAUSED)).toEqual(ON_RESUME);
  });

  it('has the cursor on Resume when there is none', () => {
    expect(openMenu(NO_SAVE, PAUSED)).toEqual(ON_RESUME);
  });

  it('is the title\'s menu, with no mark of a pause, when it is not told that the game is paused', () => {
    expect(openMenu(SAVED, false)).toEqual({ cursor: 'continue', confirming: false, showingControls: false });
    expect(openMenu(NO_SAVE, false)).toEqual({ cursor: 'new-game', confirming: false, showingControls: false });
    expect(openMenu(SAVED)).not.toHaveProperty('paused');
  });
});

describe('the lines of the paused menu', () => {
  it('are Resume, New Game, Continue and Controls, top to bottom', () => {
    expect(PAUSED_ENTRIES).toEqual(['resume', 'new-game', 'continue', 'controls']);
  });

  it('can all be rested on when there is a saved game to continue from', () => {
    expect(selectableEntries(SAVED, PAUSED)).toEqual(['resume', 'new-game', 'continue', 'controls']);
  });

  it('are Resume, New Game and Controls when there is none, because Continue is greyed', () => {
    expect(selectableEntries(NO_SAVE, PAUSED)).toEqual(['resume', 'new-game', 'controls']);
  });

  it('are those of the title, with no Resume, when the game is not paused', () => {
    expect(selectableEntries(SAVED, false)).toEqual(['new-game', 'continue', 'controls']);
    expect(selectableEntries(NO_SAVE, false)).toEqual(['new-game', 'controls']);
  });
});

describe('the cursor of the paused menu', () => {
  it('goes down from Resume through New Game and Continue to Controls, and up again, over a saved game', () => {
    expect(press(ON_RESUME, SAVED, { step: 1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_NEW_GAME, SAVED, { step: 1 })).toEqual({ menu: ON_CONTINUE, choice: null });
    expect(press(ON_CONTINUE, SAVED, { step: 1 })).toEqual({ menu: ON_CONTROLS, choice: null });
    expect(press(ON_CONTROLS, SAVED, { step: -1 })).toEqual({ menu: ON_CONTINUE, choice: null });
    expect(press(ON_CONTINUE, SAVED, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(ON_NEW_GAME, SAVED, { step: -1 })).toEqual({ menu: ON_RESUME, choice: null });
  });

  it('skips Continue, which is greyed, when there is no saved game', () => {
    expect(press(ON_NEW_GAME, NO_SAVE, { step: 1 })).toEqual({ menu: ON_CONTROLS, choice: null });
    expect(press(ON_CONTROLS, NO_SAVE, { step: -1 })).toEqual({ menu: ON_NEW_GAME, choice: null });
  });

  it('stops at Resume and at Controls, the first and the last line, and does not go round', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      expect(press(ON_RESUME, canContinue, { step: -1 })).toEqual({ menu: ON_RESUME, choice: null });
      expect(press(ON_CONTROLS, canContinue, { step: 1 })).toEqual({ menu: ON_CONTROLS, choice: null });
    }
  });

  it('stays where it is when no key is pressed', () => {
    for (const menu of ON_LINES) {
      expect(press(menu, SAVED)).toEqual({ menu, choice: null });
    }
  });

  it('goes back to Resume when it was left on Continue and the saved game is gone', () => {
    expect(press(ON_CONTINUE, NO_SAVE)).toEqual({ menu: ON_RESUME, choice: null });
  });
});

describe('Enter on the paused menu', () => {
  it('chooses Resume on Resume, with a saved game or without one, and asks nothing', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      expect(press(ON_RESUME, canContinue, { confirm: true })).toEqual({ menu: ON_RESUME, choice: 'resume' });
    }
  });

  it('asks on New Game before it replaces the game in play, with a saved game and without one', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      expect(press(ON_NEW_GAME, canContinue, { confirm: true })).toEqual({ menu: ASKING, choice: null });
    }
  });

  it('chooses Continue on Continue, which asks nothing', () => {
    expect(press(ON_CONTINUE, SAVED, { confirm: true })).toEqual({ menu: ON_CONTINUE, choice: 'continue' });
  });

  it('shows the list of the controls on Controls, which starts nothing', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      expect(press(ON_CONTROLS, canContinue, { confirm: true })).toEqual({ menu: SHOWING_CONTROLS, choice: null });
    }
  });
});

describe('Esc on the paused menu', () => {
  it('chooses Resume, wherever the cursor is, with a saved game or without one', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      for (const menu of ON_LINES) {
        if (menu.cursor === 'continue' && !canContinue) {
          continue;
        }
        expect(press(menu, canContinue, { cancel: true })).toEqual({ menu, choice: 'resume' });
      }
    }
  });

  it('wins over an Enter pressed with it: resuming loses nothing, and Continue would replace the game in play', () => {
    expect(press(ON_CONTINUE, SAVED, { cancel: true, confirm: true })).toEqual({ menu: ON_CONTINUE, choice: 'resume' });
    expect(press(ON_NEW_GAME, SAVED, { cancel: true, confirm: true })).toEqual({ menu: ON_NEW_GAME, choice: 'resume' });
  });

  it('closes the list of the controls and leaves the cursor on Controls, and does not resume', () => {
    expect(press(SHOWING_CONTROLS, SAVED, { cancel: true })).toEqual({ menu: ON_CONTROLS, choice: null });
    expect(press(SHOWING_CONTROLS, NO_SAVE, { cancel: true })).toEqual({ menu: ON_CONTROLS, choice: null });
  });

  it('is not answered by the cursor keys while the list of the controls shows', () => {
    expect(press(SHOWING_CONTROLS, SAVED, { step: 1 })).toEqual({ menu: SHOWING_CONTROLS, choice: null });
  });

  it('goes back from the question to the menu with the cursor on New Game, where Esc resumes', () => {
    const back = press(ASKING, SAVED, { cancel: true });
    expect(back).toEqual({ menu: ON_NEW_GAME, choice: null });
    expect(press(back.menu, SAVED, { cancel: true })).toEqual({ menu: ON_NEW_GAME, choice: 'resume' });
  });

  it('does nothing on the title\'s menu, which is not paused', () => {
    const onTitle: TitleMenu = { cursor: 'new-game', confirming: false, showingControls: false };
    expect(press(onTitle, SAVED, { cancel: true })).toEqual({ menu: onTitle, choice: null });
  });
});

describe('Enter on the paused screen once it is asked or shows the list', () => {
  it('chooses New Game at the question, whether or not there is a saved game', () => {
    for (const canContinue of [SAVED, NO_SAVE]) {
      expect(press(ASKING, canContinue, { confirm: true })).toEqual({ menu: ASKING, choice: 'new-game' });
    }
  });

  it('closes the list of the controls, with the cursor on Controls, and does not resume', () => {
    expect(press(SHOWING_CONTROLS, SAVED, { confirm: true })).toEqual({ menu: ON_CONTROLS, choice: null });
  });
});

describe('what the player hears of the paused menu', () => {
  interface Heard {
    readonly name: string;
    readonly before: TitleMenu;
    readonly keys: Partial<TitleKeys>;
    readonly heard: string | null;
  }
  const heard: readonly Heard[] = [
    { name: 'Resume chosen, a page closing', before: ON_RESUME, keys: { confirm: true }, heard: 'page-close' },
    { name: 'Esc at the menu, which resumes the same way', before: ON_NEW_GAME, keys: { cancel: true }, heard: 'page-close' },
    { name: 'the question opening', before: ON_NEW_GAME, keys: { confirm: true }, heard: 'page-open' },
    { name: 'the question closing by Esc', before: ASKING, keys: { cancel: true }, heard: 'page-close' },
    { name: 'a New Game chosen at the question', before: ASKING, keys: { confirm: true }, heard: 'confirm' },
    { name: 'Continue chosen', before: ON_CONTINUE, keys: { confirm: true }, heard: 'confirm' },
    { name: 'the list of the controls opening', before: ON_CONTROLS, keys: { confirm: true }, heard: 'page-open' },
    { name: 'the list closing by Esc', before: SHOWING_CONTROLS, keys: { cancel: true }, heard: 'page-close' },
    { name: 'the list closing by Enter', before: SHOWING_CONTROLS, keys: { confirm: true }, heard: 'page-close' },
    { name: 'a step of the cursor, which is not heard', before: ON_RESUME, keys: { step: 1 }, heard: null },
    { name: 'no key at all', before: ON_RESUME, keys: {}, heard: null },
  ];

  it.each(heard)('is as follows for $name', ({ before, keys, heard: sound }) => {
    const { menu, choice } = press(before, SAVED, keys);
    expect(soundOfPress(before, menu, choice)).toBe(sound);
  });
});
