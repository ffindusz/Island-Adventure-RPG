import { describe, expect, it } from 'vitest';
import type { ContentDefinition, Game, GameEvent, InteractableDefinition, Point } from '../src/core';
import {
  advance,
  arena,
  chestAt,
  doorAt,
  gameAtTitle,
  gateAt,
  keyAt,
  leverAt,
  newGame,
  playingView,
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

/** The yard with the terrain `symbol` on the tile (4, 4), and the interactables that are given. */
function yardWith(symbol: string, interactables: readonly InteractableDefinition[] = []): ContentDefinition {
  const layout = Array.from({ length: 9 }, (_, row) => {
    if (row === 0 || row === 8) {
      return '#########';
    }
    return row === 4 ? `#...${symbol}...#` : '#.......#';
  });
  return arena({ layout, interactables, hero: REAL_HERO });
}

/** A game of the content with the hero put at a place, as a save would put it there. */
function heroPutAt(content: ContentDefinition, position: Point): Game {
  const snapshot = newGame(content).snapshot();
  snapshot.state.hero.position = { ...position };
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
    const game = heroPutAt(content(), { x: 5.175, y: FLUSH_ABOVE_THING });

    game.send({ type: 'move', direction: 'down' });
    advance(game, 3);
    expectHeroAt(game, 5.375, FLUSH_ABOVE_THING);
    advance(game, 1);
    expectHeroAt(game, 5.375, FLUSH_ABOVE_THING + STEP);
  });

  it('walks head-on up to it and stays flush in front of it, so that Interact reaches it as it did', () => {
    // From (4.5, 2.5) it takes 13.5 steps to get to y = 3.625, and it stays there for the rest of the 40.
    const game = heroPutAt(content(), { x: 4.5, y: 2.5 });

    walk(game, 'down', 40);

    expectHeroAt(game, 4.5, FLUSH_ABOVE_THING);
    if (used !== undefined) {
      expect(game.send({ type: 'interact' }).map((event) => event.type)).toContain(used);
    }
  });
});
