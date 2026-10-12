import { describe, expect, it } from 'vitest';
import type { PageId } from '../src/core';
import type { AudioChange } from '../src/adapter/audio-settings';
import { PlayerInput } from '../src/adapter/player-input';

// player-input.ts is given the keys by the scene that makes it, and Phaser's rule of when a key went down (`JustDown`).
// FakeKey copies the parts of Phaser's `Key` that the player's input reads, and `justDown` below copies the rule. Whether
// the real keys behave like these is looked at in the browser.

/** Phaser's `JustDown`: whether the key went down since the last time it was asked. Asking uses the press up. */
function justDown(key: FakeKey): boolean {
  const pressed = key._justDown;
  key._justDown = false;
  return pressed;
}

/** What Phaser's `Key` keeps of a press, with the rules of its `onDown` and `onUp`. */
class FakeKey {
  isDown = false;
  _justDown = false;
  originalEvent = { repeat: false, ctrlKey: false, metaKey: false };

  /**
   * The browser's key-down event. `repeat` is true for the repeats of a key that is held down, and `modifiers` are the
   * Ctrl and Cmd keys that the event says are held with it.
   */
  down(repeat = false, modifiers: { ctrlKey?: boolean; metaKey?: boolean } = {}): void {
    this.originalEvent = { repeat, ctrlKey: false, metaKey: false, ...modifiers };
    if (!this.isDown) {
      this.isDown = true;
      this._justDown = true;
    }
  }

  up(): void {
    this.originalEvent = { repeat: false, ctrlKey: false, metaKey: false };
    this.isDown = false;
    this._justDown = false;
  }
}

/** A player input over fake keys, as a screen that has just begun has it, and the keys by the name Phaser gives them. */
function newScreen(): {
  input: PlayerInput<FakeKey>;
  key: (name: string) => FakeKey;
  captured: (name: string) => boolean;
} {
  const keys = new Map<string, FakeKey>();
  const captures = new Map<string, boolean>();
  const keyboard = {
    // Phaser holds a key back from the browser unless it is told not to.
    addKey: (name: string, capture = true) => {
      const key = new FakeKey();
      keys.set(name, key);
      captures.set(name, capture);
      return key;
    },
  };
  const key = (name: string): FakeKey => {
    const found = keys.get(name);
    if (found === undefined) {
      throw new Error(`No key named ${name} was added.`);
    }
    return found;
  };
  const captured = (name: string): boolean => {
    key(name);
    return captures.get(name) === true;
  };
  return { input: new PlayerInput(keyboard, justDown), key, captured };
}

/** Whether the actions the keys asked for since the last look include the toggle of this page. */
function togglesPage(page: PageId): (input: PlayerInput<FakeKey>) => boolean {
  return (input) => input.pollActions().some((command) => command.type === 'toggle-page' && command.page === page);
}

/** The keys that more than one screen reads, and how each reports that it went down again. */
const READS: readonly { name: string; says: string; read: (input: PlayerInput<FakeKey>) => boolean }[] = [
  { name: 'ENTER', says: 'a confirm', read: (input) => input.pollMenu().confirm },
  { name: 'UP', says: 'a step up', read: (input) => input.pollMenu().step === -1 },
  { name: 'W', says: 'a step up', read: (input) => input.pollMenu().step === -1 },
  { name: 'DOWN', says: 'a step down', read: (input) => input.pollMenu().step === 1 },
  { name: 'S', says: 'a step down', read: (input) => input.pollMenu().step === 1 },
  { name: 'ESC', says: 'a cancel', read: (input) => input.pollCancel() },
  {
    name: 'ONE',
    says: 'a Stat Point for health',
    read: (input) => input.pollActions().some((command) => command.type === 'assign-stat-point'),
  },
  { name: 'N', says: 'a change of the audio', read: (input) => input.pollAudio().length > 0 },
  // A page key toggles its page: held down, or pressed again by a browser that repeats it, it must not toggle it back.
  { name: 'C', says: 'a toggle of the stat page', read: togglesPage('stats') },
  { name: 'TAB', says: 'a toggle of the stat page', read: togglesPage('stats') },
  { name: 'I', says: 'a toggle of the inventory', read: togglesPage('inventory') },
  { name: 'M', says: 'a toggle of the Automap', read: togglesPage('automap') },
  { name: 'H', says: 'a toggle of the Controls page', read: togglesPage('controls') },
];

describe.each(READS)('the $name key', ({ name, says, read }) => {
  it(`is ${says} when it goes down, once`, () => {
    const { input, key } = newScreen();
    key(name).down();
    expect(read(input)).toBe(true);
    expect(read(input)).toBe(false);
  });

  it(`is not ${says} again however long it stays down and the browser repeats it`, () => {
    const { input, key } = newScreen();
    key(name).down();
    read(input);
    for (let repeat = 0; repeat < 5; repeat += 1) {
      key(name).down(true);
    }
    expect(read(input)).toBe(false);
  });

  it(`is ${says} again when it is let go and pressed again`, () => {
    const { input, key } = newScreen();
    key(name).down();
    read(input);
    key(name).up();
    key(name).down();
    expect(read(input)).toBe(true);
  });

  // Phaser makes new keys for every screen, and a new key takes the first repeat of a key that is already held down for
  // a press. A player who holds Enter to sail home would otherwise turn the first page of the ending with that repeat.
  it(`is not ${says} when it was already held down before the screen began`, () => {
    const { input, key } = newScreen();
    key(name).down(true);
    key(name).down(true);
    expect(read(input)).toBe(false);
  });

  it(`is ${says} when it is let go and pressed after that`, () => {
    const { input, key } = newScreen();
    key(name).down(true);
    read(input);
    key(name).up();
    key(name).down();
    expect(read(input)).toBe(true);
  });
});

