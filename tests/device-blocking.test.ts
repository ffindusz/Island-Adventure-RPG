import { describe, expect, it } from 'vitest';
import type {
  ContentDefinition,
  Game,
  InteractableDefinition,
  MonsterPlacement,
  MonsterTypeDefinition,
} from '../src/core';
import {
  WITH_BOW,
  advance,
  arena,
  biterAt,
  cacheAt,
  doorAt,
  face,
  gameAtTitle,
  gateAt,
  keyAt,
  monsterAction,
  monsterNamed,
  newGame,
  playingView,
  throughStorage,
  walk,
} from './fixtures';
import { chargerAt, enemyContent, shooterAt, untilFired } from './enemy-fixtures';

// What a shut device does to everything that moves, besides the hero walking (doors.test.ts): it stops the hero's
// arrow, a monster that walks, the dash of a charger and the projectile of a ranged attacker, as a chest does, and
// once it is open they all pass. They share one rule for what is in the way (interactableObstacles), so each is
// pinned here once, with the geometry worked out by hand.
//
// A device stands on the tile (col, row) with the id "blocker". It is open in a game that continues a saved one in
// which it is.

/** The devices that fill a tile and are solid while shut. A door needs a key, which lies out of the way in (5, 1). */
const BLOCKERS: readonly {
  readonly what: string;
  readonly placedAt: (col: number, row: number) => InteractableDefinition[];
}[] = [
  { what: 'a door', placedAt: (col, row) => [doorAt('blocker', col, row, 'key-1'), keyAt('key-1', 5, 1)] },
  { what: 'a gate', placedAt: (col, row) => [gateAt('blocker', col, row)] },
];

/** The game of `content` as it would be had the blocker been opened: it continues a saved game that has it open. */
function gameWithBlockerOpen(content: ContentDefinition): Game {
  const snapshot = throughStorage(newGame(content).snapshot());
  const blocker = snapshot.state.areas['arena']?.interactables['blocker'];
  if (blocker === undefined || !('open' in blocker)) {
    throw new Error('Expected the content to place a door or a gate "blocker" in the arena');
  }
  blocker.open = true;
  const game = gameAtTitle(content);
  game.send({ type: 'continue', snapshot });
  return game;
}

