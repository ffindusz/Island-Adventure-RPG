import { CONSUMABLE_IDS } from './definitions';
import type { ConsumableId } from './definitions';

// The checks that loading runs on a single value of the content, which the loaders in content.ts and in the modules
// beside it share. Each refuses with an Error that starts with what the caller says the value is.

// These also refuse NaN, which no comparison with a number is true for.
export function requireMoreThanZero(what: string, value: number): void {
  if (!(value > 0)) {
    throw new Error(`${what} must be more than 0, but it is ${value}`);
  }
}

export function requireZeroOrMore(what: string, value: number): void {
  if (!(value >= 0)) {
    throw new Error(`${what} must be 0 or more, but it is ${value}`);
  }
}

export function requireWholeNumberOfOneOrMore(what: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${what} must be a whole number of 1 or more, but it is ${value}`);
  }
}

/** Content read from a file could name a consumable that does not exist, and the compiler would not notice. */
export function isConsumableId(id: string): id is ConsumableId {
  return (CONSUMABLE_IDS as readonly string[]).includes(id);
}
