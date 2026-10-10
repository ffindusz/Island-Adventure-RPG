import { describe, expect, it } from 'vitest';
import type {
  AreaDefinition,
  CheckpointDefinition,
  ContentDefinition,
  EntranceDefinition,
  ExitDefinition,
  Game,
} from '../src/core';
import {
  ARENA_LAYOUT,
  BITER,
  WITH_BOW,
  advance,
  arena,
  biterAt,
  cacheAt,
  chestAt,
  chestViews,
  dummyAt,
  expectRefused,
  face,
  frailMonster,
  gameAtTitle,
  milestone,
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
//   arena   entrance "from-cellar" at tile (4, 3), exit "to-cellar" on tile (5, 3)
//   cellar  entrance "from-arena" at tile (2, 3), exit "to-arena" on tile (1, 3)
//
// The hero starts at (3.5, 3.5) in the arena. Its body is 0.5 wide and a step is 0.125.

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
  checkpoints: [{ id: 'cellar-checkpoint', tile: { col: 1, row: 1 } }],
};

/** The arena and the cellar, with the hero in the arena. `cellar` replaces parts of the cellar. */
function world(arenaOptions: ArenaOptions = {}, cellar: Partial<AreaDefinition> = {}): ContentDefinition {
  return arena({
    entrances: [FROM_CELLAR],
    exits: [TO_CELLAR],
    ...arenaOptions,
    otherAreas: [{ ...CELLAR, ...cellar }],
  });
}

describe('Checkpoints in the content', () => {
  it('an Adventure Area without a Checkpoint is refused', () => {
    expectRefused(arena({ checkpoints: [] }), 'Area "arena" has no Checkpoint');
  });

  it('two Checkpoints have the same id, even in different Adventure Areas', () => {
    const cellar = {
      id: 'cellar',
      name: 'Cellar',
      layout: ARENA_LAYOUT,
      monsters: [],
      checkpoints: [{ id: 'arena-checkpoint', tile: { col: 2, row: 1 } }],
    };

    expectRefused(arena({ otherAreas: [cellar] }), 'Checkpoint id "arena-checkpoint" is used more than once');
  });

  it.each([
    { where: 'on water', tile: { col: 2, row: 2 }, described: '(col 2, row 2)' },
    { where: 'in a wall', tile: { col: 0, row: 3 }, described: '(col 0, row 3)' },
    { where: 'outside the map', tile: { col: 7, row: 1 }, described: '(col 7, row 1)' },
  ])('a Checkpoint $where is refused', ({ tile, described }) => {
    expectRefused(
      arena({ checkpoints: [{ id: 'gate', tile }] }),
      `Area "arena": Checkpoint "gate" is placed at ${described}, which is solid terrain or outside the map`,
    );
  });

  it('a Checkpoint inside an exit is refused: defeat would send the hero straight through the exit', () => {
    expectRefused(
      world({ checkpoints: [{ id: 'gate', tile: { col: 5, row: 3 } }] }),
      'Area "arena": Checkpoint "gate" is inside exit "to-cellar", which would send the hero straight through it',
    );
  });

  it.each([
    { what: 'a chest', interactable: chestAt('chest', 2, 3, 'iron-sword'), named: 'chest "chest"' },
    { what: 'a pickup', interactable: pickupAt('potion', 2, 3, 1), named: 'pickup "potion"' },
  ])('$what on the tile of a Checkpoint is refused', ({ interactable, named }) => {
    expectRefused(
      arena({ checkpoints: [{ id: 'gate', tile: { col: 2, row: 3 } }], interactables: [interactable] }),
      `Area "arena": ${named} is placed at (col 2, row 3), where Checkpoint "gate" stands`,
    );
  });

  it('a monster that starts on the tile of a Checkpoint is refused', () => {
    expectRefused(
      arena({ checkpoints: [{ id: 'gate', tile: { col: 2, row: 3 } }], monsters: [dummyAt('dummy', 2, 3)] }),
      'Area "arena": Checkpoint "gate" is placed at (col 2, row 3), where monster "dummy" starts',
    );
  });
});

// The hero stands at (3.5, 3.5) and the camp is the tile below it. Walking down, the bottom edge of the hero's body
// reaches the camp, at y = 4, after 2 steps and overlaps it on the 3rd.
const CAMP: CheckpointDefinition = { id: 'camp', tile: { col: 3, row: 4 } };
const CAMP_VIEW = { id: 'camp', position: { x: 3.5, y: 4.5 }, size: 1 };
const CAMP_ACTIVATED = { type: 'checkpoint-activated', checkpointId: 'camp' } as const;

