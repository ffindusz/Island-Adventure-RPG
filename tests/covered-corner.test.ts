import { describe, expect, it } from 'vitest';
import { COVERED_CORNER, SCREEN_TILES, createGame } from '../src/core';
import type { ContentDefinition, Tile } from '../src/core';
import { arena, fixedRandom } from './fixtures';

// The in-play HUD sits over the top left of the screen. In an Adventure Area larger than the screen the camera stops
// at the map's corner, so the HUD covers the corner's tiles and a hero standing on one would be hidden behind it.
// Content must keep those tiles solid, and loading it says so when it does not. An area exactly the size of the
// screen never scrolls, so the HUD covers nothing that matters there.

const HERO_TILE: Tile = { col: 10, row: 6 };
const BIGGER = { wide: SCREEN_TILES.wide + 4, high: SCREEN_TILES.high + 3 };

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

function contentOf(layout: readonly string[]): ContentDefinition {
  return arena({ layout, entrances: [{ id: 'start', tile: HERO_TILE }], start: { area: 'arena', tile: HERO_TILE } });
}

const loading = (content: ContentDefinition) => () => createGame({ content, random: fixedRandom });

describe('the corner of an area that the HUD covers', () => {
  it('may be solid in an area larger than the screen, with open ground right beyond it', () => {
    expect(loading(contentOf(layoutOf(BIGGER.wide, BIGGER.high)))).not.toThrow();
  });

  it.each([
    [0, 0],
    [COVERED_CORNER.cols - 1, 0],
    [0, COVERED_CORNER.rows - 1],
    [COVERED_CORNER.cols - 1, COVERED_CORNER.rows - 1],
  ])('may not be walkable at (col %i, row %i) in an area larger than the screen', (col, row) => {
    const load = loading(contentOf(layoutOf(BIGGER.wide, BIGGER.high, [{ col, row }])));

    expect(load).toThrow('Area "arena"');
    expect(load).toThrow(`(col ${col}, row ${row})`);
  });

  it('may not be walkable in an area that is only taller than the screen, which scrolls up and down', () => {
    const layout = layoutOf(SCREEN_TILES.wide, SCREEN_TILES.high + 3, [{ col: 2, row: 1 }]);

    expect(loading(contentOf(layout))).toThrow('Area "arena"');
  });

  it('may not be walkable in an area that is only wider than the screen, which scrolls sideways', () => {
    const layout = layoutOf(SCREEN_TILES.wide + 3, SCREEN_TILES.high, [{ col: 2, row: 1 }]);

    expect(loading(contentOf(layout))).toThrow('Area "arena"');
  });

  it('is not asked of an area exactly the size of the screen, which never scrolls', () => {
    const layout = layoutOf(SCREEN_TILES.wide, SCREEN_TILES.high, [{ col: 2, row: 1 }]);

    expect(loading(contentOf(layout))).not.toThrow();
  });

  it('is asked of every Adventure Area, not only the first', () => {
    const cliff = {
      id: 'cliff',
      name: 'Cliff',
      layout: layoutOf(BIGGER.wide, BIGGER.high, [{ col: 3, row: 2 }]),
      monsters: [],
      entrances: [{ id: 'start', tile: HERO_TILE }],
    };

    expect(loading(arena({ otherAreas: [cliff] }))).toThrow('Area "cliff"');
  });
});
