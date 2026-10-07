import { describe, expect, it } from 'vitest';
import type { AreaDefinition, AutomapAreaView, AutomapPageView, Game } from '../src/core';
import { ARENA_LAYOUT, FIELD_LAYOUT, arena, gameAtTitle, newGame, playingView, walk } from './fixtures';

// The Automap, tested at the Game core's interface: commands and steps in, the page view and the snapshot out.
//
// The arena of fixtures.ts is 7 x 6 tiles and the hero starts on tile (3, 3). Most tests set the reveal distance to one
// that gives a block of tiles that can be worked out by hand. A tile is revealed when the straight line from the
// middle of the hero's tile to the middle of that tile is no longer than the distance:
//
//   1     the hero's tile and the 4 tiles that share an edge with it: 5 tiles
//   1.5   the 3 x 3 square around the hero's tile: a diagonal neighbour is 1.41 tiles away, a tile two away is 2
//   2     the 3 x 3 square and the 4 tiles two away in a straight line from the hero's tile: 13 tiles
//
// A test reads the Automap as the picture the page shows of an area: the symbol of the terrain on each revealed tile
// and a space on each tile that is hidden, so what is expected can be read off the layout.

const OPEN_AUTOMAP = { type: 'open-page', page: 'automap' } as const;
const CLOSE_AUTOMAP = { type: 'close-page', page: 'automap' } as const;

/** What the terrain kinds of the arena look like in a picture: the symbols of its layout. */
const SYMBOLS: Readonly<Record<string, string>> = { wall: '#', ground: '.', water: '~', sand: ',' };

/** The Automap page as the player sees it. The page pauses the game, so it is closed again for the test to go on. */
function automap(game: Game): AutomapPageView {
  game.send(OPEN_AUTOMAP);
  const { page } = playingView(game);
  game.send(CLOSE_AUTOMAP);
  if (page?.id !== 'automap') {
    throw new Error('The Automap page did not open');
  }
  return page;
}