// A biter beside the hero: it starts its wind-up on the 1st step with the hero in its zone, and strikes on the 31st
// step for 5 damage. The zone stays where it was, and it still covers the hero at the camp.
const BITER_BESIDE_HERO = biterAt('biter', 4, 3);
const BITE = { type: 'hero-hit', monsterId: 'biter', damage: 5, health: 5 } as const;

// The beach is the tile to the right of the camp (sand, so the hero can walk on it). Walking right from the camp, the
// hero's body overlaps it on the 3rd step.
const BEACH: CheckpointDefinition = { id: 'beach', tile: { col: 4, row: 4 } };
const BEACH_ACTIVATED = { type: 'checkpoint-activated', checkpointId: 'beach' } as const;

// The door is the entrance of the cellar, where the hero arrives coming from the arena.
const DOOR: CheckpointDefinition = { id: 'cellar-door', tile: { col: 2, row: 3 } };
const DOOR_ACTIVATED = { type: 'checkpoint-activated', checkpointId: 'cellar-door' } as const;

const WEAKLING = { weakling: frailMonster(0) };

// The lookout is the tile up and to the right of the hero's start. Walking up from the start, the hero's body overlaps
// the tile (3, 2) on the 3rd step, and walking right from there it overlaps the lookout, on the tile (4, 2), on the 3rd.
const LOOKOUT: CheckpointDefinition = { id: 'lookout', tile: { col: 4, row: 2 } };
const LOOKOUT_ACTIVATED = { type: 'checkpoint-activated', checkpointId: 'lookout' } as const;

const INTERACT = { type: 'interact' } as const;
const ATTACK = { type: 'attack' } as const;
const OPEN_INVENTORY = { type: 'open-page', page: 'inventory' } as const;
const CLOSE_INVENTORY = { type: 'close-page', page: 'inventory' } as const;
const USE_POTION = { type: 'use-healing-potion' } as const;

function tookPotions(amount: number) {
  return { type: 'pickup', item: { kind: 'consumable', id: 'healing-potion', amount } } as const;
}

function tookArrows(amount: number) {
  return { type: 'pickup', item: { kind: 'consumable', id: 'ammunition', amount } } as const;
}

/** The ids of the pickups lying on the ground in the hero's Adventure Area. */
function pickupIds(game: Game): string[] {
  return playingView(game).interactables.flatMap((item) => (item.kind === 'pickup' ? [item.id] : []));
}

/** Steps the game until the hero is defeated, which has to happen within 300 steps. */
function untilDefeated(game: Game): void {
  for (let step = 0; step < 300; step += 1) {
    if (game.step().some((event) => event.type === 'hero-defeated')) {
      return;
    }
  }
  throw new Error('The hero was not defeated within 300 steps');
}

