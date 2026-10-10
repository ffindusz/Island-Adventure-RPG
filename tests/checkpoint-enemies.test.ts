import { describe, expect, it } from 'vitest';
import type { CheckpointDefinition, ContentDefinition, ExitDefinition, Game, MonsterPlacement } from '../src/core';
import { FIELD_LAYOUT, advance, biterAt, face, frailMonster, monsterAction, monsterNamed, newGame, playingView, strike, untilDefeated, walk } from './fixtures';
import { chargerAt, enemyContent, enemyField, shooterAt } from './enemy-fixtures';

// Chargers and ranged attackers with the Checkpoints and the defeat of Checkpoints (checkpoints.test.ts). The timelines
// are those of charger.test.ts and projectile.test.ts: a charger or a shooter in the tile (2, 3) launches its dash or
// fires in step 31, the dash, 0.25 tile a step, would meet a hero who stays at (6.5, 3.5) in step 45 and the shot, 0.0625
// tile a step, in step 89.

const CAMP: CheckpointDefinition = { id: 'camp', tile: { col: 5, row: 3 } };
const CAMP_ACTIVATED = { type: 'checkpoint-activated', checkpointId: 'camp' } as const;

describe('a hero who comes onto a Checkpoint as a monster defeats it', () => {
  // The hero has 4 Health, which a shot and a dash take. It walks left, toward the monster, and its body overlaps the
  // camp, on the tile (5, 3), from its 3rd step: its left edge goes from 6.25 to 5.875, past the edge of the camp at 6.
  it('counts a projectile as it does any hit: the Checkpoint is activated first, and the hero is back on it', () => {
    // The front of the shot is at 5.875 in step 83, and in step 82 it is at 5.8125, short of the hero's edge at 6.
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { hero: { health: 4 }, checkpoints: [CAMP] });
    advance(game, 80);

    const events = walk(game, 'left', 3); // steps 81 to 83

    expect(events).toEqual([
      CAMP_ACTIVATED,
      { type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 0 },
      { type: 'hero-defeated' },
    ]);
    const view = playingView(game);
    expect(view.hero).toMatchObject({ position: { x: 5.5, y: 3.5 }, health: 4 });
    expect(view.checkpoints).toEqual([{ id: 'camp', position: { x: 5.5, y: 3.5 }, size: 1, active: true }]);
  });

  it('counts a dash the same way', () => {
    // The back of the charger is at 5.75 in step 43, a gap of 0.25 short of the hero's edge at 6, and its dash of 0.25
    // reaches the hero, at 5.875, in step 44.
    const game = enemyField([chargerAt('charger-1', 2, 3)], { hero: { health: 4 }, checkpoints: [CAMP] });
    advance(game, 41);

    const events = walk(game, 'left', 3); // steps 42 to 44

    expect(events).toEqual([
      CAMP_ACTIVATED,
      { type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 0 },
      { type: 'hero-defeated' },
    ]);
    const view = playingView(game);
    expect(view.hero).toMatchObject({ position: { x: 5.5, y: 3.5 }, health: 4 });
    expect(view.checkpoints).toEqual([{ id: 'camp', position: { x: 5.5, y: 3.5 }, size: 1, active: true }]);
  });
});

// The world of the falls below: the arena is the wide field of enemy-fixtures.ts and the cellar a second one.
//
//   arena   the hero begins at (6.5, 3.5); a weakling stands on the tile (5, 3) and the hero strikes it down first; the
//           camp, a Checkpoint, is on the tile (7, 3), the exit "to-cellar" on the tile (8, 3) and the entrance
//           "from-cellar" on the tile (11, 3)
//   cellar  the entrance "from-arena" is on the tile (2, 3): the hero arrives there, at (2.5, 3.5), and stays; the exit
//           "to-arena" is on the tile (1, 3); the monsters and a Checkpoint are up to each test
//
// The hero's body overlaps the camp on its 3rd step to the right and the exit on its 11th. It has 4 Health, which a bite
// (5), a dash (6) and a shot (4) all take. The monsters of the cellar first act in the step after the hero arrives.

const EXIT_CAMP: CheckpointDefinition = { id: 'exit-camp', tile: { col: 7, row: 3 } };
const EXIT_CAMP_ACTIVATED = { type: 'checkpoint-activated', checkpointId: 'exit-camp' } as const;
const EXIT_CAMP_VIEW = { id: 'exit-camp', position: { x: 7.5, y: 3.5 }, size: 1 };
const CELLAR_DOOR: CheckpointDefinition = { id: 'cellar-door', tile: { col: 2, row: 3 } };
const CELLAR_CORNER: CheckpointDefinition = { id: 'cellar-corner', tile: { col: 12, row: 5 } };
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

