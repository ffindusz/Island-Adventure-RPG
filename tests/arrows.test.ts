import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ContentDefinition, Direction, Game, MonsterTypeDefinition, Snapshot } from '../src/core';
import {
  ARENA_LAYOUT,
  COOLDOWN_STEPS,
  FIELD_LAYOUT,
  WITH_BOW,
  advance,
  arena,
  biterAt,
  cacheAt,
  chestAt,
  dummyAt,
  face,
  fixedRandom,
  frailMonster,
  gameAtTitle,
  milestone,
  monsterNamed,
  newGame,
  playingView,
  strike,
  throughStorage,
} from './fixtures';
import type { ArenaOptions } from './fixtures';

// The hero stands at (3.5, 3.5) in the arena with a short bow equipped. Its arrows are 0.25 tile wide and fly 0.25
// tile a step for 4 tiles from the hero's centre (16 steps). The short bow adds 2 to the base Attack of 1, so an
// arrow does 3 damage: a dummy (Health 3) falls to one arrow, and a sturdy post (Health 10) takes a few.
//
// The hero has Ammunition only from a cache, a chest that is in reach next to its start. Each game here has the hero
// open the cache and take the bow in hand, so the cache stands on the side opposite the one the hero shoots to.

const ATTACK = { type: 'attack' } as const;
const INTERACT = { type: 'interact' } as const;
const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const SWITCH = { type: 'switch-weapon' } as const;

const FIELD_START: ContentDefinition['start'] = { area: 'arena', tile: { col: 6, row: 3 } };

/** A monster that takes several arrows to bring down, so that the damage of each shows. */
const POST: MonsterTypeDefinition = { behavior: 'stationary', health: 10, size: 0.5, experience: 0 };

const OPPOSITE: Readonly<Record<Direction, Direction>> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const NEXT_TILE: Readonly<Record<Direction, { col: number; row: number }>> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

/** The content of a game where a cache with `ammunition` arrows stands on the given side of the hero's start. */
function archerContent(
  ammunition: number,
  options: ArenaOptions = {},
  cacheSide: Direction = 'down',
): ContentDefinition {
  const start = options.start ?? { area: 'arena', tile: { col: 3, row: 3 } };
  const next = NEXT_TILE[cacheSide];
  const cache = cacheAt('cache', start.tile.col + next.col, start.tile.row + next.row, ammunition);
  return arena({
    ...options,
    hero: { startingGear: WITH_BOW, ...options.hero },
    interactables: [cache, ...(options.interactables ?? [])],
  });
}

/** The hero opens the cache beside it and takes the bow in hand. It still faces the cache. */
function takeUpBow(game: Game, cacheSide: Direction = 'down'): Game {
  face(game, cacheSide);
  game.send(INTERACT);
  game.send(SWITCH);
  return game;
}

/** A game where the hero has the bow in hand and `ammunition` arrows, and faces the cache they came from. */
function archer(ammunition: number, options: ArenaOptions = {}, cacheSide: Direction = 'down'): Game {
  return takeUpBow(newGame(archerContent(ammunition, options, cacheSide)), cacheSide);
}

/** A game where the hero has the bow in hand and no Ammunition. */
function archerWithNoAmmunition(options: ArenaOptions = {}): Game {
  const game = newGame(arena({ ...options, hero: { startingGear: WITH_BOW, ...options.hero } }));
  game.send(SWITCH);
  return game;
}

const arrowsOf = (game: Game) => playingView(game).arrows;
const ammunitionOf = (game: Game) => playingView(game).hero.consumables.ammunition;

/** A saved game as if the hero were in another Adventure Area. */
function inArea(snapshot: Snapshot, areaId: string): Snapshot {
  return { ...snapshot, state: { ...snapshot.state, areaId } };
}

// The attack command is a shot while the bow is in hand, so strike() of the fixtures (wait out the cooldown, then
// attack) serves for shots too.