describe.each(BLOCKERS)('$what', ({ placedAt }) => {
  describe("and the hero's arrow", () => {
    // The hero stands at (3.5, 3.5) with a short bow, which does 3 damage. The blocker is on tile (4, 3), at its
    // right, and a post, a monster of 10 Health, stands on tile (5, 3) behind it. A cache beside the hero holds the
    // arrows. The arrow is 0.25 wide and flies 0.25 tile a step from the hero's centre: its front edge reaches the
    // blocker's left edge (x = 4) in step 1 and the post's (x = 5.25) in step 7.
    const POST: MonsterTypeDefinition = { behavior: 'stationary', health: 10, size: 0.5, experience: 0 };
    const POST_AT: MonsterPlacement = { id: 'post', type: 'post', tile: { col: 5, row: 3 } };

    const content = (): ContentDefinition =>
      arena({
        hero: { startingGear: WITH_BOW },
        monsterTypes: { post: POST },
        monsters: [POST_AT],
        interactables: [cacheAt('cache', 3, 4, 3), ...placedAt(4, 3)],
      });

    /** The hero opens the cache, takes the bow in hand and shoots right. */
    function shoots(game: Game): Game {
      face(game, 'down');
      game.send({ type: 'interact' });
      game.send({ type: 'switch-weapon' });
      face(game, 'right');
      game.send({ type: 'attack' });
      return game;
    }

    it('is stopped by it while it is shut, so that it never reaches the monster behind it', () => {
      const game = shoots(newGame(content()));

      advance(game, 1);
      expect(playingView(game).arrows).toMatchObject([{ position: { x: 3.75, y: 3.5 } }]);
      expect(advance(game, 40)).toEqual([]);

      expect(playingView(game).arrows).toEqual([]);
      expect(monsterNamed(game, 'post').health).toBe(10);
    });

    it('flies through it once it is open, and hits the monster behind it', () => {
      const game = shoots(gameWithBlockerOpen(content()));

      expect(advance(game, 6)).toEqual([]);
      expect(advance(game, 1)).toEqual([{ type: 'monster-hit', monsterId: 'post', damage: 3, health: 7 }]);
    });
  });

  describe('and a monster that walks toward the hero', () => {
    // The hero stands at (3.5, 3.5) and a biter on tile (5, 3), at (5.5, 3.5), notices it from there. The blocker is
    // on tile (4, 3), between them: the biter's left edge is at x = 5.25 and the blocker's right edge at x = 5. The
    // biter walks 0.0625 tile a step. Free to walk, it comes within its reach of 0.75 of the hero when its left edge
    // is past x = 3.75 + 0.75 = 4.5, which takes 13 steps and puts it at x = 5.5 - 13 * 0.0625 = 4.6875, and in step
    // 14 it winds up to bite.
    const content = (): ContentDefinition =>
      arena({ monsters: [biterAt('biter', 5, 3)], interactables: placedAt(4, 3) });

    it('is stopped by it while it is shut: the monster stands flush against it and never reaches the hero', () => {
      const game = newGame(content());

      advance(game, 100);

      expect(monsterNamed(game, 'biter').position).toEqual({ x: 5.25, y: 3.5 });
      expect(playingView(game).hero.health).toBe(10);
    });

    it('lets the monster through once it is open: it goes on until it is within reach of the hero', () => {
      const game = gameWithBlockerOpen(content());

      advance(game, 14);

      expect(monsterNamed(game, 'biter').position).toEqual({ x: 4.6875, y: 3.5 });
      expect(monsterAction(game, 'biter')).toMatchObject({ type: 'winding-up' });
    });
  });

  describe('and the dash of a charger', () => {
    // The charger on tile (2, 3), at (2.5, 3.5), winds up for 30 steps and dashes right along a lane that begins at
    // its front edge, x = 2.75, and is 6 tiles long. The hero steps aside out of the lane while it winds up, and the
    // dash is launched in step 31, after which it moves 0.25 tile a step. The blocker is on tile (8, 3), whose left
    // edge is at x = 8: the front edge of the charger is there after 21 moves, with its centre at x = 7.75. Where the
    // lane is whole, the dash is 24 moves long and ends with the centre at x = 8.5.
    const content = (): ContentDefinition =>
      enemyContent([chargerAt('charger-1', 2, 3)], { interactables: placedAt(8, 3) });

    /** Plays up to step 31, the one in which the dash is launched, with the hero out of its lane. */
    function launchedDash(game: Game): Game {
      game.step();
      walk(game, 'up', 4);
      advance(game, 26);
      return game;
    }

    it('shows a lane that ends at the blocker while it is shut', () => {
      const game = newGame(content());

      game.step();

      expect(monsterAction(game, 'charger-1')).toEqual({
        type: 'winding-up',
        progress: 0,
        zone: { minX: 2.75, minY: 3.25, maxX: 8, maxY: 3.75 },
      });
    });

    it('stops flush against the blocker while it is shut', () => {
      const game = launchedDash(newGame(content()));

      advance(game, 20);
      expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 7.5, y: 3.5 });
      advance(game, 1);

      expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 7.75, y: 3.5 });
      expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
    });

    it('shows the whole lane once the blocker is open', () => {
      const game = gameWithBlockerOpen(content());

      game.step();

      expect(monsterAction(game, 'charger-1')).toEqual({
        type: 'winding-up',
        progress: 0,
        zone: { minX: 2.75, minY: 3.25, maxX: 8.75, maxY: 3.75 },
      });
    });

    it('dashes on through it once it is open, to the end of its lane', () => {
      const game = launchedDash(gameWithBlockerOpen(content()));

      advance(game, 21);
      expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 7.75, y: 3.5 });
      expect(monsterAction(game, 'charger-1')).toEqual({ type: 'dashing', direction: 'right' });
      advance(game, 3);

      expect(monsterNamed(game, 'charger-1').position).toEqual({ x: 8.5, y: 3.5 });
      expect(monsterAction(game, 'charger-1')).toEqual({ type: 'recovering' });
    });
  });

  describe('and the projectile of a ranged attacker', () => {
    // The shooter on tile (2, 3), at (2.5, 3.5), and the hero at (6.5, 3.5) are in one row. The shot is fired in step
    // 31 and has made k moves of 0.0625 tile in step 31 + k. The blocker is on tile (4, 3), with its left edge at
    // x = 4: the front edge of the projectile is there after 22 moves, with its centre at x = 3.875. Where it is
    // free, the shot meets the hero after 58 moves.
    const content = (): ContentDefinition =>
      enemyContent([shooterAt('shooter-1', 2, 3)], { interactables: placedAt(4, 3) });

    it('is stopped by it while it is shut: it flies right up to it and is gone, and the hero is not hurt', () => {
      const game = newGame(content());
      untilFired(game);

      advance(game, 22);
      expect(playingView(game).arrows).toEqual([
        { position: { x: 3.875, y: 3.5 }, direction: 'right', size: 0.25, shooter: 'monster' },
      ]);
      expect(advance(game, 1)).toEqual([]);

      expect(playingView(game).arrows).toEqual([]);
      expect(advance(game, 46)).toEqual([]);
      expect(playingView(game).hero.health).toBe(10);
    });

    it('flies through it once it is open, and hits the hero', () => {
      const game = gameWithBlockerOpen(content());
      untilFired(game);

      expect(advance(game, 58)).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]);
    });
  });
});
