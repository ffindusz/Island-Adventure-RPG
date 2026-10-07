import { describe, expect, it } from 'vitest';
import { createSaveStore } from '../src/adapter/save-store';
import type { SaveStorage } from '../src/adapter/save-store';
import { adventureAfter, adventureContent } from './saved-adventure';

const content = adventureContent();

/** The part of localStorage the game uses, in memory. The tests look at what it holds, and make it fail. */
class MemoryStorage implements SaveStorage {
  readonly items = new Map<string, string>();
  refuseReads: Error | null = null;
  refuseWrites: Error | null = null;

  getItem(key: string): string | null {
    if (this.refuseReads !== null) {
      throw this.refuseReads;
    }
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.refuseWrites !== null) {
      throw this.refuseWrites;
    }
    this.items.set(key, value);
  }
}

const KEY = 'island-adventure-rpg:saved-game';

describe('the save store', () => {
  it('finds no save when nothing was ever written', () => {
    expect(createSaveStore(new MemoryStorage(), content).read()).toEqual({ status: 'none' });
  });

  it('gives back the game that was written, exactly as it was', () => {
    const store = createSaveStore(new MemoryStorage(), content);
    const snapshot = adventureAfter('volley').snapshot();

    expect(store.write(snapshot)).toBe(true);

    expect(store.read()).toEqual({ status: 'usable', snapshot });
  });

  it('keeps the game under one key of the storage, as the JSON of the Snapshot', () => {
    const storage = new MemoryStorage();
    const snapshot = adventureAfter('camp').snapshot();

    createSaveStore(storage, content).write(snapshot);

    expect([...storage.items.keys()]).toEqual([KEY]);
    expect(JSON.parse(storage.items.get(KEY) ?? '')).toEqual(snapshot);
    expect(JSON.parse(storage.items.get(KEY) ?? '')).toHaveProperty('version', 1);
  });

  it('finds the game a store of an earlier visit wrote', () => {
    const storage = new MemoryStorage();
    const snapshot = adventureAfter('camp').snapshot();
    createSaveStore(storage, content).write(snapshot);

    expect(createSaveStore(storage, content).read()).toEqual({ status: 'usable', snapshot });
  });

  it('replaces the saved game when another is written, and keeps only that one', () => {
    const storage = new MemoryStorage();
    const store = createSaveStore(storage, content);
    store.write(adventureAfter('camp').snapshot());
    const later = adventureAfter('volley').snapshot();

    store.write(later);

    expect(store.read()).toEqual({ status: 'usable', snapshot: later });
    expect(storage.items.size).toBe(1);
  });

  describe('when what the storage holds is not a game it can continue', () => {
    it.each([
      ['damaged', 'the island at dusk', 'damaged'],
      ['of another version', JSON.stringify({ version: 2, state: {} }), 'incompatible'],
    ])('says so when the save is %s', (_, text, problem) => {
      const storage = new MemoryStorage();
      storage.items.set(KEY, text);

      expect(createSaveStore(storage, content).read()).toMatchObject({ status: 'unusable', problem });
    });

    it('keeps it where it is when it is read, and for as long as no game is written', () => {
      const storage = new MemoryStorage();
      storage.items.set(KEY, 'the island at dusk');
      const store = createSaveStore(storage, content);

      store.read();
      store.read();

      expect(storage.items.get(KEY)).toBe('the island at dusk');
    });

    it('is replaced by the next game that is written', () => {
      const storage = new MemoryStorage();
      storage.items.set(KEY, 'the island at dusk');
      const store = createSaveStore(storage, content);
      const snapshot = adventureAfter('camp').snapshot();

      store.write(snapshot);

      expect(store.read()).toEqual({ status: 'usable', snapshot });
    });
  });

  describe('when the browser will not let it save', () => {
    it('finds the storage unavailable when it cannot be read', () => {
      const storage = new MemoryStorage();
      storage.refuseReads = new Error('The operation is insecure.');

      expect(createSaveStore(storage, content).read()).toEqual({ status: 'unavailable' });
    });

    it('says it could not save, and leaves the earlier save readable, when the storage refuses a write', () => {
      const storage = new MemoryStorage();
      const store = createSaveStore(storage, content);
      const earlier = adventureAfter('camp').snapshot();
      store.write(earlier);
      storage.refuseWrites = new Error('The quota has been exceeded.');

      expect(store.write(adventureAfter('volley').snapshot())).toBe(false);

      expect(store.read()).toEqual({ status: 'usable', snapshot: earlier });
    });

    it('finds the storage unavailable, and cannot save, when the browser has none', () => {
      const store = createSaveStore(null, content);

      expect(store.read()).toEqual({ status: 'unavailable' });
      expect(store.write(adventureAfter('camp').snapshot())).toBe(false);
    });
  });
});