describe('shooting', () => {
  it('launches an arrow from the hero, the way it faces, and costs one Ammunition', () => {
    const game = archer(3);
    face(game, 'right');

    expect(game.send(ATTACK)).toEqual([{ type: 'hero-shot', direction: 'right' }]);

    expect(arrowsOf(game)).toEqual([{ position: { x: 3.5, y: 3.5 }, direction: 'right', size: 0.25 }]);
    expect(ammunitionOf(game)).toBe(2);
  });

  it('costs exactly one Ammunition for each shot', () => {
    const game = archer(3);
    face(game, 'right');

    game.send(ATTACK);
    expect(ammunitionOf(game)).toBe(2);
    strike(game);
    expect(ammunitionOf(game)).toBe(1);
    strike(game);
    expect(ammunitionOf(game)).toBe(0);
  });

  it('strikes when the sword is in hand, and that spends no Ammunition', () => {
    const game = archer(3);
    game.send(SWITCH);

    expect(game.send(ATTACK)).toMatchObject([{ type: 'hero-attacked' }]);

    expect(arrowsOf(game)).toEqual([]);
    expect(ammunitionOf(game)).toBe(3);
  });

  it.each(['up', 'down', 'left', 'right'] as const)('can be done to the %s', (direction) => {
    const game = archer(3, {}, OPPOSITE[direction]);
    face(game, direction);

    expect(game.send(ATTACK)).toEqual([{ type: 'hero-shot', direction }]);
    advance(game, 2);

    const flownTo = {
      up: { x: 3.5, y: 3 },
      down: { x: 3.5, y: 4 },
      left: { x: 3, y: 3.5 },
      right: { x: 4, y: 3.5 },
    }[direction];
    expect(arrowsOf(game)).toEqual([{ position: flownTo, direction, size: 0.25 }]);
  });

  it('shares the attack cooldown with the sword: after a shot a strike waits, and after a strike a shot waits', () => {
    const game = archer(3);
    face(game, 'right');

    expect(game.send(ATTACK)).toHaveLength(1);
    game.send(SWITCH);
    expect(game.send(ATTACK), 'a strike right after a shot').toEqual([]);
    advance(game, COOLDOWN_STEPS - 1);
    expect(game.send(ATTACK), 'a strike one step short of the cooldown').toEqual([]);
    advance(game, 1);
    expect(game.send(ATTACK), 'a strike when the cooldown is over').toMatchObject([{ type: 'hero-attacked' }]);

    game.send(SWITCH);
    expect(game.send(ATTACK), 'a shot right after a strike').toEqual([]);
    advance(game, COOLDOWN_STEPS);
    expect(game.send(ATTACK), 'a shot when the cooldown is over').toEqual([{ type: 'hero-shot', direction: 'right' }]);
  });

  it('is refused during the cooldown of a shot: no second arrow and no second Ammunition spent', () => {
    const game = archer(3);
    face(game, 'right');
    game.send(ATTACK);
    advance(game, 2);

    expect(game.send(ATTACK)).toEqual([]);

    expect(arrowsOf(game)).toHaveLength(1);
    expect(ammunitionOf(game)).toBe(2);
  });

  it('is not done at the title', () => {
    const game = gameAtTitle(archerContent(3));

    expect(game.send(ATTACK)).toEqual([]);
  });

  it('is not done while a page is open, where nothing is spent', () => {
    const game = archer(3);
    face(game, 'right');
    game.send(OPEN_INVENTORY);

    expect(game.send(ATTACK)).toEqual([]);

    expect(ammunitionOf(game)).toBe(3);
    expect(arrowsOf(game)).toEqual([]);
  });

  it('uses the Attack of the bow, base Attack included, and a Stat Point in Attack raises it', () => {
    const game = archer(3, {
      milestones: [milestone('start', { col: 3, row: 3, width: 1, height: 1 }, 10)],
      monsters: [{ id: 'post', type: 'sturdy', tile: { col: 4, row: 3 } }],
      monsterTypes: { sturdy: POST },
    });
    advance(game, 1);
    game.send({ type: 'assign-stat-point', stat: 'attack' });
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 3)).toEqual([{ type: 'monster-hit', monsterId: 'post', damage: 5, health: 5 }]);
  });
});