describe('Touching a Checkpoint', () => {
  it('activates it, which the event and the view say', () => {
    const game = newGame(arena({ checkpoints: [CAMP] }));
    expect(playingView(game).checkpoints).toEqual([{ ...CAMP_VIEW, active: false }]);

    expect(walk(game, 'down', 2)).not.toContainEqual(CAMP_ACTIVATED);
    expect(playingView(game).checkpoints).toEqual([{ ...CAMP_VIEW, active: false }]);

    expect(walk(game, 'down', 1)).toContainEqual(CAMP_ACTIVATED);
    expect(playingView(game).checkpoints).toEqual([{ ...CAMP_VIEW, active: true }]);
  });

  it('is active in its own Adventure Area only: a Checkpoint on the same tile of another area is not', () => {
    // The adventure starts on tile (3, 3) of the arena, which is where defeat sends the hero until it touches another
    // Checkpoint. The cellar has a Checkpoint on its own tile (3, 3), which the hero does not touch when it comes in
    // at (2.5, 3.5).
    const twin: CheckpointDefinition = { id: 'cellar-twin', tile: { col: 3, row: 3 } };
    const game = newGame(world({}, { checkpoints: [twin] }));

    walk(game, 'right', 11);

    expect(playingView(game).area.id).toBe('cellar');
    expect(playingView(game).checkpoints).toEqual([
      { id: 'cellar-twin', position: { x: 3.5, y: 3.5 }, size: 1, active: false },
    ]);
  });

  it('restores the hero to full Health', () => {
    const game = newGame(arena({ checkpoints: [CAMP], monsters: [BITER_BESIDE_HERO] }));
    expect(advance(game, 31)).toContainEqual(BITE);
    expect(playingView(game).hero.health).toBe(5);

    walk(game, 'down', 3);

    expect(playingView(game).hero.health).toBe(10);
  });

  it('happens as the hero comes onto it: standing there does nothing more, and coming back does', () => {
    const game = newGame(arena({ checkpoints: [CAMP], monsters: [BITER_BESIDE_HERO] }));
    walk(game, 'down', 3);

    const standing = advance(game, 28);
    expect(standing).toContainEqual(BITE);
    expect(standing).not.toContainEqual(CAMP_ACTIVATED);
    expect(playingView(game).hero.health).toBe(5);

    walk(game, 'up', 3);
    expect(walk(game, 'down', 3)).toContainEqual(CAMP_ACTIVATED);
    expect(playingView(game).hero.health).toBe(10);
  });

  it('leaves what the hero carries, opened and took as it is: Ammunition does not come back, nothing is put back', () => {
    // The hero opens the cache below it (5 arrows), takes the bow in hand, shoots one arrow to the left, takes the 2
    // potions on the tile (3, 2) and touches the lookout.
    const game = newGame(
      arena({
        hero: { startingGear: WITH_BOW },
        checkpoints: [LOOKOUT],
        interactables: [cacheAt('arena-cache', 3, 4, 5), pickupAt('arena-potions-1', 3, 2, 2)],
      }),
    );
    game.send(INTERACT);
    game.send({ type: 'switch-weapon' });
    face(game, 'left');
    game.send(ATTACK);
    walk(game, 'up', 3);

    expect(walk(game, 'right', 3)).toContainEqual(LOOKOUT_ACTIVATED);

    expect(playingView(game).hero.consumables).toEqual({ ammunition: 4, 'healing-potion': 2 });
    expect(chestViews(game)).toEqual([expect.objectContaining({ id: 'arena-cache', opened: true })]);
    expect(pickupIds(game)).toEqual([]);
  });
});

describe('Arriving on a Checkpoint', () => {
  // The hero walks right along row 3 and is in the exit, on tile (5, 3), on the 11th step. It arrives in the cellar at
  // the entrance on tile (2, 3), where the door is.
  it('activates it once the hero is in the new area, and not again while it stays', () => {
    const game = newGame(world({}, { checkpoints: [DOOR] }));

    const events = walk(game, 'right', 11);

    expect(events.slice(-2)).toEqual([{ type: 'area-changed', areaId: 'cellar' }, DOOR_ACTIVATED]);
    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ id: 'cellar-door', active: true })]);
    expect(advance(game, 5)).not.toContainEqual(DOOR_ACTIVATED);
  });

  it('does not activate a Checkpoint elsewhere in the area', () => {
    const elsewhere: CheckpointDefinition = { id: 'cellar-corner', tile: { col: 4, row: 4 } };
    const game = newGame(world({}, { checkpoints: [elsewhere] }));

    expect(walk(game, 'right', 11)).not.toContainEqual(expect.objectContaining({ type: 'checkpoint-activated' }));
    expect(playingView(game).checkpoints).toEqual([expect.objectContaining({ active: false })]);
  });
});

