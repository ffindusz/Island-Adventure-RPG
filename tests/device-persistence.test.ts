import { describe, expect, it } from 'vitest';
import type {
  AreaDefinition,
  ContentDefinition,
  EntranceDefinition,
  ExitDefinition,
  Game,
  InteractableDefinition,
} from '../src/core';
import {
  ARENA_LAYOUT,
  INTERACT,
  arena,
  biterAt,
  cacheAt,
  chestViews,
  continuedFrom,
  doorAt,
  face,
  gateAt,
  interactableViews,
  inventoryOf,
  keyAt,
  leverAt,
  newGame,
  playingView,
  untilDefeated,
  walk,
} from './fixtures';

// A key, an opened door, a pulled lever and an opened gate are one-time changes to the world, not what the hero carries
// like Ammunition: defeat puts back the consumables the hero found since its Checkpoint (see checkpoints.test.ts), but
// not these. They stay as the hero left them when it is defeated, when it leaves an Adventure Area and comes back, and in
// a saved game.
//
// The hero stands at (3.5, 3.5) facing down and walks 0.125 tile a step. The arena of most tests has
//
//   the rusty key on the tile (2, 3), which the hero takes in 3 steps to the left, and is back where it began after 3 to
//   the right, facing down;
//   the cellar door on the tile (3, 4), right below the hero, which the rusty key opens;
//   the switch on the tile (3, 2), right above the hero, which moves the portcullis, a gate on the tile (1, 2).
//
// In the tests about defeat a biter stands on the tile (4, 3), beside the hero, which has 5 Health: it starts its wind-up
// on the first step and bites for 5 on the 31st. A hero that has touched no Checkpoint is sent back to where it began.

const RUSTY_KEY_HELD = { id: 'rusty-key', name: 'Rusty Key' };
const OPENED = { type: 'door-opened', doorId: 'cellar-door', keyName: 'Rusty Key' } as const;
const PULLED = { type: 'lever-toggled', leverId: 'switch', pulled: true } as const;
const PUT_BACK = { type: 'lever-toggled', leverId: 'switch', pulled: false } as const;

const RUSTY_KEY = keyAt('rusty-key', 2, 3, 'Rusty Key');
const CELLAR_DOOR = doorAt('cellar-door', 3, 4, 'rusty-key');
const SWITCH = leverAt('switch', 3, 2, ['portcullis']);
const PORTCULLIS = gateAt('portcullis', 1, 2);

/** The hero takes the key beside it and comes back to where it began, facing down. */
function takeKey(game: Game): void {
  walk(game, 'left', 3);
  walk(game, 'right', 3);
  face(game, 'down');
}

/** The hero opens the door below it with the key it holds. */
function openDoor(game: Game): void {
  face(game, 'down');
  expect(game.send(INTERACT)).toEqual([OPENED]);
}

/** The hero turns to the switch above it and pulls it, or puts it back. */
function useSwitch(game: Game) {
  face(game, 'up');
  return game.send(INTERACT);
}

describe('when the hero is defeated', () => {
  /** The arena with a biter beside the hero, whose bite defeats it. */
  function doomedArena(...interactables: InteractableDefinition[]): ContentDefinition {
    return arena({ hero: { health: 5 }, monsters: [biterAt('biter', 4, 3)], interactables });
  }

  it('keeps the key the hero holds, and does not put it back on the ground', () => {
    const game = newGame(doomedArena(RUSTY_KEY, CELLAR_DOOR));
    walk(game, 'left', 3);
    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);

    untilDefeated(game);

    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);
    expect(interactableViews(game, 'key')).toEqual([]);
    expect(walk(game, 'left', 3), 'the place where the key lay gives nothing more').toEqual([]);
    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);
  });

  it('keeps open the door the hero opened with its key, and the key stays gone', () => {
    const game = newGame(doomedArena(RUSTY_KEY, CELLAR_DOOR));
    takeKey(game);
    openDoor(game);

    untilDefeated(game);

    expect(interactableViews(game, 'door')).toMatchObject([{ id: 'cellar-door', open: true }]);
    expect(inventoryOf(game).keys).toEqual([]);
    expect(interactableViews(game, 'key')).toEqual([]);
    expect(walk(game, 'down', 20), 'the hero walks through the door').toEqual([]);
    expect(playingView(game).hero.position).toEqual({ x: 3.5, y: 4.75 });
  });

  it('keeps a lever pulled and its gate open, and the lever can still be put back', () => {
    const game = newGame(doomedArena(SWITCH, PORTCULLIS));
    expect(useSwitch(game)).toEqual([PULLED]);

    untilDefeated(game);

    expect(interactableViews(game, 'lever')).toMatchObject([{ id: 'switch', pulled: true }]);
    expect(interactableViews(game, 'gate')).toMatchObject([{ id: 'portcullis', open: true }]);
    expect(useSwitch(game)).toEqual([PUT_BACK]);
    expect(interactableViews(game, 'gate')).toMatchObject([{ id: 'portcullis', open: false }]);
  });

  it('puts back the Ammunition found since the Checkpoint and the cache it was in, but not the key', () => {
    // The hero takes the key, opens the cache below it (5 arrows) and is defeated. The door the key opens is out of the way.
    const game = newGame(doomedArena(RUSTY_KEY, doorAt('side-door', 5, 1, 'rusty-key'), cacheAt('cache', 3, 4, 5)));
    takeKey(game);
    game.send(INTERACT);
    expect(playingView(game).hero.consumables).toEqual({ ammunition: 5, 'healing-potion': 0 });

    untilDefeated(game);

    expect(playingView(game).hero.consumables).toEqual({ ammunition: 0, 'healing-potion': 0 });
    expect(chestViews(game)).toEqual([expect.objectContaining({ id: 'cache', opened: false })]);
    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);
    expect(interactableViews(game, 'key')).toEqual([]);
  });
});