describe('two keys that mean the same pressed together', () => {
  it('are one step, and neither is left over for the next look', () => {
    const { input, key } = newScreen();
    key('UP').down();
    key('W').down();
    expect(input.pollMenu().step).toBe(-1);
    expect(input.pollMenu().step).toBe(0);
  });

  it('are one Stat Point, and neither is left over for the next look', () => {
    const { input, key } = newScreen();
    key('ONE').down();
    key('NUMPAD_ONE').down();
    expect(input.pollActions().filter((command) => command.type === 'assign-stat-point')).toHaveLength(1);
    expect(input.pollActions().filter((command) => command.type === 'assign-stat-point')).toHaveLength(0);
  });

  it('are one change of the audio, and neither is left over for the next look', () => {
    const { input, key } = newScreen();
    key('MINUS').down();
    key('NUMPAD_SUBTRACT').down();
    expect(input.pollAudio()).toEqual<AudioChange[]>(['lower']);
    expect(input.pollAudio()).toEqual<AudioChange[]>([]);
  });

  // Two toggles of one page in a frame would open it and close it again, and the player would see nothing happen.
  it('are one toggle of the stat page, C and Tab, and neither is left over for the next look', () => {
    const { input, key } = newScreen();
    key('C').down();
    key('TAB').down();
    expect(input.pollActions()).toEqual([{ type: 'toggle-page', page: 'stats' }]);
    expect(input.pollActions()).toEqual([]);
  });
});

describe('the keys of the audio', () => {
  it('ask for their changes in the order of the changes, whichever was pressed first', () => {
    const { input, key } = newScreen();
    key('NUMPAD_ADD').down();
    key('N').down();
    expect(input.pollAudio()).toEqual<AudioChange[]>(['toggle-mute', 'raise']);
  });

  // Ctrl and minus zooms the page, and Ctrl and plus too: those presses are the browser's, and change nothing here.
  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
  ])('ask for nothing when they are pressed with %s', (_held, modifiers) => {
    const { input, key } = newScreen();
    key('MINUS').down(false, modifiers);
    key('NUMPAD_ADD').down(false, modifiers);
    expect(input.pollAudio()).toEqual<AudioChange[]>([]);
  });

  it('ask again when the key is let go and pressed without Ctrl after a press with it', () => {
    const { input, key } = newScreen();
    key('MINUS').down(false, { ctrlKey: true });
    input.pollAudio();
    key('MINUS').up();
    key('MINUS').down();
    expect(input.pollAudio()).toEqual<AudioChange[]>(['lower']);
  });
});

describe('the keys of the pages', () => {
  it.each([
    ['C', 'stats'],
    ['TAB', 'stats'],
    ['I', 'inventory'],
    ['M', 'automap'],
    ['H', 'controls'],
  ] as const)('%s toggles the %s page and nothing else', (name, page) => {
    const { input, key } = newScreen();
    key(name).down();
    expect(input.pollActions()).toEqual([{ type: 'toggle-page', page }]);
  });

  // It is the Game core that tells opening from closing: the same key sends the same command every time.
  it('send the same toggle each time a key is pressed, whether the page is open or not', () => {
    const { input, key } = newScreen();
    const sent = [1, 2, 3].map(() => {
      key('M').down();
      const commands = input.pollActions();
      key('M').up();
      return commands;
    });
    expect(sent).toEqual([
      [{ type: 'toggle-page', page: 'automap' }],
      [{ type: 'toggle-page', page: 'automap' }],
      [{ type: 'toggle-page', page: 'automap' }],
    ]);
  });

  // Ctrl and Tab, or Cmd and Tab, switch tabs or applications, and Ctrl and C copies: those presses are the browser's.
  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
  ])('ask for nothing when they are pressed with %s', (_held, modifiers) => {
    const { input, key } = newScreen();
    for (const name of ['C', 'TAB', 'I', 'M', 'H']) {
      key(name).down(false, modifiers);
    }
    expect(input.pollActions()).toEqual([]);
  });

  it('ask again when the key is let go and pressed without Ctrl after a press with it', () => {
    const { input, key } = newScreen();
    key('TAB').down(false, { ctrlKey: true });
    input.pollActions();
    key('TAB').up();
    key('TAB').down();
    expect(input.pollActions()).toEqual([{ type: 'toggle-page', page: 'stats' }]);
  });

  it('hold Tab back from the browser, so that pressing it in play does not move the focus out of the game', () => {
    const { captured } = newScreen();
    expect(captured('TAB')).toBe(true);
  });

  it.each(['C', 'I', 'M', 'H'])('leave %s to the browser, whose own shortcuts on it keep working', (name) => {
    const { captured } = newScreen();
    expect(captured(name)).toBe(false);
  });
});

describe('Esc', () => {
  it('closes whichever page is open and declines the question whether to sail home, as the page keys toggle', () => {
    const { input, key } = newScreen();
    key('ESC').down();
    expect(input.pollActions()).toEqual([
      { type: 'close-page', page: 'stats' },
      { type: 'close-page', page: 'inventory' },
      { type: 'close-page', page: 'automap' },
      { type: 'close-page', page: 'controls' },
      { type: 'cancel-departure' },
    ]);
  });
});