describe('Defeat with Checkpoints', () => {
  // The hero has 5 Health, so the biter's hit on the 31st step takes all of it. The hero stays in the biter's zone
  // (x 3.5 to 5.5, y 2.5 to 4.5) on every walk below, and the biter's body (x 4.25 to 4.75) is never in its way.
  function frailHeroWithCampAndBeach(): Game {
    return newGame(arena({ hero: { health: 5 }, checkpoints: [CAMP, BEACH], monsters: [BITER_BESIDE_HERO] }));
  }

  it('sends the hero back to the Checkpoint it touched last, at full Health', () => {
    const game = frailHeroWithCampAndBeach();
    expect(walk(game, 'down', 3)).toContainEqual(CAMP_ACTIVATED);
    // The hero is at (3.875, 3.875): its body overlaps the camp still, and the beach from this step on.
    const arrival = walk(game, 'right', 3);
    expect(arrival).toContainEqual(BEACH_ACTIVATED);
    expect(arrival).not.toContainEqual(CAMP_ACTIVATED);
    expect(advance(game, 24)).not.toContainEqual({ type: 'hero-defeated' });

    expect(advance(game, 1)).toContainEqual({ type: 'hero-defeated' });

    const { hero, area } = playingView(game);
    expect(hero).toMatchObject({ position: { x: 4.5, y: 4.5 }, health: 5, maxHealth: 5 });
    expect(area.id).toBe('arena');
  });

  it('counts the last Checkpoint touched, which may have been touched before another one', () => {
    const game = frailHeroWithCampAndBeach();
    walk(game, 'down', 3); // the camp
    walk(game, 'right', 3); // the beach
    walk(game, 'up', 3); // clear of both
    walk(game, 'left', 3);
    expect(walk(game, 'down', 3)).toEqual([CAMP_ACTIVATED]); // the camp again, at (3.5, 3.875): step 15
    expect(advance(game, 15)).not.toContainEqual({ type: 'hero-defeated' });

    expect(advance(game, 1)).toContainEqual({ type: 'hero-defeated' });

    expect(playingView(game).hero).toMatchObject({ position: { x: 3.5, y: 4.5 }, health: 5 });
  });

  it('does so from another Adventure Area: back to the Checkpoint of the arena, though the hero fell in the cellar', () => {
    // The camp is touched on the 3rd step, the exit reached on the 14th: the hero arrives in the cellar at (2.5, 3.5),
    // within the zone of the biter on tile (3, 3), whose hit lands on the 31st step after that.
    const game = newGame(
      world({ hero: { health: 5 }, checkpoints: [CAMP] }, { monsters: [biterAt('cellar-biter', 3, 3)] }),
    );
    walk(game, 'down', 3);
    walk(game, 'right', 11);
    expect(playingView(game).area.id).toBe('cellar');
    expect(advance(game, 30)).not.toContainEqual({ type: 'hero-defeated' });

    const events = advance(game, 1);

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated', 'area-changed']);
    const view = playingView(game);
    expect(view.area.id).toBe('arena');
    expect(view.hero).toMatchObject({ position: { x: 3.5, y: 4.5 }, health: 5 });
    expect(view.checkpoints).toEqual([{ ...CAMP_VIEW, active: true }]);
  });

  it('takes the text of the area where the hero fell off the screen', () => {
    // As above, with the text of the cellar on the screen from the hero's arrival, 31 steps before the defeat.
    const game = newGame(
      world(
        { hero: { health: 5 }, checkpoints: [CAMP] },
        { text: 'A damp cellar.', monsters: [biterAt('cellar-biter', 3, 3)] },
      ),
    );
    walk(game, 'down', 3);
    walk(game, 'right', 11);
    advance(game, 30);
    expect(playingView(game).areaText).toBe('A damp cellar.');

    expect(advance(game, 1)).toContainEqual({ type: 'hero-defeated' });

    expect(playingView(game).area.id).toBe('arena');
    expect(playingView(game).areaText).toBeNull();
  });

  it('may send the hero to a Checkpoint of the cellar, from the arena it has gone back to', () => {
    // The door of the cellar is touched on arrival. The hero walks back out, to the arena entrance, where the biter at
    // (4, 4) winds up from the first step after the arrival and hits on the 31st.
    const game = newGame(
      world({ hero: { health: 5 }, monsters: [biterAt('arena-biter', 4, 4)] }, { checkpoints: [DOOR] }),
    );
    walk(game, 'right', 11);
    walk(game, 'left', 3);
    expect(playingView(game).area.id).toBe('arena');
    expect(advance(game, 30)).not.toContainEqual({ type: 'hero-defeated' });

    const events = advance(game, 1);

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit', 'hero-defeated', 'area-changed']);
    expect(events.at(-1)).toEqual({ type: 'area-changed', areaId: 'cellar' });
    expect(playingView(game).hero).toMatchObject({ position: { x: 2.5, y: 3.5 }, health: 5 });
  });
});

