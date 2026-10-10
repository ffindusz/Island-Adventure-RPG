import { describe, expect, it } from 'vitest';
import type {
  AreaDefinition,
  ChaserMonsterDefinition,
  ContentDefinition,
  ExitDefinition,
  Game,
  MonsterPlacement,
} from '../src/core';
import {
  BITER,
  FIELD_LAYOUT,
  advance,
  face,
  frailMonster,
  gameAtTitle,
  monsterAction,
  monsterNamed,
  newGame,
  playingView,
  strike,
  throughStorage,
  untilDefeated,
  walk,
} from './fixtures';
import type { ArenaOptions } from './fixtures';
import { gateOf, guardianAt, guardianContent, guardianGateAt, guardianInOrder } from './guardian-fixtures';

// What becomes of the Guardian when the hero is defeated and when it leaves the Guardian's Adventure Area, in a wide field
// (walkable in columns 1 to 12 and rows 1 to 5) with a cellar beside it:
//
//   arena   the Guardian "guardian-1" stands on tile (11, 3), at (11.5, 3.5): its body spans x 11 to 12. The hero begins on
//           tile (10, 3), at (10.5, 3.5), a quarter of a tile from it, with 4 Health, which a sweep takes, and Attack 3:
//           a strike takes 3 of the Guardian's 12 Health. It has touched no Checkpoint, so defeat sends it back to where it
//           began. The exit "to-cellar" is on tile (8, 3), which the hero reaches in 11 steps to the left, and the entrance
//           "from-cellar" on tile (10, 3). The gate "gate-1", which the fall of the Guardian opens, is on tile (12, 5).
//   cellar  the entrance "from-arena" is on tile (2, 3) and the exit "to-arena" on tile (1, 3), which the hero reaches in
//           3 steps to the left. The hero can begin there instead, and then defeat sends it back to the cellar.
//
// Timelines. A wind-up that begins in step 1 ends in step N + 1, where N is its length in steps. The sweep (30 steps) lands
// in step 31 and the smite (48 steps) in step 49. A charge from tile (4, 3) is launched in step 37 and meets the hero in
// step 58. The "killer" is a biter that has the hero in reach at once and bites for 50 after a wind-up of 42 steps, in step 43.

const GUARDIAN_ID = 'guardian-1';
const GATE = 'gate-1';

const KILLER: ChaserMonsterDefinition = { ...BITER, damage: 50, windUpMs: 700 };

const GUARDIAN_PLACE = guardianAt(GUARDIAN_ID, 11, 3);
const WEAKLING: MonsterPlacement = { id: 'weakling', type: 'weakling', tile: { col: 10, row: 2 } };
const KILLER_PLACE: MonsterPlacement = { id: 'killer', type: 'killer', tile: { col: 9, row: 4 } };

const CELLAR_START = { area: 'cellar', tile: { col: 2, row: 3 } };

const TO_CELLAR: ExitDefinition = {
  id: 'to-cellar',
  zone: { col: 8, row: 3, width: 1, height: 1 },
  to: { area: 'cellar', entrance: 'from-arena' },
};

const CELLAR: AreaDefinition = {
  id: 'cellar',
  name: 'Cellar',
  layout: FIELD_LAYOUT,
  monsters: [],
  entrances: [{ id: 'from-arena', tile: { col: 2, row: 3 } }],
  exits: [{ id: 'to-arena', zone: { col: 1, row: 3, width: 1, height: 1 }, to: { area: 'arena', entrance: 'from-cellar' } }],
};

function world(monsters: readonly MonsterPlacement[], options: ArenaOptions = {}): ContentDefinition {
  return guardianContent(monsters, {
    start: { area: 'arena', tile: { col: 10, row: 3 } },
    hero: { health: 4, attack: 3 },
    entrances: [{ id: 'from-cellar', tile: { col: 10, row: 3 } }],
    exits: [TO_CELLAR],
    interactables: [guardianGateAt(GATE, 12, 5, GUARDIAN_ID)],
    otherAreas: [CELLAR],
    ...options,
    monsterTypes: { killer: KILLER, weakling: frailMonster(0), ...options.monsterTypes },
  });
}

