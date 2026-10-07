import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { AreaDefinition, ContentDefinition, EntranceDefinition, ExitDefinition, Game } from '../src/core';
import {
  ARENA_LAYOUT,
  advance,
  arena,
  biterAt,
  chestAt,
  dummyAt,
  face,
  fixedRandom,
  frailMonster,
  monsterNamed,
  newGame,
  playingView,
  strike,
  walk,
} from './fixtures';

// The test world: the arena and a cellar, both 7 x 6 tiles (see fixtures.ts), each with an exit into the other.
//
//   arena   entrance "from-cellar" at tile (4, 3), where the hero arrives coming up from the cellar
//           exit "to-cellar" on tile (5, 3), the tile next to it on the right
//   cellar  entrance "from-arena" at tile (2, 3), where the hero arrives coming down from the arena
//           exit "to-arena" on tile (1, 3), the tile next to it on the left
//
// The hero starts at (3.5, 3.5) in the arena. Its body is 0.5 wide and a step is 0.125, so its right edge reaches the
// exit at x = 5 after 10 steps (the edge touching the zone is not in it) and is in it on the 11th.

const FROM_CELLAR: EntranceDefinition = { id: 'from-cellar', tile: { col: 4, row: 3 } };
const FROM_ARENA: EntranceDefinition = { id: 'from-arena', tile: { col: 2, row: 3 } };
const TO_CELLAR: ExitDefinition = {
  id: 'to-cellar',
  zone: { col: 5, row: 3, width: 1, height: 1 },
  to: { area: 'cellar', entrance: 'from-arena' },
};
const TO_ARENA: ExitDefinition = {
  id: 'to-arena',
  zone: { col: 1, row: 3, width: 1, height: 1 },
  to: { area: 'arena', entrance: 'from-cellar' },
};

const CELLAR: AreaDefinition = {
  id: 'cellar',
  name: 'Cellar',
  layout: ARENA_LAYOUT,
  monsters: [],
  entrances: [FROM_ARENA],
  exits: [TO_ARENA],
};

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

/** The arena and the cellar, with the hero in the arena at (3.5, 3.5). `cellar` replaces parts of the cellar. */
function world(arenaOptions: ArenaOptions = {}, cellar: Partial<AreaDefinition> = {}): ContentDefinition {
  return arena({
    entrances: [FROM_CELLAR],
    exits: [TO_CELLAR],
    ...arenaOptions,
    otherAreas: [{ ...CELLAR, ...cellar }],
  });
}

type ArenaOptions = NonNullable<Parameters<typeof arena>[0]>;

/** Into the cellar and out again, which leaves the hero in the arena at its entrance, (4.5, 3.5). */
function goThereAndBack(game: Game): void {
  walk(game, 'right', 11);
  walk(game, 'left', 3);
}

const WEAKLING = { weakling: frailMonster(0) };

describe('Moving between Adventure Areas', () => {
  it('takes the hero into the other area, to the entrance the exit leads to, when its body overlaps the exit', () => {
    const game = newGame(world());

    // After 10 steps the hero's right edge is at x = 5, touching the exit without overlapping it.
    expect(walk(game, 'right', 10)).not.toContainEqual({ type: 'area-changed', areaId: 'cellar' });
    expect(playingView(game).area.id).toBe('arena');

    expect(walk(game, 'right', 1)).toContainEqual({ type: 'area-changed', areaId: 'cellar' });
    const view = playingView(game);
    expect(view.area.id).toBe('cellar');
    expect(view.area.name).toBe('Cellar');
    expect(view.hero.position).toEqual({ x: 2.5, y: 3.5 });
  });

  it('takes the hero back the way it came, to the entrance of the area it left', () => {
    const game = newGame(world());
    walk(game, 'right', 11);

    // From (2.5, 3.5) the hero's left edge is at x = 2.25. It reaches x = 2 after 2 steps and overlaps the exit on the 3rd.
    expect(walk(game, 'left', 2)).not.toContainEqual({ type: 'area-changed', areaId: 'arena' });
    expect(walk(game, 'left', 1)).toContainEqual({ type: 'area-changed', areaId: 'arena' });
    const view = playingView(game);
    expect(view.area.id).toBe('arena');
    expect(view.hero.position).toEqual({ x: 4.5, y: 3.5 });
  });

  it('keeps the hero walking in the same direction after it arrives, if the key is still down', () => {
    const game = newGame(world());
    game.send({ type: 'move', direction: 'right' });

    advance(game, 12);

    expect(playingView(game).area.id).toBe('cellar');
    expect(playingView(game).hero.position).toEqual({ x: 2.625, y: 3.5 });
    expect(playingView(game).hero.facing).toBe('right');
  });

  it('takes the hero through the first listed exit when its body overlaps two at once', () => {
    const toSide: ExitDefinition = {
      id: 'to-side',
      zone: { col: 5, row: 4, width: 1, height: 1 },
      to: { area: 'cellar', entrance: 'side' },
    };
    const cellar: AreaDefinition = { ...CELLAR, entrances: [FROM_ARENA, { id: 'side', tile: { col: 2, row: 1 } }] };
    const game = newGame(arena({ entrances: [FROM_CELLAR], exits: [toSide, TO_CELLAR], otherAreas: [cellar] }));

    // At y = 4 the hero's body covers the bottom half of row 3 and the top half of row 4, so it meets both exits.
    walk(game, 'down', 4);
    walk(game, 'right', 11);

    expect(playingView(game).hero.position).toEqual({ x: 2.5, y: 1.5 });
  });

  it('shows the exits of the area the hero is in, as boxes in tile units, so they can be drawn', () => {
    const game = newGame(world());

    expect(playingView(game).exits).toEqual([{ id: 'to-cellar', zone: { minX: 5, minY: 3, maxX: 6, maxY: 4 } }]);

    walk(game, 'right', 11);

    expect(playingView(game).exits).toEqual([{ id: 'to-arena', zone: { minX: 1, minY: 3, maxX: 2, maxY: 4 } }]);
  });
});