describe('Monsters and Checkpoints', () => {
  it('stay defeated when the hero touches a Checkpoint or goes from one area to the other and back', () => {
    // The hero turns left and strikes the weakling on tile (2, 3) down. The hero then touches the camp, goes through the
    // exit to the cellar, where it touches the door, and comes back to the arena.
    const game = newGame(
      world(
        { monsters: [{ id: 'weakling', type: 'weakling', tile: { col: 2, row: 3 } }], monsterTypes: WEAKLING, checkpoints: [CAMP] },
        { checkpoints: [DOOR] },
      ),
    );
    face(game, 'left');
    expect(strike(game)).toContainEqual({ type: 'monster-defeated', monsterId: 'weakling' });
    expect(playingView(game).monsters).toEqual([]);

    expect(walk(game, 'down', 3)).toContainEqual(CAMP_ACTIVATED);
    expect(playingView(game).monsters).toEqual([]);

    expect(walk(game, 'right', 11)).toContainEqual(DOOR_ACTIVATED);
    walk(game, 'left', 3);

    expect(playingView(game).area.id).toBe('arena');
    expect(playingView(game).monsters).toEqual([]);
  });
});

describe('Defeat and the consumables', () => {
  /**
   * The hero opens the cache of the arena (5 arrows) and takes the bow in hand, takes the 2 potions on the tile (3, 2)
   * and touches the lookout, which records 5 arrows and 2 potions. It takes the potion on the tile (5, 2) on its way
   * through the exit to the cellar, where it arrives at (2.5, 3.5): it takes the 2 potions on the tile (2, 4), opens the
   * cache of 3 arrows beside them and shoots an arrow. The biter hits on the 31st step after the arrival, taking 5 of
   * the hero's 10 Health, the hero drinks a potion, and the biter finishes it some time later.
   *
   *   arrows   5 -> 8 -> 7        potions   2 -> 3 -> 5 -> 4
   */
  function worldOfTheFall(): ContentDefinition {
    return world(
      {
        hero: { startingGear: WITH_BOW },
        checkpoints: [LOOKOUT],
        interactables: [
          cacheAt('arena-cache', 3, 4, 5),
          pickupAt('arena-potions-1', 3, 2, 2),
          pickupAt('arena-potions-2', 5, 2, 1),
        ],
      },
      {
        monsters: [biterAt('cellar-biter', 3, 3)],
        interactables: [pickupAt('cellar-potions', 2, 4, 2), cacheAt('cellar-cache', 3, 4, 3)],
      },
    );
  }

  /** The hero has done all that and has 8 Health, 7 arrows and 4 potions: the biter is about to hit it again. */
  function aboutToFall(): Game {
    const game = newGame(worldOfTheFall());
    game.send(INTERACT);
    game.send({ type: 'switch-weapon' });
    walk(game, 'up', 3);
    expect(walk(game, 'right', 3)).toContainEqual(LOOKOUT_ACTIVATED);
    walk(game, 'right', 8);
    expect(playingView(game).area.id).toBe('cellar');
    walk(game, 'down', 3);
    face(game, 'right');
    game.send(INTERACT);
    face(game, 'left');
    game.send(ATTACK);
    expect(advance(game, 28)).toContainEqual({ type: 'hero-hit', monsterId: 'cellar-biter', damage: 5, health: 5 });
    game.send(OPEN_INVENTORY);
    game.send(USE_POTION);
    game.send(CLOSE_INVENTORY);
    expect(playingView(game).hero).toMatchObject({ health: 8, consumables: { ammunition: 7, 'healing-potion': 4 } });
    return game;
  }

  function fallInTheCellar(): Game {
    const game = aboutToFall();
    untilDefeated(game);
    return game;
  }

  it('gives back the Ammunition and the Healing Potions the hero had at the Checkpoint: what it spent comes back, what it found goes', () => {
    const game = fallInTheCellar();

    const view = playingView(game);
    expect(view.area.id).toBe('arena');
    expect(view.hero).toMatchObject({
      position: { x: 4.5, y: 2.5 },
      health: 10,
      consumables: { ammunition: 5, 'healing-potion': 2 },
    });
  });

  /**
   * The hero is on the lookout again after the fall. It takes the potion on the tile (5, 2), which its 3rd step to the
   * right reaches, and its 3rd step down is in the exit: it arrives in the cellar at (2.5, 3.5).
   */
  function backToTheCellar(game: Game): void {
    walk(game, 'right', 3);
    walk(game, 'down', 3);
    expect(playingView(game).area.id).toBe('cellar');
  }

  it('puts a pickup the hero took after the Checkpoint back on the ground in the area of the Checkpoint', () => {
    const game = fallInTheCellar();
    expect(pickupIds(game)).toEqual(['arena-potions-2']);

    expect(walk(game, 'right', 3)).toEqual([tookPotions(1)]);
  });

  it('puts a pickup the hero took after the Checkpoint back on the ground in the area where it fell, too', () => {
    const game = fallInTheCellar();
    backToTheCellar(game);
    expect(pickupIds(game)).toEqual(['cellar-potions']);

    expect(walk(game, 'down', 3)).toEqual([tookPotions(2)]);
  });

  it('closes a cache the hero opened after the Checkpoint again, and leaves open one it opened before', () => {
    const game = fallInTheCellar();
    expect(chestViews(game)).toEqual([expect.objectContaining({ id: 'arena-cache', opened: true })]);
    backToTheCellar(game);
    expect(chestViews(game)).toEqual([expect.objectContaining({ id: 'cellar-cache', opened: false })]);

    walk(game, 'down', 3);
    face(game, 'right');
    expect(game.send(INTERACT)).toEqual([{ type: 'chest-opened', chestId: 'cellar-cache' }, tookArrows(3)]);
    expect(playingView(game).hero.consumables).toEqual({ ammunition: 8, 'healing-potion': 5 });
  });

  it('does not put back a pickup the hero took before the Checkpoint', () => {
    const game = fallInTheCellar();

    // The hero is on the lookout, and its 3rd step to the left is onto the tile (3, 2), where it took 2 potions.
    expect(walk(game, 'left', 3)).toEqual([]);

    expect(playingView(game).hero.consumables).toEqual({ ammunition: 5, 'healing-potion': 2 });
  });

  it('does not put back a pickup the hero took in the other area before the Checkpoint', () => {
    // The hero takes the 2 potions on the tile (3, 2) of the arena, goes through the exit and touches the door of the
    // cellar as it arrives. The biter on the tile (3, 3) defeats it: it is back at the door, and goes through the exit
    // on its 3rd step to the left.
    const game = newGame(
      world(
        { hero: { health: 5 }, interactables: [pickupAt('arena-potions', 3, 2, 2)] },
        { checkpoints: [DOOR], monsters: [biterAt('cellar-biter', 3, 3)] },
      ),
    );
    expect(walk(game, 'up', 3)).toContainEqual(tookPotions(2));
    walk(game, 'down', 3);
    expect(walk(game, 'right', 11)).toContainEqual(DOOR_ACTIVATED);
    untilDefeated(game);
    expect(playingView(game).area.id).toBe('cellar');

    walk(game, 'left', 3);

    expect(playingView(game).area.id).toBe('arena');
    expect(pickupIds(game)).toEqual([]);
    expect(playingView(game).hero.consumables).toEqual({ ammunition: 0, 'healing-potion': 2 });
  });

  it('keeps what the hero took on the very step it came onto the Checkpoint: the pickups are taken first', () => {
    // The hero walks right to x = 4, then down: on the 3rd step down its body comes onto the camp, on the tile (3, 4),
    // and onto the potions on the tile (4, 4) together. The biter's hit on the 31st step defeats it.
    const game = newGame(
      arena({
        hero: { health: 5 },
        checkpoints: [CAMP],
        monsters: [BITER_BESIDE_HERO],
        interactables: [pickupAt('potions', 4, 4, 2)],
      }),
    );
    walk(game, 'right', 4);

    const events = walk(game, 'down', 3);
    expect(events).toContainEqual(tookPotions(2));
    expect(events).toContainEqual(CAMP_ACTIVATED);
    untilDefeated(game);

    expect(playingView(game).hero.consumables).toEqual({ ammunition: 0, 'healing-potion': 2 });
    expect(pickupIds(game)).toEqual([]);
  });

  it('records what the hero has again each time it comes back onto the Checkpoint', () => {
    // The hero has 5 Health. It touches the camp on its 3rd step, takes the 2 potions on the tile (4, 4) in the 3 steps
    // to the right, steps clear of the camp and comes back onto it on its 12th step, which records the potions. The
    // biter's hit on the 31st step defeats it.
    const game = newGame(
      arena({
        hero: { health: 5 },
        checkpoints: [CAMP],
        monsters: [BITER_BESIDE_HERO],
        interactables: [pickupAt('potions', 4, 4, 2)],
      }),
    );
    expect(walk(game, 'down', 3)).toEqual([CAMP_ACTIVATED]);
    expect(walk(game, 'right', 3)).toEqual([tookPotions(2)]);
    walk(game, 'up', 3);
    expect(walk(game, 'down', 3)).toEqual([CAMP_ACTIVATED]);

    untilDefeated(game);

    expect(playingView(game).hero).toMatchObject({
      position: { x: 3.5, y: 4.5 },
      consumables: { ammunition: 0, 'healing-potion': 2 },
    });
    expect(pickupIds(game)).toEqual([]);
  });

  it('does the same every time the hero falls: what it finds again in its next life goes as well', () => {
    // The hero has 5 Health. It touches the camp, opens the cache to its left (5 arrows) and walks onto the beach (3
    // potions), and the biter's hit on the 31st step defeats it. The biter is whole again and hits 31 steps after
    // the fall, which leaves the hero the time to find the same things again.
    const game = newGame(
      arena({
        hero: { health: 5 },
        checkpoints: [CAMP],
        monsters: [BITER_BESIDE_HERO],
        interactables: [cacheAt('cache', 2, 4, 5), pickupAt('potions', 4, 4, 3)],
      }),
    );
    function findThem(): void {
      face(game, 'left');
      game.send(INTERACT);
      walk(game, 'right', 3);
      expect(playingView(game).hero.consumables).toEqual({ ammunition: 5, 'healing-potion': 3 });
    }
    function expectNoneFound(): void {
      expect(playingView(game).hero.consumables).toEqual({ ammunition: 0, 'healing-potion': 0 });
      expect(chestViews(game)).toEqual([expect.objectContaining({ id: 'cache', opened: false })]);
      expect(pickupIds(game)).toEqual(['potions']);
    }

    walk(game, 'down', 3);
    findThem();
    untilDefeated(game);
    expectNoneFound();

    findThem();
    untilDefeated(game);
    expectNoneFound();
  });

  it('is the same after saving and continuing: the snapshot holds the Checkpoint and what it recorded', () => {
    const original = aboutToFall();
    const restored = gameAtTitle(worldOfTheFall());
    restored.send({ type: 'continue', snapshot: throughStorage(original.snapshot()) });
    expect(restored.view()).toEqual(original.view());

    untilDefeated(original);
    untilDefeated(restored);

    expect(restored.view()).toEqual(original.view());
    const view = playingView(restored);
    expect(view.area.id).toBe('arena');
    expect(view.hero).toMatchObject({ health: 10, consumables: { ammunition: 5, 'healing-potion': 2 } });
    expect(pickupIds(restored)).toEqual(['arena-potions-2']);
  });
});