function areaOnMap(game: Game, id: string): AutomapAreaView {
  const area = automap(game).areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The Automap shows no area "${id}"`);
  }
  return area;
}

/** The terrain the page shows of an area, one string for each row: a symbol on a revealed tile, a space on a hidden one. */
function picture(area: AutomapAreaView): string[] {
  return area.terrain.map((row) =>
    row
      .map((kind) => {
        if (kind === null) {
          return ' ';
        }
        const symbol = SYMBOLS[kind];
        if (symbol === undefined) {
          throw new Error(`The picture has no symbol for terrain "${kind}"`);
        }
        return symbol;
      })
      .join(''),
  );
}

const CELLAR: AreaDefinition = { id: 'cellar', name: 'Cellar', layout: ARENA_LAYOUT, monsters: [] };

describe('The Automap at the start of the adventure', () => {
  it('shows the terrain around the hero and nothing else of its area', () => {
    const game = newGame(arena({ automapRevealDistance: 1.5 }));

    expect(picture(areaOnMap(game, 'arena'))).toEqual([
      '       ',
      '       ',
      '  ~..  ',
      '  ...  ',
      '  ..,  ',
      '       ',
    ]);
  });

  it('hides an Adventure Area the hero has not been in: no terrain and not even its name', () => {
    const game = newGame(arena({ automapRevealDistance: 1.5, otherAreas: [CELLAR] }));

    const cellar = areaOnMap(game, 'cellar');

    expect(cellar).toMatchObject({ name: null, discovered: false, current: false, width: 7, height: 6 });
    expect(picture(cellar)).toEqual(Array<string>(6).fill('       '));
  });
});

describe('The Automap while the hero walks', () => {
  const START = ['       ', '       ', '  ~..  ', '  ...  ', '  ..,  ', '       '];

  it('reveals more terrain only once the hero is on another tile', () => {
    const game = newGame(arena({ automapRevealDistance: 1.5 }));

    // The hero starts in the middle of tile (3, 3) and moves an eighth of a tile each step: after 3 steps it is at
    // x 3.875, still on tile 3, and the 4th step brings it to x 4.0, which is the first point of tile 4.
    walk(game, 'right', 3);
    expect(picture(areaOnMap(game, 'arena'))).toEqual(START);

    walk(game, 'right', 1);
    expect(picture(areaOnMap(game, 'arena'))).toEqual([
      '       ',
      '       ',
      '  ~... ',
      '  .... ',
      '  ..,. ',
      '       ',
    ]);
  });

  it('keeps the terrain it has revealed when the hero walks away from it', () => {
    const game = newGame(arena({ automapRevealDistance: 1.5 }));

    // To x 4.0 and back to x 2.0: on tile 2 the hero sees tiles 1 to 3, and the tile 5 it saw from tile 4 stays.
    walk(game, 'right', 4);
    walk(game, 'left', 16);

    expect(picture(areaOnMap(game, 'arena'))).toEqual([
      '       ',
      '       ',
      ' .~... ',
      ' ..... ',
      ' ...,. ',
      '       ',
    ]);
  });

  it('reveals a wall like any other terrain: nothing blocks the hero from seeing it', () => {
    const game = newGame(arena({ automapRevealDistance: 1.5 }));

    // Down to y 4.0, which is the first point of row 4, so that the bottom wall in row 5 is within reach.
    walk(game, 'down', 4);

    expect(picture(areaOnMap(game, 'arena'))).toEqual([
      '       ',
      '       ',
      '  ~..  ',
      '  ...  ',
      '  ..,  ',
      '  ###  ',
    ]);
  });
});

describe('The hero on the Automap', () => {
  it('is shown where it is, in the Adventure Area it is in, and follows it as it walks', () => {
    const game = newGame(arena());

    expect(areaOnMap(game, 'arena').hero).toEqual({ x: 3.5, y: 3.5 });

    walk(game, 'right', 4);
    walk(game, 'down', 2);

    expect(areaOnMap(game, 'arena').hero).toEqual({ x: 4, y: 3.75 });
  });

  it('is shown in no other Adventure Area', () => {
    const game = newGame(arena({ otherAreas: [CELLAR] }));

    expect(areaOnMap(game, 'cellar').hero).toBeNull();
  });
});

describe('The reveal distance', () => {
  it.each([
    {
      distance: 0,
      reveals: "only the hero's own tile",
      expected: ['       ', '       ', '       ', '   .   ', '       ', '       '],
    },
    {
      distance: 1,
      reveals: "the hero's tile and the 4 tiles that share an edge with it",
      expected: ['       ', '       ', '   .   ', '  ...  ', '   .   ', '       '],
    },
    {
      distance: 2,
      reveals: 'the 3 x 3 square and the 4 tiles two away in a straight line',
      expected: ['       ', '   .   ', '  ~..  ', ' ..... ', '  ..,  ', '   #   '],
    },
    {
      distance: 100,
      reveals: 'the whole Adventure Area when it is beyond the farthest tile',
      expected: ARENA_LAYOUT,
    },
  ])('of $distance tiles reveals $reveals', ({ distance, expected }) => {
    const game = newGame(arena({ automapRevealDistance: distance }));

    expect(picture(areaOnMap(game, 'arena'))).toEqual(expected);
  });

  it('is 4 tiles when the content does not say', () => {
    const content = arena({ layout: FIELD_LAYOUT, start: { area: 'arena', tile: { col: 6, row: 3 } } });

    const game = newGame(content);

    // Row by row from the top, the hero's tile is (6, 3): the rows 3 away show 5 tiles, the rows 2 and 1 away 7, and the
    // hero's row 9. The 1 tile that is 4 away above and below the hero is in no row of this field.
    expect(picture(areaOnMap(game, 'arena'))).toEqual([
      '    #####     ',
      '   .......    ',
      '   .......    ',
      '  .........   ',
      '   .......    ',
      '   .......    ',
      '    #####     ',
    ]);
  });

  it.each([
    { what: 'below 0', distance: -1, shown: '-1' },
    { what: 'not a number', distance: Number.NaN, shown: 'NaN' },
  ])('is refused when it is $what', ({ distance, shown }) => {
    expect(() => gameAtTitle(arena({ automapRevealDistance: distance }))).toThrow(
      `The Automap reveal distance must be 0 or more, but it is ${shown}`,
    );
  });
});
