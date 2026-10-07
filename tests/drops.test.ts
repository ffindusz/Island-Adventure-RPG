import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type {
  ContentDefinition,
  DropDefinition,
  MonsterTypeDefinition,
  StationaryMonsterDefinition,
} from '../src/core';
import {
  BITER,
  WITH_BOW,
  advance,
  arena,
  cacheAt,
  face,
  fixedRandom,
  frailMonster,
  newGame,
  playingView,
  scriptedRandom,
  seededRandom,
  strike,
} from './fixtures';

// A monster type can have a drop table: a list of entries, each a chance to leave some of a consumable behind when
// the hero defeats a monster of the type. The random source decides. Each entry is rolled once, in order, and it hits
// when the roll is below its chance. What a drop leaves goes straight to the hero, who is told by a pickup.
//
// The hero stands at (3.5, 3.5) facing down. The monster of these tests has 1 Health, is worth 1 Experience and stands
// on the tile (3, 4), right below the hero, so that a strike defeats it.

const MONSTER_BELOW = { id: 'monster', type: 'dropper', tile: { col: 3, row: 4 } } as const;

/** One entry of a drop table: a chance of some Ammunition. */
function ammunition(chance: number, amount = 2): DropDefinition {
  return { consumable: 'ammunition', chance, amount };
}

/** A monster that a single strike defeats, worth 1 Experience, with this drop table. */
function monsterDropping(...drops: DropDefinition[]): StationaryMonsterDefinition {
  return { ...frailMonster(1), drops };
}

function arenaWithMonsterBelow(type: MonsterTypeDefinition): ContentDefinition {
  return arena({ monsters: [MONSTER_BELOW], monsterTypes: { dropper: type } });
}

/** What a strike that defeats the monster below says, before any drop. */
const DEFEAT_EVENTS = [
  { type: 'hero-attacked' },
  { type: 'monster-hit', monsterId: 'monster', damage: 1, health: 0 },
  { type: 'monster-defeated', monsterId: 'monster' },
  { type: 'experience-gained', amount: 1 },
] as const;

function ammunitionPickup(amount: number) {
  return { type: 'pickup', item: { kind: 'consumable', id: 'ammunition', amount } } as const;
}

function ammunitionOf(game: ReturnType<typeof newGame>): number {
  return playingView(game).hero.consumables.ammunition;
}

