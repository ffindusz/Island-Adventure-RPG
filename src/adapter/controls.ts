import { PAGE_IDS, STAT_IDS } from '../core';
import type { Direction, PageId, StatId } from '../core';
import { AUDIO_CHANGES } from './audio-settings';
import type { AudioChange } from './audio-settings';

// The controls: which keys the game answers to, by the name Phaser gives each key, and the labels the player reads for
// them. Nothing here touches Phaser, so it can be tested as it is: the Phaser keyboard is wired to these tables by
// player-input.ts, and the lookup of key codes that `checkAudioKeys` needs is given to it.

/** The keys that walk the hero, by Phaser key name. Changing the controls means changing the tables in this file. */
export const WALK_KEYS: Readonly<Record<Direction, readonly string[]>> = {
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
};

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export const ATTACK_KEY = 'SPACE';

/** The key that interacts with what the hero faces, such as opening a chest. */
export const INTERACT_KEY = 'E';

/** The key that interacts with what the hero faces, as the player reads it. */
export function interactKeyLabel(): string {
  return INTERACT_KEY;
}

/** The key that takes the other weapon in hand, the sword or the bow. */
export const SWITCH_WEAPON_KEY = 'Q';

/** The key that takes the other weapon in hand, as the player reads it. */
export function switchWeaponKeyLabel(): string {
  return SWITCH_WEAPON_KEY;
}

/** The key that picks the highlighted entry of a menu. The keys that walk up and down also move through a menu. */
export const CONFIRM_KEY = 'ENTER';

/** The key that picks the highlighted entry of a menu, as the player reads it. */
export function confirmKeyLabel(): string {
  return CONFIRM_KEY;
}

/** The key that opens each page. */
export const PAGE_KEYS: Readonly<Record<PageId, string>> = { stats: 'C', inventory: 'I', automap: 'M' };

/** The key that opens the page, as the player reads it. */
export function pageKeyLabel(page: PageId): string {
  return PAGE_KEYS[page];
}

/** The key that closes the page that is open, and declines the question whether to sail home. */
export const CLOSE_PAGE_KEY = 'ESC';

/** The key that closes the page that is open, as the player reads it. */
export function closePageKeyLabel(): string {
  return CLOSE_PAGE_KEY;
}

/** The keys that assign a Stat Point to each stat, number row and keypad alike, and the label the player reads. */
export const STAT_KEYS: Readonly<Record<StatId, { readonly label: string; readonly keys: readonly string[] }>> = {
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
export const AUDIO_KEYS: Readonly<Record<AudioChange, { readonly label: string; readonly keys: readonly string[] }>> = {
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

/**
 * Throws, naming the key, when a key of the audio is also bound to anything else, or to another of the audio's changes, or
 * has a name that Phaser does not know. Two bindings on one key share a single Phaser key, which one of them takes the
 * press from, so a clash is a key that works by chance. Call it before the game starts. `codeOf` is Phaser's table of key
 * codes: the code of the key that Phaser calls by the name, or undefined when it knows no such key.
 */
export function checkAudioKeys(codeOf: (name: string) => number | undefined): void {
  const known = (name: string): number => {
    const code = codeOf(name);
    if (code === undefined) {
      throw new Error(`"${name}" is not the name of a key that Phaser knows`);
    }
    return code;
  };
  const taken = new Map<number, string>();
  for (const { use, names } of keysOfEverythingElse()) {
    for (const name of names) {
      taken.set(known(name), use);
    }
  }
  for (const change of AUDIO_CHANGES) {
    for (const name of AUDIO_KEYS[change].keys) {
      const code = known(name);
      const clash = taken.get(code);
      if (clash !== undefined) {
        throw new Error(`The key ${name}, for the audio (${change}), is also the key for ${clash}`);
      }
      taken.set(code, `the audio (${change})`);
    }
  }
}
