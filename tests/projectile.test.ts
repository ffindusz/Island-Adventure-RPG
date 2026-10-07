import { describe, expect, it } from 'vitest';
import type { AreaDefinition, ExitDefinition, Game, RangedMonsterDefinition } from '../src/core';
import {
  ARENA_LAYOUT,
  WITH_BOW,
  advance,
  cacheAt,
  chestAt,
  dummyAt,
  face,
  monsterAction,
  monsterNamed,
  newGame,
  playingView,
  walk,
} from './fixtures';
import { SHOOTER, enemyContent, enemyField, shooterAt, untilFired } from './enemy-fixtures';

// The timeline is that of ranged-attacker.test.ts: a shooter in tile (2, 3), at (2.5, 3.5), and the hero at (6.5, 3.5),
// in the same row. The shot is fired in step 31 and has made k moves of 0.0625 tile in step 31 + k. Its body is 0.25
// wide, so its front edge is at x = 2.625 + 0.0625 k, and it meets the hero after 58 moves, in step 89.

const ATTACK = { type: 'attack' } as const;

const MONSTER_SHOT = { direction: 'right', size: 0.25, shooter: 'monster' } as const;

// The field of fixtures.ts with a wall on the tile (4, 3), in the row of fire.
const WALLED_FIELD = [
  '##############',
  '#............#',
  '#............#',
  '#...#........#',
  '#............#',
  '#............#',
  '##############',
];

describe('where a projectile stops', () => {
  // Whatever is on the tile (4, 3) has its left edge at x = 4. The front edge of the projectile is there after 22
  // moves, in step 53, with its centre at x = 3.875. In step 54 it cannot move on.
  function expectStoppedAtTheLeftEdgeOfTile4(game: Game): void {
    untilFired(game);
    advance(game, 22);
    expect(playingView(game).arrows).toEqual([{ position: { x: 3.875, y: 3.5 }, ...MONSTER_SHOT }]);

    expect(advance(game, 1)).toEqual([]);

    expect(playingView(game).arrows).toEqual([]);
    expect(advance(game, 46)).toEqual([]); // steps 55 to 100: the hero, behind it, is not hurt
    expect(playingView(game).hero.health).toBe(10);
  }

  it('is stopped by solid terrain: it flies right up to it and is gone', () => {
    expectStoppedAtTheLeftEdgeOfTile4(enemyField([shooterAt('shooter-1', 2, 3)], { layout: WALLED_FIELD }));
  });

  it('is stopped by a chest, as it is by solid terrain', () => {
    const chest = chestAt('chest-1', 4, 3, 'iron-sword');

    expectStoppedAtTheLeftEdgeOfTile4(enemyField([shooterAt('shooter-1', 2, 3)], { interactables: [chest] }));
  });

  it('is gone when its range is spent, short of a hero that is farther away than that', () => {
    // A range of 2 tiles is 32 moves, from the centre of the shooter.
    const shortShot: RangedMonsterDefinition = { ...SHOOTER, projectile: { ...SHOOTER.projectile, range: 2 } };
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { monsterTypes: { shooter: shortShot } });
    untilFired(game);

    advance(game, 31);
    expect(playingView(game).arrows).toEqual([{ position: { x: 4.4375, y: 3.5 }, ...MONSTER_SHOT }]);

    expect(advance(game, 1)).toEqual([]); // step 63: the 32nd move
    expect(playingView(game).arrows).toEqual([]);
    expect(advance(game, 30)).toEqual([]); // steps 64 to 93
    expect(playingView(game).hero.health).toBe(10);
  });

  it('flies through the monsters in its way, and hurts none of them', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3), dummyAt('dummy-1', 4, 3)]);
    untilFired(game);

    const events = advance(game, 58);

    expect(events).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]);
    expect(monsterNamed(game, 'dummy-1').health).toBe(3);
    expect(monsterNamed(game, 'shooter-1').health).toBe(3);
  });
});

