import type {
  AreaDefinition,
  ContentDefinition,
  EntranceDefinition,
  ExitDefinition,
  Game,
  GameEvent,
  GameView,
  Snapshot,
} from '../src/core';
import { CHARGER, SHOOTER, chargerAt, shooterAt } from './enemy-fixtures';
import {
  FIELD_LAYOUT,
  advance,
  arena,
  cacheAt,
  chestAt,
  dummyAt,
  face,
  fixedRandom,
  frailMonster,
  gameAtTitle,
  keyAt,
  milestone,
  newGame,
  pickupAt,
  throughStorage,
  walk,
} from './fixtures';

// The saved adventure: one scripted game that visits every kind of state the Game core saves, and the content it is
// played in. The tests of the save (save-round-trip.test.ts) restore the game after every chapter of the script and
// check that nothing was lost. When a ticket adds state to the game, it extends this file in two places, so that the
// round trip covers it: the content (a thing to find, open, pull or fight) and a chapter of the script that changes it.
//
// Two Adventure Areas, both the wide field of fixtures.ts (14 x 7 tiles, walkable in columns 1 to 12 and rows 1 to 5).
// A hero tile is 8 steps of 0.125; the numbers below are worked out from the arena of fixtures.ts and the monsters of
// enemy-fixtures.ts.
//
//   arena  (the hero begins at tile (6, 3), at (6.5, 3.5), facing down; Health 8; text shown on arrival)
//     chests      the armor chest on tile (5, 3), the bow chest on (7, 3) and the iron chest on (6, 2), right around the
//                 hero; the steel chest on (2, 1), never opened. The arrow cache on (2, 4) holds 6 Ammunition; a second
//                 cache on (11, 5) is never opened
//     pickups     a potion on (4, 4), taken on the way, and one on (9, 4), taken after the Checkpoint; one on (11, 4),
//                 never taken
//     keys        the brass key on (4, 3), next to the Checkpoint, taken after it is touched
//     monsters    a dummy on (6, 5), which the hero only wounds, and a rat on (3, 5), worth 8 Experience
//     milestones  the lookout on (5, 4), worth 2 Experience, which the hero reaches; the far point on (11, 1), which
//                 it does not
//     Checkpoint  the camp on (3, 3)
//     exit        on (12, 3), to the ruins; the entrance from the ruins is on (11, 3)
//   ruins  (the hero arrives on tile (2, 3), at (2.5, 3.5))
//     monsters    a charger on (7, 3), in the arrival row, and a shooter on (2, 1), above the hero; both wind up for
//                 30 steps from the first step after the arrival, so the charger dashes and the shooter fires on step 31
//     chests      a cache on (12, 5), never opened; a potion on (11, 5), never taken
//     exit        on (1, 3), back to the arena
//
// The hero's Experience: 2 from the lookout and 8 from the rat make the 10 that raise it to Level 2.

const TO_RUINS: ExitDefinition = {
  id: 'to-ruins',
  zone: { col: 12, row: 3, width: 1, height: 1 },
  to: { area: 'ruins', entrance: 'from-arena' },
};
const FROM_RUINS: EntranceDefinition = { id: 'from-ruins', tile: { col: 11, row: 3 } };

const RUINS: AreaDefinition = {
  id: 'ruins',
  name: 'Ruins',
  layout: FIELD_LAYOUT,
  text: 'Broken walls rise from the sand.',
  monsters: [chargerAt('charger', 7, 3), shooterAt('shooter', 2, 1)],
  interactables: [cacheAt('ruin-cache', 12, 5, 4), pickupAt('ruin-potion', 11, 5, 1)],
  entrances: [{ id: 'from-arena', tile: { col: 2, row: 3 } }],
  exits: [
    { id: 'to-arena', zone: { col: 1, row: 3, width: 1, height: 1 }, to: { area: 'arena', entrance: 'from-ruins' } },
  ],
  checkpoints: [{ id: 'ruins-stone', tile: { col: 12, row: 1 } }],
};

/** The content of the saved adventure. A fresh object each time, as a game is made from its own. */
export function adventureContent(): ContentDefinition {
  return arena({
    layout: FIELD_LAYOUT,
    start: { area: 'arena', tile: { col: 6, row: 3 } },
    hero: { health: 8 },
    text: 'The wind drops.',
    monsters: [dummyAt('dummy', 6, 5), { id: 'rat', type: 'rat', tile: { col: 3, row: 5 } }],
    monsterTypes: {
      rat: frailMonster(8),
      charger: CHARGER,
      // A drop that the fixed random source always leaves, so that the rules ask it for a roll.
      shooter: { ...SHOOTER, drops: [{ consumable: 'ammunition', chance: 0.75, amount: 2 }] },
    },
    interactables: [
      chestAt('armor-chest', 5, 3, 'leather-armor'),
      chestAt('bow-chest', 7, 3, 'short-bow'),
      chestAt('iron-chest', 6, 2, 'iron-sword'),
      chestAt('steel-chest', 2, 1, 'steel-sword'),
      cacheAt('arrow-cache', 2, 4, 6),
      cacheAt('spare-cache', 11, 5, 3),
      pickupAt('potion-near', 4, 4, 1),
      pickupAt('potion-far', 9, 4, 1),
      pickupAt('potion-spare', 11, 4, 1),
      keyAt('brass-key', 4, 3, 'Brass Key'),
    ],
    milestones: [
      milestone('lookout', { col: 5, row: 4, width: 1, height: 1 }, 2),
      milestone('far-point', { col: 11, row: 1, width: 1, height: 1 }, 3),
    ],
    checkpoints: [{ id: 'camp', tile: { col: 3, row: 3 } }],
    entrances: [FROM_RUINS],
    exits: [TO_RUINS],
    otherAreas: [RUINS],
  });
}

