import { PAGE_IDS, STAT_IDS } from '../core';
import type { Command, Direction, PageId, StatId } from '../core';
import { AUDIO_CHANGES } from './audio-settings';
import type { AudioChange } from './audio-settings';
import {
  ATTACK_KEY,
  AUDIO_KEYS,
  CLOSE_PAGE_KEY,
  CONFIRM_KEY,
  DIRECTIONS,
  INTERACT_KEY,
  PAGE_KEYS,
  STAT_KEYS,
  SWITCH_WEAPON_KEY,
  WALK_KEYS,
} from './controls';

/** What the player's input reads of a key: whether it is down, and the browser's event of its last press. Phaser's `Key` has both. */
export interface KeyState {
  readonly isDown: boolean;
  readonly originalEvent: { readonly repeat: boolean; readonly ctrlKey: boolean; readonly metaKey: boolean };
}

/** What the browser said of one press of a key: whether it is the repeat of a key held down, and the Ctrl and Cmd keys held with it. */
export type KeyPress = KeyState['originalEvent'];

/** What the player's input asks of the keyboard: the key by the name Phaser gives it, held back from the browser if `capture`. */
export interface Keyboard<K extends KeyState> {
  addKey(name: string, capture?: boolean): K;
}

/** What the keys did in a menu since the last look: a step up or down its list, and whether Enter was pressed. */
export interface MenuInput {
  readonly step: -1 | 0 | 1;
  readonly confirm: boolean;
}

/** Whether a press is for the game and not for the browser: Ctrl or Cmd with a key is a shortcut, such as Ctrl and minus, which zooms, or Ctrl and Tab, which switches tabs. */
function isForTheGame(press: KeyState['originalEvent']): boolean {
  return !press.ctrlKey && !press.metaKey;
}

/** Whether a press is a fresh one for the game: not the repeat of a key held down, and not a browser's shortcut (see `isForTheGame`). */
export function isFreshPress(press: KeyPress): boolean {
  return !press.repeat && isForTheGame(press);
}

/**
 * Turns the keyboard into Game core commands. It polls the keys once per frame instead of listening for key
 * events, because Phaser releases every key when the window loses focus without sending key-up events: polling
 * notices, so the hero never keeps walking by itself. It sends every command the keys call for and leaves it to the
 * Game core to ignore the ones that do not apply, such as closing a page that is not open. The one exception is the
 * walk keys, which a menu uses too: see `pollWalking`. The keys of the audio are not the game's and send no command:
 * see `pollAudio`. It knows Phaser's keys only by what `KeyState` says of them, and is given Phaser's rule of when a key
 * went down (`JustDown`), so that it runs without Phaser.
 */
export class PlayerInput<K extends KeyState> {
  private readonly justDown: (key: K) => boolean;
  private readonly walkKeys: Readonly<Record<Direction, readonly K[]>>;
  private readonly attackKey: K;
  private readonly interactKey: K;
  private readonly switchWeaponKey: K;
  private readonly confirmKey: K;
  private readonly pageKeys: readonly { readonly page: PageId; readonly keys: readonly K[] }[];
  private readonly closePageKey: K;
  private readonly statKeys: readonly { readonly stat: StatId; readonly keys: readonly K[] }[];
  private readonly audioKeys: readonly { readonly change: AudioChange; readonly keys: readonly K[] }[];
  private readonly walking: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  /** The fresh press of Esc that the last `pollActions` took, for `pollActionsWithEsc` to hand on. Set by every call, so none is left over. */
  private freshEsc: KeyPress | null = null;

  constructor(keyboard: Keyboard<K>, justDown: (key: K) => boolean) {
    this.justDown = justDown;
    const keysFor = (direction: Direction): K[] => WALK_KEYS[direction].map((name) => keyboard.addKey(name));
    this.walkKeys = { up: keysFor('up'), down: keysFor('down'), left: keysFor('left'), right: keysFor('right') };
    this.attackKey = keyboard.addKey(ATTACK_KEY);
    // These are not captured, so the browser's own shortcuts on the same keys, such as Ctrl+C, still work.
    this.interactKey = keyboard.addKey(INTERACT_KEY, false);
    this.switchWeaponKey = keyboard.addKey(SWITCH_WEAPON_KEY, false);
    this.confirmKey = keyboard.addKey(CONFIRM_KEY, false);
    // The table says which of the page keys Phaser holds back from the browser: Tab, so that it does not move the focus.
    this.pageKeys = PAGE_IDS.map((page) => ({
      page,
      keys: PAGE_KEYS[page].map(({ name, capture }) => keyboard.addKey(name, capture)),
    }));
    this.closePageKey = keyboard.addKey(CLOSE_PAGE_KEY, false);
    this.statKeys = STAT_IDS.map((stat) => ({
      stat,
      keys: STAT_KEYS[stat].keys.map((name) => keyboard.addKey(name, false)),
    }));
    this.audioKeys = AUDIO_CHANGES.map((change) => ({
      change,
      keys: AUDIO_KEYS[change].keys.map((name) => keyboard.addKey(name, false)),
    }));
  }