describe('What the hero left behind in an Adventure Area', () => {
  it('keeps a defeated monster defeated in either area when the hero comes back', () => {
    const game = newGame(
      world(
        { monsters: [{ id: 'arena-weakling', type: 'weakling', tile: { col: 3, row: 4 } }], monsterTypes: WEAKLING },
        { monsters: [{ id: 'cellar-weakling', type: 'weakling', tile: { col: 2, row: 4 } }] },
      ),
    );
    // The hero starts facing down, at the weakling below it.
    expect(strike(game)).toContainEqual({ type: 'monster-defeated', monsterId: 'arena-weakling' });
    walk(game, 'right', 11);
    face(game, 'down');
    expect(strike(game)).toContainEqual({ type: 'monster-defeated', monsterId: 'cellar-weakling' });

    walk(game, 'left', 3);
    expect(playingView(game).monsters).toEqual([]);
    walk(game, 'right', 3);

    expect(playingView(game).area.id).toBe('cellar');
    expect(playingView(game).monsters).toEqual([]);
  });

  it('keeps a monster as hurt as the hero left it', () => {
    const game = newGame(world({ monsters: [dummyAt('dummy-1', 3, 4)] }));
    strike(game);
    expect(monsterNamed(game, 'dummy-1').health).toBe(2);

    goThereAndBack(game);

    expect(monsterNamed(game, 'dummy-1').health).toBe(2);
  });

  it('keeps a chest open in either area once the hero has opened it', () => {
    const game = newGame(
      world(
        { interactables: [chestAt('arena-chest', 3, 4, 'steel-sword')] },
        { interactables: [chestAt('cellar-chest', 4, 3, 'iron-sword')] },
      ),
    );
    // The hero starts facing down, beside the chest below it.
    game.send({ type: 'interact' });
    expect(playingView(game).interactables).toEqual([expect.objectContaining({ id: 'arena-chest', opened: true })]);
    walk(game, 'right', 11);
    // The chest on tile (4, 3) stops the hero when its right edge is at x = 4, after 10 steps.
    walk(game, 'right', 10);
    game.send({ type: 'interact' });
    expect(playingView(game).interactables).toEqual([expect.objectContaining({ id: 'cellar-chest', opened: true })]);

    walk(game, 'left', 13);
    expect(playingView(game).area.id).toBe('arena');
    expect(playingView(game).interactables).toEqual([expect.objectContaining({ id: 'arena-chest', opened: true })]);
    walk(game, 'right', 3);

    expect(playingView(game).area.id).toBe('cellar');
    expect(playingView(game).interactables).toEqual([expect.objectContaining({ id: 'cellar-chest', opened: true })]);
  });

  it('lets a chest block the hero only in the area where it stands', () => {
    const game = newGame(world({ interactables: [chestAt('arena-chest', 3, 4, 'steel-sword')] }));
    walk(game, 'right', 11);

    // The tile (3, 4) of the cellar is empty: the hero walks down a tile and across it, to the middle of the tile.
    walk(game, 'down', 8);
    walk(game, 'right', 8);

    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 4.5 });
  });

  it('calms the monsters of the area the hero leaves, so that none resumes a wind-up when it returns', () => {
    const game = newGame(world({ monsters: [biterAt('biter-1', 4, 4)] }));

    // The biter winds up from the first step, and the hero leaves during its wind-up, which would end on the 31st step.
    goThereAndBack(game);

    // Back in the arena the hero is within the biter's reach again, and its wind-up starts over: 30 steps, then the hit.
    expect(advance(game, 30)).not.toContainEqual(expect.objectContaining({ type: 'hero-hit' }));
    expect(advance(game, 1)).toContainEqual(expect.objectContaining({ type: 'hero-hit', monsterId: 'biter-1' }));
  });
});

