import Phaser from 'phaser';
import { PAGE_IDS, STAT_IDS } from '../core';
import type { Command, Direction, PageId, StatId } from '../core';
import { AUDIO_CHANGES } from './audio-settings';
import type { AudioChange } from './audio-settings';

/** The keys that walk the hero, by Phaser key name. Changing the controls means changing the tables in this file. */
const WALK_KEYS: Readonly<Record<Direction, readonly string[]>> = {
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
};

const ATTACK_KEY = 'SPACE';

/** The key that interacts with what the hero faces, such as opening a chest. */
const INTERACT_KEY = 'E';

/** The key that interacts with what the hero faces, as the player reads it. */
export function interactKeyLabel(): string {
  return INTERACT_KEY;
}

/** The key that takes the other weapon in hand, the sword or the bow. */
const SWITCH_WEAPON_KEY = 'Q';

/** The key that takes the other weapon in hand, as the player reads it. */
export function switchWeaponKeyLabel(): string {
  return SWITCH_WEAPON_KEY;
}

/** The key that picks the highlighted entry of a menu. The keys that walk up and down also move through a menu. */
const CONFIRM_KEY = 'ENTER';

/** The key that opens each page. */
const PAGE_KEYS: Readonly<Record<PageId, string>> = { stats: 'C', inventory: 'I', automap: 'M' };

/** The key that opens the page, as the player reads it. */
export function pageKeyLabel(page: PageId): string {
  return PAGE_KEYS[page];
}

/** The key that closes the page that is open, and declines the question whether to sail home. */
const CLOSE_PAGE_KEY = 'ESC';

/** The keys that assign a Stat Point to each stat, number row and keypad alike, and the label the player reads. */
const STAT_KEYS: Readonly<Record<StatId, { readonly label: string; readonly keys: readonly string[] }>> = {
  health: { label: '1', keys: ['ONE', 'NUMPAD_ONE'] },
  attack: { label: '2', keys: ['TWO', 'NUMPAD_TWO'] },
  defense: { label: '3', keys: ['THREE', 'NUMPAD_THREE'] },
};

/** The key that assigns a Stat Point to the stat, as the level-up choice shows it. */
export function statKeyLabel(stat: StatId): string {
  return STAT_KEYS[stat].label;
}

/**
 * The keys that turn the sound off and on, make it quieter and make it louder, and the label the player reads. The
 * number pad has its twins of minus and plus. None of them may be bound to anything else: see `checkAudioKeys`.
 */
const AUDIO_KEYS: Readonly<Record<AudioChange, { readonly label: string; readonly keys: readonly string[] }>> = {
  'toggle-mute': { label: 'N', keys: ['N'] },
  lower: { label: '-', keys: ['MINUS', 'NUMPAD_SUBTRACT'] },
  raise: { label: '+', keys: ['PLUS', 'NUMPAD_ADD'] },
};

/** The key that makes the audio change that way, as the title shows it. */
export function audioKeyLabel(change: AudioChange): string {
  return AUDIO_KEYS[change].label;
}

/** The keys of everything but the audio, and what each is for, to see that none of them is also a key of the audio. */
function keysOfEverythingElse(): readonly { readonly use: string; readonly names: readonly string[] }[] {
  return [
    ...DIRECTIONS.map((direction) => ({ use: `walking ${direction}`, names: WALK_KEYS[direction] })),
    { use: 'attacking', names: [ATTACK_KEY] },
    { use: 'interacting', names: [INTERACT_KEY] },
    { use: 'switching weapons', names: [SWITCH_WEAPON_KEY] },
    { use: 'picking from a menu', names: [CONFIRM_KEY] },
    ...PAGE_IDS.map((page) => ({ use: `opening the ${page} page`, names: [PAGE_KEYS[page]] })),
    { use: 'closing a page', names: [CLOSE_PAGE_KEY] },
    ...STAT_IDS.map((stat) => ({ use: `assigning a Stat Point to ${stat}`, names: STAT_KEYS[stat].keys })),
  ];
}

/** The code of the key that Phaser calls by this name, which is what two bindings share when they clash. */
function keyCodeOf(name: string): number {
  const code = (Phaser.Input.Keyboard.KeyCodes as Record<string, number | undefined>)[name.toUpperCase()];
  if (code === undefined) {
    throw new Error(`"${name}" is not the name of a key that Phaser knows`);
  }
  return code;
}

/**
 * Throws, naming the key, when a key of the audio is also bound to anything else, or to another of the audio's changes, or
 * has a name that Phaser does not know. Two bindings on one key share a single Phaser key, which one of them takes the
 * press from, so a clash is a key that works by chance. Call it before the game starts.
 */
export function checkAudioKeys(): void {
  const taken = new Map<number, string>();
  for (const { use, names } of keysOfEverythingElse()) {
    for (const name of names) {
      taken.set(keyCodeOf(name), use);
    }
  }
  for (const change of AUDIO_CHANGES) {
    for (const name of AUDIO_KEYS[change].keys) {
      const code = keyCodeOf(name);
      const clash = taken.get(code);
      if (clash !== undefined) {
        throw new Error(`The key ${name}, for the audio (${change}), is also the key for ${clash}`);
      }
      taken.set(code, `the audio (${change})`);
    }
  }
}

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

