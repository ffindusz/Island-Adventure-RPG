import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import type { ContentDefinition } from '../src/core';
import { arena, dummyAt, fixedRandom } from './fixtures';

function expectRefused(content: ContentDefinition, message: string): void {
  expect(() => createGame({ content, random: fixedRandom })).toThrow(message);
}

describe('content that does not make sense is refused when the game is created', () => {
  it('a layout uses a terrain symbol that the legend does not define', () => {
    const layout = ['#######', '#.....#', '#.?...#', '#.....#', '#...,.#', '#######'];

    expectRefused(arena({ layout }), 'Area "arena": row 2 uses terrain symbol "?", which the legend does not define');
  });

  it('a monster has a type that does not exist', () => {
    const monsters = [{ id: 'ogre-1', type: 'ogre', tile: { col: 5, row: 3 } }];

    expectRefused(arena({ monsters }), 'Area "arena": monster "ogre-1" has unknown type "ogre"');
  });

  it('the game starts in an Adventure Area that does not exist', () => {
    const start = { area: 'nowhere', tile: { col: 3, row: 3 } };

    expectRefused(arena({ start, monsters: [dummyAt('dummy-1', 5, 3)] }), 'The start is in unknown area "nowhere"');
  });
});
