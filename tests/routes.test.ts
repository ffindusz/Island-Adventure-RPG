import { describe, expect, it } from 'vitest';
import type { AreaDefinition, MonsterTypeDefinition, Tile } from '../src/core';
import { CHARGER, SHOOTER } from './enemy-fixtures';
import {
  BITER,
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
import { CHARGE, GUARDIAN, SMITE, SWEEP } from './guardian-fixtures';
import {
  awarenessOf,
  damageOf,
  distanceBetween,
  experienceOf,
  experienceOfAll,
  isInOpenBlock,
  isWithinAwareness,
  metOn,
  milestonesOf,
  noticingOf,
  openTilesOf,
  reachableFrom,
  tilesOf,
} from './routes';

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
  const [close, , beside] = fieldArea.monsters;
  if (close === undefined || beside === undefined) {
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

  it('meets the monsters that have a tile of the route in the square their noticing distance makes round them: the edge of it too, a diagonal too, and none that notices no one', () => {
    // The route ends on (5, 5): the biter at (7, 3) is 2 tiles off on the diagonal, the one at (8, 3) is 3 columns away,
    // and the dummy at (3, 4) is a tile off the route but notices no one.
    expect(metOn(field, fieldArea, bottomRow).map(({ id }) => id)).toEqual(['close']);
  });

  it('meets nothing on a route that is not there', () => {
    expect(metOn(field, fieldArea, null)).toEqual([]);
  });
});

const stationary: MonsterTypeDefinition = { behavior: 'stationary', health: 3, size: 0.5, experience: 5 };
const guardianOf = (noticingDistance: number, ...patterns: (typeof GUARDIAN)['patterns']): MonsterTypeDefinition => ({
  ...GUARDIAN,
  noticingDistance,
  patterns,
});

// The tests that keep the shipped layout clear of the monsters ask where a monster takes the hero in. The numbers are
// worked by hand from the fixtures: a biter (size 0.5) notices within 2 tiles and its attack reaches 0.75; the charger
// notices within 5 and dashes 6; the shooter notices within 6 and shoots 5; the Guardian's sweep reaches 1, its charge 6
// and its smite 4.

describe('where a monster takes the hero in, for the tests that keep the layout clear of it', () => {
  it.each([
    ['none for a stationary monster', stationary, 0],
    ['how far a chaser notices', BITER, 2],
    ['how far a chaser reaches, when that is farther than it notices', { ...BITER, noticingDistance: 1, reach: 1.5 }, 1.5],
    ['how far a charger notices, and not how far it dashes', CHARGER, 5],
    ['how far a ranged attacker notices, and not how far it shoots', SHOOTER, 6],
    ['how far a Guardian notices, when that is the farthest', guardianOf(7, SWEEP, CHARGE, SMITE), 7],
    ['how far the sweep of a Guardian reaches, when that is the farthest', guardianOf(0.5, SWEEP), 1],
    ['how far the charge of a Guardian dashes, when that is the farthest', guardianOf(0.5, SWEEP, CHARGE, SMITE), 6],
    ['how far the smite of a Guardian reaches, when that is the farthest', guardianOf(0.5, SWEEP, SMITE), 4],
  ])('makes the awareness of a monster %s', (_what, type, tiles) => {
    expect(awarenessOf(type)).toBe(tiles);
  });

  it('takes the hero in when the two bodies are closer than the awareness in the columns and in the rows both, and not when they only touch it', () => {
    // A biter of size 1 that notices within 2, and a hero of size 1: their bodies are 3 tiles apart where it stops.
    const biter: MonsterTypeDefinition = { ...BITER, size: 1 };
    const at: Tile = { col: 10, row: 10 };

    expect(isWithinAwareness(biter, at, 1, at)).toBe(true);
    expect(isWithinAwareness(biter, at, 1, { col: 12, row: 10 })).toBe(true);
    expect(isWithinAwareness(biter, at, 1, { col: 8, row: 10 })).toBe(true);
    expect(isWithinAwareness(biter, at, 1, { col: 10, row: 12 })).toBe(true);
    expect(isWithinAwareness(biter, at, 1, { col: 10, row: 8 })).toBe(true);
    expect(isWithinAwareness(biter, at, 1, { col: 12, row: 12 })).toBe(true);
    expect(isWithinAwareness(biter, at, 1, { col: 13, row: 10 })).toBe(false);
    expect(isWithinAwareness(biter, at, 1, { col: 7, row: 10 })).toBe(false);
    expect(isWithinAwareness(biter, at, 1, { col: 10, row: 13 })).toBe(false);
    expect(isWithinAwareness(biter, at, 1, { col: 10, row: 7 })).toBe(false);
    expect(isWithinAwareness(biter, at, 1, { col: 13, row: 12 })).toBe(false);
    expect(isWithinAwareness(biter, at, 1, { col: 12, row: 13 })).toBe(false);
  });

  it('counts the size of the hero: a hero of size 2 is taken in from half a tile farther than one of size 1', () => {
    const biter: MonsterTypeDefinition = { ...BITER, size: 1 };
    const at: Tile = { col: 10, row: 10 };

    expect(isWithinAwareness(biter, at, 2, { col: 13, row: 10 })).toBe(true);
    expect(isWithinAwareness(biter, at, 2, { col: 14, row: 10 })).toBe(false);
    expect(isWithinAwareness(biter, at, 1, { col: 13, row: 10 })).toBe(false);
  });
});

