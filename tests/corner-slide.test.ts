import { describe, expect, it } from 'vitest';
import type {
  Box,
  ContentDefinition,
  Direction,
  Game,
  GameEvent,
  InteractableDefinition,
  MonsterPlacement,
  Point,
} from '../src/core';
import { boxAround, overlaps } from './dodging-bot';
import {
  advance,
  arena,
  biterAt,
  chestAt,
  doorAt,
  dummyAt,
  gameAtTitle,
  gateAt,
  keyAt,
  leverAt,
  monsterNamed,
  newGame,
  playingView,
  seededRandom,
  signAt,
  walk,
} from './fixtures';
import { FIRST_GEAR, gameWithHero, heroAt, QUIET } from './profile-heroes';

// The corner slide of the hero (ticket 31). The real hero is 0.75 tile wide and walks 5 tiles a second in 60 steps a
// second, so a step is 1/12 tile, and the passages of the game are one tile wide: the hero has 1/8 tile of room on
// each side. A step that a corner stops, with the middle of the hero's body over the gap beside it, slides the hero
// sideways, along the corner, the little that clears it. The numbers here are worked out by hand.
//
// The crevice in the south wall of the coast's bay is the tile (25, 13) between the rock of columns 24 and 26. A hero
// that walks down against it stops flush above it with its middle at y = 12.625, so that its body, 0.75 tile, touches
// row 13: the rock of column 26 is where x grows past 26, the gap runs from x = 25 to 26 and its middle is 25.5.

/** A walking step of the real hero. */
const STEP = 1 / 12;

/** The middle of the hero standing flush above row 13 of the coast, in tiles from the top. */
const FLUSH_ABOVE_CREVICE = 12.625;

const NEW_HERO = heroAt(1, { health: 0, attack: 0, defense: 0 }, FIRST_GEAR, 0);

/** A new game on the shipped coast, without its monsters, with the real hero flush above the crevice at the given x. */
function heroAboveCrevice(x: number): Game {
  return gameWithHero(QUIET, NEW_HERO, {
    areaId: 'shipwreck-coast',
    position: { x, y: FLUSH_ABOVE_CREVICE },
    facing: 'down',
  });
}

function heroOf(game: Game): { x: number; y: number } {
  return playingView(game).hero.position;
}

function expectHeroAt(game: Game, x: number, y: number): void {
  expect(heroOf(game).x).toBeCloseTo(x, 6);
  expect(heroOf(game).y).toBeCloseTo(y, 6);
}

describe('the hero at the crevice of the coast, off the middle of the gap', () => {
  it('slides clear of a corner that it overlaps by 0.075 tile in one step, and walks on in the next', () => {
    // The middle at x = 25.7: the body runs from 25.325 to 26.075 and overlaps the rock of column 26 by 0.075.
    const game = heroAboveCrevice(25.7);

    game.send({ type: 'move', direction: 'down' });
    game.step();
    expectHeroAt(game, 25.625, FLUSH_ABOVE_CREVICE);
    game.step();
    expectHeroAt(game, 25.625, FLUSH_ABOVE_CREVICE + STEP);
  });

  it('slides 0.375 tile at the far end of the window in five steps, four of a step and one of half a step, and then walks down', () => {
    // The middle at x = 26.0, the edge of the gap: the body overlaps the rock by 0.375, half its width.
    const game = heroAboveCrevice(26);

    game.send({ type: 'move', direction: 'down' });
    for (const x of [26 - STEP, 26 - 2 * STEP, 26 - 3 * STEP, 26 - 4 * STEP, 25.625]) {
      game.step();
      expectHeroAt(game, x, FLUSH_ABOVE_CREVICE);
    }
    game.step();
    expectHeroAt(game, 25.625, FLUSH_ABOVE_CREVICE + STEP);
  });

  it('does not help a hero whose middle is a sixteenth beyond the window, over the rock, however long the key is held', () => {
    const game = heroAboveCrevice(26.0625);

    game.send({ type: 'move', direction: 'down' });
    for (let step = 0; step < 120; step++) {
      game.step();
      expect(heroOf(game)).toEqual({ x: 26.0625, y: FLUSH_ABOVE_CREVICE });
    }
  });

  it('slides the other way, round the rock of column 24, as far as it has to', () => {
    // The middle at x = 25.3: the body runs from 24.925 to 25.675 and overlaps the rock of column 24 by 0.075.
    const game = heroAboveCrevice(25.3);

    game.send({ type: 'move', direction: 'down' });
    game.step();
    expectHeroAt(game, 25.375, FLUSH_ABOVE_CREVICE);
    game.step();
    expectHeroAt(game, 25.375, FLUSH_ABOVE_CREVICE + STEP);
  });

  it('does not help a hero over the rock of column 24 either', () => {
    const game = heroAboveCrevice(24.9375);

    game.send({ type: 'move', direction: 'down' });
    for (let step = 0; step < 120; step++) {
      game.step();
      expect(heroOf(game)).toEqual({ x: 24.9375, y: FLUSH_ABOVE_CREVICE });
    }
  });
});

