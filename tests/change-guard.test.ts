import { describe, expect, it } from 'vitest';
import { ChangeGuard } from '../src/adapter/change-guard';

describe('the change guard of a screen', () => {
  it('says the first thing shown is a change, whatever it is, nothing at all included', () => {
    for (const first of ['FOUND SWORD', '', null, 0, false, [], { health: 3 }]) {
      expect(new ChangeGuard().changed(first)).toBe(true);
    }
  });

  it('says the same thing again is no change, however often it is asked', () => {
    const guard = new ChangeGuard();
    expect(guard.changed('LV 2')).toBe(true);
    expect(guard.changed('LV 2')).toBe(false);
    expect(guard.changed('LV 2')).toBe(false);
  });

  it('goes by what a thing says and not by which object it is', () => {
    const guard = new ChangeGuard();
    expect(guard.changed({ health: 3, carrying: [1, 2] })).toBe(true);
    expect(guard.changed({ health: 3, carrying: [1, 2] })).toBe(false);
    expect(guard.changed({ health: 2, carrying: [1, 2] })).toBe(true);
    expect(guard.changed({ health: 2, carrying: [1, 2, 3] })).toBe(true);
  });

  it('remembers only the last thing, so going back to an earlier one is a change', () => {
    const guard = new ChangeGuard();
    expect(guard.changed('A')).toBe(true);
    expect(guard.changed('B')).toBe(true);
    expect(guard.changed('A')).toBe(true);
    expect(guard.changed('A')).toBe(false);
  });

  it('tells nothing from the word for it, and a number from its digits', () => {
    const guard = new ChangeGuard();
    expect(guard.changed(null)).toBe(true);
    expect(guard.changed('null')).toBe(true);
    expect(guard.changed(0)).toBe(true);
    expect(guard.changed('0')).toBe(true);
    expect(guard.changed(false)).toBe(true);
    expect(guard.changed('false')).toBe(true);
  });

  it('says whether anything has been shown, from the start or since it forgot', () => {
    const guard = new ChangeGuard();
    expect(guard.hasShown()).toBe(false);
    guard.changed(null);
    expect(guard.hasShown()).toBe(true);
    guard.forget();
    expect(guard.hasShown()).toBe(false);
    guard.changed('A');
    expect(guard.hasShown()).toBe(true);
  });

  it('makes the next call a change after it forgot, even for the same thing, and no more than the next', () => {
    const guard = new ChangeGuard();
    guard.changed('A');
    expect(guard.changed('A')).toBe(false);
    guard.forget();
    expect(guard.changed('A')).toBe(true);
    expect(guard.changed('A')).toBe(false);
  });
});
