import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
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
  advance,
  arena,
  biterAt,
  chestAt,
  dummyAt,
  face,
  fixedRandom,
  frailMonster,
  newGame,
  pickupAt,
  playingView,
  strike,
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

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

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

describe('Touching a Checkpoint', () => {
  it('activates it, which the event and the view say', () => {
    const game = newGame(arena({ checkpoints: [CAMP] }));
    expect(playingView(game).checkpoints).toEqual([{ ...CAMP_VIEW, active: false }]);

    expect(walk(game, 'down', 2)).not.toContainEqual(CAMP_ACTIVATED);
    expect(playingView(game).checkpoints).toEqual([{ ...CAMP_VIEW, active: false }]);

    expect(walk(game, 'down', 1)).toContainEqual(CAMP_ACTIVATED);
    expect(playingView(game).checkpoints).toEqual([{ ...CAMP_VIEW, active: true }]);
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