// Everything that stands still and stops a walker is a corner, rock and water as much as a chest or a shut door. The
// yard is a room of ground nine tiles square with a wall all round it and one thing on the tile (4, 4), which runs from
// x = 4 to 5 and from y = 4 to 5. A hero that walks down against it stops flush above it, with its middle at y = 3.625.
// The hero is the real one in size and speed, in the arena of fixtures.ts, so that a step is 1/12 tile as above.

const REAL_HERO = { size: 0.75, speedTilesPerSecond: 5 };

const FLUSH_ABOVE_THING = 3.625;

/** The yard with the terrain `symbol` on the tile (4, 4), and the interactables and monsters that are given. */
function yardWith(
  symbol: string,
  interactables: readonly InteractableDefinition[] = [],
  monsters: readonly MonsterPlacement[] = [],
): ContentDefinition {
  const layout = Array.from({ length: 9 }, (_, row) => {
    if (row === 0 || row === 8) {
      return '#########';
    }
    return row === 4 ? `#...${symbol}...#` : '#.......#';
  });
  return arena({ layout, interactables, monsters, hero: REAL_HERO });
}

/** A game of the content with the hero, and the monsters by their ids, put at places as a save would put them there. */
function putAt(content: ContentDefinition, hero: Point, monsters: Readonly<Record<string, Point>> = {}): Game {
  const snapshot = newGame(content).snapshot();
  snapshot.state.hero.position = { ...hero };
  for (const monster of snapshot.state.areas['arena']?.monsters ?? []) {
    const place = monsters[monster.id];
    if (place !== undefined) {
      monster.position = { ...place };
    }
  }
  const game = gameAtTitle(content);
  game.send({ type: 'continue', snapshot });
  return game;
}

interface Thing {
  readonly what: string;
  /** The yard with the thing on the tile (4, 4). */
  readonly content: () => ContentDefinition;
  /** What Interact tells of the thing, if it can be used. */
  readonly used?: GameEvent['type'];
}

const THINGS: readonly Thing[] = [
  { what: 'rock', content: () => yardWith('#') },
  { what: 'water', content: () => yardWith('~') },
  { what: 'a chest', content: () => yardWith('.', [chestAt('thing', 4, 4, 'leather-armor')]), used: 'chest-opened' },
  {
    what: 'a lever',
    content: () => yardWith('.', [leverAt('thing', 4, 4, ['far-gate']), gateAt('far-gate', 7, 7)]),
    used: 'lever-toggled',
  },
  { what: 'a sign', content: () => yardWith('.', [signAt('thing', 4, 4, 'Mind the step.')]), used: 'sign-read' },
  {
    what: 'a shut door',
    content: () => yardWith('.', [doorAt('thing', 4, 4, 'key-1'), keyAt('key-1', 1, 7)]),
    used: 'door-locked',
  },
  { what: 'a shut gate', content: () => yardWith('.', [gateAt('thing', 4, 4)]) },
];

