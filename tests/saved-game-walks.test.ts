import { describe, expect, it } from 'vitest';
import { parseSave } from '../src/adapter/saved-game';
import { gameContent } from '../src/content';
import { createGame, PAGE_IDS, STAT_IDS } from '../src/core';
import type { Command, ContentDefinition, Direction, Game, RandomSource } from '../src/core';
import { CHARGER, chargerAt, SHOOTER, shooterAt } from './enemy-fixtures';
import {
  arena,
  biterAt,
  cacheAt,
  chestAt,
  dummyAt,
  face,
  FIELD_LAYOUT,
  milestone,
  pickupAt,
  seededRandom,
} from './fixtures';

// The checks of a save (saved-game.ts) must refuse what the game could not have made, and never what it can make. The
// tests of saved-game.test.ts hold the first promise; these hold the second, with a player that does anything at all:
// every state the game gets to is saved, and the save must be usable and come back exactly as it was saved.

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

/**
 * A walk saves and checks the whole state at each of its steps, with what the hero has explored of every area in it,
 * so it takes longer with every area the game ships, and longer still when the other test files run beside it.
 */
const WALK_TIMEOUT_MS = 30_000;

function pickFrom<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)] as T;
}

/** What a player who knows nothing might do: mostly walk and strike, now and then open a Page or spend a point. */
function commandAtRandom(random: RandomSource, gearIds: readonly string[]): Command {
  const roll = random();
  if (roll < 0.3) {
    return { type: 'move', direction: pickFrom(DIRECTIONS, random) };
  }
  if (roll < 0.4) {
    return { type: 'stop', direction: pickFrom(DIRECTIONS, random) };
  }
  if (roll < 0.6) {
    return { type: 'attack' };
  }
  if (roll < 0.7) {
    return { type: 'interact' };
  }
  if (roll < 0.75) {
    return { type: 'switch-weapon' };
  }
  if (roll < 0.8) {
    return { type: 'use-healing-potion' };
  }
  if (roll < 0.85) {
    return { type: 'open-page', page: pickFrom(PAGE_IDS, random) };
  }
  if (roll < 0.9) {
    return { type: 'close-page', page: pickFrom(PAGE_IDS, random) };
  }
  if (roll < 0.95) {
    return { type: 'assign-stat-point', stat: pickFrom(STAT_IDS, random) };
  }
  return { type: 'equip', gearId: pickFrom(gearIds, random) };
}

interface Walk {
  /** The rounds whose save was not usable, or did not come back as it was saved, with what the checks said. */
  readonly refused: unknown[];
  /** What the monsters were saved doing, over the whole walk. */
  readonly actions: Set<string>;
  /** Whose arrows were saved in flight: the hero's or the monsters'. */
  readonly arrows: Set<'hero' | 'monster'>;
}

/** What a walk plays on a game before its first round: the commands of a script that put the game in a state of its own. */
type Script = (game: Game) => void;

/**
 * Plays a game from its start, after its script if it has one, with commands at random, a few steps after each, and
 * saves it after the script and after every round.
 */
function walkAtRandom(content: ContentDefinition, seed: number, rounds: number, walk: Walk, script?: Script): void {
  const random = seededRandom(seed);
  const game = createGame({ content, random: seededRandom(seed + 1) });
  game.send({ type: 'new-game' });
  const gearIds = Object.keys(content.gear);

  if (script !== undefined) {
    script(game);
    saveAndCheck(game, content, { seed, round: 'script' }, walk);
  }
  for (let round = 0; round < rounds; round++) {
    game.send(commandAtRandom(random, gearIds));
    const steps = 1 + Math.floor(random() * 8);
    for (let step = 0; step < steps; step++) {
      game.step();
    }
    saveAndCheck(game, content, { seed, round }, walk);
  }
}

/** Saves the game, checks the save as the game would be given it back, and notes what the walk has been through. */
function saveAndCheck(
  game: Game,
  content: ContentDefinition,
  at: { readonly seed: number; readonly round: number | 'script' },
  walk: Walk,
): void {
  const saved = game.snapshot();
  const text = JSON.stringify(saved);
  const parsed = parseSave(text, content);
  if (parsed.status !== 'usable' || JSON.stringify(parsed.snapshot) !== text) {
    walk.refused.push({ ...at, parsed });
  }
  for (const world of Object.values(saved.state.areas)) {
    for (const monster of world.monsters) {
      walk.actions.add(monster.action.type);
    }
  }
  for (const arrow of saved.state.arrows) {
    walk.arrows.add(arrow.shotBy === undefined ? 'hero' : 'monster');
  }
}

