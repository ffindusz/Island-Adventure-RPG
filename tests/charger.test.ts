import { describe, expect, it } from 'vitest';
import { advance, monsterAction, walk } from './fixtures';
import { chargerAt, enemyField } from './enemy-fixtures';

// A charger in tile (2, 3) stands at (2.5, 3.5), so its body spans x 2.25 to 2.75 and y 3.25 to 3.75. The hero stands at
// (6.5, 3.5): its body spans x 6.25 to 6.75 and y 3.25 to 3.75, in the same row of space. The charger's lane to the
// right begins at its front edge, x = 2.75, is as wide as its body, and is 6 tiles long: x 2.75 to 8.75.

const LANE_RIGHT = { minX: 2.75, minY: 3.25, maxX: 8.75, maxY: 3.75 };

describe('a charger with the hero in its line', () => {
  it('starts winding up as soon as it has noticed the hero, and shows the lane it will dash along', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'winding-up', progress: 0, zone: LANE_RIGHT });
  });

  it('shows how far the wind-up has come, which is the share of its 30 steps that have passed', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    game.step(); // the wind-up starts

    advance(game, 15);
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 0.5 });

    advance(game, 14); // 29 of 30 steps
    expect(monsterAction(game, 'charger-1')).toMatchObject({ type: 'winding-up', progress: 29 / 30 });
  });

  it('locks the lane when the wind-up starts: it does not follow a hero who walks away', () => {
    const game = enemyField([chargerAt('charger-1', 2, 3)]);
    game.step(); // the wind-up starts

    walk(game, 'down', 8); // the hero ends a tile lower, at (6.5, 4.5), out of the lane

    expect(monsterAction(game, 'charger-1')).toEqual({ type: 'winding-up', progress: 8 / 30, zone: LANE_RIGHT });
  });
});