describe.each(THINGS)('the hero in front of $what', ({ content, used }) => {
  it('slides round its corner when its middle is over the gap beside it', () => {
    // The middle at x = 5.175: the body runs from 4.8 to 5.55 and overlaps the thing by 0.2 tile. The slide takes
    // 0.2 / (1/12) = 2.4 steps, two whole ones and 0.0333 tile, to x = 5.375, and the hero walks down from the fourth.
    const game = putAt(content(), { x: 5.175, y: FLUSH_ABOVE_THING });

    game.send({ type: 'move', direction: 'down' });
    advance(game, 3);
    expectHeroAt(game, 5.375, FLUSH_ABOVE_THING);
    advance(game, 1);
    expectHeroAt(game, 5.375, FLUSH_ABOVE_THING + STEP);
  });

  it('slides when its middle is at the very edge of it, and is not helped when its middle is a sixteenth over it', () => {
    // The middle at x = 5: the body overlaps the thing by 0.375, half its width, which is the end of the window. The
    // slide takes four whole steps and half of a fifth.
    const atTheEdge = putAt(content(), { x: 5, y: FLUSH_ABOVE_THING });
    atTheEdge.send({ type: 'move', direction: 'down' });
    advance(atTheEdge, 5);
    expectHeroAt(atTheEdge, 5.375, FLUSH_ABOVE_THING);
    advance(atTheEdge, 1);
    expectHeroAt(atTheEdge, 5.375, FLUSH_ABOVE_THING + STEP);

    // The middle at x = 4.9375: the body overlaps it by 0.4375, and its middle is over the thing.
    const overIt = putAt(content(), { x: 4.9375, y: FLUSH_ABOVE_THING });
    overIt.send({ type: 'move', direction: 'down' });
    for (let step = 0; step < 120; step++) {
      overIt.step();
      expect(heroOf(overIt)).toEqual({ x: 4.9375, y: FLUSH_ABOVE_THING });
    }
  });

  it('walks head-on up to it and stays flush in front of it, so that Interact reaches it as it did', () => {
    // From (4.5, 2.5) it takes 13.5 steps to get to y = 3.625, and it stays there for the rest of the 40.
    const game = putAt(content(), { x: 4.5, y: 2.5 });

    walk(game, 'down', 40);

    expectHeroAt(game, 4.5, FLUSH_ABOVE_THING);
    if (used !== undefined) {
      expect(game.send({ type: 'interact' }).map((event) => event.type)).toContain(used);
    }
  });
});

// A slide never goes into anything solid, and a living monster is solid for it. A dummy never moves or attacks, so
// that it stands where the test puts it. It is half a tile wide, and it stands with its middle at y = 3.5 at the side of
// the hero, whose body runs from y = 3.25 to 4 when it is flush above the rock, so that they are in one row.

describe('the hero in front of a rock, with a monster at the side it would slide to', () => {
  const content = (): ContentDefinition => yardWith('#', [], [dummyAt('dummy', 1, 1)]);

  it('is left where it was by a monster that stands against that side of it, and the slide does not move it at all', () => {
    // The middle at x = 5.125: the body runs from 4.75 to 5.5 and overlaps the rock by 0.25, which is a slide to the
    // right. The dummy's left edge is at x = 5.5, where the right edge of the hero is: there is no room to slide.
    const game = putAt(content(), { x: 5.125, y: FLUSH_ABOVE_THING }, { dummy: { x: 5.75, y: 3.5 } });

    game.send({ type: 'move', direction: 'down' });
    for (let step = 0; step < 120; step++) {
      game.step();
      expectHeroAt(game, 5.125, FLUSH_ABOVE_THING);
    }
  });

  it('slides as far as the monster lets it, and stops flush against it', () => {
    // The dummy's left edge is at x = 5.625, an eighth of a tile from the right edge of the hero: the slide is cut
    // short at x = 5.125 + 0.125 = 5.25, after one whole step and half of the next.
    const game = putAt(content(), { x: 5.125, y: FLUSH_ABOVE_THING }, { dummy: { x: 5.875, y: 3.5 } });

    game.send({ type: 'move', direction: 'down' });
    advance(game, 1);
    expectHeroAt(game, 5.125 + STEP, FLUSH_ABOVE_THING);
    for (let step = 0; step < 120; step++) {
      game.step();
      expectHeroAt(game, 5.25, FLUSH_ABOVE_THING);
    }
  });
});

describe('the hero that walks into a monster', () => {
  it('is not helped round it: a monster moves, so it is not a corner, and the hero stays flush against it', () => {
    // The dummy stands with its middle at (5, 4.75), so that its body runs from x = 4.75 to 5.25 and from y = 4.5 to
    // 5. The hero walks down from (5.4, 3) with its body from x = 5.025 to 5.775, which overlaps the dummy by 0.225 and
    // would clear it by sliding right, if a monster were a corner. It is stopped with its middle at y = 4.5 - 0.375.
    const game = putAt(yardWith('.', [], [dummyAt('dummy', 1, 1)]), { x: 5.4, y: 3 }, { dummy: { x: 5, y: 4.75 } });

    walk(game, 'down', 120);

    expectHeroAt(game, 5.4, 4.125);
  });
});