describe('a monster drop', () => {
  it('is left when the roll is below its chance: the hero takes the amount, after the Experience', () => {
    const script = scriptedRandom(0.49);
    const game = newGame(arenaWithMonsterBelow(monsterDropping(ammunition(0.5, 2))), script.random);

    expect(strike(game)).toMatchObject([...DEFEAT_EVENTS, ammunitionPickup(2)]);

    expect(ammunitionOf(game)).toBe(2);
  });

  it('is not left when the roll is not below its chance: a roll equal to the chance misses', () => {
    const script = scriptedRandom(0.5);
    const game = newGame(arenaWithMonsterBelow(monsterDropping(ammunition(0.5, 2))), script.random);

    expect(strike(game)).toMatchObject(DEFEAT_EVENTS);

    expect(ammunitionOf(game)).toBe(0);
    expect(script.asked()).toBe(1);
  });

  it('never comes with a chance of 0, whatever the roll, but the roll is still asked for', () => {
    const script = scriptedRandom(0);
    const game = newGame(arenaWithMonsterBelow(monsterDropping(ammunition(0))), script.random);

    expect(strike(game)).toMatchObject(DEFEAT_EVENTS);

    expect(ammunitionOf(game)).toBe(0);
    expect(script.asked()).toBe(1);
  });

  it('always comes with a chance of 1: no roll is as high', () => {
    const script = scriptedRandom(0.999999);
    const game = newGame(arenaWithMonsterBelow(monsterDropping(ammunition(1, 3))), script.random);

    expect(strike(game)).toMatchObject([...DEFEAT_EVENTS, ammunitionPickup(3)]);

    expect(ammunitionOf(game)).toBe(3);
  });

  it('is added to the Ammunition the hero has', () => {
    const script = scriptedRandom(0.1);
    const content = arena({
      interactables: [cacheAt('cache-1', 3, 4, 6)],
      monsters: [{ id: 'monster', type: 'dropper', tile: { col: 4, row: 3 } }],
      monsterTypes: { dropper: monsterDropping(ammunition(0.5, 2)) },
    });
    const game = newGame(content, script.random);
    game.send({ type: 'interact' });
    face(game, 'right');

    strike(game);

    expect(ammunitionOf(game)).toBe(8);
  });

  it('is rolled only when the monster is defeated: a hit that leaves it standing asks for no roll', () => {
    const script = scriptedRandom(0.1);
    const sturdy: StationaryMonsterDefinition = { ...monsterDropping(ammunition(0.5, 2)), health: 2 };
    const game = newGame(arenaWithMonsterBelow(sturdy), script.random);

    strike(game);

    expect(script.asked()).toBe(0);
    expect(ammunitionOf(game)).toBe(0);

    strike(game);

    expect(script.asked()).toBe(1);
    expect(ammunitionOf(game)).toBe(2);
  });

  it('is left once: a monster that stays defeated cannot be defeated again', () => {
    const script = scriptedRandom(0.1);
    const game = newGame(arenaWithMonsterBelow(monsterDropping(ammunition(0.5, 2))), script.random);
    strike(game);

    expect(strike(game)).toMatchObject([{ type: 'hero-attacked' }]);

    expect(script.asked()).toBe(1);
    expect(ammunitionOf(game)).toBe(2);
  });

  it('is not part of a monster without a drop table: it never asks for a roll', () => {
    const script = scriptedRandom();
    const game = newGame(arenaWithMonsterBelow(frailMonster(1)), script.random);

    expect(strike(game)).toMatchObject(DEFEAT_EVENTS);

    expect(script.asked()).toBe(0);
  });

  it('is part of a monster type of any behavior: a chaser leaves its drop as well', () => {
    const script = scriptedRandom(0.1);
    const biter: MonsterTypeDefinition = { ...BITER, health: 1, drops: [ammunition(0.5, 2)] };
    const content = arena({
      monsters: [{ id: 'monster', type: 'dropper', tile: { col: 4, row: 3 } }],
      monsterTypes: { dropper: biter },
    });
    const game = newGame(content, script.random);
    face(game, 'right');

    expect(strike(game)).toMatchObject([
      { type: 'hero-attacked' },
      { type: 'monster-hit', monsterId: 'monster', damage: 1, health: 0 },
      { type: 'monster-defeated', monsterId: 'monster' },
      { type: 'experience-gained', amount: 8 },
      ammunitionPickup(2),
    ]);
  });

  it('is left by an arrow that defeats the monster as well as by a strike', () => {
    const script = scriptedRandom(0.1);
    const content = arena({
      hero: { startingGear: WITH_BOW },
      interactables: [cacheAt('cache-1', 3, 4, 3)],
      monsters: [{ id: 'monster', type: 'dropper', tile: { col: 5, row: 3 } }],
      monsterTypes: { dropper: monsterDropping(ammunition(0.5, 2)) },
    });
    const game = newGame(content, script.random);
    game.send({ type: 'interact' });
    game.send({ type: 'switch-weapon' });
    face(game, 'right');
    game.send({ type: 'attack' });

    expect(advance(game, 10)).toMatchObject([
      { type: 'monster-hit', monsterId: 'monster', damage: 3, health: 0 },
      { type: 'monster-defeated', monsterId: 'monster' },
      { type: 'experience-gained', amount: 1 },
      ammunitionPickup(2),
    ]);

    expect(ammunitionOf(game), 'three found, one shot, two dropped').toBe(4);
  });
});