function world(
  cellar: readonly MonsterPlacement[],
  cellarCheckpoint: CheckpointDefinition,
  arena: readonly MonsterPlacement[] = [],
  heroHealth = 4,
): ContentDefinition {
  return enemyContent([{ id: 'weakling', type: 'weakling', tile: { col: 5, row: 3 } }, ...arena], {
    hero: { health: heroHealth },
    checkpoints: [EXIT_CAMP],
    entrances: [{ id: 'from-cellar', tile: { col: 11, row: 3 } }],
    exits: [TO_CELLAR],
    monsterTypes: { weakling: frailMonster(0) },
    otherAreas: [
      {
        id: 'cellar',
        name: 'Cellar',
        layout: FIELD_LAYOUT,
        monsters: cellar,
        entrances: [{ id: 'from-arena', tile: { col: 2, row: 3 } }],
        exits: [TO_ARENA],
        checkpoints: [cellarCheckpoint],
      },
    ],
  });
}

/** The hero strikes down the weakling, touches the camp on its way to the exit and arrives in the cellar. */
function intoTheCellar(game: Game): void {
  face(game, 'left');
  strike(game);
  expect(playingView(game).monsters).toEqual([]);

  const events = walk(game, 'right', 11);

  expect(events).toContainEqual(EXIT_CAMP_ACTIVATED);
  expect(events).toContainEqual({ type: 'area-changed', areaId: 'cellar' });
}

/** A hero sent back to the camp in the arena walks to the exit and arrives in the cellar again; one in the cellar stays. */
function backInTheCellar(game: Game): void {
  if (playingView(game).area.id === 'cellar') {
    return;
  }
  expect(walk(game, 'right', 3)).toContainEqual({ type: 'area-changed', areaId: 'cellar' });
}

// What defeats the hero: a monster of the cellar, with the damage it does and the place it stands on, which defeat puts
// it back to. The biter's reach covers the hero where it arrives and its hit lands in the 31st step after the arrival;
// the charger and the shooter are in the row of the hero, and their hits land in the 49th step (the dash) and in the 89th.
const KILLERS = [
  {
    how: 'a biter',
    monster: biterAt('killer', 3, 3),
    hit: { type: 'hero-hit', monsterId: 'killer', damage: 5, health: 0 },
    home: { x: 3.5, y: 3.5 },
  },
  {
    how: 'the dash of a charger',
    monster: chargerAt('killer', 7, 3),
    hit: { type: 'hero-hit', monsterId: 'killer', damage: 6, health: 0 },
    home: { x: 7.5, y: 3.5 },
  },
  {
    how: 'the projectile of a shooter',
    monster: shooterAt('killer', 6, 3),
    hit: { type: 'hero-hit', monsterId: 'killer', damage: 4, health: 0 },
    home: { x: 6.5, y: 3.5 },
  },
] as const;

describe('a hero defeated in the cellar with its Checkpoint in the arena', () => {
  it.each(KILLERS)('sends a hero defeated by $how back to the camp in the arena, at full Health', ({ monster, hit }) => {
    const game = newGame(world([monster], CELLAR_CORNER));
    intoTheCellar(game);

    const events = untilDefeated(game);

    expect(events.slice(-3)).toEqual([hit, { type: 'hero-defeated' }, { type: 'area-changed', areaId: 'arena' }]);
    const view = playingView(game);
    expect(view.area.id).toBe('arena');
    expect(view.hero).toMatchObject({ position: { x: 7.5, y: 3.5 }, health: 4 });
    expect(view.checkpoints).toEqual([{ ...EXIT_CAMP_VIEW, active: true }]);
  });

  it.each(KILLERS)('starts the arena over and leaves no arrow in the air when $how defeated the hero', ({ monster }) => {
    const game = newGame(world([monster], CELLAR_CORNER));
    intoTheCellar(game);

    untilDefeated(game);

    expect(monsterNamed(game, 'weakling')).toMatchObject({ health: 1, action: { type: 'idle' } });
    expect(playingView(game).arrows).toEqual([]);
    expect(game.snapshot().state.arrows).toEqual([]);
  });

  it.each(KILLERS)('leaves the monsters of the cellar calm when $how defeated the hero', ({ monster }) => {
    const game = newGame(world([monster], CELLAR_CORNER));
    intoTheCellar(game);

    untilDefeated(game);

    const { monsters } = game.snapshot().state.areas['cellar'] ?? { monsters: [] };
    expect(monsters.map(({ id, action }) => ({ id, action }))).toEqual([{ id: 'killer', action: { type: 'idle' } }]);
  });
});