describe('the size of a projectile, which is a setting of its type', () => {
  // The hero has stepped down 3 times before the shot, to y = 3.875, so its top edge is at y = 3.625. A projectile
  // 0.25 wide flies along y = 3.5 with its bottom edge there: edges that meet do not overlap, and it flies by the hero.
  // One that is 0.5 wide reaches 0.125 into the hero. It is as wide as the shooter, which is as wide as it may be.
  const BROAD: RangedMonsterDefinition = { ...SHOOTER, projectile: { ...SHOOTER.projectile, size: 0.5 } };

  function firedAtAHeroBelowTheRow(shooter: RangedMonsterDefinition): Game {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { monsterTypes: { shooter } });
    walk(game, 'down', 3);
    advance(game, 27);
    expect(game.step()).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' }]); // step 31
    return game;
  }

  it('flies by a hero whose top edge only meets its bottom edge', () => {
    const game = firedAtAHeroBelowTheRow(SHOOTER);

    expect(advance(game, 70)).toEqual([]); // steps 32 to 101: its back edge has passed the hero's right edge
    expect(playingView(game).arrows).toEqual([{ position: { x: 6.875, y: 3.5 }, ...MONSTER_SHOT }]);
    expect(playingView(game).hero.health).toBe(10);
  });

  it('is drawn as wide as its type says, and reaches into that hero when it is broader', () => {
    const game = firedAtAHeroBelowTheRow(BROAD);
    expect(playingView(game).arrows).toEqual([{ position: { x: 2.5, y: 3.5 }, ...MONSTER_SHOT, size: 0.5 }]);

    // Its front edge, at x = 2.75 + 0.0625 k, meets the hero's left edge at x = 6.25 after 56 moves, and it touches the hero.
    expect(advance(game, 55)).toEqual([]);
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]); // step 87
  });
});

describe('a projectile and the arrows of the hero', () => {
  /** The hero has opened the cache below it, has the bow in hand and faces left, toward the shooter on its left. */
  function archerAgainst(shooter: RangedMonsterDefinition): Game {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], {
      hero: { startingGear: WITH_BOW },
      interactables: [cacheAt('cache', 6, 4, 3)],
      monsterTypes: { shooter },
    });
    face(game, 'down');
    game.send({ type: 'interact' });
    game.send({ type: 'switch-weapon' });
    face(game, 'left');
    return game;
  }

  it('flies through an arrow of the hero that flies the other way, and neither stops the other', () => {
    const game = archerAgainst({ ...SHOOTER, health: 99 });
    untilFired(game);
    game.send(ATTACK); // the hero shoots back at once: its arrow, 0.25 tile a step, leaves (6.5, 3.5) in step 32

    advance(game, 13); // step 44: they have passed each other
    expect(playingView(game).arrows).toEqual([
      { position: { x: 3.3125, y: 3.5 }, ...MONSTER_SHOT },
      { position: { x: 3.25, y: 3.5 }, direction: 'left', size: 0.25, shooter: 'hero' },
    ]);

    // The arrow of the hero reaches the shooter in step 46, and the projectile flies on.
    expect(advance(game, 2)).toEqual([{ type: 'monster-hit', monsterId: 'shooter-1', damage: 3, health: 96 }]);
    expect(playingView(game).arrows).toEqual([{ position: { x: 3.4375, y: 3.5 }, ...MONSTER_SHOT }]);
  });

  it('flies on when its shooter is defeated: it hurts the hero all the same', () => {
    const game = archerAgainst(SHOOTER);
    untilFired(game);
    game.send(ATTACK);

    expect(advance(game, 15)).toEqual([
      { type: 'monster-hit', monsterId: 'shooter-1', damage: 3, health: 0 },
      { type: 'monster-defeated', monsterId: 'shooter-1' },
      { type: 'experience-gained', amount: 6 },
    ]);
    expect(playingView(game).arrows).toHaveLength(1);

    expect(advance(game, 42)).toEqual([]); // steps 47 to 88
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 }]);
  });
});