function newWalk(): Walk {
  return { refused: [], actions: new Set(), arrows: new Set() };
}

describe('a hero among every kind of monster, doing anything at all', () => {
  // The field of fixtures.ts with the hero at (6.5, 3.5) and a monster of each behavior in reach of it. The chests
  // hold a bow and Ammunition, so that the hero shoots as well, and the shooter drops Ammunition when it is defeated.
  const gauntlet = arena({
    layout: FIELD_LAYOUT,
    start: { area: 'arena', tile: { col: 6, row: 3 } },
    text: 'The wind drops.',
    monsters: [
      dummyAt('dummy', 6, 5),
      biterAt('biter', 4, 2),
      chargerAt('charger', 10, 3),
      shooterAt('shooter', 6, 1),
    ],
    monsterTypes: {
      charger: CHARGER,
      shooter: { ...SHOOTER, drops: [{ consumable: 'ammunition', chance: 0.75, amount: 2 }] },
    },
    interactables: [
      chestAt('armor-chest', 5, 3, 'leather-armor'),
      chestAt('bow-chest', 7, 3, 'short-bow'),
      cacheAt('arrow-cache', 6, 4, 6),
      pickupAt('potion', 4, 4, 1),
    ],
    milestones: [milestone('lookout', { col: 5, row: 4, width: 1, height: 1 }, 2)],
    checkpoints: [{ id: 'camp', tile: { col: 3, row: 3 } }],
  });

  // The hero's first moves are scripted, because what it comes to by chance is not enough: the hero no longer sticks to
  // the chests it walks into, as it did before it slid round corners, so a random walk seldom gets to its bow and
  // Ammunition and to shoot. It takes the Ammunition of the cache below it and the bow of the chest at its right, equips
  // the bow, takes it in hand and shoots left, at the other chest, so that the shot is in flight when the game is saved.
  const shootsFirst: Script = (game) => {
    face(game, 'down');
    game.send({ type: 'interact' });
    face(game, 'right');
    game.send({ type: 'interact' });
    game.send({ type: 'open-page', page: 'inventory' });
    game.send({ type: 'equip', gearId: 'short-bow' });
    game.send({ type: 'close-page', page: 'inventory' });
    game.send({ type: 'switch-weapon' });
    face(game, 'left');
    expect(game.send({ type: 'attack' })).toEqual([{ type: 'hero-shot', direction: 'left' }]);
  };

  it(
    'is saved in a state the checks accept, whatever the state, every time',
    () => {
      const walk = newWalk();

      for (const seed of [1, 2, 3, 4]) {
        walkAtRandom(gauntlet, seed, 600, walk, shootsFirst);
      }

      expect(walk.refused).toEqual([]);
      // The walks must have been through what the checks are about, or they prove nothing.
      expect([...walk.actions].sort()).toEqual(['chasing', 'dashing', 'idle', 'recovering', 'winding-up']);
      expect([...walk.arrows].sort()).toEqual(['hero', 'monster']);
    },
    WALK_TIMEOUT_MS,
  );
});

describe('the game as shipped', () => {
  it.each(gameContent.areas)('is saved in a state the checks accept when the hero begins in "$id"', (area) => {
    const [entrance] = area.entrances ?? [];
    if (entrance === undefined) {
      throw new Error(`The shipped area "${area.id}" has no entrance to begin at`);
    }
    const game = createGame({
      content: { ...gameContent, start: { area: area.id, tile: entrance.tile } },
      random: seededRandom(5),
    });
    game.send({ type: 'new-game' });
    const saved = game.snapshot();

    expect(parseSave(JSON.stringify(saved), gameContent)).toEqual({ status: 'usable', snapshot: saved });
  });

  it.each([11, 12])(
    'is saved in a state the checks accept, whatever the player does (seed %i)',
    (seed) => {
      const walk = newWalk();

      walkAtRandom(gameContent, seed, 500, walk);

      expect(walk.refused).toEqual([]);
    },
    WALK_TIMEOUT_MS,
  );
});
