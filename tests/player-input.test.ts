import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { PlayerInput } from '../src/adapter/player-input';

// player-input.ts imports Phaser, and Phaser cannot load without a window. All it takes from Phaser here is the rule of
// `JustDown`, copied below, and the keys, which FakeKey copies in the parts that the rule reads. Whether the real keys
// behave like these is looked at in the browser.
vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        JustDown: (key: { _justDown: boolean }) => {
          const pressed = key._justDown;
          key._justDown = false;
          return pressed;
        },
      },
    },
  },
}));

/** What Phaser's `Key` keeps of a press, with the rules of its `onDown` and `onUp`. */
class FakeKey {
  isDown = false;
  _justDown = false;
  originalEvent: { repeat: boolean } | undefined;

  /** The browser's key-down event. `repeat` is true for the repeats of a key that is held down. */
  down(repeat = false): void {
    this.originalEvent = { repeat };
    if (!this.isDown) {
      this.isDown = true;
      this._justDown = true;
    }
  }

  up(): void {
    this.originalEvent = { repeat: false };
    this.isDown = false;
    this._justDown = false;
  }
}

/** A player input over fake keys, as a screen that has just begun has it, and the keys by the name Phaser gives them. */
function newScreen(): { input: PlayerInput; key: (name: string) => FakeKey } {
  const keys = new Map<string, FakeKey>();
  const keyboard = {
    addKey: (name: string) => {
      const key = new FakeKey();
      keys.set(name, key);
      return key;
    },
  } as unknown as Phaser.Input.Keyboard.KeyboardPlugin;
  const key = (name: string): FakeKey => {
    const found = keys.get(name);
    if (found === undefined) {
      throw new Error(`No key named ${name} was added.`);
    }
    return found;
  };
  return { input: new PlayerInput(keyboard), key };
}

/** The keys that more than one screen reads, and how each reports that it went down again. */
const READS: readonly { name: string; says: string; read: (input: PlayerInput) => boolean }[] = [
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
});
