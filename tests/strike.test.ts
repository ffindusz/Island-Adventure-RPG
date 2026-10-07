import { describe, expect, it } from 'vitest';
import { dummyAt, face, newGameWithMonsters, playingView } from './fixtures';

// The hero stands at (3.5, 3.5) with a body 0.5 wide, so its body spans 3.25 to 3.75 each way. Its strike reaches
// 1 tile beyond the body and is 1 tile wide, centred on the hero. Its Attack is 1 and a dummy has Health 3.

describe('striking', () => {
  it.each([
    { facing: 'right', dummy: { col: 4, row: 3 }, zone: { minX: 3.75, minY: 3, maxX: 4.75, maxY: 4 } },
    { facing: 'left', dummy: { col: 2, row: 3 }, zone: { minX: 2.25, minY: 3, maxX: 3.25, maxY: 4 } },
    { facing: 'up', dummy: { col: 3, row: 2 }, zone: { minX: 3, minY: 2.25, maxX: 4, maxY: 3.25 } },
    { facing: 'down', dummy: { col: 3, row: 4 }, zone: { minX: 3, minY: 3.75, maxX: 4, maxY: 4.75 } },
  ] as const)('a strike facing $facing hits the monster directly in front of the hero', ({ facing, dummy, zone }) => {
    const game = newGameWithMonsters(dummyAt('dummy-1', dummy.col, dummy.row));
    face(game, facing);

    const events = game.send({ type: 'attack' });

    expect(events).toEqual([
      { type: 'hero-attacked', direction: facing, zone },
      { type: 'monster-hit', monsterId: 'dummy-1', damage: 1, health: 2 },
    ]);
    expect(playingView(game).monsters[0]?.health).toBe(2);
  });
});