describe('Content validation of connected Adventure Areas', () => {
  it('refuses an Adventure Area that has no entrance', () => {
    expectRefused(arena({ entrances: [], exits: [TO_CELLAR], otherAreas: [CELLAR] }), 'Area "arena" has no entrance');
    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR], otherAreas: [{ ...CELLAR, entrances: [] }] }),
      'Area "cellar" has no entrance',
    );
  });

  it('refuses an exit that leads to an Adventure Area that does not exist', () => {
    const toNowhere: ExitDefinition = { ...TO_CELLAR, id: 'to-nowhere', to: { area: 'nowhere', entrance: 'door' } };

    expectRefused(arena({ exits: [toNowhere] }), 'Area "arena": exit "to-nowhere" leads to unknown area "nowhere"');
  });

  it('refuses an exit that leads to an entrance the Adventure Area does not have', () => {
    const toMissingDoor: ExitDefinition = { ...TO_CELLAR, to: { area: 'cellar', entrance: 'missing-door' } };

    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [toMissingDoor], otherAreas: [CELLAR] }),
      'Area "arena": exit "to-cellar" leads to unknown entrance "missing-door" of area "cellar"',
    );
  });

  it('refuses an exit to an Adventure Area that has no exit back', () => {
    const cellarWithoutExit: AreaDefinition = { ...CELLAR, exits: [] };

    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR], otherAreas: [cellarWithoutExit] }),
      'Area "arena": exit "to-cellar" leads to area "cellar", which has no exit back to area "arena"',
    );
  });

  it('accepts two Adventure Areas that each have an exit into the other', () => {
    const content = arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR], otherAreas: [CELLAR] });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });

  it('refuses an entrance on solid terrain or outside the map', () => {
    const inWater: EntranceDefinition = { id: 'from-cellar', tile: { col: 2, row: 2 } };
    const outside: EntranceDefinition = { id: 'from-cellar', tile: { col: 9, row: 3 } };

    expectRefused(
      arena({ entrances: [inWater] }),
      'Area "arena": entrance "from-cellar" is placed at (col 2, row 2), which is solid terrain or outside the map',
    );
    expectRefused(
      arena({ entrances: [outside] }),
      'Area "arena": entrance "from-cellar" is placed at (col 9, row 3), which is solid terrain or outside the map',
    );
  });

  it('refuses an exit whose zone reaches outside the map', () => {
    const wide: ExitDefinition = { ...TO_CELLAR, zone: { col: 6, row: 3, width: 2, height: 1 } };

    expectRefused(
      arena({ exits: [wide] }),
      'Area "arena": the zone of exit "to-cellar" (col 6, row 3, 2 wide, 1 high) reaches outside the map',
    );
  });

  it('refuses an exit whose zone is not whole tiles, or is less than a tile', () => {
    const halfWay: ExitDefinition = { ...TO_CELLAR, zone: { col: 5.5, row: 3, width: 1, height: 1 } };
    const flat: ExitDefinition = { ...TO_CELLAR, zone: { col: 5, row: 3, width: 1, height: 0 } };

    expectRefused(
      arena({ exits: [halfWay] }),
      'Area "arena": the zone of exit "to-cellar" (col 5.5, row 3, 1 wide, 1 high) must be whole tiles, at least one wide and one high',
    );
    expectRefused(
      arena({ exits: [flat] }),
      'Area "arena": the zone of exit "to-cellar" (col 5, row 3, 1 wide, 0 high) must be whole tiles, at least one wide and one high',
    );
  });

  it('refuses two entrances or two exits with the same id in one Adventure Area', () => {
    const sameEntrance: EntranceDefinition = { ...FROM_CELLAR, tile: { col: 1, row: 1 } };
    const sameExit: ExitDefinition = { ...TO_CELLAR, zone: { col: 5, row: 1, width: 1, height: 1 } };

    expectRefused(
      arena({ entrances: [FROM_CELLAR, sameEntrance] }),
      'Area "arena": entrance id "from-cellar" is used more than once',
    );
    expectRefused(
      arena({ entrances: [FROM_CELLAR], exits: [TO_CELLAR, sameExit], otherAreas: [CELLAR] }),
      'Area "arena": exit id "to-cellar" is used more than once',
    );
  });

  it('refuses an entrance where the hero would at once overlap an exit of the same Adventure Area', () => {
    const insideTheExit: EntranceDefinition = { id: 'from-cellar', tile: { col: 5, row: 3 } };

    expectRefused(
      arena({ entrances: [insideTheExit], exits: [TO_CELLAR], otherAreas: [CELLAR] }),
      'Area "arena": entrance "from-cellar" is inside exit "to-cellar", which would send the hero straight back',
    );
  });
});