type Key = Phaser.Input.Keyboard.Key;

/** What the keys did in a menu since the last look: a step up or down its list, and whether Enter was pressed. */
export interface MenuInput {
  readonly step: -1 | 0 | 1;
  readonly confirm: boolean;
}

/**
 * Whether any of the keys went down again since the last check. Every key is checked, so a key pressed together
 * with its twin is not left over for the next frame. A key that is held down from the screen before is not pressed
 * again: Phaser makes new keys for each screen, and a new key takes the first repeat of a held key for a press. So
 * Enter held down to sail home does not turn the first page of the ending, nor does it go on to pick on the title.
 * A press that `counts` refuses is used up all the same, and does not come back on the next frame.
 */
function pressedAgain(keys: readonly Key[], counts: (press: KeyboardEvent) => boolean = () => true): boolean {
  return (
    keys.filter((key) => Phaser.Input.Keyboard.JustDown(key) && !key.originalEvent.repeat && counts(key.originalEvent))
      .length > 0
  );
}

/** Whether a press is for the game and not for the browser: Ctrl or Cmd with a key is a shortcut, such as Ctrl and minus, which zooms. */
function isForTheGame(press: KeyboardEvent): boolean {
  return !press.ctrlKey && !press.metaKey;
}

/**
 * Turns the keyboard into Game core commands. It polls the keys once per frame instead of listening for key
 * events, because Phaser releases every key when the window loses focus without sending key-up events: polling
 * notices, so the hero never keeps walking by itself. It sends every command the keys call for and leaves it to the
 * Game core to ignore the ones that do not apply, such as closing a page that is not open. The one exception is the
 * walk keys, which a menu uses too: see `pollWalking`. The keys of the audio are not the game's and send no command:
 * see `pollAudio`.
 */
export class PlayerInput {
  private readonly walkKeys: Readonly<Record<Direction, readonly Key[]>>;
  private readonly attackKey: Key;
  private readonly interactKey: Key;
  private readonly switchWeaponKey: Key;
  private readonly confirmKey: Key;
  private readonly pageKeys: readonly { readonly page: PageId; readonly key: Key }[];
  private readonly closePageKey: Key;
  private readonly statKeys: readonly { readonly stat: StatId; readonly keys: readonly Key[] }[];
  private readonly audioKeys: readonly { readonly change: AudioChange; readonly keys: readonly Key[] }[];
  private readonly walking: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    const keysFor = (direction: Direction): Key[] => WALK_KEYS[direction].map((name) => keyboard.addKey(name));
    this.walkKeys = { up: keysFor('up'), down: keysFor('down'), left: keysFor('left'), right: keysFor('right') };
    this.attackKey = keyboard.addKey(ATTACK_KEY);
    // These are not captured, so the browser's own shortcuts on the same keys, such as Ctrl+C, still work.
    this.interactKey = keyboard.addKey(INTERACT_KEY, false);
    this.switchWeaponKey = keyboard.addKey(SWITCH_WEAPON_KEY, false);
    this.confirmKey = keyboard.addKey(CONFIRM_KEY, false);
    this.pageKeys = PAGE_IDS.map((page) => ({ page, key: keyboard.addKey(PAGE_KEYS[page], false) }));
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
   * a key down does not repeat its command.
   */
  pollActions(): Command[] {
    const commands: Command[] = [];
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      commands.push({ type: 'attack' });
    }
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      commands.push({ type: 'interact' });
    }
    if (Phaser.Input.Keyboard.JustDown(this.switchWeaponKey)) {
      commands.push({ type: 'switch-weapon' });
    }
    for (const { page, key } of this.pageKeys) {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        commands.push({ type: 'open-page', page });
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.closePageKey)) {
      for (const page of PAGE_IDS) {
        commands.push({ type: 'close-page', page });
      }
      commands.push({ type: 'cancel-departure' });
    }
    for (const { stat, keys } of this.statKeys) {
      if (pressedAgain(keys)) {
        commands.push({ type: 'assign-stat-point', stat });
      }
    }
    return commands;
  }

  /**
   * What the keys did in a menu since the last call. Call it every frame, menu or not: a press that nobody asks about
   * would otherwise be left over, and count the next time a menu is open.
   */
  pollMenu(): MenuInput {
    const up = pressedAgain(this.walkKeys.up);
    const down = pressedAgain(this.walkKeys.down);
    return { step: up === down ? 0 : up ? -1 : 1, confirm: pressedAgain([this.confirmKey]) };
  }

  /**
   * Whether Esc went down again since the last call, to turn down what a menu asks. Esc also closes the page that is
   * open and declines the question whether to sail home, and `pollActions` takes that press: so a screen asks only one
   * of the two, as the title asks this.
   */
  pollCancel(): boolean {
    return pressedAgain([this.closePageKey]);
  }

  /**
   * What the keys of the audio asked of the settings since the last call, in the order of `AUDIO_CHANGES`. Holding a key
   * down asks once, and a key pressed with Ctrl or Cmd asks nothing: that is the browser's, as Ctrl and minus is its
   * zoom. Call it every frame in every screen, so that a press is not left over for a later one.
   */
  pollAudio(): AudioChange[] {
    return this.audioKeys.filter(({ keys }) => pressedAgain(keys, isForTheGame)).map(({ change }) => change);
  }
}