describe('Defeat and the drops of monsters', () => {
  // The dropper has 1 Health and always leaves 2 arrows when it is defeated.
  const DROPPER = { ...frailMonster(1), drops: [{ consumable: 'ammunition', chance: 1, amount: 2 }] } as const;

  it('gives back a drop of a monster of the Checkpoint\'s area: the monster is back and drops again', () => {
    // The hero touches the camp, turns left and strikes the dropper on the tile (2, 4) before the biter's hit on the
    // 31st step defeats it. The hero is back on the camp when the cooldown of its strike is over, strikes again, and
    // the monster, which came back with the area, leaves its arrows once more.
    const game = newGame(
      arena({
        hero: { health: 5 },
        checkpoints: [CAMP],
        monsters: [BITER_BESIDE_HERO, { id: 'dropper', type: 'dropper', tile: { col: 2, row: 4 } }],
        monsterTypes: { dropper: DROPPER },
      }),
    );
    walk(game, 'down', 3);
    face(game, 'left');
    expect(game.send(ATTACK)).toContainEqual(tookArrows(2));
    untilDefeated(game);
    expect(playingView(game).hero.consumables.ammunition).toBe(0);

    face(game, 'left');
    expect(game.send(ATTACK)).toContainEqual(tookArrows(2));

    expect(playingView(game).hero.consumables.ammunition).toBe(2);
  });

  it('is lost when the monster is in another area than the Checkpoint: it stays defeated and drops nothing more', () => {
    // The known edge. The hero touches the camp and goes to the cellar, where it strikes the dropper on the tile (2, 4)
    // right below its arrival, and the biter on the tile (3, 3) defeats it on the 31st step after the arrival. The
    // hero is back at the camp without the arrows, and the dropper does not come back with the cellar.
    const game = newGame(
      world(
        { hero: { health: 5 }, checkpoints: [CAMP], monsterTypes: { dropper: DROPPER } },
        { monsters: [{ id: 'dropper', type: 'dropper', tile: { col: 2, row: 4 } }, biterAt('cellar-biter', 3, 3)] },
      ),
    );
    walk(game, 'down', 3);
    walk(game, 'right', 11);
    face(game, 'down');
    expect(game.send(ATTACK)).toContainEqual(tookArrows(2));
    untilDefeated(game);
    expect(playingView(game).hero.consumables.ammunition).toBe(0);

    walk(game, 'up', 3);
    walk(game, 'right', 11);
    expect(playingView(game).area.id).toBe('cellar');
    expect(playingView(game).monsters.map((monster) => monster.id)).toEqual(['cellar-biter']);
    face(game, 'down');
    expect(game.send(ATTACK)).not.toContainEqual(expect.objectContaining({ type: 'pickup' }));
    expect(playingView(game).hero.consumables.ammunition).toBe(0);
  });
});

