import { describe, expect, it } from 'vitest';
import type { AreaDefinition } from '../src/core';
import { FIELD_LAYOUT, arena, chestAt, doorAt, gateAt, keyAt, leverAt, pickupAt, signAt } from './fixtures';
import { openTilesOf } from './routes';

// The tests of the shipped content walk the hero over the tiles that `openTilesOf` counts as open, so what it counts as
// solid is what no route they find goes through. The hero begins with every door and gate shut.

const content = arena({
  layout: FIELD_LAYOUT,
  interactables: [
    chestAt('chest', 1, 1, 'basic-sword'),
    leverAt('lever', 2, 1, ['gate']),
    signAt('sign', 3, 1, 'Hello.'),
    doorAt('door', 4, 1, 'key'),
    gateAt('gate', 5, 1),
    keyAt('key', 6, 1),
    pickupAt('potion', 7, 1, 1),
  ],
});
const area: AreaDefinition | undefined = content.areas[0];
if (area === undefined) {
  throw new Error('The arena has no area');
}

describe('the open tiles of an area, for the routes the tests walk', () => {
  it.each([
    ['a chest', 1],
    ['a lever', 2],
    ['a sign', 3],
  ])('counts %s as solid, whether or not the doors and gates are counted open', (_what, col) => {
    expect(openTilesOf(content, area)({ col, row: 1 })).toBe(false);
    expect(openTilesOf(content, area, true)({ col, row: 1 })).toBe(false);
  });

  it.each([
    ['a door', 4],
    ['a gate', 5],
  ])('counts %s as solid while it is shut, and as open ground once doors and gates are counted open', (_what, col) => {
    expect(openTilesOf(content, area)({ col, row: 1 })).toBe(false);
    expect(openTilesOf(content, area, true)({ col, row: 1 })).toBe(true);
  });

  it.each([
    ['a key', 6],
    ['a pickup', 7],
  ])('counts a tile with %s as open ground, since the hero walks over it', (_what, col) => {
    expect(openTilesOf(content, area)({ col, row: 1 })).toBe(true);
  });

  it('counts bare floor as open and the rock around it, and what lies outside the map, as solid', () => {
    const isOpen = openTilesOf(content, area);

    expect(isOpen({ col: 8, row: 1 })).toBe(true);
    expect(isOpen({ col: 0, row: 1 })).toBe(false);
    expect(isOpen({ col: 20, row: 1 })).toBe(false);
    expect(isOpen({ col: 1, row: -1 })).toBe(false);
  });
});
