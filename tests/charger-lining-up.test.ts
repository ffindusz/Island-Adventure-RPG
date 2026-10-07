import { describe, expect, it } from 'vitest';
import { advance, monsterAction, monsterNamed, walk } from './fixtures';
import { CHARGER, chargerAt, enemyField } from './enemy-fixtures';

// A charger in tile (2, 3) stands at (2.5, 3.5) and walks 0.0625 tile a step to line up with the hero. It begins its
// wind-up as soon as the hero's body overlaps its lane, the strip in front of it that is as wide as its body: the
// lane to the right is y 3.25 to 3.75 as long as the charger is at y = 3.5. The hero walks 0.125 tile a step.

// The field of fixtures.ts with a wall on column 3, from the top row to the bottom one: it ends the lane to the right of
// the charger in the tile (2, 3) at x = 3, however far down the charger goes.
const WALL_ACROSS = [
  '##############',
  '#..#.........#',
  '#..#.........#',
  '#..#.........#',
  '#..#.........#',
  '#..#.........#',
  '##############',
];

describe('a charger lining up with the hero', () => {
  it('walks sideways, toward the hero, until its lane reaches the hero, and winds up where it stands', () => {
    // The hero is at (6.5, 5.5): its body spans y 5.25 to 5.75. The charger's lane, y - 0.25 to y + 0.25, touches
    // that when the charger is at y = 5, after 24 steps of walking down, and overlaps it after the 25th.
    const game = enemyField([chargerAt('charger-1', 2, 3)], { start: { area: 'arena', tile: { col: 6, row: 5 } } });

    advance(game, 24);
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: { x: 2.5, y: 5 }, action: { type: 'chasing' } });

    game.step();
    expect(monsterNamed(game, 'charger-1')).toMatchObject({
      position: { x: 2.5, y: 5.0625 },
      action: { type: 'chasing' },
    });

    game.step();
    expect(monsterNamed(game, 'charger-1')).toMatchObject({
      position: { x: 2.5, y: 5.0625 },
      action: {
        type: 'winding-up',
        progress: 0,
        zone: { minX: 2.75, minY: 4.8125, maxX: 8.75, maxY: 5.3125 },
      },
    });
  });

  // The walk to the lane goes whichever way the lane has to move: the lane takes 24 steps to touch the hero's body,
  // and overlaps it after the 25th. The first test above is the case where the hero is below the charger.
  it.each([
    {
      goes: 'up, to a hero above it, when its lane runs across',
      charger: { col: 2, row: 3 },
      hero: { col: 6, row: 1 },
      position: { x: 2.5, y: 1.9375 },
      zone: { minX: 2.75, minY: 1.6875, maxX: 8.75, maxY: 2.1875 },
    },
    {
      goes: 'left, to a hero on its left, when its lane runs down',
      charger: { col: 6, row: 1 },
      hero: { col: 4, row: 5 },
      position: { x: 4.9375, y: 1.5 },
      zone: { minX: 4.6875, minY: 1.75, maxX: 5.1875, maxY: 6 },
    },
    {
      goes: 'right, to a hero on its right, when its lane runs down',
      charger: { col: 2, row: 1 },
      hero: { col: 4, row: 5 },
      position: { x: 4.0625, y: 1.5 },
      zone: { minX: 3.8125, minY: 1.75, maxX: 4.3125, maxY: 6 },
    },
    {
      goes: 'right, to a hero on its right, when its lane runs up',
      charger: { col: 2, row: 5 },
      hero: { col: 4, row: 1 },
      position: { x: 4.0625, y: 5.5 },
      zone: { minX: 3.8125, minY: 1, maxX: 4.3125, maxY: 5.25 },
    },
  ])('walks $goes', ({ charger, hero, position, zone }) => {
    const game = enemyField([chargerAt('charger-1', charger.col, charger.row)], {
      start: { area: 'arena', tile: hero },
    });

    advance(game, 25);
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position, action: { type: 'chasing' } });

    game.step();
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'winding-up', progress: 0, zone });
  });

  it.each([
    { where: 'below it, to its right', charger: { col: 4, row: 1 }, position: { x: 4.5, y: 1.5625 } },
    { where: 'below it, to its left', charger: { col: 8, row: 1 }, position: { x: 8.5, y: 1.5625 } },
    { where: 'above it, to its right', charger: { col: 4, row: 5 }, position: { x: 4.5, y: 5.4375 } },
    { where: 'above it, to its left', charger: { col: 8, row: 5 }, position: { x: 8.5, y: 5.4375 } },
  ])('lines up for a lane across when the hero is as far across as down: the hero is $where', (c) => {
    // The hero in tile (6, 3) is exactly 2 tiles across and 2 tiles down from each of these chargers. A charger goes
    // for the lane along its row then, and so walks up or down, not sideways.
    const game = enemyField([chargerAt('charger-1', c.charger.col, c.charger.row)]);

    game.step();

    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: c.position, action: { type: 'chasing' } });
  });

  it('walks toward a hero who is level with it but out of reach of its lane, until the lane reaches', () => {
    // The charger dashes 2 tiles at most: its lane ends at x = 4.75, and the hero's body begins at x = 6.25. Each step
    // takes the lane 0.0625 tile nearer: it touches the hero after 24 steps and overlaps it after the 25th.
    const game = enemyField([chargerAt('charger-1', 2, 3)], {
      monsterTypes: { charger: { ...CHARGER, dashRange: 2 } },
    });

    advance(game, 24);
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: { x: 4, y: 3.5 }, action: { type: 'chasing' } });

    game.step();
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: { x: 4.0625, y: 3.5 } });

    game.step();
    expect(monsterAction(game, 'charger-1')).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 4.3125, minY: 3.25, maxX: 6.3125, maxY: 3.75 },
    });
  });

  it('comes level with a hero it cannot reach and no further, going down in whole steps and then in a short one', () => {
    // The wall ends the lane at x = 3, so the hero at (6.5, 4.5) is never in it. The charger walks 0.09375 tile a step:
    // 10 steps take it to y = 4.4375, and the last 0.0625 tile to being level with the hero is a short step.
    const game = enemyField([chargerAt('charger-1', 2, 3)], {
      layout: WALL_ACROSS,
      start: { area: 'arena', tile: { col: 6, row: 4 } },
      monsterTypes: { charger: { ...CHARGER, speedTilesPerSecond: 5.625 } },
    });

    advance(game, 10);
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: { x: 2.5, y: 4.4375 }, action: { type: 'chasing' } });

    game.step();
    expect(monsterNamed(game, 'charger-1').position.y).toBe(4.5);

    advance(game, 20); // it has walked on, to the wall, and has not left the hero's row
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: { x: 2.75, y: 4.5 }, action: { type: 'chasing' } });
  });

  it('stands where it is when it does not walk, until the hero comes into its lane', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)], {
      start: { area: 'arena', tile: { col: 6, row: 5 } },
      monsterTypes: { charger: { ...CHARGER, speedTilesPerSecond: 0 } },
    });

    advance(game, 60);
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: { x: 2.5, y: 3.5 }, action: { type: 'idle' } });

    walk(game, 'up', 12); // the hero's body now touches the lane from below
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'idle' });

    walk(game, 'up', 1);
    expect(monsterAction(game, 'charger-1')).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 2.75, minY: 3.25, maxX: 8.75, maxY: 3.75 },
    });
  });
});