describe('the biter that walks into a corner', () => {
  // The wall across this room has a gap of one tile, the tile (4, 5). The biter is half a tile wide and walks down
  // toward the hero, who stands still on the other side of the wall.
  const content = (): ContentDefinition =>
    arena({
      layout: [
        '#########',
        '#.......#',
        '#.......#',
        '#.......#',
        '#.......#',
        '####.####',
        '#.......#',
        '#.......#',
        '#########',
      ],
      monsters: [biterAt('biter', 1, 1)],
      hero: REAL_HERO,
    });

  it('is not helped round it: only the hero is, so it stays flush against the wall with its middle over the gap', () => {
    // The biter's middle is at x = 4.9: its body runs from 4.65 to 5.15 and overlaps the wall right of the gap by 0.15.
    const game = putAt(content(), { x: 4.9, y: 6.5 }, { biter: { x: 4.9, y: 4.5 } });

    for (let step = 0; step < 120; step++) {
      game.step();
      expect(monsterNamed(game, 'biter').position.x).toBeCloseTo(4.9, 6);
    }
    expect(monsterNamed(game, 'biter').position.y).toBeCloseTo(4.75, 6);
    expect(playingView(game).hero.health).toBe(playingView(game).hero.maxHealth);
  });

  it('does walk into the gap when it is lined up with it, which is what the corner stopped it from doing', () => {
    // It is stopped at y = 4.75 by the wall, in the test above, and it goes on to wind up its attack from the gap here.
    const game = putAt(content(), { x: 4.5, y: 6.5 }, { biter: { x: 4.5, y: 4.5 } });

    advance(game, 60);

    expect(monsterNamed(game, 'biter').position.y).toBeGreaterThan(5);
  });
});

// The slide goes sideways whichever way the hero walks. The rock on the tile (4, 4) of the yard is a corner on each of
// its four sides: flush against one of them, with its middle 0.175 tile beyond the edge of the rock at either end, the
// hero overlaps the rock by 0.2 tile. It slides 0.2 tile clear of it in three steps, two whole ones and a third of one,
// and walks on in the fourth. It goes on facing the way it walks, and the slide tells no event.

interface SlideAlongRock {
  readonly what: string;
  readonly walking: Direction;
  /** Where the hero starts, flush against the rock. */
  readonly from: Point;
  /** Where the slide leaves it, three steps later. */
  readonly slidTo: Point;
  /** Where it is a step after that. */
  readonly then: Point;
}

const SLIDES_ALONG_ROCK: readonly SlideAlongRock[] = [
  {
    what: 'down, with its middle right of the rock',
    walking: 'down',
    from: { x: 5.175, y: 3.625 },
    slidTo: { x: 5.375, y: 3.625 },
    then: { x: 5.375, y: 3.625 + STEP },
  },
  {
    what: 'down, with its middle left of the rock',
    walking: 'down',
    from: { x: 3.825, y: 3.625 },
    slidTo: { x: 3.625, y: 3.625 },
    then: { x: 3.625, y: 3.625 + STEP },
  },
  {
    what: 'up, with its middle right of the rock',
    walking: 'up',
    from: { x: 5.175, y: 5.375 },
    slidTo: { x: 5.375, y: 5.375 },
    then: { x: 5.375, y: 5.375 - STEP },
  },
  {
    what: 'up, with its middle left of the rock',
    walking: 'up',
    from: { x: 3.825, y: 5.375 },
    slidTo: { x: 3.625, y: 5.375 },
    then: { x: 3.625, y: 5.375 - STEP },
  },
  {
    what: 'right, with its middle below the rock',
    walking: 'right',
    from: { x: 3.625, y: 5.175 },
    slidTo: { x: 3.625, y: 5.375 },
    then: { x: 3.625 + STEP, y: 5.375 },
  },
  {
    what: 'right, with its middle above the rock',
    walking: 'right',
    from: { x: 3.625, y: 3.825 },
    slidTo: { x: 3.625, y: 3.625 },
    then: { x: 3.625 + STEP, y: 3.625 },
  },
  {
    what: 'left, with its middle below the rock',
    walking: 'left',
    from: { x: 5.375, y: 5.175 },
    slidTo: { x: 5.375, y: 5.375 },
    then: { x: 5.375 - STEP, y: 5.375 },
  },
  {
    what: 'left, with its middle above the rock',
    walking: 'left',
    from: { x: 5.375, y: 3.825 },
    slidTo: { x: 5.375, y: 3.625 },
    then: { x: 5.375 - STEP, y: 3.625 },
  },
];

