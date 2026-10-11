import type { SaveStorage } from '../src/adapter/save-store';

/** The part of localStorage the game uses, in memory. The tests look at what it holds and what was asked of it, and make it fail. */
export class MemoryStorage implements SaveStorage {
  readonly items = new Map<string, string>();
  readonly keysAskedFor: string[] = [];
  refuseReads: Error | null = null;
  refuseWrites: Error | null = null;

  getItem(key: string): string | null {
    this.keysAskedFor.push(key);
    if (this.refuseReads !== null) {
      throw this.refuseReads;
    }
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.keysAskedFor.push(key);
    if (this.refuseWrites !== null) {
      throw this.refuseWrites;
    }
    this.items.set(key, value);
  }
}
