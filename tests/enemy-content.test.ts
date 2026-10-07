import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ChargerMonsterDefinition, ContentDefinition, RangedMonsterDefinition } from '../src/core';
import { advance, fixedRandom, monsterNamed } from './fixtures';
import { CHARGER, chargerAt, enemyContent, enemyField, HEAVY, SHOOTER, shooterAt, SNIPER } from './enemy-fixtures';

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

describe('chargers and ranged attackers the rules cannot work with are refused when the game is created', () => {
  const chargerWith = (changes: Partial<ChargerMonsterDefinition>) =>
    enemyContent([], { monsterTypes: { bull: { ...CHARGER, ...changes } } });
  const rangedWith = (changes: Partial<RangedMonsterDefinition>) =>
    enemyContent([], { monsterTypes: { archer: { ...SHOOTER, ...changes } } });
  const projectileWith = (changes: Partial<RangedMonsterDefinition['projectile']>) =>
    rangedWith({ projectile: { ...SHOOTER.projectile, ...changes } });
  const keepingWith = (changes: Partial<NonNullable<RangedMonsterDefinition['keepsDistance']>>) =>
    rangedWith({ keepsDistance: { preferredDistance: 3, speedTilesPerSecond: 3.75, ...changes } });

  it.each([
    {
      what: 'a charger whose hits do no damage',
      content: chargerWith({ damage: 0 }),
      message: 'Monster type "bull": damage must be more than 0, but it is 0',
    },
    {
      what: 'a charger with a negative speed for lining up',
      content: chargerWith({ speedTilesPerSecond: -1 }),
      message: 'Monster type "bull": speedTilesPerSecond must be 0 or more, but it is -1',
    },
    {
      what: 'a charger with a negative noticing distance',
      content: chargerWith({ noticingDistance: -2 }),
      message: 'Monster type "bull": noticingDistance must be 0 or more, but it is -2',
    },
    {
      what: 'a charger that does not wind up before it dashes, so that there is nothing to see coming',
      content: chargerWith({ windUpMs: 0 }),
      message: 'Monster type "bull": windUpMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a charger whose dash goes nowhere in a step',
      content: chargerWith({ dashSpeedTilesPerSecond: 0 }),
      message: 'Monster type "bull": dashSpeedTilesPerSecond must be more than 0, but it is 0',
    },
    {
      what: 'a charger whose dash has no length',
      content: chargerWith({ dashRange: 0 }),
      message: 'Monster type "bull": dashRange must be more than 0, but it is 0',
    },
    {
      what: 'a charger whose dash length is not a number',
      content: chargerWith({ dashRange: Number.NaN }),
      message: 'Monster type "bull": dashRange must be more than 0, but it is NaN',
    },
    {
      what: 'a charger with a negative recovery',
      content: chargerWith({ recoveryMs: -1 }),
      message: 'Monster type "bull": recoveryMs must be 0 or more, but it is -1',
    },
    {
      what: 'a charger that earns the hero negative Experience',
      content: chargerWith({ experience: -1 }),
      message: 'Monster type "bull": experience must be 0 or more, but it is -1',
    },
    {
      what: 'a ranged attacker with a negative noticing distance',
      content: rangedWith({ noticingDistance: -2 }),
      message: 'Monster type "archer": noticingDistance must be 0 or more, but it is -2',
    },
    {
      what: 'a ranged attacker that does not wind up before it fires, so that there is nothing to see coming',
      content: rangedWith({ windUpMs: 0 }),
      message: 'Monster type "archer": windUpMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a ranged attacker with a negative recovery',
      content: rangedWith({ recoveryMs: -1 }),
      message: 'Monster type "archer": recoveryMs must be 0 or more, but it is -1',
    },
    {
      what: 'a ranged attacker that earns the hero negative Experience',
      content: rangedWith({ experience: -1 }),
      message: 'Monster type "archer": experience must be 0 or more, but it is -1',
    },
    {
      what: 'a projectile that does no damage',
      content: projectileWith({ damage: 0 }),
      message: 'Monster type "archer": projectile.damage must be more than 0, but it is 0',
    },
    {
      what: 'a projectile that does not fly',
      content: projectileWith({ speedTilesPerSecond: 0 }),
      message: 'Monster type "archer": projectile.speedTilesPerSecond must be more than 0, but it is 0',
    },
    {
      what: 'a projectile that falls where it is fired',
      content: projectileWith({ range: 0 }),
      message: 'Monster type "archer": projectile.range must be more than 0, but it is 0',
    },
    {
      what: 'a projectile that is not there',
      content: projectileWith({ size: 0 }),
      message: 'Monster type "archer": projectile.size must be more than 0, but it is 0',
    },
    {
      what: 'a projectile larger than its shooter, which would begin inside the wall it stands against',
      content: projectileWith({ size: 0.75 }),
      message: 'Monster type "archer": projectile.size must be at most the monster\'s size of 0.5, but it is 0.75',
    },
    {
      what: 'a ranged attacker that prefers a negative distance',
      content: keepingWith({ preferredDistance: -1 }),
      message: 'Monster type "archer": keepsDistance.preferredDistance must be 0 or more, but it is -1',
    },
    {
      what: 'a ranged attacker that keeps its distance without moving',
      content: keepingWith({ speedTilesPerSecond: 0 }),
      message: 'Monster type "archer": keepsDistance.speedTilesPerSecond must be more than 0, but it is 0',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('the lowest numbers that still make sense are accepted', () => {
    const content = enemyContent([], {
      monsterTypes: {
        bull: {
          ...CHARGER,
          damage: 0.1,
          speedTilesPerSecond: 0,
          noticingDistance: 0,
          windUpMs: 1000 / 60,
          dashSpeedTilesPerSecond: 0.1,
          dashRange: 0.1,
          recoveryMs: 0,
          experience: 0,
        },
        archer: {
          ...SHOOTER,
          noticingDistance: 0,
          windUpMs: 1000 / 60,
          recoveryMs: 0,
          experience: 0,
          projectile: { damage: 0.1, speedTilesPerSecond: 0.1, range: 0.1, size: SHOOTER.size },
          keepsDistance: { preferredDistance: 0, speedTilesPerSecond: 0.1 },
        },
      },
    });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });
});

describe('a new monster of a known behavior is content, not code', () => {
  // The hero stands in the middle of the field, 4 tiles from each monster in the row, and has Health to spare.
  it('lets a heavy charger stand in one game with the standard one, each acting by its own numbers', () => {
    const heavy = { id: 'heavy-1', type: 'heavy', tile: { col: 10, row: 3 } };
    const game = enemyField([chargerAt('charger-1', 2, 3), heavy], {
      monsterTypes: { heavy: HEAVY },
      hero: { health: 100 },
    });
    expect(monsterNamed(game, 'charger-1')).toMatchObject({ health: 3, maxHealth: 3 });
    expect(monsterNamed(game, 'heavy-1')).toMatchObject({ health: 6, maxHealth: 6 });

    expect(advance(game, 28).map((event) => event.type)).toEqual(['monster-attacked']); // the heavy dash, step 19
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'heavy-1', damage: 8, health: 92 }]); // step 29
    expect(advance(game, 15).map((event) => event.type)).toEqual(['monster-attacked']); // the standard dash, step 31
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'charger-1', damage: 6, health: 86 }]); // step 45
  });

  it('lets a sniper stand in one game with the standard shooter, each acting by its own numbers', () => {
    const sniper = { id: 'sniper-1', type: 'sniper', tile: { col: 10, row: 3 } };
    const game = enemyField([shooterAt('shooter-1', 2, 3), sniper], {
      monsterTypes: { sniper: SNIPER },
      hero: { health: 100 },
    });
    expect(monsterNamed(game, 'shooter-1')).toMatchObject({ health: 3, maxHealth: 3 });
    expect(monsterNamed(game, 'sniper-1')).toMatchObject({ health: 6, maxHealth: 6 });

    expect(advance(game, 47)).toEqual([
      { type: 'monster-fired', monsterId: 'sniper-1', direction: 'left' }, // step 19
      { type: 'monster-fired', monsterId: 'shooter-1', direction: 'right' }, // step 31
    ]);
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'sniper-1', damage: 6, health: 94 }]); // step 48
    expect(advance(game, 40)).toEqual([{ type: 'monster-fired', monsterId: 'sniper-1', direction: 'left' }]); // step 61
    expect(game.step()).toEqual([{ type: 'hero-hit', monsterId: 'shooter-1', damage: 4, health: 90 }]); // step 89
  });
});