describe.each(SLIDES_ALONG_ROCK)('the hero that walks $what', ({ walking, from, slidTo, then }) => {
  it('is slid clear of it in three steps, walks on in the fourth, and goes on facing the way it walks', () => {
    const game = putAt(yardWith('#'), from);

    game.send({ type: 'move', direction: walking });
    for (let step = 0; step < 3; step++) {
      expect(game.step()).toEqual([]);
      expect(playingView(game).hero.facing).toBe(walking);
    }
    expectHeroAt(game, slidTo.x, slidTo.y);
    expect(game.step()).toEqual([]);
    expectHeroAt(game, then.x, then.y);
    expect(playingView(game).hero.facing).toBe(walking);
  });
});

describe('the hero that comes to the corner part of the way through a step', () => {
  it('walks the part of the step that it has up to the rock, and slides with what is left of it', () => {
    // The middle at (5.175, 3.55): the body is 0.075 above the rock. The first step walks that 0.075 of its 1/12 tile
    // and slides the 1/120 that is left, and the next three slide on, the last of them 0.025 tile, to x = 5.375.
    const game = putAt(yardWith('#'), { x: 5.175, y: 3.55 });
    const leftOfFirstStep = STEP - 0.075;

    game.send({ type: 'move', direction: 'down' });
    for (const x of [5.175 + leftOfFirstStep, 5.175 + leftOfFirstStep + STEP, 5.175 + leftOfFirstStep + 2 * STEP, 5.375]) {
      game.step();
      expectHeroAt(game, x, FLUSH_ABOVE_THING);
    }
    game.step();
    expectHeroAt(game, 5.375, FLUSH_ABOVE_THING + STEP);
  });
});

// Walking that nothing stops is as it was: a twelfth of a tile in a step, along the key and not a hair to the side. So
// is walking into what is no corner: a straight wall, the same wherever along it the hero comes up to it.

describe('the hero that walks where no corner stops it', () => {
  it.each([
    { direction: 'up', along: { x: 0, y: -1 } },
    { direction: 'down', along: { x: 0, y: 1 } },
    { direction: 'left', along: { x: -1, y: 0 } },
    { direction: 'right', along: { x: 1, y: 0 } },
  ] as const)('goes $direction a twelfth of a tile in each step over open ground', ({ direction, along }) => {
    const game = putAt(yardWith('.'), { x: 4.5, y: 4.5 });

    game.send({ type: 'move', direction });
    for (let step = 1; step <= 12; step++) {
      game.step();
      expectHeroAt(game, 4.5 + along.x * step * STEP, 4.5 + along.y * step * STEP);
    }
  });

  it.each([-0.125, 0, 0.125])('goes down the crevice of the coast a twelfth of a tile in each step, %s off its middle', (offset) => {
    const x = 25.5 + offset;
    const game = gameWithHero(QUIET, NEW_HERO, { areaId: 'shipwreck-coast', position: { x, y: 12 }, facing: 'down' });

    game.send({ type: 'move', direction: 'down' });
    for (let step = 1; step <= 24; step++) {
      game.step();
      expectHeroAt(game, x, 12 + step * STEP);
    }
  });

  it('stays flush against a straight wall wherever along it it walks up to it, however long the key is held', () => {
    // Its middle at every sixteenth of a tile from 1.5 to 7.5 along the north wall of the yard: its body is over one
    // tile of the wall, or two of them, and never over a corner.
    for (let sixteenths = 24; sixteenths <= 120; sixteenths++) {
      const x = sixteenths / 16;
      const game = putAt(yardWith('.'), { x, y: 1.375 });

      walk(game, 'up', 3);

      expect(heroOf(game)).toEqual({ x, y: 1.375 });
    }
  });
});