  /**
   * The commands for the directions that started or stopped being held since the last call; either of a direction's
   * two keys counts. Holding a key down does not repeat its command. The walk keys also move through a menu, so the
   * caller leaves this out while the game waits for the player: the hero does not turn behind a menu. Nothing is lost
   * by that, because the first call after the wait sends everything that changed meanwhile.
   */
  pollWalking(): Command[] {
    const commands: Command[] = [];
    for (const direction of DIRECTIONS) {
      const held = this.walkKeys[direction].some((key) => key.isDown);
      if (held === this.walking[direction]) {
        continue;
      }
      this.walking[direction] = held;
      if (held) {
        commands.push({ type: 'move', direction });
      } else {
        commands.push({ type: 'stop', direction });
      }
    }
    return commands;
  }

  /**
   * The commands for the attack, interact, switch weapon, page and Stat Point keys that were pressed again since the
   * last call, and for Esc, which closes the page that is open and declines the question whether to sail home. Holding
   * a key down does not repeat its command. A page key asks to toggle its page, and the Game core knows whether that
   * opens it or closes it: this does not look at the view. A page key pressed with Ctrl or Cmd asks nothing, as the
   * audio keys: that is the browser's, such as Ctrl and C, which copies, or Ctrl and Tab, which switches tabs.
   */
  pollActions(): Command[] {
    const commands: Command[] = [];
    if (this.justDown(this.attackKey)) {
      commands.push({ type: 'attack' });
    }
    if (this.justDown(this.interactKey)) {
      commands.push({ type: 'interact' });
    }
    if (this.justDown(this.switchWeaponKey)) {
      commands.push({ type: 'switch-weapon' });
    }
    for (const { page, keys } of this.pageKeys) {
      if (this.pressedAgain(keys, isForTheGame)) {
        commands.push({ type: 'toggle-page', page });
      }
    }
    const escWentDown = this.justDown(this.closePageKey);
    this.freshEsc = escWentDown && isFreshPress(this.closePageKey.originalEvent) ? this.closePageKey.originalEvent : null;
    if (escWentDown) {
      for (const page of PAGE_IDS) {
        commands.push({ type: 'close-page', page });
      }
      commands.push({ type: 'cancel-departure' });
    }
    for (const { stat, keys } of this.statKeys) {
      if (this.pressedAgain(keys)) {
        commands.push({ type: 'assign-stat-point', stat });
      }
    }
    return commands;
  }

  /**
   * What `pollActions` found, and with it the press of Esc that went down in that same read, if it is a fresh one: not
   * the repeat of a key held down, and not with Ctrl or Cmd (`isFreshPress`). The press goes to the rule of the pause
   * (pausing.ts). It is not read from the key a second time, because `JustDown` uses a press up: `pollActions` has taken
   * it, and sends the commands of Esc whether or not the press is fresh.
   */
  pollActionsWithEsc(): { readonly commands: Command[]; readonly esc: KeyPress | null } {
    const commands = this.pollActions();
    return { commands, esc: this.freshEsc };
  }

  /**
   * What the keys did in a menu since the last call. Call it every frame, menu or not: a press that nobody asks about
   * would otherwise be left over, and count the next time a menu is open.
   */
  pollMenu(): MenuInput {
    const up = this.pressedAgain(this.walkKeys.up);
    const down = this.pressedAgain(this.walkKeys.down);
    return { step: up === down ? 0 : up ? -1 : 1, confirm: this.pressedAgain([this.confirmKey]) };
  }

  /**
   * Whether Esc went down again since the last call, to turn down what a menu asks. Esc also closes the page that is
   * open and declines the question whether to sail home, and `pollActions` takes that press: so a screen asks only one
   * of the two, as the title asks this.
   */
  pollCancel(): boolean {
    return this.pressedAgain([this.closePageKey]);
  }

  /**
   * What the keys of the audio asked of the settings since the last call, in the order of `AUDIO_CHANGES`. Holding a key
   * down asks once, and a key pressed with Ctrl or Cmd asks nothing: that is the browser's, as Ctrl and minus is its
   * zoom. Call it every frame in every screen, so that a press is not left over for a later one.
   */
  pollAudio(): AudioChange[] {
    return this.audioKeys.filter(({ keys }) => this.pressedAgain(keys, isForTheGame)).map(({ change }) => change);
  }

  /**
   * Whether any of the keys went down again since the last check. Every key is checked, so a key pressed together
   * with its twin is not left over for the next frame. A key that is held down from the screen before is not pressed
   * again: Phaser makes new keys for each screen, and a new key takes the first repeat of a held key for a press. So
   * Enter held down to sail home does not turn the first page of the ending, nor does it go on to pick on the title.
   * A press that `counts` refuses is used up all the same, and does not come back on the next frame.
   */
  private pressedAgain(keys: readonly K[], counts: (press: KeyState['originalEvent']) => boolean = () => true): boolean {
    return keys.filter((key) => this.justDown(key) && !key.originalEvent.repeat && counts(key.originalEvent)).length > 0;
  }
}
