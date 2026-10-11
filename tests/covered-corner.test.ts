import { describe, expect, it } from 'vitest';
import { VIEW_TILES_HIGH, VIEW_TILES_WIDE } from '../src/adapter/config';
import { COVERED_CORNER, createGame } from '../src/core';
import type { AreaDefinition, ContentDefinition, Tile } from '../src/core';
import { arena, fixedRandom } from './fixtures';

// The in-play HUD sits over the top left of the screen. The camera stops at a map's corner, and a map that fits the
// screen shows all of it, so the HUD covers the map's own top-left tiles whatever its size, and a hero standing on one
// would be hidden behind it. Content that asks for the check (`checkCoveredCorner`, which the game's own content does)
// must keep those tiles solid in every area, and loading it says so when it does not. The small maps of other tests
// do not ask: it is a rule about the game that ships, and the tests of the shipped content check that it asks. The
// sizes below are measured against the screen of the adapter, because the corner is the same on a map of any size.

const HERO_TILE: Tile = { col: 10, row: 6 };
const BIGGER = { wide: VIEW_TILES_WIDE + 4, high: VIEW_TILES_HIGH + 3 };
const SIZES: Array<[string, { wide: number; high: number }]> = [
  ['smaller than the screen', { wide: 12, high: 8 }],
  ['exactly the size of the screen', { wide: VIEW_TILES_WIDE, high: VIEW_TILES_HIGH }],
  ['larger than the screen', BIGGER],
];

/** A walled area of the given size whose covered corner is solid, except for the given tiles, which are open ground. */
function layoutOf(wide: number, high: number, opened: readonly Tile[] = []): string[] {
  return Array.from({ length: high }, (_, row) =>
    Array.from({ length: wide }, (_, col) => {
      const solid =
        row === 0 || col === 0 || row === high - 1 || col === wide - 1 || (col < COVERED_CORNER.cols && row < COVERED_CORNER.rows);
      const open = opened.some((tile) => tile.col === col && tile.row === row);
      return solid && !open ? '#' : '.';
    }).join(''),
  );
}

/** One area of the given layout, with the check asked for unless a test says otherwise. */
function contentOf(
  layout: readonly string[],
  asking: Pick<ContentDefinition, 'checkCoveredCorner'> = { checkCoveredCorner: true },
  otherAreas: readonly AreaDefinition[] = [],
): ContentDefinition {
  const content = arena({
    layout,
    entrances: [{ id: 'start', tile: HERO_TILE }],
    start: { area: 'arena', tile: HERO_TILE },
    otherAreas,
  });
  return { ...content, ...asking };
}

const NOT_ASKED: Array<[string, Pick<ContentDefinition, 'checkCoveredCorner'>]> = [
  ['says nothing about it', {}],
  ['says it does not ask for it', { checkCoveredCorner: false }],
];

const loading = (content: ContentDefinition) => () => createGame({ content, random: fixedRandom });

describe('the corner of an area that the HUD covers', () => {
  describe.each(SIZES)('in an area %s', (_, size) => {
    it('may be solid, with open ground right beyond it', () => {
      expect(loading(contentOf(layoutOf(size.wide, size.high)))).not.toThrow();
    });

    it.each([
      [0, 0],
      [COVERED_CORNER.cols - 1, 0],
      [0, COVERED_CORNER.rows - 1],
      [COVERED_CORNER.cols - 1, COVERED_CORNER.rows - 1],
    ])('may not be walkable at (col %i, row %i)', (col, row) => {
      const load = loading(contentOf(layoutOf(size.wide, size.high, [{ col, row }])));

      expect(load).toThrow('Area "arena"');
      expect(load).toThrow(`(col ${col}, row ${row})`);
    });
  });

  it.each(NOT_ASKED)('is not checked when the content %s', (_, asking) => {
    const layout = layoutOf(BIGGER.wide, BIGGER.high, [{ col: 2, row: 1 }]);

    expect(loading(contentOf(layout, asking))).not.toThrow();
  });

  it('is asked of every Adventure Area, not only the first', () => {
    const cliff: AreaDefinition = {
      id: 'cliff',
      name: 'Cliff',
      layout: layoutOf(BIGGER.wide, BIGGER.high, [{ col: 3, row: 2 }]),
      monsters: [],
      entrances: [{ id: 'start', tile: HERO_TILE }],
    };
    const content = contentOf(layoutOf(BIGGER.wide, BIGGER.high), { checkCoveredCorner: true }, [cliff]);

    expect(loading(content)).toThrow('Area "cliff"');
  });
});