describe('an arrow in flight', () => {
  it('flies on 0.25 tile a step, the way it was shot', () => {
    const game = archer(3);
    face(game, 'right');
    game.send(ATTACK);

    advance(game, 1);
    expect(arrowsOf(game)).toEqual([{ position: { x: 3.75, y: 3.5 }, direction: 'right', size: 0.25 }]);
    advance(game, 2);
    expect(arrowsOf(game)).toEqual([{ position: { x: 4.25, y: 3.5 }, direction: 'right', size: 0.25 }]);
  });

  it('keeps its way when the hero turns, and flies on when the hero walks off', () => {
    const game = archer(3);
    face(game, 'right');
    game.send(ATTACK);

    face(game, 'up');
    advance(game, 2);

    expect(arrowsOf(game)).toEqual([{ position: { x: 4, y: 3.5 }, direction: 'right', size: 0.25 }]);
  });

  it('is gone when it meets the wall, having flown right up to it', () => {
    const game = archer(3);
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 9)).toEqual([]);
    expect(arrowsOf(game)).toMatchObject([{ position: { x: 5.75, y: 3.5 } }]);
    expect(advance(game, 1)).toEqual([]);
    expect(arrowsOf(game)).toEqual([]);
  });

  it('is stopped by solid terrain that is not a wall, so that it never reaches the monster behind it', () => {
    // The hero stands at (3.5, 2.5), and the water on the tile (2, 2) is in the way of an arrow shot to the left.
    const game = archer(
      3,
      { start: { area: 'arena', tile: { col: 3, row: 2 } }, monsters: [dummyAt('behind-water', 1, 2)] },
      'down',
    );
    face(game, 'left');
    game.send(ATTACK);

    advance(game, 1);
    expect(arrowsOf(game)).toMatchObject([{ position: { x: 3.25, y: 2.5 } }]);
    expect(advance(game, 40)).toEqual([]);

    expect(arrowsOf(game)).toEqual([]);
    expect(monsterNamed(game, 'behind-water').health).toBe(3);
  });

  it('is stopped by a chest, which it does not open, so that it never reaches the monster behind it', () => {
    const game = archer(3, {
      interactables: [chestAt('chest-1', 4, 3, 'iron-sword')],
      monsters: [dummyAt('behind-chest', 5, 3)],
    });
    face(game, 'right');
    game.send(ATTACK);

    advance(game, 1);
    expect(arrowsOf(game)).toMatchObject([{ position: { x: 3.75, y: 3.5 } }]);
    expect(advance(game, 40)).toEqual([]);

    expect(arrowsOf(game)).toEqual([]);
    expect(monsterNamed(game, 'behind-chest').health).toBe(3);
    expect(playingView(game).interactables).toContainEqual(expect.objectContaining({ id: 'chest-1', opened: false }));
  });

  it('flies past a monster that is not in its way', () => {
    const game = archer(3, { monsters: [dummyAt('above', 4, 2), dummyAt('below', 4, 4)] });
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 12)).toEqual([]);

    expect(monsterNamed(game, 'above').health).toBe(3);
    expect(monsterNamed(game, 'below').health).toBe(3);
  });

  it('falls after 4 tiles from the hero, wherever it has flown to', () => {
    const game = archer(3, { layout: FIELD_LAYOUT, start: FIELD_START });
    face(game, 'right');
    game.send(ATTACK);

    advance(game, 15);
    expect(arrowsOf(game)).toMatchObject([{ position: { x: 10.25, y: 3.5 } }]);
    advance(game, 1);
    expect(arrowsOf(game)).toEqual([]);
  });

  it.each([
    { what: 'hits a monster that stands within its range', col: 10, health: 7 },
    { what: 'falls short of a monster that stands beyond its range', col: 11, health: 10 },
  ])('$what', ({ col, health }) => {
    const game = archer(3, {
      layout: FIELD_LAYOUT,
      start: FIELD_START,
      monsters: [{ id: 'post', type: 'sturdy', tile: { col, row: 3 } }],
      monsterTypes: { sturdy: POST },
    });
    face(game, 'right');
    game.send(ATTACK);

    advance(game, 20);

    expect(monsterNamed(game, 'post').health).toBe(health);
  });
});

