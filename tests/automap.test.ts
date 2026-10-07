import { describe, expect, it } from 'vitest';
import type {
  AreaDefinition,
  AutomapAreaView,
  AutomapPageView,
  ContentDefinition,
  Direction,
  ExitDefinition,
  Game,
} from '../src/core';
import { ARENA_LAYOUT, FIELD_LAYOUT, arena, gameAtTitle, newGame, playingView, walk } from './fixtures';
import type { ArenaOptions } from './fixtures';

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

function exitIds(game: Game, areaId: string): string[] {
  return areaOnMap(game, areaId).exits.map((exit) => exit.id);
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

// A route of three rooms in a row, each of the arena's size and layout. A door on tile (5, 3) leads on to the next room
// and a door on tile (1, 3) leads back. The hero arrives from the west at tile (2, 3) and from the east at tile (4, 3),
// and starts in the arena at (3.5, 3.5). The content lists the rooms in the order of the route, which is not the order
// of their names.
//
//   arena   exit "to-cellar" (5, 3)                         entrance "from-cellar" (4, 3)
//   cellar  exits "to-arena" (1, 3) and "to-attic" (5, 3)   entrances "from-arena" (2, 3) and "from-attic" (4, 3)
//   attic   exit "to-cellar" (1, 3)                         entrance "from-cellar" (2, 3)

function door(id: string, col: number, area: string, entrance: string, row = 3): ExitDefinition {
  return { id, zone: { col, row, width: 1, height: 1 }, to: { area, entrance } };
}

const CELLAR_ROOM: AreaDefinition = {
  id: 'cellar',
  name: 'Cellar',
  layout: ARENA_LAYOUT,
  monsters: [],
  entrances: [
    { id: 'from-arena', tile: { col: 2, row: 3 } },
    { id: 'from-attic', tile: { col: 4, row: 3 } },
  ],
  exits: [door('to-arena', 1, 'arena', 'from-cellar'), door('to-attic', 5, 'attic', 'from-cellar')],
};

const ATTIC_ROOM: AreaDefinition = {
  id: 'attic',
  name: 'Attic',
  layout: ARENA_LAYOUT,
  monsters: [],
  entrances: [{ id: 'from-cellar', tile: { col: 2, row: 3 } }],
  exits: [door('to-cellar', 1, 'cellar', 'from-attic')],
};

/** The arena, the cellar and the attic, with the hero in the arena. `options` replaces parts of the arena. */
function route(options: ArenaOptions = {}): ContentDefinition {
  return arena({
    entrances: [{ id: 'from-cellar', tile: { col: 4, row: 3 } }],
    exits: [door('to-cellar', 5, 'cellar', 'from-arena')],
    otherAreas: [CELLAR_ROOM, ATTIC_ROOM],
    ...options,
  });
}

/** Walks the hero in a direction until it has gone through an exit, and stops it there. */
function crossExit(game: Game, direction: Direction): void {
  const from = playingView(game).area.id;
  game.send({ type: 'move', direction });
  for (let steps = 0; steps < 100 && playingView(game).area.id === from; steps++) {
    game.step();
  }
  game.send({ type: 'stop', direction });
  if (playingView(game).area.id === from) {
    throw new Error(`The hero did not leave area "${from}"`);
  }
}

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

describe('The route on the Automap', () => {
  const idsOnMap = (game: Game): string[] => automap(game).areas.map((area) => area.id);

  it('lists every Adventure Area of the content in the order the content lists them', () => {
    const game = newGame(route());

    expect(idsOnMap(game)).toEqual(['arena', 'cellar', 'attic']);
  });

  it('keeps that order whatever the ids look like', () => {
    // An object lists the keys that look like whole numbers first, in ascending order, whatever order they were added in.
    const game = newGame(arena({ otherAreas: [{ ...CELLAR, id: '2' }, { ...CELLAR, id: '1' }] }));

    expect(idsOnMap(game)).toEqual(['arena', '2', '1']);
  });

  it('shows the connections of each area: the areas its exits lead to, in the order of its exits', () => {
    const game = newGame(route());

    expect(automap(game).areas.map((area) => [area.id, area.connections])).toEqual([
      ['arena', ['cellar']],
      ['cellar', ['arena', 'attic']],
      ['attic', ['cellar']],
    ]);
  });

  it('shows a connection once, however many exits lead to the same area', () => {
    const exits = [door('to-cellar', 5, 'cellar', 'from-arena'), door('to-cellar-too', 5, 'cellar', 'from-arena', 2)];
    const game = newGame(route({ exits }));

    expect(areaOnMap(game, 'arena').connections).toEqual(['cellar']);
  });

  it('shows an Adventure Area with no exit as connected to nothing', () => {
    const game = newGame(arena());

    expect(areaOnMap(game, 'arena').connections).toEqual([]);
  });

  it('shows an area the hero has not been to on the route, with its connections but not what it is', () => {
    const game = newGame(route());

    expect(areaOnMap(game, 'attic')).toMatchObject({ name: null, discovered: false, connections: ['cellar'] });
  });

  it('highlights the area the hero is in, wherever it goes', () => {
    const game = newGame(route());
    const currentAreas = (): string[] =>
      automap(game)
        .areas.filter((area) => area.current)
        .map((area) => area.id);

    expect(currentAreas()).toEqual(['arena']);

    crossExit(game, 'right');
    expect(currentAreas()).toEqual(['cellar']);

    crossExit(game, 'right');
    expect(currentAreas()).toEqual(['attic']);

    crossExit(game, 'left');
    expect(currentAreas()).toEqual(['cellar']);
  });

  it('puts the hero in the area it has gone into, at the entrance, and in no other', () => {
    const game = newGame(route());

    crossExit(game, 'right');

    expect(areaOnMap(game, 'cellar').hero).toEqual({ x: 2.5, y: 3.5 });
    expect(areaOnMap(game, 'arena').hero).toBeNull();
    expect(areaOnMap(game, 'attic').hero).toBeNull();
  });
});

describe('Exits on the Automap', () => {
  it('marks an exit once the hero has revealed a tile of it, and not before', () => {
    const game = newGame(route({ automapRevealDistance: 1.5 }));
    expect(exitIds(game, 'arena')).toEqual([]);

    // The exit is on tile (5, 3). The 4th step takes the hero to tile (4, 3), which has tile (5, 3) next to it.
    walk(game, 'right', 3);
    expect(exitIds(game, 'arena')).toEqual([]);

    walk(game, 'right', 1);
    expect(areaOnMap(game, 'arena').exits).toEqual([{ id: 'to-cellar', zone: { minX: 5, minY: 3, maxX: 6, maxY: 4 } }]);
    expect(exitIds(game, 'cellar')).toEqual([]);
  });

  it('marks an exit when any tile of its zone has been revealed, not only when all of them have', () => {
    const tall = { ...door('to-cellar', 5, 'cellar', 'from-arena'), zone: { col: 5, row: 3, width: 1, height: 2 } };
    const game = newGame(route({ automapRevealDistance: 1, exits: [tall] }));

    // The plus of tiles around tile (3, 3) where the hero started, and the plus around tile (4, 3) where it is now: the
    // second reveals tile (5, 3) of the exit, but not tile (5, 4) below it.
    walk(game, 'right', 4);

    expect(picture(areaOnMap(game, 'arena'))).toEqual([
      '       ',
      '       ',
      '   ..  ',
      '  .... ',
      '   .,  ',
      '       ',
    ]);
    expect(exitIds(game, 'arena')).toEqual(['to-cellar']);
  });

  it('keeps an exit marked when the hero walks away from it', () => {
    const game = newGame(route({ automapRevealDistance: 1.5 }));

    // Back to x 3.0: on tile (3, 3) the exit on tile (5, 3) is out of reach.
    walk(game, 'right', 4);
    walk(game, 'left', 8);

    expect(exitIds(game, 'arena')).toEqual(['to-cellar']);
  });
});

describe('The Automap on arrival in another Adventure Area', () => {
  // A distance of 1.5 reveals the 3 x 3 square around the tile the hero is on. The hero arrives on tile (2, 3).
  const AROUND_THE_ENTRANCE = [
    '       ',
    '       ',
    ' .~.   ',
    ' ...   ',
    ' ...   ',
    '       ',
  ];

  it('reveals the terrain around the entrance at once, and shows the name of the area', () => {
    const game = newGame(route({ automapRevealDistance: 1.5 }));

    crossExit(game, 'right');

    const cellar = areaOnMap(game, 'cellar');
    expect(cellar.name).toBe('Cellar');
    expect(picture(cellar)).toEqual(AROUND_THE_ENTRANCE);
  });

  it('finds the exits within reach of the entrance and no other', () => {
    const game = newGame(route({ automapRevealDistance: 1.5 }));

    crossExit(game, 'right');

    // The way back is on tile (1, 3), next to the entrance. The way on is on tile (5, 3), three tiles away.
    expect(exitIds(game, 'cellar')).toEqual(['to-arena']);
  });

  it('keeps what was revealed of the area the hero has left, and the exit it left through', () => {
    const game = newGame(route({ automapRevealDistance: 1.5 }));

    crossExit(game, 'right');

    // The squares around tile (3, 3), where the hero started, and tile (4, 3), where it was as it went out.
    expect(picture(areaOnMap(game, 'arena'))).toEqual([
      '       ',
      '       ',
      '  ~... ',
      '  .... ',
      '  ..,. ',
      '       ',
    ]);
    expect(exitIds(game, 'arena')).toEqual(['to-cellar']);
  });

  it('reveals each area the hero comes to along the route, and keeps the rest', () => {
    const game = newGame(route({ automapRevealDistance: 1.5 }));

    crossExit(game, 'right');
    crossExit(game, 'right');

    expect(picture(areaOnMap(game, 'attic'))).toEqual(AROUND_THE_ENTRANCE);
    expect(exitIds(game, 'attic')).toEqual(['to-cellar']);
    // The hero walked the cellar from tile (2, 3) to tile (4, 3).
    expect(picture(areaOnMap(game, 'cellar'))).toEqual([
      '       ',
      '       ',
      ' .~... ',
      ' ..... ',
      ' ...,. ',
      '       ',
    ]);
    expect(exitIds(game, 'cellar')).toEqual(['to-arena', 'to-attic']);
    expect(automap(game).areas.map((area) => area.discovered)).toEqual([true, true, true]);
  });
});
