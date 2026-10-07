import { describe, expect, it } from 'vitest';
import type { AreaDefinition, AutomapAreaView, AutomapPageView, Game } from '../src/core';
import { ARENA_LAYOUT, arena, newGame, playingView } from './fixtures';

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