describe('Defeat and what the hero keeps', () => {
  /**
   * The hero touches the camp and goes through the exit to the cellar. There it reaches the milestone on the entrance
   * (4 Experience), opens the chest (an iron sword), defeats the weakling (10 Experience, which makes it Level 2),
   * assigns the Stat Point to Health and equips the iron sword. The biter then hits for far more than the hero's Health.
   */
  function growInTheCellarAndFall(): Game {
    const game = newGame(
      world(
        { checkpoints: [CAMP], monsterTypes: { weakling: frailMonster(10), biter: { ...BITER, damage: 100 } } },
        {
          monsters: [{ id: 'cellar-weakling', type: 'weakling', tile: { col: 1, row: 4 } }, biterAt('cellar-biter', 3, 3)],
          milestones: [milestone('landing', { col: 2, row: 3, width: 1, height: 1 }, 4)],
          interactables: [chestAt('cellar-chest', 3, 4, 'iron-sword')],
        },
      ),
    );
    walk(game, 'down', 3);
    walk(game, 'right', 11);
    walk(game, 'down', 3);
    face(game, 'right');
    game.send(INTERACT);
    face(game, 'left');
    expect(game.send(ATTACK)).toContainEqual({ type: 'monster-defeated', monsterId: 'cellar-weakling' });
    game.send({ type: 'assign-stat-point', stat: 'health' });
    game.send(OPEN_INVENTORY);
    game.send({ type: 'equip', gearId: 'iron-sword' });
    game.send(CLOSE_INVENTORY);
    expect(playingView(game).hero).toMatchObject({ health: 13, maxHealth: 13 });
    untilDefeated(game);
    expect(playingView(game).area.id).toBe('arena');
    return game;
  }

  it('keeps the Level, the Experience and the Stat Points the hero assigned', () => {
    const game = growInTheCellarAndFall();

    game.send({ type: 'open-page', page: 'stats' });

    expect(playingView(game).page).toMatchObject({
      id: 'stats',
      level: 2,
      experience: { earned: 4, needed: 15 },
      health: 13,
      maxHealth: 13,
    });
  });

  it('keeps all the Gear the hero carries, what it has equipped and the chest of Gear it opened', () => {
    const game = growInTheCellarAndFall();

    game.send(OPEN_INVENTORY);
    expect(playingView(game).page).toMatchObject({
      id: 'inventory',
      gear: [
        { id: 'basic-sword', equipped: false },
        { id: 'iron-sword', equipped: true },
        { id: 'basic-armor', equipped: true },
      ],
      attack: 3,
    });
    game.send(CLOSE_INVENTORY);

    // The hero goes back to the cellar, to the chest at (3, 4).
    walk(game, 'up', 3);
    walk(game, 'right', 11);
    walk(game, 'down', 3);
    face(game, 'right');
    expect(chestViews(game)).toEqual([expect.objectContaining({ id: 'cellar-chest', opened: true })]);
    expect(game.send(INTERACT)).toEqual([]);
  });

  it('keeps the milestones the hero reached: they give nothing a second time', () => {
    const game = growInTheCellarAndFall();

    // The hero goes back to the cellar, to the entrance, which is the tile of the milestone.
    walk(game, 'up', 3);
    walk(game, 'right', 11);
    expect(advance(game, 2)).toEqual([]);

    game.send({ type: 'open-page', page: 'stats' });
    expect(playingView(game).page).toMatchObject({ level: 2, experience: { earned: 4, needed: 15 } });
  });
});