describe('a drop table', () => {
  const TABLE = [ammunition(0.5, 2), ammunition(0.25, 5)];

  it.each([
    { rolls: [0.4, 0.1], left: [2, 5], total: 7 },
    { rolls: [0.4, 0.3], left: [2], total: 2 },
    { rolls: [0.6, 0.1], left: [5], total: 5 },
    { rolls: [0.6, 0.3], left: [], total: 0 },
  ])('rolls each of its entries once, in order: rolls $rolls leave $left', ({ rolls, left, total }) => {
    const script = scriptedRandom(...rolls);
    const game = newGame(arenaWithMonsterBelow(monsterDropping(...TABLE)), script.random);

    const pickups = strike(game).filter((event) => event.type === 'pickup');

    expect(pickups).toEqual(left.map(ammunitionPickup));
    expect(ammunitionOf(game)).toBe(total);
    expect(script.asked()).toBe(2);
  });

  it('is rolled for each monster that one strike defeats, in the order the content places them', () => {
    // A wide sword reaches the three monsters right of the hero, in the tiles (4, 2), (4, 3) and (4, 4).
    const script = scriptedRandom(0.1, 0.9, 0.2);
    const content = arena({
      hero: { meleeWeapon: { reach: 1, width: 3 } },
      monsters: [
        { id: 'first', type: 'one', tile: { col: 4, row: 2 } },
        { id: 'second', type: 'two', tile: { col: 4, row: 3 } },
        { id: 'third', type: 'four', tile: { col: 4, row: 4 } },
      ],
      monsterTypes: {
        one: monsterDropping(ammunition(0.5, 1)),
        two: monsterDropping(ammunition(0.5, 2)),
        four: monsterDropping(ammunition(0.5, 4)),
      },
    });
    const game = newGame(content, script.random);
    face(game, 'right');

    expect(strike(game)).toMatchObject([
      { type: 'hero-attacked' },
      { type: 'monster-hit', monsterId: 'first' },
      { type: 'monster-defeated', monsterId: 'first' },
      { type: 'experience-gained', amount: 1 },
      ammunitionPickup(1),
      { type: 'monster-hit', monsterId: 'second' },
      { type: 'monster-defeated', monsterId: 'second' },
      { type: 'experience-gained', amount: 1 },
      { type: 'monster-hit', monsterId: 'third' },
      { type: 'monster-defeated', monsterId: 'third' },
      { type: 'experience-gained', amount: 1 },
      ammunitionPickup(4),
    ]);

    expect(ammunitionOf(game)).toBe(5);
  });

  it('follows the random source alone: the same seed leaves the same drops every run, another seed does not', () => {
    const table = Array.from({ length: 12 }, () => ammunition(0.5, 1));
    const run = (seed: number) => {
      const game = newGame(arenaWithMonsterBelow(monsterDropping(...table)), seededRandom(seed));
      return strike(game);
    };

    expect(run(1)).toEqual(run(1));
    expect(run(7)).toEqual(run(7));
    expect(run(1)).not.toEqual(run(7));
  });
});

describe('a drop table that does not make sense is refused when the game is created', () => {
  // Content read from a file could say these, and the compiler would not notice.
  const GOOD = ammunition(0.5, 2);
  const typeWith = (...drops: object[]) => ({ ...frailMonster(1), drops }) as unknown as MonsterTypeDefinition;

  function expectRefused(type: MonsterTypeDefinition, message: string): void {
    expect(() => createGame({ content: arenaWithMonsterBelow(type), random: fixedRandom })).toThrow(message);
  }

  it.each([
    {
      what: 'a drop of a consumable that does not exist',
      type: typeWith({ consumable: 'gold', chance: 0.5, amount: 1 }),
      message: 'Monster type "dropper": drops[0] gives unknown consumable "gold"',
    },
    {
      what: 'a chance below 0',
      type: typeWith({ consumable: 'ammunition', chance: -0.1, amount: 1 }),
      message: 'Monster type "dropper": drops[0].chance must be from 0 to 1, but it is -0.1',
    },
    {
      what: 'a chance above 1',
      type: typeWith({ consumable: 'ammunition', chance: 1.5, amount: 1 }),
      message: 'Monster type "dropper": drops[0].chance must be from 0 to 1, but it is 1.5',
    },
    {
      what: 'a chance that is not a number',
      type: typeWith({ consumable: 'ammunition', chance: Number.NaN, amount: 1 }),
      message: 'Monster type "dropper": drops[0].chance must be from 0 to 1, but it is NaN',
    },
    {
      what: 'a drop of nothing',
      type: typeWith({ consumable: 'ammunition', chance: 0.5, amount: 0 }),
      message: 'Monster type "dropper": drops[0].amount must be a whole number of 1 or more, but it is 0',
    },
    {
      what: 'a drop of a fraction of an arrow',
      type: typeWith({ consumable: 'ammunition', chance: 0.5, amount: 1.5 }),
      message: 'Monster type "dropper": drops[0].amount must be a whole number of 1 or more, but it is 1.5',
    },
    {
      what: 'a bad entry after a good one: it says which entry',
      type: typeWith(GOOD, { consumable: 'ammunition', chance: 2, amount: 1 }),
      message: 'Monster type "dropper": drops[1].chance must be from 0 to 1, but it is 2',
    },
    {
      what: 'a bad drop on a chaser, as on any other monster',
      type: { ...BITER, drops: [{ consumable: 'gold', chance: 0.5, amount: 1 }] } as unknown as MonsterTypeDefinition,
      message: 'Monster type "dropper": drops[0] gives unknown consumable "gold"',
    },
  ])('$what', ({ type, message }) => {
    expectRefused(type, message);
  });

  it('no table at all, an empty table, chances of exactly 0 and 1, and the same consumable twice are accepted', () => {
    const content = arena({
      monsterTypes: {
        none: frailMonster(1),
        empty: monsterDropping(),
        edges: monsterDropping(ammunition(0), ammunition(1)),
        twice: monsterDropping(ammunition(0.5, 2), ammunition(0.5, 3)),
      },
    });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });
});
