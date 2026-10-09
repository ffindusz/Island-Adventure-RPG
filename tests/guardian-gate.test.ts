import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { Game, GameEvent, MonsterPlacement, MonsterTypeDefinition } from '../src/core';
import {
  WITH_BOW,
  advance,
  biterAt,
  cacheAt,
  dummyAt,
  face,
  fixedRandom,
  gateAt,
  leverAt,
  monsterNamed,
  newGame,
  playingView,
  strike,
  walk,
} from './fixtures';
import type { ArenaOptions } from './fixtures';
import { GUARDIAN, gateOf, guardianAt, guardianContent, guardianGateAt } from './guardian-fixtures';

// The gate that the defeat of a Guardian opens, and what the defeat tells, in the wide field of fixtures.ts (walkable in
// columns 1 to 12 and rows 1 to 5). The Guardian "guardian-1" stands on tile (4, 3): its body spans x 4 to 5 and y 3 to 4,
// and it has 12 Health and is worth 20 Experience. The gate "gate-1" fills tile (8, 3), x 8 to 9. The hero begins on tile
// (5, 3), at (5.5, 3.5), with its left edge a quarter of a tile from the Guardian, and its Attack is 12: one strike, or one
// arrow, takes the Guardian's Health to 0. A hero that walks right along the row of the gate has its centre no farther than
// x = 7.75 while the gate is shut, which takes 18 steps of 0.125 tile.

const GUARDIAN_ID = 'guardian-1';
const GATE = 'gate-1';

/** A Guardian that never notices the hero, for the tests of what the shut gate does to the one who stands before it. */
const CALM = { guardian: { ...GUARDIAN, noticingDistance: 0 } };

/** The field with the Guardian and its gate, and perhaps more monsters. The hero begins before the Guardian by default. */
function gateField(options: ArenaOptions = {}, others: readonly MonsterPlacement[] = []): Game {
  return newGame(
    guardianContent([guardianAt(GUARDIAN_ID, 4, 3), ...others], {
      start: { area: 'arena', tile: { col: 5, row: 3 } },
      hero: { attack: 12 },
      interactables: [guardianGateAt(GATE, 8, 3, GUARDIAN_ID)],
      ...options,
    }),
  );
}

/** The hero opens the cache on the tile below it, takes the bow in hand and shoots. Returns the events of the shot. */
function shoots(game: Game, direction: 'left' | 'right'): readonly GameEvent[] {
  face(game, 'down');
  game.send({ type: 'interact' });
  game.send({ type: 'switch-weapon' });
  face(game, direction);
  return game.send({ type: 'attack' });
}

/**
 * The hero strikes the Guardian on its left once, which defeats it. The Experience takes the hero to Level 2, and the game
 * waits for the Stat Point to be assigned before it steps on, so the point is assigned too. Returns the events of the strike.
 */
function slays(game: Game): readonly GameEvent[] {
  face(game, 'left');
  const events = game.send({ type: 'attack' });
  game.send({ type: 'assign-stat-point', stat: 'health' });
  return events;
}

const toldAbout = (events: readonly GameEvent[], type: GameEvent['type']): GameEvent[] =>
  events.filter((event) => event.type === type);

describe('the gate that the defeat of a Guardian opens, while the Guardian lives', () => {
  it('is shut', () => {
    const game = gateField();

    expect(gateOf(game).open).toBe(false);
    advance(game, 10);
    expect(gateOf(game).open).toBe(false);
  });

  it('stops the hero, who stands flush against it', () => {
    const game = gateField({ monsterTypes: CALM });

    walk(game, 'right', 40);

    expect(playingView(game).hero.position).toEqual({ x: 7.75, y: 3.5 });
  });

  it('does nothing when the hero uses Interact on it, which is all the hero can do', () => {
    const game = gateField({ monsterTypes: CALM });
    walk(game, 'right', 18);

    const events = game.send({ type: 'interact' });

    expect(events).toEqual([]);
    expect(gateOf(game).open).toBe(false);
  });

  it("stops the hero's arrow, so that it never reaches what stands behind the gate", () => {
    // A post of 10 Health stands on tile (9, 3), behind the gate. The arrow flies from the hero's centre, and would
    // reach it within the 4 tiles of its range if the gate were not in the way.
    const post: MonsterTypeDefinition = { behavior: 'stationary', health: 10, size: 0.5, experience: 0 };
    const game = gateField(
      {
        hero: { attack: 12, startingGear: WITH_BOW },
        interactables: [cacheAt('cache', 5, 4, 3), guardianGateAt(GATE, 8, 3, GUARDIAN_ID)],
        monsterTypes: { ...CALM, post },
      },
      [{ id: 'post', type: 'post', tile: { col: 9, row: 3 } }],
    );
    shoots(game, 'right');

    expect(advance(game, 40)).toEqual([]);

    expect(playingView(game).arrows).toEqual([]);
    expect(monsterNamed(game, 'post').health).toBe(10);
  });

  it('stops a monster that walks toward the hero, which stands flush against it and never reaches the hero', () => {
    // The hero stands at (7.5, 3.5), left of the gate, and a biter on tile (9, 3), right of it, notices it from there.
    const game = gateField({ monsterTypes: CALM, start: { area: 'arena', tile: { col: 7, row: 3 } } }, [
      biterAt('biter', 9, 3),
    ]);

    advance(game, 100);

    expect(monsterNamed(game, 'biter').position).toEqual({ x: 9.25, y: 3.5 });
    expect(playingView(game).hero.health).toBe(10);
  });

  it('stays shut when another monster is defeated, and tells nothing of a Guardian', () => {
    const game = gateField({}, [dummyAt('dummy-1', 6, 3)]);
    face(game, 'right');

    const events = game.send({ type: 'attack' });

    expect(toldAbout(events, 'monster-defeated')).toEqual([{ type: 'monster-defeated', monsterId: 'dummy-1' }]);
    expect(toldAbout(events, 'guardian-defeated')).toEqual([]);
    expect(gateOf(game).open).toBe(false);
  });
});