describe('an arrow that meets a monster', () => {
  const twoPosts: ArenaOptions = {
    monsters: [
      { id: 'near', type: 'sturdy', tile: { col: 4, row: 3 } },
      { id: 'far', type: 'sturdy', tile: { col: 5, row: 3 } },
    ],
    monsterTypes: { sturdy: POST },
  };

  it('hurts the first monster in its way by the Attack of the bow, and is gone', () => {
    const game = archer(3, twoPosts);
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 2), 'still in flight').toEqual([]);
    expect(advance(game, 1)).toEqual([{ type: 'monster-hit', monsterId: 'near', damage: 3, health: 7 }]);

    expect(arrowsOf(game)).toEqual([]);
  });

  it('hurts only that monster: the one behind it is not touched, however long the game goes on', () => {
    const game = archer(3, twoPosts);
    face(game, 'right');
    game.send(ATTACK);

    advance(game, 40);

    expect(monsterNamed(game, 'near').health).toBe(7);
    expect(monsterNamed(game, 'far').health).toBe(10);
  });

  it('is hurt by the bow and not by the sword: the bonus of the sword is for strikes only', () => {
    const game = archer(3, {
      ...twoPosts,
      hero: { startingGear: { 'melee-weapon': 'steel-sword', 'ranged-weapon': 'short-bow' } },
    });
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 3)).toEqual([{ type: 'monster-hit', monsterId: 'near', damage: 3, health: 7 }]);
  });

  it('defeats a monster as a strike does: the hit, the defeat and the Experience, and the monster is gone', () => {
    const game = archer(3, { monsters: [dummyAt('dummy-1', 4, 3)] });
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 3)).toEqual([
      { type: 'monster-hit', monsterId: 'dummy-1', damage: 3, health: 0 },
      { type: 'monster-defeated', monsterId: 'dummy-1' },
      { type: 'experience-gained', amount: 5 },
    ]);

    expect(playingView(game).monsters).toEqual([]);
  });

  it('can raise the hero a Level: the Experience of a monster it defeats counts like any other', () => {
    const game = archer(3, {
      monsters: [{ id: 'prize', type: 'prize', tile: { col: 4, row: 3 } }],
      monsterTypes: { prize: frailMonster(10) },
    });
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 3)).toEqual([
      { type: 'monster-hit', monsterId: 'prize', damage: 3, health: 0 },
      { type: 'monster-defeated', monsterId: 'prize' },
      { type: 'experience-gained', amount: 10 },
      { type: 'level-up', level: 2 },
    ]);

    expect(playingView(game).levelUp).not.toBeNull();
  });

  it('hits a monster that walks into it as well: it is not in front of the arrow any more, but it is touched', () => {
    // A wide arrow, 0.4 tile, and a biter that walks toward the hero: after 5 steps the arrow has come to within a
    // hair of the biter, and the biter's next stride takes it into the arrow.
    const game = archer(3, {
      hero: { rangedWeapon: { arrowSpeedTilesPerSecond: 15, range: 4, arrowSize: 0.4 } },
      monsters: [biterAt('biter', 5, 3)],
    });
    face(game, 'right');
    game.send(ATTACK);

    expect(advance(game, 5)).toEqual([]);
    expect(advance(game, 1)).toEqual([
      { type: 'monster-hit', monsterId: 'biter', damage: 3, health: 0 },
      { type: 'monster-defeated', monsterId: 'biter' },
      { type: 'experience-gained', amount: 8 },
    ]);
  });
});

