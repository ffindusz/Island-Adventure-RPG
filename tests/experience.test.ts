import { describe, expect, it } from 'vitest';
import { advance, arena, biterAt, dummyAt, face, frailMonster, gameWithPrizes, newGame, strike } from './fixtures';

// A dummy has 3 Health and is worth 5 Experience; the hero's Attack is 1 and its attack cooldown is 24 steps.
// A prize is a monster that falls to one strike and is worth whatever the test says (see prizes in fixtures.ts).

describe('Experience from defeating monsters', () => {
  it('is granted when a strike defeats a monster: its type gives the amount, right after the defeat', () => {
    const game = newGame(arena({ monsters: [dummyAt('dummy-1', 4, 3)] }));
    face(game, 'right');
    strike(game);
    strike(game);

    const events = strike(game);

    expect(events.slice(1)).toEqual([
      { type: 'monster-hit', monsterId: 'dummy-1', damage: 1, health: 0 },
      { type: 'monster-defeated', monsterId: 'dummy-1' },
      { type: 'experience-gained', amount: 5 },
    ]);
  });

  it('is not granted by a strike that leaves the monster standing', () => {
    const game = newGame(arena({ monsters: [dummyAt('dummy-1', 4, 3)] }));
    face(game, 'right');

    const events = strike(game);

    expect(events.map((event) => event.type)).toEqual(['hero-attacked', 'monster-hit']);
  });

  it.each([{ experience: 1 }, { experience: 9 }])(
    'is the amount of the monster type: a monster worth $experience grants $experience',
    ({ experience }) => {
      const game = gameWithPrizes(experience);

      const events = game.send({ type: 'attack' });

      expect(events.at(-1)).toEqual({ type: 'experience-gained', amount: experience });
    },
  );

  it('is not granted, and not announced, for a monster that is worth none', () => {
    const game = gameWithPrizes(0);

    const events = game.send({ type: 'attack' });

    expect(events.map((event) => event.type)).toEqual(['hero-attacked', 'monster-hit', 'monster-defeated']);
  });

  it('is granted for each monster that one strike defeats, each right after its own defeat', () => {
    // A strike covers one tile of width, so a hero with a wide Melee Weapon is what reaches both monsters below it.
    const game = newGame(
      arena({
        hero: { meleeWeapon: { reach: 1, width: 3 } },
        monsterTypes: { weakling: frailMonster(2), runt: frailMonster(3) },
        monsters: [
          { id: 'weakling-1', type: 'weakling', tile: { col: 3, row: 4 } },
          { id: 'runt-1', type: 'runt', tile: { col: 4, row: 4 } },
        ],
      }),
    );

    const events = game.send({ type: 'attack' });

    expect(events.slice(1).map((event) => event.type)).toEqual([
      'monster-hit',
      'monster-defeated',
      'experience-gained',
      'monster-hit',
      'monster-defeated',
      'experience-gained',
    ]);
    expect(events.filter((event) => event.type === 'experience-gained')).toEqual([
      { type: 'experience-gained', amount: 2 },
      { type: 'experience-gained', amount: 3 },
    ]);
  });
});

describe('Experience from monsters that were reset', () => {
  it('is granted again when a monster that the hero was defeated and sent back with is defeated again', () => {
    // As in hero-defeat.test.ts: the weakling falls at step 0, and the biter's hit on step 44 defeats the hero, which
    // brings the weakling back. The biter only sets off again then and hits next on step 88; the hero strikes at 68.
    const game = newGame(
      arena({
        hero: { health: 5 },
        monsterTypes: { weakling: frailMonster(4) },
        monsters: [{ id: 'weakling-1', type: 'weakling', tile: { col: 3, row: 4 } }, biterAt('biter-1', 5, 3)],
      }),
    );
    const first = game.send({ type: 'attack' });
    face(game, 'right');
    strike(game); // step 24: the biter is hit once
    advance(game, 20); // step 44: the hero is defeated and the monsters are back

    face(game, 'down');
    const second = strike(game); // step 68

    expect(first.at(-1)).toEqual({ type: 'experience-gained', amount: 4 });
    expect(second.map((event) => event.type)).toEqual([
      'hero-attacked',
      'monster-hit',
      'monster-defeated',
      'experience-gained',
    ]);
    expect(second.at(-1)).toEqual({ type: 'experience-gained', amount: 4 });
  });
});
