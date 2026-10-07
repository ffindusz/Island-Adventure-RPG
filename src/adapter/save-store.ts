import type { ContentDefinition, Snapshot } from '../core';
import { parseSave } from './saved-game';
import type { ParsedSave } from './saved-game';

// The save slot. The saved game is the JSON text of one Snapshot under one key of the browser's localStorage, which a
// new save replaces. The store never removes it: a save the game cannot continue from stays where it is until the next
// autosave overwrites it, so that nothing the player may still want is thrown away on a guess.
// No Phaser in here: the storage is handed in, so the tests give it one in memory that they can make fail.

/** The part of the browser's localStorage that the store uses. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The one key of the storage that holds the saved game, namespaced for the other things the game may keep there. */
export const SAVE_KEY = 'island-adventure-rpg:saved-game';

/** What the save slot holds: a verdict on the saved game (see parseSave), or that the browser lets nothing be saved. */
export type SavedGame = ParsedSave | { readonly status: 'unavailable' };

export interface SaveStore {
  /** What the slot holds now. */
  read(): SavedGame;
  /** Replaces the saved game. False when the browser refused: the game goes on, and the earlier save stays as it was. */
  write(snapshot: Snapshot): boolean;
}

/** The store over the storage the browser gave, or null when it gave none (storage blocked, or no window). */
export function createSaveStore(storage: SaveStorage | null, content: ContentDefinition): SaveStore {
  return {
    read() {
      if (storage === null) {
        return { status: 'unavailable' };
      }
      let text: string | null;
      try {
        text = storage.getItem(SAVE_KEY);
      } catch {
        return { status: 'unavailable' };
      }
      return parseSave(text, content);
    },
    write(snapshot) {
      if (storage === null) {
        return false;
      }
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(snapshot));
        return true;
      } catch {
        return false;
      }
    },
  };
}