describe('shooting with no Ammunition', () => {
  it('fires nothing, and the hero is told that it is out of Ammunition', () => {
    const game = archerWithNoAmmunition();

    expect(game.send(ATTACK)).toEqual([{ type: 'out-of-ammunition' }]);

    expect(arrowsOf(game)).toEqual([]);
    expect(ammunitionOf(game)).toBe(0);
  });

  it('starts no cooldown: the hero is told again at once, and a strike with the sword needs no wait', () => {
    const game = archerWithNoAmmunition({ monsters: [dummyAt('dummy-1', 3, 4)] });

    game.send(ATTACK);
    expect(game.send(ATTACK), 'asking again at once').toEqual([{ type: 'out-of-ammunition' }]);

    game.send(SWITCH);
    expect(game.send(ATTACK), 'a strike with no wait').toEqual([
      expect.objectContaining({ type: 'hero-attacked' }),
      { type: 'monster-hit', monsterId: 'dummy-1', damage: 1, health: 2 },
    ]);
  });

  it('is told only when a shot could be made: while the cooldown of a strike runs, an attack does nothing', () => {
    const game = archerWithNoAmmunition();
    game.send(SWITCH);
    game.send(ATTACK);
    game.send(SWITCH);

    expect(game.send(ATTACK)).toEqual([]);

    advance(game, COOLDOWN_STEPS);
    expect(game.send(ATTACK)).toEqual([{ type: 'out-of-ammunition' }]);
  });

  it('comes after the last arrow: the last Ammunition is shot, and the next try is refused', () => {
    const game = archer(1);
    face(game, 'right');

    expect(game.send(ATTACK)).toEqual([{ type: 'hero-shot', direction: 'right' }]);
    expect(ammunitionOf(game)).toBe(0);

    advance(game, COOLDOWN_STEPS);
    expect(game.send(ATTACK)).toEqual([{ type: 'out-of-ammunition' }]);
    expect(arrowsOf(game), 'nothing was fired').toEqual([]);
  });

  it('is ended by finding Ammunition: with arrows from another cache the hero shoots again', () => {
    const game = archer(1, { interactables: [cacheAt('cache-2', 4, 3, 2)] });
    face(game, 'right');
    game.send(ATTACK);
    advance(game, COOLDOWN_STEPS);
    expect(game.send(ATTACK)).toEqual([{ type: 'out-of-ammunition' }]);

    game.send(INTERACT);

    expect(ammunitionOf(game)).toBe(2);
    expect(game.send(ATTACK)).toEqual([{ type: 'hero-shot', direction: 'right' }]);
  });
});

describe('while the game waits', () => {
  it('holds the arrows in the air while a page is open, and they fly on when it is closed', () => {
    const game = archer(3);
    face(game, 'right');
    game.send(ATTACK);
    advance(game, 2);

    game.send(OPEN_INVENTORY);
    expect(advance(game, 50)).toEqual([]);
    expect(arrowsOf(game)).toMatchObject([{ position: { x: 4, y: 3.5 } }]);

    game.send({ type: 'close-page', page: 'inventory' });
    advance(game, 1);
    expect(arrowsOf(game)).toMatchObject([{ position: { x: 4.25, y: 3.5 } }]);
  });

  it('holds them in the air while a Stat Point waits to be assigned', () => {
    const game = archer(3, { milestones: [milestone('start', { col: 3, row: 3, width: 1, height: 1 }, 10)] });
    face(game, 'right');
    game.send(ATTACK);

    advance(game, 1);
    expect(playingView(game).levelUp).not.toBeNull();
    const held = arrowsOf(game);
    advance(game, 20);
    expect(arrowsOf(game)).toEqual(held);

    game.send({ type: 'assign-stat-point', stat: 'health' });
    advance(game, 1);
    expect(arrowsOf(game)).not.toEqual(held);
  });
});

