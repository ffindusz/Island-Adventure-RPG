import { describe, expect, it } from 'vitest';
import { advance, biterAt, dummyAt, monsterAction, newGameWithMonsters, playingView } from './fixtures';

// The hero stands at (3.5, 3.5) with a body 0.5 wide, so its body spans 3.25 to 3.75 each way, and it has 10 Health.
// A biter has a body 0.5 wide and its attack reaches 0.75 tile beyond its body, in every direction. Its wind-up lasts
// 30 steps. A biter in tile (4, 3) stands at (4.5, 3.5), so its body spans x 4.25 to 4.75 and y 3.25 to 3.75.

describe('a monster winding up an attack', () => {
  it('starts as soon as the hero is within its reach, and shows where the attack will land', () => {
    // The attack covers 0.75 beyond the body: x 3.5 to 5.5 and y 2.5 to 4.5. The hero's body is partly in it.
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, 'biter-1')).toEqual({
      type: 'winding-up',
      progress: 0,
      zone: { minX: 3.5, minY: 2.5, maxX: 5.5, maxY: 4.5 },
    });
  });

  it('shows how far the wind-up has come, which is the share of its 30 steps that have passed', () => {
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));
    game.step(); // the wind-up starts

    advance(game, 15);
    expect(monsterAction(game, 'biter-1')).toMatchObject({ type: 'winding-up', progress: 0.5 });

    advance(game, 14); // 29 of 30 steps
    expect(monsterAction(game, 'biter-1')).toMatchObject({ type: 'winding-up', progress: 29 / 30 });
  });

  it('does not start while the hero is beyond its reach', () => {
    // The biter is in tile (5, 3): its body starts at x 5.25, and its attack at x 4.5, but the hero's body ends at 3.75.
    const game = newGameWithMonsters(biterAt('biter-1', 5, 3));

    game.step();

    expect(monsterAction(game, 'biter-1').type).not.toBe('winding-up');
  });
});

describe('a monster that does not attack', () => {
  it('stays idle and leaves the hero alone, however long the hero stands beside it', () => {
    const game = newGameWithMonsters(dummyAt('dummy-1', 4, 3));

    const events = advance(game, 200);

    expect(events).toEqual([]);
    expect(monsterAction(game, 'dummy-1')).toEqual({ type: 'idle' });
    expect(playingView(game).hero.health).toBe(10);
  });
});
