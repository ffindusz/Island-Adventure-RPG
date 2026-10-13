import { describe, expect, it } from 'vitest';
import type { Command, Game, GameEvent } from '../src/core';
import { dismissalFirst, DismissalWatch } from '../src/adapter/area-text-dismissal';
import { dismissesAreaText } from '../src/adapter/player-input';
import { INTERACT, arena, face, newGame, playingView, signAt } from './fixtures';

// Which presses put the text of an area away (the rule of `dismissesAreaText` in player-input.ts), which frame commands
// the dismissal goes before, and what sees the presses (area-text-dismissal.ts). All of it is pure: no Phaser, no scene.
// The wiring of it in the play screen is looked at in the game, as ADR 0005 says of the wiring.

/** A press as the browser's event tells it, with the key by its `code`. */
interface Press {
  readonly code: string;
  readonly repeat: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

/** The first press of a key, with nothing held, unless `held` says otherwise. */
function pressOf(code: string, held: Partial<Omit<Press, 'code'>> = {}): Press {
  return { code, repeat: false, ctrlKey: false, metaKey: false, ...held };
}

// The rule is for any key: the game's own (a walk key, the keys that strike, interact, switch the weapon, assign a Stat
// Point, close or toggle a page, confirm, and sound), and one that the game does not use. The keys are named so that
// the table shows none is left out.
const KEYS = [
  { key: 'a walk key', code: 'ArrowRight' },
  { key: 'a letter that walks', code: 'KeyA' },
  { key: 'Space, which strikes', code: 'Space' },
  { key: 'E, which interacts', code: 'KeyE' },
  { key: 'Q, which switches the weapon', code: 'KeyQ' },
  { key: 'Enter', code: 'Enter' },
  { key: 'Esc', code: 'Escape' },
  { key: 'I, the inventory', code: 'KeyI' },
  { key: 'Tab, a key of the stat page', code: 'Tab' },
  { key: '2, which assigns a Stat Point', code: 'Digit2' },
  { key: 'N, a key of the audio', code: 'KeyN' },
  { key: 'minus, a key of the audio', code: 'Minus' },
  { key: 'Z, which the game does not use', code: 'KeyZ' },
] as const;

describe('which presses put the text of an area away', () => {
  it.each(KEYS)('the first press of $key does', ({ code }) => {
    expect(dismissesAreaText(pressOf(code))).toBe(true);
  });

  it.each(KEYS)('the auto-repeat of $key, held down, does not', ({ code }) => {
    expect(dismissesAreaText(pressOf(code, { repeat: true }))).toBe(false);
  });

  it.each(KEYS)('$key pressed with Ctrl held, a shortcut of the browser, does not', ({ code }) => {
    expect(dismissesAreaText(pressOf(code, { ctrlKey: true }))).toBe(false);
  });

  it.each(KEYS)('$key pressed with Meta held, a shortcut of the browser, does not', ({ code }) => {
    expect(dismissesAreaText(pressOf(code, { metaKey: true }))).toBe(false);
  });

  it('the press of the Ctrl key or the Meta key itself, which tells that it is held, does not', () => {
    expect(dismissesAreaText(pressOf('ControlLeft', { ctrlKey: true }))).toBe(false);
    expect(dismissesAreaText(pressOf('MetaLeft', { metaKey: true }))).toBe(false);
  });

  it('a repeat with Ctrl held does not either', () => {
    expect(dismissesAreaText(pressOf('KeyR', { repeat: true, ctrlKey: true }))).toBe(false);
  });
});

const DISMISS = { type: 'dismiss-area-text' } as const;
const MOVE_RIGHT: Command = { type: 'move', direction: 'right' };
const ATTACK: Command = { type: 'attack' };
const TOGGLE_STATS: Command = { type: 'toggle-page', page: 'stats' };

describe('the dismissal goes first in the frame', () => {
  it('is put ahead of the one command of a frame in which a press counted', () => {
    expect(dismissalFirst([INTERACT], true)).toEqual([DISMISS, INTERACT]);
  });

  it('leaves the other commands of the frame as they were, in their own order', () => {
    expect(dismissalFirst([MOVE_RIGHT, ATTACK, TOGGLE_STATS, INTERACT], true)).toEqual([
      DISMISS,
      MOVE_RIGHT,
      ATTACK,
      TOGGLE_STATS,
      INTERACT,
    ]);
  });

  it('is all there is to send in a frame in which a press counted and nothing else was asked', () => {
    expect(dismissalFirst([], true)).toEqual([DISMISS]);
  });

  it('is not added to a frame in which no press counted', () => {
    expect(dismissalFirst([MOVE_RIGHT, INTERACT], false)).toEqual([MOVE_RIGHT, INTERACT]);
    expect(dismissalFirst([], false)).toEqual([]);
  });

  it('does not change the list it is given', () => {
    const commands: readonly Command[] = Object.freeze([MOVE_RIGHT, INTERACT]);

    dismissalFirst(commands, true);

    expect(commands).toEqual([MOVE_RIGHT, INTERACT]);
  });
});

describe('the frame in which the player presses E at a sign', () => {
  const AREA_TEXT = 'A quiet arena.';
  const CLUE = 'The lever hides behind the old well.';

  /** The text of the area is on show, and the hero faces a sign right above it. */
  function atTheSign(): Game {
    const game = newGame(arena({ text: AREA_TEXT, interactables: [signAt('sign-1', 3, 2, CLUE)] }));
    face(game, 'up');
    return game;
  }

  /** What the play screen does with the commands of a frame: sends each to the Game core, in order. */
  function sendAll(game: Game, commands: readonly Command[]): GameEvent[] {
    return commands.flatMap((command) => game.send(command));
  }

  it('reads the sign after the text of the area is put away, so the text of the sign shows and stays', () => {
    const game = atTheSign();
    expect(playingView(game).areaText).toBe(AREA_TEXT);

    const events = sendAll(game, dismissalFirst([INTERACT], true));

    expect(events).toEqual([{ type: 'sign-read', signId: 'sign-1', text: CLUE }]);
    expect(playingView(game).areaText).toBe(CLUE);
  });
});

/** A keyboard that tells of presses as Phaser's plugin does, by hand: who listens to which event, and a press to give them. */
class FakeKeyboard {
  private readonly listeners: { readonly event: string; readonly listener: (press: Press) => void }[] = [];