describe('a hero defeated in the cellar with its Checkpoint in the cellar', () => {
  // The hero touches the door of the cellar as it arrives, after the camp: the door is the Checkpoint it touched last.
  it.each(KILLERS)('sends a hero defeated by $how back to the door of the cellar, at full Health', ({ monster, hit }) => {
    const game = newGame(world([monster], CELLAR_DOOR));
    intoTheCellar(game);

    const events = untilDefeated(game);

    expect(events.slice(-2)).toEqual([hit, { type: 'hero-defeated' }]);
    expect(events).not.toContainEqual(expect.objectContaining({ type: 'area-changed' }));
    const view = playingView(game);
    expect(view.area.id).toBe('cellar');
    expect(view.hero).toMatchObject({ position: { x: 2.5, y: 3.5 }, health: 4 });
  });

  it.each(KILLERS)('starts the cellar over when $how defeated the hero: its monster is new and first acts in the next step', ({ monster, home }) => {
    const game = newGame(world([monster], CELLAR_DOOR));
    intoTheCellar(game);

    untilDefeated(game);

    expect(monsterNamed(game, 'killer')).toMatchObject({ position: home, health: 3, action: { type: 'idle' } });
  });
});

describe('a shot in flight when the dash of a charger defeats the hero', () => {
  // The shooter on the tile (2, 5), below the place where the hero arrives, fires in step 31 and its shot would meet the
  // hero there in step 57. The charger on the tile (7, 3), in the row of the hero, hits with its dash in step 49.
  const KILLER_AND_SHOOTER = [chargerAt('killer', 7, 3), shooterAt('shooter-1', 2, 5)];

  it.each([
    { where: 'in the arena', checkpoint: CELLAR_CORNER },
    { where: 'in the cellar', checkpoint: CELLAR_DOOR },
  ])('takes the shot out of the air, with the Checkpoint $where', ({ checkpoint }) => {
    const game = newGame(world(KILLER_AND_SHOOTER, checkpoint));
    intoTheCellar(game);
    advance(game, 48);
    expect(playingView(game).arrows).toHaveLength(1);

    const events = game.step();

    expect(events).toContainEqual({ type: 'hero-defeated' });
    expect(playingView(game).arrows).toEqual([]);
    expect(game.snapshot().state.arrows).toEqual([]);
  });

  it('does not let that shot meet the hero who is back at the door of the cellar', () => {
    const game = newGame(world(KILLER_AND_SHOOTER, CELLAR_DOOR));
    intoTheCellar(game);
    advance(game, 49);

    // The new monsters are still winding up for 30 steps, and the old shot would hit in the 8th.
    const events = advance(game, 30);

    expect(events).not.toContainEqual(expect.objectContaining({ type: 'hero-hit' }));
    expect(playingView(game).hero.health).toBe(4);
  });
});

// The other monsters of the cellar are each in a state of their own when the hero falls. The killer is the biter on the
// tile (3, 3), whose bite lands in step 31. A monster listed before it has acted in that step: a charger has launched its
// dash and a shooter has fired, and recovers. One listed after it has not: it still winds up, a step short of the dash or
// the shot. Any of them, left as it was, would hit the hero soon after it is back, and a new one hits in step 31.
const BYSTANDERS = [
  { state: 'a charger that winds up', before: [], after: [chargerAt('bystander', 2, 5)] },
  { state: 'a charger that has launched its dash', before: [chargerAt('bystander', 2, 1)], after: [] },
  { state: 'a shooter that winds up', before: [], after: [shooterAt('bystander', 2, 5)] },
  { state: 'a shooter that has just fired', before: [shooterAt('bystander', 2, 5)], after: [] },
] as const;

const FALLS = [
  { checkpointIn: 'the arena', checkpoint: CELLAR_CORNER },
  { checkpointIn: 'the cellar', checkpoint: CELLAR_DOOR },
] as const;

