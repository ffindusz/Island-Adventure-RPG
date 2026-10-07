import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ContentDefinition } from '../src/core';
import { ARENA_LAYOUT, arena, dummyAt, fixedRandom } from './fixtures';

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
});
