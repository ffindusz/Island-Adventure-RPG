import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type {
  AreaDefinition,
  ContentDefinition,
  EntranceDefinition,
  ExitDefinition,
  Game,
  GameEvent,
} from '../src/core';
import {
  ARENA_LAYOUT,
  FIELD_LAYOUT,
  WITH_BOW,
  advance,
  arena,
  biterAt,
  cacheAt,
  chestAt,
  chestViews,
  dummyAt,
  face,
  fixedRandom,
  frailMonster,
  gameAtTitle,
  monsterNamed,
  newGame,
  pickupAt,
  playingView,
  strike,
  throughStorage,
  walk,
} from './fixtures';
import type { ArenaOptions } from './fixtures';

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

  it('keeps an Ammunition cache open in either area, and the cache of the other area as it was', () => {
    const game = newGame(
      world(
        { interactables: [cacheAt('arena-cache', 3, 4, 5)] },
        { interactables: [cacheAt('cellar-cache', 4, 3, 3)] },
      ),
    );
    const caches = () => chestViews(game).map((cache) => [cache.id, cache.holds, cache.opened]);
    const ammunition = () => playingView(game).hero.consumables.ammunition;

    // The hero starts facing down, beside the cache below it.
    game.send({ type: 'interact' });
    expect(ammunition()).toBe(5);

    // Opening the cache of the arena left the one of the cellar closed.
    walk(game, 'right', 11);
    expect(caches()).toEqual([['cellar-cache', 'ammunition', false]]);
    // The cache on tile (4, 3) stops the hero when its right edge is at x = 4, after 10 steps.
    walk(game, 'right', 10);
    game.send({ type: 'interact' });
    expect(ammunition()).toBe(8);

    walk(game, 'left', 13);
    expect(playingView(game).area.id).toBe('arena');
    expect(caches()).toEqual([['arena-cache', 'ammunition', true]]);
    walk(game, 'right', 3);
    expect(playingView(game).area.id).toBe('cellar');
    expect(caches()).toEqual([['cellar-cache', 'ammunition', true]]);

    // Both caches are empty now: going there and back gave the hero no second helping from either.
    walk(game, 'right', 10);
    expect(game.send({ type: 'interact' })).toEqual([]);
    expect(ammunition()).toBe(8);
  });

  it('keeps a pickup taken in either area taken, and the pickup of the other area where it lay', () => {
    const game = newGame(
      world(
        { interactables: [pickupAt('arena-potion', 3, 4, 2)] },
        { interactables: [pickupAt('cellar-potion', 2, 4, 1)] },
      ),
    );
    const lying = () => playingView(game).interactables.map((pickup) => pickup.id);
    const potions = () => playingView(game).hero.consumables['healing-potion'];

    // The hero's body overlaps the tile below it, (3, 4), on the 3rd step down.
    walk(game, 'down', 3);
    expect(potions()).toBe(2);
    walk(game, 'up', 3);

    // Taking the pickup of the arena left the one of the cellar where it lay, below the hero's arrival at (2.5, 3.5).
    walk(game, 'right', 11);
    expect(playingView(game).area.id).toBe('cellar');
    expect(lying()).toEqual(['cellar-potion']);
    walk(game, 'down', 3);
    expect(potions()).toBe(3);
    walk(game, 'up', 3);

    walk(game, 'left', 3);
    expect(playingView(game).area.id).toBe('arena');
    expect(lying()).toEqual([]);
    walk(game, 'right', 3);
    expect(playingView(game).area.id).toBe('cellar');
    expect(lying()).toEqual([]);

    // Both are gone for good: walking over the places again gives no second potion from either.
    expect(walk(game, 'down', 3)).toEqual([]);
    walk(game, 'up', 3);
    walk(game, 'left', 3);
    walk(game, 'left', 8);
    expect(walk(game, 'down', 3)).toEqual([]);
    expect(potions()).toBe(3);
  });

  it('reports a pickup taken on the very step that takes the hero through an exit', () => {
    // The pickup lies on the tile of the exit, so the hero's body overlaps both on the 11th step.
    const game = newGame(world({ interactables: [pickupAt('exit-potion', 5, 3, 2)] }));

    expect(walk(game, 'right', 11)).toEqual([
      { type: 'pickup', item: { kind: 'consumable', id: 'healing-potion', amount: 2 } },
      { type: 'area-changed', areaId: 'cellar' },
    ]);

    expect(playingView(game).hero.consumables['healing-potion']).toBe(2);
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

describe('Arrows and Adventure Areas', () => {
  // The field is 14 x 7 tiles (see fixtures.ts), wide enough for an arrow to be in the air when the hero reaches the
  // exit. The hero stands at (6.5, 3.5) and shoots to the right, along row 3. The exit is on the tile (8, 3): the
  // hero's right edge reaches x = 8 after 10 steps and the hero is in the exit on the 11th. An arrow flies 0.25 tile
  // a step, for 16 steps.
  const EXIT_ON_THE_FIELD: ExitDefinition = { ...TO_CELLAR, zone: { col: 8, row: 3, width: 1, height: 1 } };

  /** The hero has opened the cache below it, has the bow in hand and faces right. */
  function archerOnTheField(monsters: ArenaOptions['monsters'] = []): Game {
    const game = newGame(
      world({
        layout: FIELD_LAYOUT,
        start: { area: 'arena', tile: { col: 6, row: 3 } },
        hero: { startingGear: WITH_BOW },
        interactables: [cacheAt('cache', 6, 4, 5)],
        exits: [EXIT_ON_THE_FIELD],
        monsters,
      }),
    );
    game.send({ type: 'interact' });
    game.send({ type: 'switch-weapon' });
    face(game, 'right');
    return game;
  }

  it('are gone when the hero goes through an exit: a save made then holds none, and none flies on when it comes back', () => {
    const game = archerOnTheField();
    game.send({ type: 'attack' });
    walk(game, 'right', 10);
    expect(playingView(game).arrows, 'still in the air just before the exit').toHaveLength(1);

    walk(game, 'right', 1);

    expect(playingView(game).area.id).toBe('cellar');
    expect(game.snapshot().state.arrows, 'a save made in the cellar').toEqual([]);

    // The way back takes 3 steps, 14 steps after the shot: the arrow would still have 2 steps of flight left.
    walk(game, 'left', 3);
    expect(playingView(game).area.id).toBe('arena');
    expect(playingView(game).arrows).toEqual([]);
    advance(game, 5);
    expect(playingView(game).arrows).toEqual([]);
    expect(game.snapshot().state.arrows).toEqual([]);
  });

  it('fly their last step in the area the hero leaves: an arrow that reaches a monster in that step still hurts it', () => {
    // The dummy on the tile (9, 3), behind the exit, begins at x = 9.25. The tip of the arrow is at x = 9.125 after 10
    // steps and reaches the dummy in the 11th, the step in which the hero is in the exit.
    const game = archerOnTheField([dummyAt('dummy-1', 9, 3)]);
    game.send({ type: 'attack' });

    const events = walk(game, 'right', 11);

    expect(events).toEqual([
      { type: 'monster-hit', monsterId: 'dummy-1', damage: 3, health: 0 },
      { type: 'monster-defeated', monsterId: 'dummy-1' },
      { type: 'experience-gained', amount: 5 },
      { type: 'area-changed', areaId: 'cellar' },
    ]);
  });
});

describe('Defeat in a connected Adventure Area', () => {
  /**
   * The arena's weakling falls to the first strike, the hero goes to the cellar and strikes down the weakling there,
   * and the biter's hit lands on the 31st step after the hero came in. By then the hero has walked on to (3.25, 3.5),
   * still in the zone the biter chose, so defeat has to send it back from there. Returns the events of the 31st step.
   */
  function fallInTheCellar(): { game: Game; events: readonly GameEvent[] } {
    const game = newGame(
      world(
        {
          monsters: [{ id: 'arena-weakling', type: 'weakling', tile: { col: 3, row: 4 } }],
          monsterTypes: WEAKLING,
          hero: { health: 5 },
        },
        { monsters: [{ id: 'cellar-weakling', type: 'weakling', tile: { col: 3, row: 3 } }, biterAt('cellar-biter', 2, 4)] },
      ),
    );
    strike(game);
    walk(game, 'right', 11);
    strike(game);
    walk(game, 'right', 6);
    return { game, events: advance(game, 1) };
  }

  it('sends the hero back to the arena, where the adventure began, at full Health: no Checkpoint of the cellar was touched', () => {
    const { game, events } = fallInTheCellar();

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated', 'area-changed']);
    expect(events.at(-1)).toEqual({ type: 'area-changed', areaId: 'arena' });
    const view = playingView(game);
    expect(view.area.id).toBe('arena');
    expect(view.hero.position).toEqual({ x: 3.5, y: 3.5 });
    expect(view.hero.health).toBe(5);
  });

  it('starts only the area of the Checkpoint: its monsters are back, and those of the area where the hero fell stay as they were', () => {
    const { game } = fallInTheCellar();

    expect(playingView(game).monsters.map((monster) => monster.id)).toEqual(['arena-weakling']);
    expect(monsterNamed(game, 'arena-weakling')).toMatchObject({ health: 1, position: { x: 3.5, y: 4.5 }, action: { type: 'idle' } });

    // Back in the cellar the weakling the hero struck down is still down, and the biter is where it was, unhurt.
    walk(game, 'right', 11);

    expect(playingView(game).area.id).toBe('cellar');
    expect(playingView(game).monsters.map((monster) => monster.id)).toEqual(['cellar-biter']);
    expect(monsterNamed(game, 'cellar-biter')).toMatchObject({ health: 3, position: { x: 2.5, y: 4.5 } });
  });

  it('calms the monsters of the area where the hero fell, so that none finishes a wind-up when the hero comes back', () => {
    // Both biters hit on the 31st step after the hero came in. The first one's hit takes all of the hero's Health, and
    // the second, at the end of its wind-up, is not asked to act again that step.
    const game = newGame(
      world({ hero: { health: 5 } }, { monsters: [biterAt('biter-a', 2, 4), biterAt('biter-b', 3, 3)] }),
    );
    walk(game, 'right', 11);
    expect(advance(game, 30).map((event) => event.type)).not.toContain('hero-hit');
    expect(advance(game, 1).map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated', 'area-changed']);

    // The hero walks back in to (2.5, 3.5): both biters begin their wind-ups over, and the hit lands 31 steps later.
    walk(game, 'right', 11);
    expect(playingView(game).area.id).toBe('cellar');

    expect(advance(game, 30).map((event) => event.type)).not.toContain('hero-hit');
    expect(advance(game, 1)).toContainEqual(expect.objectContaining({ type: 'hero-hit', monsterId: 'biter-a' }));
  });

  it('does not send the hero back to the entrance it came in by: with no Checkpoint touched it returns to the start', () => {
    const first: EntranceDefinition = { id: 'first', tile: { col: 1, row: 1 } };
    const game = newGame(
      world({ monsters: [biterAt('arena-biter', 4, 4)], entrances: [first, FROM_CELLAR], hero: { health: 5 } }),
    );
    goThereAndBack(game);

    // The biter was calm while the hero was away: it winds up from the next step and hits on the 31st.
    walk(game, 'left', 2);
    advance(game, 28);
    const events = advance(game, 1);

    expect(events.map((event) => event.type)).toContain('hero-defeated');
    expect(playingView(game).area.id).toBe('arena');
    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 3.5 });
  });

  describe('with the bow and Ammunition found', () => {
    /**
     * The hero opens the cache of the arena (5 arrows), takes the bow in hand, goes down to the cellar, opens the cache
     * there (3 arrows) and comes back to the arena, to its entrance. The biter of the arena was calm while the hero was
     * away: it winds up from the next step and hits on the 31st. The hero shoots one arrow to the left after the 20th
     * step, so that the arrow is in the air when the hit lands. Returns the game one step before the hit.
     */
    function aboutToFallWithTheBow(): Game {
      const game = newGame(
        world(
          {
            monsters: [biterAt('arena-biter', 4, 4)],
            interactables: [cacheAt('arena-cache', 3, 4, 5)],
            hero: { health: 5, startingGear: WITH_BOW },
          },
          { interactables: [cacheAt('cellar-cache', 4, 3, 3)] },
        ),
      );
      game.send({ type: 'interact' });
      game.send({ type: 'switch-weapon' });
      walk(game, 'right', 11);
      walk(game, 'right', 10);
      game.send({ type: 'interact' });
      walk(game, 'left', 13);
      advance(game, 20);
      face(game, 'left');
      game.send({ type: 'attack' });
      advance(game, 10);
      return game;
    }

    it('takes the arrows in the air and nothing else from the hero: it keeps the bow in hand and the Ammunition', () => {
      const game = aboutToFallWithTheBow();
      expect(playingView(game).arrows, 'in the air just before the hit').toHaveLength(1);

      expect(advance(game, 1).map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated']);

      const view = playingView(game);
      expect(view.area.id).toBe('arena');
      expect(view.hero).toMatchObject({
        position: { x: 3.5, y: 3.5 },
        health: 5,
        activeWeapon: 'ranged-weapon',
        consumables: { ammunition: 7 },
      });
      expect(view.arrows).toEqual([]);
      advance(game, 10);
      expect(playingView(game).arrows).toEqual([]);
    });

    it('leaves the caches the hero opened open, in both areas: dying gives no new arrows', () => {
      const game = aboutToFallWithTheBow();
      advance(game, 1);

      expect(playingView(game).interactables).toEqual([expect.objectContaining({ id: 'arena-cache', opened: true })]);
      walk(game, 'right', 11);
      expect(playingView(game).area.id).toBe('cellar');
      expect(playingView(game).interactables).toEqual([expect.objectContaining({ id: 'cellar-cache', opened: true })]);
      expect(playingView(game).hero.consumables.ammunition).toBe(7);
    });
  });
});

describe('Area text', () => {
  const CELLAR_TEXT = 'A damp cellar.';

  it('is shown when the hero first enters an area, as an event and in the view, and the hero can walk on', () => {
    const game = newGame(world({}, { text: CELLAR_TEXT }));
    expect(playingView(game).areaText).toBeNull();

    const events = walk(game, 'right', 11);

    expect(events.slice(-2)).toEqual([
      { type: 'area-changed', areaId: 'cellar' },
      { type: 'area-text', areaId: 'cellar', text: CELLAR_TEXT },
    ]);
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);

    // Nothing is paused or blocked while it shows.
    walk(game, 'right', 2);
    expect(playingView(game).hero.position).toEqual({ x: 2.75, y: 3.5 });
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);
  });

  it('is shown only on the first entry, not when the hero comes back to the area', () => {
    const game = newGame(world({}, { text: CELLAR_TEXT }));
    goThereAndBack(game);

    const events = walk(game, 'right', 3);

    expect(events).toContainEqual({ type: 'area-changed', areaId: 'cellar' });
    expect(events.map((event) => event.type)).not.toContain('area-text');
    expect(playingView(game).areaText).toBeNull();
  });

  it('is nothing for an area that has none', () => {
    const game = newGame(world());

    const events = walk(game, 'right', 11);

    expect(events.map((event) => event.type)).not.toContain('area-text');
    expect(playingView(game).areaText).toBeNull();
  });

  it('is shown at the start of a new game when the start area has one, so that the first view already has it', () => {
    const game = gameAtTitle(arena({ text: 'The wreck.' }));

    expect(game.send({ type: 'new-game' })).toEqual([{ type: 'area-text', areaId: 'arena', text: 'The wreck.' }]);

    expect(playingView(game).areaText).toBe('The wreck.');
  });

  it('is replaced when the hero leaves: by the text of an area it has not seen, or by nothing for one it has', () => {
    const game = newGame(world({ text: 'The wreck.' }, { text: CELLAR_TEXT }));
    expect(playingView(game).areaText).toBe('The wreck.');

    walk(game, 'right', 11);
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);

    walk(game, 'left', 3);
    expect(playingView(game).areaText).toBeNull();
  });

  it('stays for 4 seconds, which is 240 steps, unless the content says otherwise, and then goes', () => {
    const game = newGame(world({}, { text: CELLAR_TEXT }));
    walk(game, 'right', 11);

    advance(game, 239);
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);

    advance(game, 1);
    expect(playingView(game).areaText).toBeNull();
  });

  it('stays for as long as the content says: half a second is 30 steps', () => {
    const game = newGame(world({ areaTextMs: 500 }, { text: CELLAR_TEXT }));
    walk(game, 'right', 11);

    advance(game, 29);
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);

    advance(game, 1);
    expect(playingView(game).areaText).toBeNull();
  });

  it('waits while a page is open over the game, because the game is paused then', () => {
    const game = newGame(world({}, { text: CELLAR_TEXT }));
    walk(game, 'right', 11);

    game.send({ type: 'open-page', page: 'stats' });
    advance(game, 300);
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);

    game.send({ type: 'close-page', page: 'stats' });
    advance(game, 239);
    expect(playingView(game).areaText).toBe(CELLAR_TEXT);
    advance(game, 1);
    expect(playingView(game).areaText).toBeNull();
  });

  it('is not shown again for a game that was saved and continued, and a text on show runs on', () => {
    const game = newGame(world({}, { text: CELLAR_TEXT }));
    walk(game, 'right', 11);
    advance(game, 100);
    const resumed = gameAtTitle(world({}, { text: CELLAR_TEXT }));
    resumed.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(playingView(resumed).areaText).toBe(CELLAR_TEXT);
    advance(resumed, 139);
    expect(playingView(resumed).areaText).toBe(CELLAR_TEXT);
    advance(resumed, 1);
    expect(playingView(resumed).areaText).toBeNull();

    walk(resumed, 'left', 3);
    const events = walk(resumed, 'right', 3);
    expect(events).toContainEqual({ type: 'area-changed', areaId: 'cellar' });
    expect(events.map((event) => event.type)).not.toContain('area-text');
  });
});