describe('a projectile that defeats the hero', () => {
  // The second shooter, in tile (6, 1), is right above the hero. Its projectile flies down and meets the hero in step 57,
  // after 26 moves, while the projectile of the first shooter is still on its way. The hero has 4 Health, which is the
  // damage of a shot.
  it('takes the arrows still in the air with it, and the fight starts over: the monsters are new ones', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3), shooterAt('shooter-2', 6, 1)], { hero: { health: 4 } });
    advance(game, 56);
    expect(playingView(game).arrows, 'both shots on their way').toHaveLength(2);

    const events = game.step();

    expect(events.map((event) => event.type)).toEqual(['hero-hit', 'hero-defeated']);
    expect(playingView(game).arrows).toEqual([]);
    expect(game.snapshot().state.arrows).toEqual([]);
    expect(playingView(game).hero).toMatchObject({ position: { x: 6.5, y: 3.5 }, health: 4 });
    for (const id of ['shooter-1', 'shooter-2']) {
      expect(monsterNamed(game, id), id).toMatchObject({ health: 3, action: { type: 'idle' } });
    }
  });

  it('is followed by new monsters that begin to wind up in the next step, and by no shot of the old ones', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3), shooterAt('shooter-2', 6, 1)], { hero: { health: 4 } });
    advance(game, 57); // the defeat

    game.step(); // step 58
    expect(monsterAction(game, 'shooter-1')).toMatchObject({ type: 'winding-up', progress: 0 });

    // The new shooters fire in step 88. The old shot in the row would have met the hero in step 89.
    const events = advance(game, 31); // steps 59 to 89
    expect(events.map((event) => event.type)).toEqual(['monster-fired', 'monster-fired']);
    expect(playingView(game).hero.health).toBe(4);
  });
});

describe('a projectile and the Adventure Areas', () => {
  // The hero goes through an exit on the tile (8, 3). Its right edge reaches x = 8 after 10 steps and the hero is in the
  // exit on the 11th. The way back through the cellar takes 3 steps. It arrives in the arena at (7.5, 3.5).
  const TO_CELLAR: ExitDefinition = {
    id: 'to-cellar',
    zone: { col: 8, row: 3, width: 1, height: 1 },
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
    entrances: [{ id: 'from-arena', tile: { col: 2, row: 3 } }],
    exits: [TO_ARENA],
  };

  function shooterWithACellar(): Game {
    return newGame(
      enemyContent([shooterAt('shooter-1', 2, 3)], {
        entrances: [{ id: 'from-cellar', tile: { col: 7, row: 3 } }],
        exits: [TO_CELLAR],
        otherAreas: [CELLAR],
      }),
    );
  }

  it('is gone when the hero goes through an exit: a save made then holds none, and none flies on when it comes back', () => {
    const game = shooterWithACellar();
    untilFired(game);
    walk(game, 'right', 10);
    expect(playingView(game).arrows, 'still in the air just before the exit').toHaveLength(1);

    walk(game, 'right', 1);

    expect(playingView(game).area.id).toBe('cellar');
    expect(game.snapshot().state.arrows, 'a save made in the cellar').toEqual([]);

    walk(game, 'left', 3);
    expect(playingView(game).area.id).toBe('arena');
    expect(playingView(game).arrows).toEqual([]);
    advance(game, 20);
    expect(playingView(game).arrows).toEqual([]);
    expect(game.snapshot().state.arrows).toEqual([]);
  });

  it('is not fired by a shooter that was winding up when the hero left: its wind-up starts over when the hero is back', () => {
    const game = shooterWithACellar();
    walk(game, 'right', 11); // the shooter has wound up for 9 steps
    walk(game, 'left', 3);
    expect(monsterAction(game, 'shooter-1')).toEqual({ type: 'idle' });

    expect(advance(game, 30)).toEqual([]);
    expect(game.step()).toEqual([{ type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' }]);
  });
});