  on(event: string, listener: (press: Press) => void): void {
    this.listeners.push({ event, listener });
  }

  off(event: string, listener: (press: Press) => void): void {
    const at = this.listeners.findIndex((entry) => entry.event === event && entry.listener === listener);
    if (at >= 0) {
      this.listeners.splice(at, 1);
    }
  }

  listening(event: string): number {
    return this.listeners.filter((entry) => entry.event === event).length;
  }

  /** The browser tells of a press: every listener of the event hears it. */
  tell(event: string, press: Press): void {
    for (const entry of [...this.listeners]) {
      if (entry.event === event) {
        entry.listener(press);
      }
    }
  }
}

describe('what sees the presses', () => {
  // A name of the test's own: a watch that listened for the browser's `keydown` whatever it was given would hear nothing.
  const KEY_DOWN = 'a-key-went-down';

  function watching(): { keyboard: FakeKeyboard; watch: DismissalWatch } {
    const keyboard = new FakeKeyboard();
    return { keyboard, watch: new DismissalWatch(keyboard, KEY_DOWN) };
  }

  it('has seen nothing before a key is pressed', () => {
    const { watch } = watching();

    expect(watch.take()).toBe(false);
  });

  it('listens for the presses of the keyboard: one listener, on the event it was given', () => {
    const { keyboard } = watching();

    expect(keyboard.listening(KEY_DOWN)).toBe(1);
    expect(keyboard.listening('keyup')).toBe(0);
  });

  it('sees the first press of a key, and tells of it once: asking takes it', () => {
    const { keyboard, watch } = watching();

    keyboard.tell(KEY_DOWN, pressOf('ArrowRight'));

    expect(watch.take()).toBe(true);
    expect(watch.take()).toBe(false);
  });

  it('tells of one press when several came between two looks', () => {
    const { keyboard, watch } = watching();

    keyboard.tell(KEY_DOWN, pressOf('ArrowRight'));
    keyboard.tell(KEY_DOWN, pressOf('KeyE'));

    expect(watch.take()).toBe(true);
    expect(watch.take()).toBe(false);
  });

  it('does not see an auto-repeat, a press with Ctrl held or one with Meta held, whichever key it is', () => {
    const { keyboard, watch } = watching();

    keyboard.tell(KEY_DOWN, pressOf('ArrowRight', { repeat: true }));
    keyboard.tell(KEY_DOWN, pressOf('KeyZ', { repeat: true }));
    keyboard.tell(KEY_DOWN, pressOf('KeyR', { ctrlKey: true }));
    keyboard.tell(KEY_DOWN, pressOf('KeyA', { metaKey: true }));

    expect(watch.take()).toBe(false);
  });

  it('sees a press that counts among presses that do not', () => {
    const { keyboard, watch } = watching();

    keyboard.tell(KEY_DOWN, pressOf('ArrowRight', { repeat: true }));
    keyboard.tell(KEY_DOWN, pressOf('KeyZ'));
    keyboard.tell(KEY_DOWN, pressOf('KeyR', { ctrlKey: true }));

    expect(watch.take()).toBe(true);
  });

  it('does not see what other events tell', () => {
    const { keyboard, watch } = watching();

    keyboard.tell('keyup', pressOf('ArrowRight'));

    expect(watch.take()).toBe(false);
  });

  it('stops listening when it is stopped, and then sees no press, though the keyboard goes on', () => {
    const { keyboard, watch } = watching();

    watch.stop();
    keyboard.tell(KEY_DOWN, pressOf('ArrowRight'));

    expect(keyboard.listening(KEY_DOWN)).toBe(0);
    expect(watch.take()).toBe(false);
  });

  it('takes its own listener off and no other: the scene that starts next listens as it did', () => {
    const keyboard = new FakeKeyboard();
    const first = new DismissalWatch(keyboard, KEY_DOWN);
    const second = new DismissalWatch(keyboard, KEY_DOWN);

    first.stop();
    keyboard.tell(KEY_DOWN, pressOf('ArrowRight'));

    expect(keyboard.listening(KEY_DOWN)).toBe(1);
    expect(first.take()).toBe(false);
    expect(second.take()).toBe(true);
  });
});