describe('a saved game', () => {
  const content = archerContent(3, {
    layout: FIELD_LAYOUT,
    start: FIELD_START,
    monsters: [{ id: 'post', type: 'sturdy', tile: { col: 10, row: 3 } }],
    monsterTypes: { sturdy: POST },
  });

  it('keeps the arrows in the air and how far each can still fly: restored, they go on as they would have', () => {
    const game = takeUpBow(newGame(content));
    face(game, 'right');
    game.send(ATTACK);
    advance(game, 10);

    const restored = gameAtTitle(content);
    restored.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(playingView(restored)).toEqual(playingView(game));
    expect(advance(restored, 10)).toEqual(advance(game, 10));
    expect(playingView(restored)).toEqual(playingView(game));
    expect(monsterNamed(restored, 'post').health, 'the arrow reached the monster in those steps').toBe(7);
  });

  it('keeps the Ammunition that is left', () => {
    const game = takeUpBow(newGame(content));
    face(game, 'right');
    game.send(ATTACK);

    const restored = gameAtTitle(content);
    restored.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(ammunitionOf(restored)).toBe(2);
  });
});

describe('an arrow and the Adventure Area', () => {
  it('belongs to the Adventure Area it was shot in: it does not wait there for the hero to come back', () => {
    const content = archerContent(3, {
      otherAreas: [{ id: 'other', name: 'Other', layout: ARENA_LAYOUT, monsters: [] }],
    });
    const game = takeUpBow(newGame(content));
    face(game, 'right');
    game.send(ATTACK);
    const shot = throughStorage(game.snapshot());

    const away = gameAtTitle(content);
    away.send({ type: 'continue', snapshot: inArea(shot, 'other') });
    expect(arrowsOf(away), 'not seen in another area').toEqual([]);
    advance(away, 1);

    const back = gameAtTitle(content);
    back.send({ type: 'continue', snapshot: inArea(away.snapshot(), 'arena') });
    expect(arrowsOf(back)).toEqual([]);
  });
});

describe('when the hero is defeated', () => {
  it('has no arrow in the air any more: the arrows are gone with the defeat', () => {
    // The biter on the right winds up for 30 steps and strikes at step 31, and the arrow goes the other way.
    const game = archer(3, { hero: { health: 5, startingGear: WITH_BOW }, monsters: [biterAt('biter', 4, 3)] });
    advance(game, 25);
    face(game, 'left');
    game.send(ATTACK);
    expect(advance(game, 5)).toEqual([]);
    expect(arrowsOf(game), 'still in flight just before the defeat').toHaveLength(1);

    expect(advance(game, 1).map((event) => event.type)).toContain('hero-defeated');

    expect(arrowsOf(game)).toEqual([]);
    advance(game, 20);
    expect(arrowsOf(game)).toEqual([]);
  });
});

describe('a bow that does not make sense is refused when the game is created', () => {
  const arrows = { arrowSpeedTilesPerSecond: 15, range: 4, arrowSize: 0.25 };

  function expectRefused(change: Partial<typeof arrows>, message: string): void {
    const content = arena({ hero: { rangedWeapon: { ...arrows, ...change } } });
    expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
  }

  it.each([
    {
      what: 'arrows that do not fly',
      change: { arrowSpeedTilesPerSecond: 0 },
      message: "The hero's arrow speed must be more than 0, but it is 0",
    },
    {
      what: 'arrows that fly backwards',
      change: { arrowSpeedTilesPerSecond: -3 },
      message: "The hero's arrow speed must be more than 0, but it is -3",
    },
    {
      what: 'arrows that fall at once',
      change: { range: 0 },
      message: "The hero's arrow range must be more than 0, but it is 0",
    },
    {
      what: 'arrows that have no size',
      change: { arrowSize: 0 },
      message: "The hero's arrow size must be more than 0, but it is 0",
    },
    {
      what: 'arrows that are no number',
      change: { range: Number.NaN },
      message: "The hero's arrow range must be more than 0, but it is NaN",
    },
    {
      what: 'arrows that are wider than the hero',
      change: { arrowSize: 0.75 },
      message: "The hero's arrow size must be at most the hero's size of 0.5, but it is 0.75",
    },
  ])('$what', ({ change, message }) => {
    expectRefused(change, message);
  });

  it('arrows as wide as the hero are accepted', () => {
    const content = arena({ hero: { rangedWeapon: { ...arrows, arrowSize: 0.5 } } });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });
});
