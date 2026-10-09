import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ContentDefinition, GuardianMonsterDefinition, GuardianPatternDefinition } from '../src/core';
import { fixedRandom } from './fixtures';
import { CHARGE, GUARDIAN, guardianContent, SMITE, SWEEP } from './guardian-fixtures';

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

describe('a Guardian the rules cannot work with is refused when the game is created', () => {
  const guardianWith = (changes: Partial<GuardianMonsterDefinition>) =>
    guardianContent([], { monsterTypes: { guardian: { ...GUARDIAN, ...changes } } });
  const patternsWith = (...patterns: GuardianPatternDefinition[]) => guardianWith({ patterns });

  it.each([
    {
      what: 'a Guardian with a negative speed',
      content: guardianWith({ speedTilesPerSecond: -1 }),
      message: 'Monster type "guardian": speedTilesPerSecond must be 0 or more, but it is -1',
    },
    {
      what: 'a Guardian with a negative noticing distance',
      content: guardianWith({ noticingDistance: -2 }),
      message: 'Monster type "guardian": noticingDistance must be 0 or more, but it is -2',
    },
    {
      what: 'a Guardian that earns the hero negative Experience',
      content: guardianWith({ experience: -1 }),
      message: 'Monster type "guardian": experience must be 0 or more, but it is -1',
    },
    {
      what: 'a Guardian with no pattern to attack with',
      content: patternsWith(),
      message: 'Monster type "guardian": patterns must hold at least two patterns, but it holds 0',
    },
    {
      what: 'a Guardian with one pattern, which would make the fight one attack to learn',
      content: patternsWith(SWEEP),
      message: 'Monster type "guardian": patterns must hold at least two patterns, but it holds 1',
    },
    {
      what: 'a Guardian whose patterns are all of one kind',
      content: patternsWith(SWEEP, { ...SWEEP, reach: 2 }, SWEEP),
      message: 'Monster type "guardian": patterns must hold at least two different kinds of pattern, but all are sweep',
    },
    {
      what: 'a pattern of a kind that does not exist',
      // Content read from a file could say this, and the compiler would not notice.
      content: patternsWith(SWEEP, { ...CHARGE, kind: 'slam' } as unknown as GuardianPatternDefinition),
      message: 'Monster type "guardian": patterns[1] has unknown kind "slam"',
    },
    {
      what: 'a sweep whose hits do no damage',
      content: patternsWith({ ...SWEEP, damage: 0 }, CHARGE, SMITE),
      message: 'Monster type "guardian": patterns[0].damage must be more than 0, but it is 0',
    },
    {
      what: 'a charge whose hits do no damage',
      content: patternsWith(SWEEP, { ...CHARGE, damage: 0 }, SMITE),
      message: 'Monster type "guardian": patterns[1].damage must be more than 0, but it is 0',
    },
    {
      what: 'a smite whose hits do no damage',
      content: patternsWith(SWEEP, CHARGE, { ...SMITE, damage: 0 }),
      message: 'Monster type "guardian": patterns[2].damage must be more than 0, but it is 0',
    },
    {
      what: 'a sweep that does not wind up, so that there is nothing to see coming',
      content: patternsWith({ ...SWEEP, windUpMs: 0 }, CHARGE, SMITE),
      message: 'Monster type "guardian": patterns[0].windUpMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a charge that does not wind up',
      content: patternsWith(SWEEP, { ...CHARGE, windUpMs: 10 }, SMITE),
      message: 'Monster type "guardian": patterns[1].windUpMs must be at least one fixed step (16.7 ms), but it is 10',
    },
    {
      what: 'a smite that does not wind up',
      content: patternsWith(SWEEP, CHARGE, { ...SMITE, windUpMs: 0 }),
      message: 'Monster type "guardian": patterns[2].windUpMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a sweep after which the Guardian needs no rest, so that the hero never has a free hit',
      content: patternsWith({ ...SWEEP, recoveryMs: 0 }, CHARGE, SMITE),
      message: 'Monster type "guardian": patterns[0].recoveryMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a charge after which the Guardian needs no rest',
      content: patternsWith(SWEEP, { ...CHARGE, recoveryMs: -1 }, SMITE),
      message: 'Monster type "guardian": patterns[1].recoveryMs must be at least one fixed step (16.7 ms), but it is -1',
    },
    {
      what: 'a smite after which the Guardian needs no rest',
      content: patternsWith(SWEEP, CHARGE, { ...SMITE, recoveryMs: 0 }),
      message: 'Monster type "guardian": patterns[2].recoveryMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a sweep that reaches nowhere',
      content: patternsWith({ ...SWEEP, reach: 0 }, CHARGE, SMITE),
      message: 'Monster type "guardian": patterns[0].reach must be more than 0, but it is 0',
    },
    {
      what: 'a charge whose dash goes nowhere in a step',
      content: patternsWith(SWEEP, { ...CHARGE, dashSpeedTilesPerSecond: 0 }, SMITE),
      message: 'Monster type "guardian": patterns[1].dashSpeedTilesPerSecond must be more than 0, but it is 0',
    },
    {
      what: 'a charge whose dash has no length',
      content: patternsWith(SWEEP, { ...CHARGE, dashRange: 0 }, SMITE),
      message: 'Monster type "guardian": patterns[1].dashRange must be more than 0, but it is 0',
    },
    {
      what: 'a charge whose dash length is not a number',
      content: patternsWith(SWEEP, { ...CHARGE, dashRange: Number.NaN }, SMITE),
      message: 'Monster type "guardian": patterns[1].dashRange must be more than 0, but it is NaN',
    },
    {
      what: 'a smite on a square that is not there',
      content: patternsWith(SWEEP, CHARGE, { ...SMITE, size: 0 }),
      message: 'Monster type "guardian": patterns[2].size must be more than 0, but it is 0',
    },
    {
      what: 'a smite that is never made, because the hero is never within its range',
      content: patternsWith(SWEEP, CHARGE, { ...SMITE, range: 0 }),
      message: 'Monster type "guardian": patterns[2].range must be more than 0, but it is 0',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('the lowest numbers that still make sense are accepted', () => {
    const content = guardianContent([], {
      monsterTypes: {
        guardian: {
          ...GUARDIAN,
          speedTilesPerSecond: 0,
          noticingDistance: 0,
          experience: 0,
          patterns: [
            { kind: 'sweep', damage: 0.1, reach: 0.1, windUpMs: 1000 / 60, recoveryMs: 1000 / 60 },
            { kind: 'charge', damage: 0.1, dashSpeedTilesPerSecond: 0.1, dashRange: 0.1, windUpMs: 1000 / 60, recoveryMs: 1000 / 60 },
            { kind: 'smite', damage: 0.1, size: 0.1, range: 0.1, windUpMs: 1000 / 60, recoveryMs: 1000 / 60 },
          ],
        },
      },
    });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });

  it.each([
    { what: 'two patterns of two kinds are enough', patterns: [SWEEP, SMITE] },
    { what: 'a kind may come more than once', patterns: [SWEEP, SMITE, { ...SWEEP, reach: 2 }] },
  ])('$what', ({ patterns }) => {
    const content = guardianContent([], { monsterTypes: { guardian: { ...GUARDIAN, patterns } } });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });
});