/** The Guardian as the content places it on the tile (col, 3), as the snapshot has it. */
const freshGuardian = (col = 11): object => ({
  id: GUARDIAN_ID,
  type: 'guardian',
  position: { x: col + 0.5, y: 3.5 },
  health: 12,
  action: { type: 'idle' },
  nextPattern: 0,
});

/** The Guardian as the snapshot has it, which shows it also while the hero is in another Adventure Area. */
function guardianState(game: Game): unknown {
  return game.snapshot().state.areas['arena']?.monsters.find((monster) => monster.id === GUARDIAN_ID);
}

const ids = (game: Game): string[] => playingView(game).monsters.map((monster) => monster.id);

/** The hero strikes the Guardian, on its right, with an Attack of 12 and so defeats it, and assigns the Stat Point it earns. */
function slays(game: Game): void {
  face(game, 'right');
  strike(game);
  game.send({ type: 'assign-stat-point', stat: 'health' });
}

/** The steps within which the hero has to be defeated. */
const DEFEAT_WITHIN = 120;

/** The hero strikes the Guardian once, which takes its Health to 9. */
function hurts(game: Game): void {
  face(game, 'right');
  expect(game.send({ type: 'attack' })).toContainEqual({ type: 'monster-hit', monsterId: GUARDIAN_ID, damage: 3, health: 9 });
}

const SWEEP_ZONE = { minX: 10, minY: 2, maxX: 13, maxY: 5 };
const SWEPT = { type: 'winding-up', progress: 0, zone: SWEEP_ZONE };
const INTO_CELLAR = { type: 'area-changed', areaId: 'cellar' };
const INTO_ARENA = { type: 'area-changed', areaId: 'arena' };

describe('a hero defeated while the Guardian lives', () => {
  it('puts the Guardian back as the content places it when its own sweep defeats the hero', () => {
    const game = newGame(world([GUARDIAN_PLACE]));
    hurts(game);

    const events = untilDefeated(game, DEFEAT_WITHIN);

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: GUARDIAN_ID, damage: 4, health: 0 });
    expect(playingView(game).hero.position).toEqual({ x: 10.5, y: 3.5 });
    expect(guardianState(game)).toEqual(freshGuardian());
  });

  it('puts it back while it winds up a smite when another monster defeats the hero', () => {
    const game = newGame(world([GUARDIAN_PLACE, KILLER_PLACE], { monsterTypes: { guardian: guardianInOrder('smite', 'sweep', 'charge') } }));
    hurts(game);
    advance(game, 42);
    expect(monsterAction(game, GUARDIAN_ID)).toMatchObject({ type: 'winding-up' });

    const events = game.step();

    expect(events).toContainEqual({ type: 'hero-defeated' });
    expect(guardianState(game)).toEqual(freshGuardian());
  });

  it('puts it back on its starting tile while it dashes when another monster defeats the hero', () => {
    const game = newGame(world([guardianAt(GUARDIAN_ID, 4, 3), KILLER_PLACE], { monsterTypes: { guardian: guardianInOrder('charge', 'sweep', 'smite') } }));
    advance(game, 42);
    expect(monsterAction(game, GUARDIAN_ID)).toEqual({ type: 'dashing', direction: 'right' });
    expect(monsterNamed(game, GUARDIAN_ID).position.x).toBeGreaterThan(4.5);

    const events = game.step();

    expect(events).toContainEqual({ type: 'hero-defeated' });
    expect(guardianState(game)).toEqual(freshGuardian(4));
  });

  it('lets it begin again with its first pattern, the sweep, though the charge was the one it would have made next', () => {
    const game = newGame(world([GUARDIAN_PLACE]));
    untilDefeated(game, DEFEAT_WITHIN);

    game.step();

    expect(monsterAction(game, GUARDIAN_ID)).toEqual(SWEPT);
  });

  it('puts it back when the hero is sent to a Checkpoint in another Adventure Area, which the view does not show', () => {
    const game = newGame(world([GUARDIAN_PLACE], { start: CELLAR_START }));
    expect(walk(game, 'left', 3)).toContainEqual(INTO_ARENA);
    hurts(game);

    const events = untilDefeated(game, DEFEAT_WITHIN);

    expect(events.slice(-2)).toEqual([{ type: 'hero-defeated' }, INTO_CELLAR]);
    expect(playingView(game).area.id).toBe('cellar');
    expect(guardianState(game)).toEqual(freshGuardian());
  });

  it('shows the Guardian new, and ready to begin with the sweep, when the hero comes back from that Checkpoint', () => {
    const game = newGame(world([GUARDIAN_PLACE], { start: CELLAR_START }));
    walk(game, 'left', 3);
    hurts(game);
    untilDefeated(game, DEFEAT_WITHIN);

    expect(walk(game, 'left', 3)).toContainEqual(INTO_ARENA);

    expect(monsterNamed(game, GUARDIAN_ID)).toMatchObject({ position: { x: 11.5, y: 3.5 }, health: 12, action: { type: 'idle' } });
    game.step();
    expect(monsterAction(game, GUARDIAN_ID)).toEqual(SWEPT);
  });
});