// The arena and a cellar, as in area-connections.test.ts: the hero walks right 11 steps from where it begins, into the
// cellar, where it arrives at (2.5, 3.5), and 3 steps to the left take it back into the arena, at (4.5, 3.5).
const FROM_CELLAR: EntranceDefinition = { id: 'from-cellar', tile: { col: 4, row: 3 } };
const TO_CELLAR: ExitDefinition = {
  id: 'to-cellar',
  zone: { col: 5, row: 3, width: 1, height: 1 },
  to: { area: 'cellar', entrance: 'from-arena' },
};
const CELLAR: AreaDefinition = {
  id: 'cellar',
  name: 'Cellar',
  layout: ARENA_LAYOUT,
  monsters: [],
  entrances: [{ id: 'from-arena', tile: { col: 2, row: 3 } }],
  exits: [
    {
      id: 'to-arena',
      zone: { col: 1, row: 3, width: 1, height: 1 },
      to: { area: 'arena', entrance: 'from-cellar' },
    },
  ],
};

/** The arena with its key, door, switch and portcullis, and the cellar beside it. */
function worldOfDevices(): ContentDefinition {
  return arena({
    entrances: [FROM_CELLAR],
    exits: [TO_CELLAR],
    interactables: [RUSTY_KEY, CELLAR_DOOR, SWITCH, PORTCULLIS],
    otherAreas: [CELLAR],
  });
}

function intoTheCellar(game: Game): void {
  walk(game, 'right', 11);
  expect(playingView(game).area.id).toBe('cellar');
}

function backToTheArena(game: Game): void {
  walk(game, 'left', 3);
  expect(playingView(game).area.id).toBe('arena');
}

describe('when the hero leaves an Adventure Area and comes back', () => {
  it('has the key it holds with it in the other area, and the place where the key lay stays empty', () => {
    const game = newGame(worldOfDevices());
    takeKey(game);

    intoTheCellar(game);
    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);
    backToTheArena(game);

    expect(inventoryOf(game).keys).toEqual([RUSTY_KEY_HELD]);
    expect(interactableViews(game, 'key')).toEqual([]);
  });

  it('finds the door it opened open, and the key gone', () => {
    const game = newGame(worldOfDevices());
    takeKey(game);
    openDoor(game);

    intoTheCellar(game);
    backToTheArena(game);

    expect(interactableViews(game, 'door')).toMatchObject([{ id: 'cellar-door', open: true }]);
    expect(inventoryOf(game).keys).toEqual([]);
    face(game, 'down');
    expect(game.send(INTERACT), 'and nothing more happens at the door').toEqual([]);
  });

  it('finds the lever pulled and the gate open, and the lever can still be put back', () => {
    const game = newGame(worldOfDevices());
    useSwitch(game);

    intoTheCellar(game);
    backToTheArena(game);

    expect(interactableViews(game, 'lever')).toMatchObject([{ id: 'switch', pulled: true }]);
    expect(interactableViews(game, 'gate')).toMatchObject([{ id: 'portcullis', open: true }]);
    // The hero is back at (4.5, 3.5): the switch is above and to its left, so it walks 8 steps left to face it.
    walk(game, 'left', 8);
    expect(useSwitch(game)).toEqual([PUT_BACK]);
    expect(interactableViews(game, 'gate')).toMatchObject([{ open: false }]);
  });
});

describe('in a saved game', () => {
  it('keeps a key lying where it lies, a door locked, a lever not pulled and a gate shut', () => {
    const original = newGame(worldOfDevices());

    const restored = continuedFrom(worldOfDevices(), original.snapshot());

    expect(restored.view()).toEqual(original.view());
    expect(interactableViews(restored, 'key')).toMatchObject([{ id: 'rusty-key' }]);
    expect(interactableViews(restored, 'door')).toMatchObject([{ open: false }]);
    expect(interactableViews(restored, 'lever')).toMatchObject([{ pulled: false }]);
    expect(interactableViews(restored, 'gate')).toMatchObject([{ open: false }]);
    takeKey(restored);
    expect(inventoryOf(restored).keys).toEqual([RUSTY_KEY_HELD]);
  });

  it('keeps the key the hero holds, which still opens its door', () => {
    const original = newGame(worldOfDevices());
    takeKey(original);

    const restored = continuedFrom(worldOfDevices(), original.snapshot());

    expect(restored.view()).toEqual(original.view());
    expect(inventoryOf(restored).keys).toEqual([RUSTY_KEY_HELD]);
    expect(interactableViews(restored, 'key')).toEqual([]);
    openDoor(restored);
    expect(inventoryOf(restored).keys).toEqual([]);
  });

  it('keeps an opened door, a pulled lever and an open gate, in the area the hero is in and in the one it left', () => {
    const original = newGame(worldOfDevices());
    takeKey(original);
    openDoor(original);
    useSwitch(original);
    intoTheCellar(original);

    const restored = continuedFrom(worldOfDevices(), original.snapshot());

    expect(restored.view()).toEqual(original.view());
    backToTheArena(restored);
    expect(interactableViews(restored, 'door')).toMatchObject([{ open: true }]);
    expect(interactableViews(restored, 'lever')).toMatchObject([{ pulled: true }]);
    expect(interactableViews(restored, 'gate')).toMatchObject([{ open: true }]);
    expect(interactableViews(restored, 'key')).toEqual([]);
    expect(inventoryOf(restored).keys).toEqual([]);
  });
});