describe('the other monsters of the cellar when a biter defeats the hero', () => {
  const cases = BYSTANDERS.flatMap((bystander) => FALLS.map((fall) => ({ ...bystander, ...fall })));

  it.each(cases)('start over with $state, with the Checkpoint in $checkpointIn', ({ before, after, checkpoint }) => {
    const game = newGame(world([...before, biterAt('killer', 3, 3), ...after], checkpoint));
    intoTheCellar(game);
    advance(game, 30);
    expect(monsterNamed(game, 'bystander').action).toMatchObject({ type: 'winding-up' });

    expect(game.step()).toContainEqual({ type: 'hero-defeated' });

    const { state } = game.snapshot();
    expect(state.arrows).toEqual([]);
    expect((state.areas['cellar'] ?? { monsters: [] }).monsters.map(({ action }) => action)).toEqual([{ type: 'idle' }, { type: 'idle' }]);
    backInTheCellar(game);
    expect(advance(game, 30)).not.toContainEqual(expect.objectContaining({ type: 'hero-hit' }));
    expect(game.step()).toContainEqual(expect.objectContaining({ type: 'hero-hit', monsterId: 'killer' }));
  });
});

describe('a charger that recovers when a shot defeats the hero', () => {
  it.each(FALLS)('starts over, with the Checkpoint in $checkpointIn', ({ checkpoint }) => {
    // The hero has 10 Health: the dash of the charger takes 6 of them in step 49 and the shot of the shooter on the tile
    // (2, 5) the other 4 in step 57, while the charger, which has hit, rests.
    const game = newGame(world([chargerAt('bystander', 7, 3), shooterAt('killer', 2, 5)], checkpoint, [], 10));
    intoTheCellar(game);
    advance(game, 56);
    expect(monsterNamed(game, 'bystander').action).toEqual({ type: 'recovering' });
    expect(playingView(game).hero.health).toBe(4);

    expect(game.step()).toContainEqual({ type: 'hero-defeated' });

    const { state } = game.snapshot();
    expect(state.arrows).toEqual([]);
    expect((state.areas['cellar'] ?? { monsters: [] }).monsters.map(({ action }) => action)).toEqual([{ type: 'idle' }, { type: 'idle' }]);
  });
});

describe('a projectile that defeats a hero in the step it walks into an exit', () => {
  // The shooter on the tile (9, 3), behind the exit, fires in step 31 along the row of the hero, which waits until step 40
  // and then walks right: it is in the exit on the 11th step, step 51. The tip of the projectile is at 8.125 in that step,
  // where the right edge of the hero is, and at 8.1875 in step 50, when the edge is at 8.
  it('hits first: the hero is back at the camp it touched on its way, and has not gone through the exit', () => {
    const game = newGame(world([], CELLAR_CORNER, [shooterAt('shooter-1', 9, 3)]));
    advance(game, 40);

    const events = walk(game, 'right', 11);

    expect(events).toEqual([EXIT_CAMP_ACTIVATED, { type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 0 }, { type: 'hero-defeated' }]);
    const view = playingView(game);
    expect(view.area.id).toBe('arena');
    expect(view.hero).toMatchObject({ position: { x: 7.5, y: 3.5 }, health: 4 });
  });
});

describe('a Checkpoint between a monster and the hero', () => {
  // The camp is on the tile (4, 3), in the row of the monster on the tile (2, 3) and of the hero, who stands at (6.5, 3.5)
  // with its 10 Health. A Checkpoint is not an obstacle: the lane, the dash and the shot go over it, and a hero who is
  // hit away from it has not touched it.
  const CAMP_IN_THE_WAY: CheckpointDefinition = { id: 'camp', tile: { col: 4, row: 3 } };
  const CAMP_INACTIVE = [{ id: 'camp', position: { x: 4.5, y: 3.5 }, size: 1, active: false }];

  it('lets a charger show its whole lane across it and dash over it, and the hit activates nothing', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)], { checkpoints: [CAMP_IN_THE_WAY] });
    game.step();
    expect(monsterAction(game, 'charger-1')).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 2.75, minY: 3.25, maxX: 8.75, maxY: 3.75 },
    });

    const events = advance(game, 44); // steps 2 to 45

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 4 });
    expect(events).not.toContainEqual(expect.objectContaining({ type: 'checkpoint-activated' }));
    expect(playingView(game).checkpoints).toEqual(CAMP_INACTIVE);
  });

  it('lets a projectile fly over it, and the hit activates nothing', () => {
    const game = enemyField([shooterAt('shooter-1', 2, 3)], { checkpoints: [CAMP_IN_THE_WAY] });

    const events = advance(game, 89);

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 6 });
    expect(events).not.toContainEqual(expect.objectContaining({ type: 'checkpoint-activated' }));
    expect(playingView(game).checkpoints).toEqual(CAMP_INACTIVE);
  });
});