describe('a hero who leaves the Adventure Area of a Guardian that lives and comes back', () => {
  it('finds the Guardian as the content places it, though it was hurt and winding up when the hero left', () => {
    const game = newGame(world([GUARDIAN_PLACE]));
    hurts(game);
    expect(walk(game, 'left', 11)).toContainEqual(INTO_CELLAR);

    expect(walk(game, 'left', 3)).toContainEqual(INTO_ARENA);

    expect(monsterNamed(game, GUARDIAN_ID)).toMatchObject({ position: { x: 11.5, y: 3.5 }, health: 12, action: { type: 'idle' } });
    expect(guardianState(game)).toEqual(freshGuardian());
  });

  it('finds it ready to begin with its first pattern, the sweep, though the charge was next when the hero left', () => {
    const game = newGame(world([GUARDIAN_PLACE]));
    walk(game, 'left', 11);
    walk(game, 'left', 3);

    game.step();

    expect(monsterAction(game, GUARDIAN_ID)).toEqual(SWEPT);
  });
});

describe('a Guardian that has fallen', () => {
  it('stays fallen when the hero is defeated, as the ordinary monsters are renewed, and its gate stays open', () => {
    const game = newGame(world([GUARDIAN_PLACE, WEAKLING, KILLER_PLACE], { hero: { attack: 12 } }));
    face(game, 'up');
    game.send({ type: 'attack' });
    slays(game);
    expect(ids(game)).toEqual(['killer']);

    untilDefeated(game, DEFEAT_WITHIN);

    expect(ids(game)).toEqual(['weakling', 'killer']);
    expect(gateOf(game).open).toBe(true);
    expect(guardianState(game)).toMatchObject({ health: 0 });
  });

  it('stays fallen when the hero is sent to a Checkpoint in another Adventure Area, and is not there when the hero comes back', () => {
    const game = newGame(world([GUARDIAN_PLACE, KILLER_PLACE], { start: CELLAR_START, hero: { attack: 12 } }));
    walk(game, 'left', 3);
    slays(game);

    expect(untilDefeated(game, DEFEAT_WITHIN).slice(-1)).toEqual([INTO_CELLAR]);
    expect(walk(game, 'left', 3)).toContainEqual(INTO_ARENA);

    expect(ids(game)).toEqual(['killer']);
    expect(gateOf(game).open).toBe(true);
  });

  it('stays fallen when the hero leaves the Adventure Area and comes back, and its gate stays open', () => {
    const game = newGame(world([GUARDIAN_PLACE], { hero: { attack: 12 } }));
    slays(game);
    expect(walk(game, 'left', 11)).toContainEqual(INTO_CELLAR);

    expect(walk(game, 'left', 3)).toContainEqual(INTO_ARENA);

    expect(ids(game)).toEqual([]);
    expect(gateOf(game).open).toBe(true);
    expect(guardianState(game)).toMatchObject({ health: 0 });
  });

  it('stays fallen after Continue, and its gate stays open', () => {
    const content = world([GUARDIAN_PLACE, KILLER_PLACE], { hero: { attack: 12 } });
    const game = newGame(content);
    slays(game);
    const saved = throughStorage(game.snapshot());

    const resumed = gameAtTitle(content);
    resumed.send({ type: 'continue', snapshot: saved });

    expect(ids(resumed)).toEqual(['killer']);
    expect(gateOf(resumed).open).toBe(true);
  });
});