// A hero that wanders about a room full of things never ends a step inside one of them, however it comes against them,
// nor goes farther than a step, and now and then it is slid round a corner. The room has rock and water, a chest, a
// lever and its gate, a sign, a shut door, a key to pick up and five dummies that stand off the grid of the tiles. Two
// of them stand where a slide round a corner would run into them: 'd' beside the top right corner of the rock at the
// top left, and 'e' beside the bottom left corner of the sign.

const ROOM = [
  '##############',
  '#............#',
  '#..#.....~...#',
  '#............#',
  '#.....##.....#',
  '#.....#......#',
  '#............#',
  '#..~.....#...#',
  '#............#',
  '##############',
];

const ROOM_INTERACTABLES: readonly InteractableDefinition[] = [
  chestAt('chest', 11, 2, 'leather-armor'),
  leverAt('lever', 2, 5, ['gate']),
  gateAt('gate', 12, 5),
  signAt('sign', 4, 4, 'Mind the step.'),
  doorAt('door', 8, 6, 'key-1'),
  keyAt('key-1', 1, 8),
];

const DUMMIES_OFF_THE_TILES: Readonly<Record<string, Point>> = {
  a: { x: 5.3, y: 2.6 },
  b: { x: 10.15, y: 5.35 },
  c: { x: 2.7, y: 8.2 },
  d: { x: 4.9, y: 1.6 },
  e: { x: 3.25, y: 5.4 },
};

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

function tileAt(col: number, row: number): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}

/** The boxes of the room that the hero cannot go into: rock and water, what stops a walker of its interactables, dummies. */
function solidsOfRoom(game: Game): Box[] {
  const terrain = ROOM.flatMap((line, row) =>
    [...line].flatMap((symbol, col) => (symbol === '#' || symbol === '~' ? [tileAt(col, row)] : [])),
  );
  const interactables = ROOM_INTERACTABLES.filter((thing) => thing.kind !== 'key').map(({ tile }) =>
    tileAt(tile.col, tile.row),
  );
  const monsters = playingView(game).monsters.map(({ position, size }) => boxAround(position, size));
  return [...terrain, ...interactables, ...monsters];
}

describe('the hero that wanders about a room full of things', () => {
  it.each([1, 2, 3])('never ends a step inside one of them or farther on than a step, in the walk of seed %s', (seed) => {
    const content = arena({
      layout: ROOM,
      interactables: ROOM_INTERACTABLES,
      monsters: Object.entries(DUMMIES_OFF_THE_TILES).map(([id, { x, y }]) => dummyAt(id, Math.floor(x), Math.floor(y))),
      hero: REAL_HERO,
    });
    const game = putAt(content, { x: 1.5, y: 1.5 }, DUMMIES_OFF_THE_TILES);
    const solids = solidsOfRoom(game);
    const random = seededRandom(seed);
    const problems: string[] = [];
    let slidSteps = 0;
    let at = heroOf(game);

    for (let round = 0; round < 1500; round++) {
      const direction = DIRECTIONS[Math.floor(random() * DIRECTIONS.length)] ?? 'up';
      const steps = 1 + Math.floor(random() * 12);
      game.send({ type: 'move', direction });
      for (let step = 1; step <= steps; step++) {
        game.step();
        const to = heroOf(game);
        const where = `round ${round}, step ${step} of ${steps} ${direction}, from ${JSON.stringify(at)}`;
        if (solids.some((solid) => overlaps(boxAround(to, REAL_HERO.size), solid))) {
          problems.push(`${where}: the hero is in something at ${JSON.stringify(to)}`);
        }
        if (Math.abs(to.x - at.x) + Math.abs(to.y - at.y) > STEP + 1e-9) {
          problems.push(`${where}: the hero went farther than a step, to ${JSON.stringify(to)}`);
        }
        const aside = direction === 'up' || direction === 'down' ? to.x - at.x : to.y - at.y;
        if (Math.abs(aside) > 1e-9) {
          slidSteps++;
        }
        at = to;
      }
      game.send({ type: 'stop', direction });
    }

    expect(problems.slice(0, 5)).toEqual([]);
    // It is not for nothing: each walk slides round a corner in at least fifty of its steps (about 125 to 150 do).
    expect(slidSteps).toBeGreaterThan(50);
  });
});