describe('the defeat of a Guardian', () => {
  it('opens its gate in the very command of the strike that takes its Health to 0, and tells of it once the fall is told', () => {
    const game = gateField();
    face(game, 'left');

    const events = game.send({ type: 'attack' });

    expect(events).toEqual([
      { type: 'hero-attacked', direction: 'left', zone: { minX: 4.25, minY: 3, maxX: 5.25, maxY: 4 } },
      { type: 'monster-hit', monsterId: GUARDIAN_ID, damage: 12, health: 0 },
      { type: 'monster-defeated', monsterId: GUARDIAN_ID },
      { type: 'guardian-defeated', monsterId: GUARDIAN_ID },
      { type: 'experience-gained', amount: 20 },
      { type: 'level-up', level: 2 },
    ]);
    expect(gateOf(game).open).toBe(true);
    expect(playingView(game).monsters).toEqual([]);
  });

  it('opens its gate in the very step of the arrow that takes its Health to 0, and in no step before', () => {
    const game = gateField({
      hero: { attack: 12, startingGear: WITH_BOW },
      interactables: [cacheAt('cache', 5, 4, 3), guardianGateAt(GATE, 8, 3, GUARDIAN_ID)],
    });
    shoots(game, 'left');
    const told: GameEvent[] = [];

    // The arrow leaves the hero's centre (x = 5.5) and flies 0.25 tile a step: the Guardian's body ends at x = 5, and
    // the path of step 1 stops short of it at x = 5.125, while that of step 2 reaches into it. The Guardian notices the
    // hero in step 1, which is the first step of the game, and that is told then.
    for (const step of [1, 2]) {
      told.push(...game.step());
      expect(gateOf(game).open, `the gate after step ${step}`).toBe(step === 2);
    }

    expect(told).toEqual([
      { type: 'guardian-engaged', monsterId: GUARDIAN_ID },
      { type: 'monster-hit', monsterId: GUARDIAN_ID, damage: 14, health: 0 },
      { type: 'monster-defeated', monsterId: GUARDIAN_ID },
      { type: 'guardian-defeated', monsterId: GUARDIAN_ID },
      { type: 'experience-gained', amount: 20 },
      { type: 'level-up', level: 2 },
    ]);
  });

  it('is told once: nothing more of it later, though the hero strikes where it stood', () => {
    const game = gateField();
    slays(game);

    const later = [...advance(game, 120), ...strike(game)];

    expect(toldAbout(later, 'hero-attacked')).toHaveLength(1);
    expect(toldAbout(later, 'guardian-defeated')).toEqual([]);
    expect(toldAbout(later, 'monster-defeated')).toEqual([]);
  });

  it('opens only the gate that names it', () => {
    const game = gateField({
      interactables: [guardianGateAt(GATE, 8, 3, GUARDIAN_ID), gateAt('other-gate', 8, 5)],
    });

    slays(game);

    expect(gateOf(game, GATE).open).toBe(true);
    expect(gateOf(game, 'other-gate').open).toBe(false);
  });

  it('lets the hero through the open gate, along the row it was shut in', () => {
    const game = gateField();
    slays(game);

    walk(game, 'right', 40);

    expect(playingView(game).hero.position).toEqual({ x: 10.5, y: 3.5 });
  });
});

describe('a lever and the gate that the defeat of a Guardian opens', () => {
  const contentWith = (targets: readonly string[]) =>
    guardianContent([guardianAt(GUARDIAN_ID, 4, 3)], {
      interactables: [
        guardianGateAt(GATE, 8, 3, GUARDIAN_ID),
        gateAt('other-gate', 8, 5),
        leverAt('lever-1', 3, 1, targets),
      ],
    });

  it('may not name it: no lever moves a gate that only a defeat opens', () => {
    expect(() => createGame({ content: contentWith([GATE]), random: fixedRandom })).toThrow(
      'Area "arena": lever "lever-1" moves "gate-1", which opens when the Guardian "guardian-1" is defeated: no lever may move it',
    );
  });

  it('is refused though the lever names another gate first', () => {
    expect(() => createGame({ content: contentWith(['other-gate', GATE]), random: fixedRandom })).toThrow(
      'no lever may move it',
    );
  });

  it('may move another gate of the same area', () => {
    expect(() => createGame({ content: contentWith(['other-gate']), random: fixedRandom })).not.toThrow();
  });
});