/** Steps the game until the event has happened that many times (counting from now), whatever the steps are. */
export function advanceUntil(game: Game, type: GameEvent['type'], times = 1, limit = 1000): void {
  let seen = 0;
  for (let step = 0; step < limit; step++) {
    seen += game.step().filter((event) => event.type === type).length;
    if (seen >= times) {
      return;
    }
  }
  throw new Error(`The "${type}" event did not happen ${times} time(s) in ${limit} steps`);
}

/** One stretch of the saved adventure. The game is saved and restored at the end of each one. */
export interface Chapter {
  /** What the tests call the end of the chapter. */
  readonly id: string;
  /** What the hero does, as it reads after "the hero". */
  readonly does: string;
  play(game: Game): void;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'loot',
    does: 'wounds the dummy, opens three chests and equips what they held, with the inventory still open',
    play(game) {
      walk(game, 'down', 8);
      game.send({ type: 'attack' });
      walk(game, 'up', 8);
      for (const side of ['left', 'right', 'up'] as const) {
        face(game, side);
        game.send({ type: 'interact' });
      }
      game.send({ type: 'open-page', page: 'inventory' });
      for (const gearId of ['iron-sword', 'short-bow', 'leather-armor']) {
        game.send({ type: 'equip', gearId });
      }
    },
  },
  {
    id: 'lookout',
    does: 'takes a potion on the way, reaches the lookout and defeats the rat, which leaves a Stat Point to assign',
    play(game) {
      game.send({ type: 'close-page', page: 'inventory' });
      walk(game, 'down', 8);
      walk(game, 'left', 24);
      face(game, 'down');
      game.send({ type: 'attack' });
    },
  },
  {
    id: 'camp',
    does: 'spends the Stat Point on Attack, opens the arrow cache and comes onto the camp',
    play(game) {
      game.send({ type: 'assign-stat-point', stat: 'attack' });
      walk(game, 'left', 2);
      game.send({ type: 'interact' });
      walk(game, 'up', 8);
    },
  },
  {
    id: 'key',
    does: 'takes the brass key that lies beside the camp and comes back onto the camp',
    play(game) {
      walk(game, 'right', 8);
      walk(game, 'left', 8);
    },
  },
  {
    id: 'crossing',
    does: 'takes the far potion and crosses into the ruins, where the text shows',
    play(game) {
      walk(game, 'down', 8);
      walk(game, 'right', 50);
      walk(game, 'up', 8);
      walk(game, 'right', 19);
    },
  },
  {
    id: 'wind-up',
    does: 'waits 12 steps while the charger and the shooter wind up',
    play(game) {
      advance(game, 12);
    },
  },
  {
    id: 'volley',
    does: 'takes the bow and shoots up at the shooter as the charger dashes and the shooter fires',
    play(game) {
      game.send({ type: 'switch-weapon' });
      face(game, 'up');
      advance(game, 16);
      game.send({ type: 'attack' });
      advance(game, 5);
    },
  },
  {
    id: 'shooter-down',
    does: 'brings the shooter down while its projectile is still in the air',
    play(game) {
      advanceUntil(game, 'monster-defeated');
    },
  },
  {
    id: 'hits',
    does: 'is hit by the charger and then by the projectile',
    play(game) {
      advanceUntil(game, 'hero-hit', 2);
    },
  },
  {
    id: 'defeat',
    does: 'is defeated and sent back to the camp',
    play(game) {
      advanceUntil(game, 'hero-defeated');
    },
  },
];

/** A new game of the saved adventure that has played the chapters up to the one with that id, or all of them. */
export function adventureAfter(lastChapter?: string, random = fixedRandom): Game {
  const count = lastChapter === undefined ? CHAPTERS.length : CHAPTERS.findIndex(({ id }) => id === lastChapter) + 1;
  if (count === 0) {
    throw new Error(`The saved adventure has no chapter "${lastChapter}"`);
  }
  const game = newGame(adventureContent(), random);
  for (const chapter of CHAPTERS.slice(0, count)) {
    chapter.play(game);
  }
  return game;
}

/** A game of the saved adventure restored from the snapshot as storage gives it back: text, not the object. */
export function restoredFrom(snapshot: Snapshot, random = fixedRandom): Game {
  const game = gameAtTitle(adventureContent(), random);
  game.send({ type: 'continue', snapshot: throughStorage(snapshot) });
  return game;
}

/** What one call to a game left behind: what it returned and what the game looks like and holds after it. */
export interface Frame {
  readonly events: readonly GameEvent[];
  readonly view: GameView;
  readonly snapshot: Snapshot | null;
}

/** A game that keeps a frame for every command and step it is given, so that two games can be compared throughout. */
export function recorded(game: Game): { readonly game: Game; readonly frames: Frame[] } {
  const frames: Frame[] = [];
  const note = (events: readonly GameEvent[]): readonly GameEvent[] => {
    const view = game.view();
    frames.push({ events, view, snapshot: view.phase === 'playing' ? game.snapshot() : null });
    return events;
  };
  return {
    frames,
    game: {
      send: (command) => note(game.send(command)),
      step: () => note(game.step()),
      view: () => game.view(),
      snapshot: () => game.snapshot(),
    },
  };
}