describe('a charger noticing the hero', () => {
  // The noticing distance is measured from the charger's body, as a square around it: with 2 tiles, the hero is noticed
  // once its body overlaps the square, which reaches x = 4.75. The hero's left edge is at x = 6.25 and moves 0.125 tile
  // a step toward it, so the hero is noticed after 13 steps.
  const NEARSIGHTED = { charger: { ...CHARGER, noticingDistance: 2 } };

  it('does not react to a hero who is beyond its noticing distance', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)], { monsterTypes: NEARSIGHTED });

    advance(game, 60);

    expect(monsterNamed(game, 'charger-1')).toMatchObject({ position: { x: 2.5, y: 3.5 }, action: { type: 'idle' } });
  });

  it('winds up once the hero comes within its noticing distance', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)], { monsterTypes: NEARSIGHTED });

    walk(game, 'left', 12); // the hero's left edge touches the square
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'idle' });

    walk(game, 'left', 1);
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 0 });
  });

  it('stops going after a hero who gets away, and stands again', () => {
    // The hero at (4.5, 5.5) is within 2 tiles of the charger's body, but not in its lane: the charger walks down.
    const game = enemyField([chargerAt('charger-1', 2, 3)], {
      start: { area: 'arena', tile: { col: 4, row: 5 } },
      monsterTypes: NEARSIGHTED,
    });
    game.step();
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'chasing' });

    walk(game, 'right', 16); // the hero is at (6.5, 5.5), 3.5 tiles from the charger's body

    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'idle' });
  });
});
