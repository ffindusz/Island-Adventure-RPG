import { describe, expect, it } from 'vitest';
import { advance, biterAt, dummyAt, monsterAction, newGameWithMonsters, playingView, walk } from './fixtures';

// The hero stands at (3.5, 3.5) with a body 0.5 wide, so its body spans 3.25 to 3.75 each way, and it has 10 Health.
// A biter has a body 0.5 wide and its attack reaches 0.75 tile beyond its body, in every direction. Its wind-up lasts
// 30 steps, and its attack does 5 damage. A biter in tile (4, 3) stands at (4.5, 3.5), so its body spans x 4.25 to
// 4.75 and y 3.25 to 3.75, and its attack covers x 3.5 to 5.5 and y 2.5 to 4.5: it starts winding up on the first step.

const ATTACK_ZONE = { minX: 3.5, minY: 2.5, maxX: 5.5, maxY: 4.5 };
const WIND_UP_STEPS = 30;

describe('a monster winding up an attack', () => {
  it('starts as soon as the hero is within its reach, and shows where the attack will land', () => {
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));

    const events = game.step();

    expect(events).toEqual([]);
    expect(monsterAction(game, 'biter-1')).toEqual({ type: 'winding-up', progress: 0, zone: ATTACK_ZONE });
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

describe('the damage of a monster attack', () => {
  it('lands when the wind-up ends and not a step before', () => {
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));
    game.step(); // the wind-up starts

    const beforeTheEnd = advance(game, WIND_UP_STEPS - 1);
    expect(beforeTheEnd).toEqual([]);
    expect(playingView(game).hero.health).toBe(10);

    const events = game.step();
    expect(events).toEqual([
      { type: 'monster-attacked', monsterId: 'biter-1', zone: ATTACK_ZONE },
      { type: 'hero-hit', monsterId: 'biter-1', damage: 5, health: 5 },
    ]);
    expect(playingView(game).hero.health).toBe(5);
  });

  it('is avoided by walking out of its reach before the wind-up ends: the attack still comes, and hits nothing', () => {
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));
    game.step(); // the wind-up starts

    const events = [...walk(game, 'left', 4), ...advance(game, WIND_UP_STEPS - 4)];

    expect(events).toEqual([{ type: 'monster-attacked', monsterId: 'biter-1', zone: ATTACK_ZONE }]);
    expect(playingView(game).hero.health).toBe(10);
  });

  it('hits a hero that left its reach but came back before the wind-up ended', () => {
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));
    game.step(); // the wind-up starts

    const events = [...walk(game, 'left', 4), ...walk(game, 'right', 4), ...advance(game, WIND_UP_STEPS - 8)];

    expect(events.map((event) => event.type)).toEqual(['monster-attacked', 'hero-hit']);
    expect(playingView(game).hero.health).toBe(5);
  });

  it.each([
    // After n steps to the left the hero's body ends at x = 3.75 - n * 0.125; the attack starts at x = 3.5.
    { steps: 1, hit: true }, // the body ends at 3.625: still in the attack
    { steps: 2, hit: false }, // the body ends at 3.5, touching the edge of the attack, and not in it
  ])('after $steps steps left from the start of the wind-up, the hero is hit: $hit', ({ steps, hit }) => {
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));
    game.step(); // the wind-up starts

    const events = [...walk(game, 'left', steps), ...advance(game, WIND_UP_STEPS - steps)];

    expect(events.some((event) => event.type === 'hero-hit')).toBe(hit);
  });

  it.each(['up', 'down'] as const)('is avoided by walking out of its reach %s', (direction) => {
    // The attack covers y 2.5 to 4.5, so the hero has to walk 1.25 tiles, which is 10 steps, to leave it: the
    // body then ends at 2.5, or starts at 4.5, touching the edge of the attack.
    const game = newGameWithMonsters(biterAt('biter-1', 4, 3));
    game.step(); // the wind-up starts

    const events = [...walk(game, direction, 10), ...advance(game, WIND_UP_STEPS - 10)];

    expect(events.map((event) => event.type)).toEqual(['monster-attacked']);
  });
});
