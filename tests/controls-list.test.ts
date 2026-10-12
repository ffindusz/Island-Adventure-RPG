import { describe, expect, it } from 'vitest';
import { checkAudioKeys, controlsList } from '../src/adapter/controls';
import { PlayerInput } from '../src/adapter/player-input';
import { charactersTheFontLacks } from './drawn-text';

// The list of the Controls page is a pure function of the controls tables, so it is looked at as it is (ADR 0005). What
// it is compared with is worked out by hand from the keyboard: the test does not build the list from the tables again,
// which could only agree with itself.

/** The names of the keys that the game binds, as the player's input asks the keyboard for them, in the order it asks. */
function boundKeyNames(): string[] {
  const names: string[] = [];
  const keyboard = {
    addKey: (name: string) => {
      names.push(name);
      return { isDown: false, originalEvent: { repeat: false, ctrlKey: false, metaKey: false } };
    },
  };
  new PlayerInput(keyboard, () => false);
  return names;
}

/**
 * What the player reads for each key that the game binds, by the name Phaser gives it: the four arrow keys are read as
 * one, and the number pad is read as the number row, minus and plus. A key that the game binds and that is not here
 * fails the test below that asks for the same keys: it needs its label here, and then its line on the list.
 */
const READ_AS: Readonly<Record<string, string>> = {
  UP: 'ARROWS',
  DOWN: 'ARROWS',
  LEFT: 'ARROWS',
  RIGHT: 'ARROWS',
  W: 'W',
  A: 'A',
  S: 'S',
  D: 'D',
  SPACE: 'SPACE',
  E: 'E',
  Q: 'Q',
  ENTER: 'ENTER',
  C: 'C',
  TAB: 'TAB',
  I: 'I',
  M: 'M',
  H: 'H',
  ESC: 'ESC',
  ONE: '1',
  NUMPAD_ONE: '1',
  TWO: '2',
  NUMPAD_TWO: '2',
  THREE: '3',
  NUMPAD_THREE: '3',
  N: 'N',
  MINUS: '-',
  NUMPAD_SUBTRACT: '-',
  PLUS: '+',
  NUMPAD_ADD: '+',
};

/** The keys that the list shows, one by one: a line that shows several is cut at its spaces and its slashes. */
function keysOnTheList(): string[] {
  return controlsList().flatMap((line) => line.keys.split(/[ /]/));
}

describe('the list of the controls', () => {
  it('is, line by line, the keys of the game and what each does', () => {
    expect(controlsList()).toEqual([
      { keys: 'W A S D/ARROWS', words: 'WALK' },
      { keys: 'SPACE', words: 'ATTACK' },
      { keys: 'Q', words: 'SWITCH WEAPON' },
      { keys: 'E', words: 'OPEN, PULL, READ, SAIL' },
      { keys: 'C/TAB', words: 'STATS' },
      { keys: 'I', words: 'INVENTORY' },
      { keys: 'M', words: 'AUTOMAP' },
      { keys: 'H', words: 'CONTROLS' },
      { keys: 'ENTER', words: 'PICK A LINE, EQUIP' },
      { keys: 'ESC', words: 'CLOSE A PAGE' },
      { keys: '1 2 3', words: 'PICK A STAT AT LEVEL UP' },
      { keys: 'N', words: 'SOUND ON OR OFF' },
      { keys: '- +', words: 'VOLUME DOWN OR UP' },
    ]);
  });

  it('is made of characters that the pixel font draws: it skips, without a word, any it has no letter for', () => {
    const lacking = controlsList().flatMap((line) => charactersTheFontLacks(`${line.keys}${line.words}`));
    expect(lacking).toEqual([]);
  });
});

describe('the keys that the game binds', () => {
  it('are exactly the keys that this test has a label for, so that a key added to a table has to be given its line', () => {
    expect(new Set(boundKeyNames())).toEqual(new Set(Object.keys(READ_AS)));
  });

  it.each(Object.entries(READ_AS))('show the key %s on the list as %s', (_name, label) => {
    expect(keysOnTheList()).toContain(label);
  });

  it('are the only keys that the list shows: no line is left for a key that is gone', () => {
    const labels = new Set(Object.values(READ_AS));
    expect(keysOnTheList().filter((key) => !labels.has(key))).toEqual([]);
  });

  it('are the keys that the check at start-up asks Phaser about, and no others: the check and the list read one table', () => {
    const asked: string[] = [];
    checkAudioKeys((name) => {
      asked.push(name);
      return asked.length;
    });
    expect(new Set(asked)).toEqual(new Set(boundKeyNames()));
  });
});
