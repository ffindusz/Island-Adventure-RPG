import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ChaserMonsterDefinition, ContentDefinition, MonsterTypeDefinition } from '../src/core';
import { ARENA_LAYOUT, arena, BITER, dummyAt, fixedRandom, frailMonster } from './fixtures';

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

describe('content that does not make sense is refused when the game is created', () => {
  it('a layout uses a terrain symbol that the legend does not define', () => {
    const layout = ['#######', '#.....#', '#.?...#', '#.....#', '#...,.#', '#######'];

    expectRefused(arena({ layout }), 'Area "arena": row 2 uses terrain symbol "?", which the legend does not define');
  });

  it('a layout has rows of different lengths', () => {
    const layout = ['#######', '#.....#', '#....#', '#.....#', '#...,.#', '#######'];

    expectRefused(arena({ layout }), 'Area "arena": row 2 is 6 tiles wide, but the first row is 7 tiles wide');
  });

  it('a monster has a type that does not exist', () => {
    const monsters = [{ id: 'ogre-1', type: 'ogre', tile: { col: 5, row: 3 } }];

    expectRefused(arena({ monsters }), 'Area "arena": monster "ogre-1" has unknown type "ogre"');
  });

  it('two monsters have the same id, even in different Adventure Areas', () => {
    const cellar = { id: 'cellar', name: 'Cellar', layout: ARENA_LAYOUT, monsters: [dummyAt('dummy-1', 2, 2)] };

    expectRefused(
      arena({ monsters: [dummyAt('dummy-1', 5, 3)], otherAreas: [cellar] }),
      'Monster id "dummy-1" is used more than once',
    );
  });

  it('two Adventure Areas have the same id', () => {
    const second = { id: 'arena', name: 'Another arena', layout: ARENA_LAYOUT, monsters: [] };

    expectRefused(arena({ otherAreas: [second] }), 'Area id "arena" is used more than once');
  });

  it('the game starts in an Adventure Area that does not exist', () => {
    const start = { area: 'nowhere', tile: { col: 3, row: 3 } };

    expectRefused(arena({ start, monsters: [dummyAt('dummy-1', 5, 3)] }), 'The start is in unknown area "nowhere"');
  });

  it('the hero starts on solid terrain', () => {
    const start = { area: 'arena', tile: { col: 2, row: 2 } }; // the water

    expectRefused(arena({ start }), 'The start tile (col 2, row 2) of area "arena" is solid terrain or outside the map');
  });

  it('the hero starts outside the map', () => {
    const start = { area: 'arena', tile: { col: 9, row: 3 } };

    expectRefused(arena({ start }), 'The start tile (col 9, row 3) of area "arena" is solid terrain or outside the map');
  });

  it('a monster stands on solid terrain', () => {
    expectRefused(
      arena({ monsters: [dummyAt('dummy-1', 2, 2)] }),
      'Area "arena": monster "dummy-1" is placed at (col 2, row 2), which is solid terrain or outside the map',
    );
  });

  it('a monster type has a behavior that does not exist', () => {
    // Content read from a file could say this, and the compiler would not notice.
    const ghost = { behavior: 'teleporter', health: 3, size: 0.5, experience: 1 } as unknown as MonsterTypeDefinition;

    expectRefused(arena({ monsterTypes: { ghost } }), 'Monster type "ghost" has unknown behavior "teleporter"');
  });
});

describe('numbers the rules cannot work with are refused when the game is created', () => {
  const biterWith = (changes: Partial<ChaserMonsterDefinition>) =>
    arena({ monsterTypes: { biter: { ...BITER, ...changes } } });

  it.each([
    {
      what: 'a hero with no Health',
      content: arena({ hero: { health: 0 } }),
      message: "The hero's health must be more than 0, but it is 0",
    },
    {
      what: 'a hero with negative Defense',
      content: arena({ hero: { defense: -1 } }),
      message: "The hero's defense must be 0 or more, but it is -1",
    },
    {
      what: 'a negative minimum damage',
      content: arena({ minimumDamage: -1 }),
      message: 'The minimum damage must be 0 or more, but it is -1',
    },
    {
      what: 'a monster whose hits do no damage',
      content: biterWith({ damage: 0 }),
      message: 'Monster type "biter": damage must be more than 0, but it is 0',
    },
    {
      what: 'a monster with a negative speed',
      content: biterWith({ speedTilesPerSecond: -1 }),
      message: 'Monster type "biter": speedTilesPerSecond must be 0 or more, but it is -1',
    },
    {
      what: 'a monster with a negative noticing distance',
      content: biterWith({ noticingDistance: -2 }),
      message: 'Monster type "biter": noticingDistance must be 0 or more, but it is -2',
    },
    {
      what: 'a monster whose attack has no reach',
      content: biterWith({ reach: 0 }),
      message: 'Monster type "biter": reach must be more than 0, but it is 0',
    },
    {
      what: 'a monster that does not wind up before it attacks, so that there is nothing to see coming',
      content: biterWith({ windUpMs: 0 }),
      message: 'Monster type "biter": windUpMs must be at least one fixed step (16.7 ms), but it is 0',
    },
    {
      what: 'a monster with a negative recovery',
      content: biterWith({ recoveryMs: -1 }),
      message: 'Monster type "biter": recoveryMs must be 0 or more, but it is -1',
    },
    {
      what: 'a monster that earns the hero negative Experience',
      content: biterWith({ experience: -1 }),
      message: 'Monster type "biter": experience must be 0 or more, but it is -1',
    },
    {
      what: 'a stationary monster that earns the hero negative Experience',
      content: arena({ monsterTypes: { dummy: frailMonster(-5) } }),
      message: 'Monster type "dummy": experience must be 0 or more, but it is -5',
    },
    {
      what: 'a Level curve with no thresholds, which leaves the hero no Level to reach',
      content: arena({ progression: { levelThresholds: [] } }),
      message: 'The Level thresholds must give the Experience for at least Level 2',
    },
    {
      what: 'a Level that takes no Experience',
      content: arena({ progression: { levelThresholds: [0, 10] } }),
      message: 'The Experience for Level 2 must be more than 0, but it is 0',
    },
    {
      what: 'a Level that takes as much Experience as the one before',
      content: arena({ progression: { levelThresholds: [10, 10, 30] } }),
      message: 'The Experience for Level 3 must be more than the 10 of Level 2, but it is 10',
    },
    {
      what: 'a Level that takes less Experience than the one before',
      content: arena({ progression: { levelThresholds: [10, 25, 20] } }),
      message: 'The Experience for Level 4 must be more than the 25 of Level 3, but it is 20',
    },
  ])('$what', ({ content, message }) => {
    expectRefused(content, message);
  });

  it('the lowest numbers that still make sense are accepted', () => {
    const content = arena({
      hero: { defense: 0 },
      minimumDamage: 0,
      progression: { levelThresholds: [1] },
      monsterTypes: {
        biter: {
          ...BITER,
          speedTilesPerSecond: 0,
          noticingDistance: 0,
          recoveryMs: 0,
          windUpMs: 1000 / 60,
          experience: 0,
        },
        dummy: frailMonster(0),
      },
    });

    expect(() => createGame({ content, random: fixedRandom })).not.toThrow();
  });
});