describe('Saving a game across several Adventure Areas', () => {
  it('restores the area the hero is in and what happened in each area, and then plays on the same', () => {
    const content = world(
      {
        text: 'The wreck.',
        monsters: [{ id: 'arena-weakling', type: 'weakling', tile: { col: 3, row: 4 } }],
        monsterTypes: WEAKLING,
      },
      { text: 'A damp cellar.', interactables: [chestAt('cellar-chest', 4, 3, 'iron-sword')] },
    );
    const game = newGame(content);
    strike(game);
    walk(game, 'right', 11);
    walk(game, 'right', 10);
    game.send({ type: 'interact' });

    const resumed = gameAtTitle(content);
    resumed.send({ type: 'continue', snapshot: throughStorage(game.snapshot()) });

    expect(resumed.view()).toEqual(game.view());
    expect(playingView(resumed).interactables).toEqual([expect.objectContaining({ id: 'cellar-chest', opened: true })]);

    // Back in the arena, the weakling is still defeated and the text is not shown again, in both games alike.
    const eventsAfter = walk(resumed, 'left', 13);
    expect(eventsAfter).toEqual(walk(game, 'left', 13));
    expect(eventsAfter.map((event) => event.type)).not.toContain('area-text');
    expect(resumed.view()).toEqual(game.view());
    expect(playingView(resumed).monsters).toEqual([]);
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

  it('refuses an area text that is blank', () => {
    expectRefused(world({}, { text: '   ' }), 'Area "cellar": the area text is blank');
  });

  it.each([0, -5, Number.NaN])('refuses an area text duration of %s milliseconds', (areaTextMs) => {
    expectRefused(
      world({ areaTextMs }),
      `The area text duration must be at least one fixed step (16.7 ms), but it is ${areaTextMs}`,
    );
  });
});
