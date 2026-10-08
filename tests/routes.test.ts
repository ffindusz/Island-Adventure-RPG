import { describe, expect, it } from 'vitest';
import type { AreaDefinition, Tile } from '../src/core';
import {
  FIELD_LAYOUT,
  arena,
  biterAt,
  chestAt,
  doorAt,
  dummyAt,
  gateAt,
  keyAt,
  leverAt,
  milestone,
  pickupAt,
  signAt,
} from './fixtures';
import { distanceBetween, experienceOf, experienceOfAll, metOn, milestonesOf, noticingOf, openTilesOf } from './routes';

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

// The tests of the Experience that the shipped areas give add up what a hero meets on a route and what it passes. The
// numbers here are worked by hand from the arena: a biter is worth 8 and notices a hero 2 tiles from its body, a dummy
// is worth 5 and notices none, and the field is 12 tiles wide with the hero's route along its bottom row.

describe('the Experience of a stretch of the adventure, for the tests that tune it', () => {
  const field = arena({
    layout: FIELD_LAYOUT,
    monsters: [biterAt('close', 7, 3), biterAt('far', 8, 3), dummyAt('beside', 3, 4)],
    milestones: [
      milestone('first', { col: 1, row: 1, width: 1, height: 1 }, 3),
      milestone('second', { col: 12, row: 1, width: 1, height: 1 }, 4),
    ],
  });
  const fieldArea: AreaDefinition | undefined = field.areas[0];
  if (fieldArea === undefined) {
    throw new Error('The arena has no area');
  }
  const [close, far, beside] = fieldArea.monsters;
  if (close === undefined || far === undefined || beside === undefined) {
    throw new Error('The field has no monsters');
  }
  const bottomRow: Tile[] = [1, 2, 3, 4, 5].map((col) => ({ col, row: 5 }));

  it('measures a distance in tiles as the farther of the columns and the rows apart, a diagonal step being one', () => {
    expect(distanceBetween({ col: 1, row: 1 }, { col: 4, row: 3 })).toBe(3);
    expect(distanceBetween({ col: 4, row: 3 }, { col: 1, row: 1 })).toBe(3);
    expect(distanceBetween({ col: 2, row: 2 }, { col: 2, row: 2 })).toBe(0);
  });

  it('knows what a monster is worth by its type, and how far it notices a hero, none at all for a type that does not notice', () => {
    expect(experienceOf(field, close)).toBe(8);
    expect(experienceOf(field, beside)).toBe(5);
    expect(noticingOf(field, close)).toBe(2);
    expect(noticingOf(field, beside)).toBe(0);
  });

  it('adds up what the monsters are worth', () => {
    expect(experienceOfAll(field, fieldArea.monsters)).toBe(21);
    expect(experienceOfAll(field, [])).toBe(0);
  });

  it('adds up what the milestones of an area give, none for an area without', () => {
    const bare: AreaDefinition = { ...fieldArea, milestones: [] };

    expect(milestonesOf(fieldArea)).toBe(7);
    expect(milestonesOf(bare)).toBe(0);
    expect(milestonesOf({ ...fieldArea, milestones: undefined })).toBe(0);
  });

  it('meets the monsters that have a tile of the route in the square their noticing distance makes round them: the edge of it too, a diagonal too', () => {
    // The route ends on (5, 5): the biter at (7, 3) is 2 tiles off on the diagonal, the one at (8, 3) is 3 columns away.
    expect(metOn(field, fieldArea, bottomRow).map(({ id }) => id)).toEqual(['close']);
    expect(metOn(field, fieldArea, bottomRow)).not.toContain(far);
  });

  it('does not meet a monster that notices no one, though the route runs beside it', () => {
    expect(metOn(field, fieldArea, bottomRow)).not.toContain(beside);
  });

  it('meets nothing on a route that is not there', () => {
    expect(metOn(field, fieldArea, null)).toEqual([]);
  });
});

