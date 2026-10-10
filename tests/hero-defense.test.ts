import { describe, expect, it } from 'vitest';
import { advance, arena, biterAt, newGame, playingView } from './fixtures';

// A biter's hit does 5 damage before Defense. With the biter beside the hero, the first hit lands on step 31 and the
// next one on step 85. The hero has 20 Health, so that no hit defeats it and its Health shows exactly what each hit took.

function gameWithDefense(defense: number, minimumDamage?: number) {
  return newGame(
    arena({ hero: { health: 20, defense }, minimumDamage, monsters: [biterAt('biter-1', 4, 3)] }),
  );
}

describe('the damage of a hit, after the hero’s Defense', () => {
  it.each([
    { defense: 0, damage: 5 },
    { defense: 1, damage: 4 },
    { defense: 3, damage: 2 },
    { defense: 4, damage: 1 }, // the minimum is reached exactly
    { defense: 5, damage: 1 }, // Defense would take all the damage, and the default minimum keeps one
    { defense: 8, damage: 1 }, // Defense is more than the damage, and the minimum holds all the same
  ])('is $damage out of 5 at Defense $defense, with the default minimum', ({ defense, damage }) => {
    const game = gameWithDefense(defense);

    const events = advance(game, 31);

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: 'biter-1', damage, health: 20 - damage });
    expect(playingView(game).hero.health).toBe(20 - damage);
  });

  it('is reduced for every hit, not only the first', () => {
    const game = gameWithDefense(3);

    advance(game, 31);
    advance(game, 54);

    expect(playingView(game).hero.health).toBe(16);
  });
});

describe('the minimum damage', () => {
  it.each([
    { defense: 0, minimum: 2, damage: 5 }, // damage above the minimum is not raised to it
    { defense: 3, minimum: 2, damage: 2 }, // damage exactly at the minimum is left alone
    { defense: 4, minimum: 2, damage: 2 },
    { defense: 8, minimum: 3, damage: 3 },
    { defense: 8, minimum: 1, damage: 1 }, // the lowest floor there is, set outright, holds when Defense would take it all
  ])('is a floor the content can tune: a minimum of $minimum gives $damage at Defense $defense', ({ defense, minimum, damage }) => {
    const game = gameWithDefense(defense, minimum);

    const events = advance(game, 31);

    expect(events).toContainEqual({ type: 'hero-hit', monsterId: 'biter-1', damage, health: 20 - damage });
    expect(playingView(game).hero.health).toBe(20 - damage);
  });
});