// What one hit does is worked by hand from the same fixtures: the biter's blow is 5, the charger's 6, the shooter's shot
// 4, and the patterns of the Guardian hit for 4 (sweep), 6 (charge) and 5 (smite).

describe('what one hit of a monster does, for the tests that rank the monsters of an area', () => {
  it.each([
    ['none for a stationary monster', stationary, 0],
    ['the blow of a chaser', BITER, 5],
    ['the blow of a charger', CHARGER, 6],
    ['the damage of the shot of a ranged attacker', SHOOTER, 4],
    ['the hardest pattern of a Guardian, wherever it stands in the list of patterns', GUARDIAN, 6],
    ['the one pattern of a Guardian that has but one', guardianOf(6, SMITE), 5],
  ])('makes the damage of one hit: %s', (_what, type, damage) => {
    expect(damageOf(type)).toBe(damage);
  });
});

// The grids below are drawn by hand, one string a row, `.` for open ground and `#` for rock, and what the helpers say of
// them is worked out by counting.

/** Which tiles of a grid drawn row by row are open: the `.`, and nothing outside the grid. */
function openIn(rows: readonly string[]): (tile: Tile) => boolean {
  return ({ col, row }) => rows[row]?.[col] === '.';
}

describe('the tiles of a rectangle, for the tests that walk or check a zone', () => {
  it('lists them row by row from the top left', () => {
    expect(tilesOf({ col: 2, row: 3, width: 3, height: 2 })).toEqual([
      { col: 2, row: 3 },
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 2, row: 4 },
      { col: 3, row: 4 },
      { col: 4, row: 4 },
    ]);
  });

  it('lists the one tile of a rectangle of one, and none for a rectangle without width or without height', () => {
    expect(tilesOf({ col: 5, row: 6, width: 1, height: 1 })).toEqual([{ col: 5, row: 6 }]);
    expect(tilesOf({ col: 5, row: 6, width: 0, height: 4 })).toEqual([]);
    expect(tilesOf({ col: 5, row: 6, width: 4, height: 0 })).toEqual([]);
  });
});

describe('the tiles that the hero can walk to over open ground, for the tests that look for a way', () => {
  it('reaches every open tile of a map that has a way round its wall, the tile it begins on included', () => {
    // Thirteen tiles are open: four a row beside the wall in the top two rows, and all five of the bottom row.
    const isOpen = openIn(['..#..', '..#..', '.....']);

    expect([...reachableFrom(isOpen, { col: 0, row: 0 })].sort()).toEqual([
      '0,0',
      '0,1',
      '0,2',
      '1,0',
      '1,1',
      '1,2',
      '2,2',
      '3,0',
      '3,1',
      '3,2',
      '4,0',
      '4,1',
      '4,2',
    ]);
  });

  it('reaches only its own side of a wall that closes the map, from either side', () => {
    const isOpen = openIn(['..#..', '..#..', '..#..']);

    expect([...reachableFrom(isOpen, { col: 0, row: 0 })].sort()).toEqual(['0,0', '0,1', '0,2', '1,0', '1,1', '1,2']);
    expect([...reachableFrom(isOpen, { col: 4, row: 2 })].sort()).toEqual(['3,0', '3,1', '3,2', '4,0', '4,1', '4,2']);
  });

  it('counts the tile it begins on even where that is not open ground, and goes on from it', () => {
    expect([...reachableFrom(openIn(['#.']), { col: 0, row: 0 })].sort()).toEqual(['0,0', '1,0']);
  });
});

describe('the blocks of open ground two tiles wide and two high, for the tests that look for a place to step aside', () => {
  // Nine tiles are open: (0,0) (1,0) (3,0) (0,1) (1,1) (3,1) (0,2) (2,2) (3,2). Only the four at the top left make a
  // block; the rest are a bend of a passage one tile wide and a tile under the block that has a rock beside it.
  const isOpen = openIn(['..#.', '..#.', '.#..']);

  it.each([
    ['top left', 0, 0],
    ['top right', 1, 0],
    ['bottom left', 0, 1],
    ['bottom right', 1, 1],
  ])('counts the %s tile of a block of four open tiles as in it', (_corner, col, row) => {
    expect(isInOpenBlock(isOpen, { col, row })).toBe(true);
  });

  it.each([
    ['the open tile under the block, which has rock beside it', 0, 2],
    ['the top of a passage one tile wide', 3, 0],
    ['the middle of a passage one tile wide', 3, 1],
    ['the corner where that passage bends', 3, 2],
    ['the end of that passage after the bend', 2, 2],
    ['rock beside the block', 2, 0],
    ['rock between the block and the passage', 2, 1],
    ['rock under the block', 1, 2],
    ['a tile left of the map', -1, 0],
    ['a tile right of the map', 4, 1],
  ])('does not count %s as in a block', (_what, col, row) => {
    expect(isInOpenBlock(isOpen, { col, row })).toBe(false);
  });
});

