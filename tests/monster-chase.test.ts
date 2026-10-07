import { describe, expect, it } from 'vitest';
import {
  advance,
  arena,
  BITER,
  biterAt,
  fieldGame,
  monsterAction,
  monsterNamed,
  newGame,
  newGameWithMonsters,
  walk,
} from './fixtures';

// A biter notices the hero within 2 tiles of its body, walks 0.0625 tile a step (16 steps to cross a tile) and
// attacks once the hero is within 0.75 tile of its body. Its body is 0.5 wide, like the hero's.
//
// Most of these tests use the wide field of the fixtures, so that monsters can be farther from the hero than they can
// notice it. The hero starts there in the middle of tile (6, 3), at (6.5, 3.5).

describe('a monster noticing the hero', () => {
  it('stays idle and in place while the hero is farther away than its noticing distance', () => {
    // The biter's body starts at x 9.25 and the hero's ends at 6.75: 2.5 tiles apart, and the biter notices within 2.
    const game = fieldGame([biterAt('biter-1', 9, 3)]);

    advance(game, 120);

    expect(monsterNamed(game, 'biter-1')).toMatchObject({ position: { x: 9.5, y: 3.5 }, action: { type: 'idle' } });
  });

  it('notices the hero when it comes within its noticing distance of the biter’s body, and not before', () => {
    const game = fieldGame([biterAt('biter-1', 9, 3)]);

    walk(game, 'right', 4); // the hero's body now ends at 7.25: exactly 2 tiles away, which is not within 2
    expect(monsterAction(game, 'biter-1')).toEqual({ type: 'idle' });

    walk(game, 'right', 1); // 1.875 tiles away
    expect(monsterAction(game, 'biter-1')).toEqual({ type: 'chasing' });
  });

  it('gives up the chase when the hero gets farther away than its noticing distance, and stays where it is', () => {
    // The biter is at x 4.5 and the hero runs away to the right, twice as fast as the biter walks. At the biter's
    // k-th decision the gap between their bodies is 1.5625 + 0.0625 k tiles, which is 2 at the 7th: not within 2.
    const game = fieldGame([biterAt('biter-1', 4, 3)]);
    game.send({ type: 'move', direction: 'right' });

    advance(game, 6);
    expect(monsterNamed(game, 'biter-1')).toMatchObject({ position: { x: 4.875, y: 3.5 }, action: { type: 'chasing' } });

    advance(game, 1);
    expect(monsterNamed(game, 'biter-1')).toMatchObject({ position: { x: 4.875, y: 3.5 }, action: { type: 'idle' } });

    advance(game, 20);
    expect(monsterNamed(game, 'biter-1')).toMatchObject({ position: { x: 4.875, y: 3.5 }, action: { type: 'idle' } });
  });
});

describe('a monster approaching the hero', () => {
  it.each([
    { place: 'to the left of', tile: { col: 4, row: 3 }, after: { x: 4.75, y: 3.5 } },
    { place: 'to the right of', tile: { col: 8, row: 3 }, after: { x: 8.25, y: 3.5 } },
    { place: 'above', tile: { col: 6, row: 1 }, after: { x: 6.5, y: 1.75 } },
    { place: 'below', tile: { col: 6, row: 5 }, after: { x: 6.5, y: 5.25 } },
    // Across the longer of the two distances first: here that is across (2 tiles) rather than down (1 tile)...
    { place: 'two tiles to the right of and a tile above', tile: { col: 8, row: 2 }, after: { x: 8.25, y: 2.5 } },
    // ... and here it is down (2 tiles) rather than across (1 tile).
    { place: 'a tile to the right of and two tiles above', tile: { col: 7, row: 1 }, after: { x: 7.5, y: 1.75 } },
  ])('a biter $place the hero walks toward it, a quarter of a tile in 4 steps', ({ tile, after }) => {
    const game = fieldGame([biterAt('biter-1', tile.col, tile.row)]);

    advance(game, 4);

    expect(monsterNamed(game, 'biter-1')).toMatchObject({ position: after, action: { type: 'chasing' } });
  });

  it('stops flush against solid terrain in its way, and keeps chasing', () => {
    // The hero is in tile (1, 2) and the water is in tile (2, 2), x 2 to 3 and y 2 to 3. The biter in tile (3, 2) walks
    // left until its body, which starts 0.25 from its middle, touches the water: its middle is then at x 3.25.
    const game = newGame(
      arena({ start: { area: 'arena', tile: { col: 1, row: 2 } }, monsters: [biterAt('biter-1', 3, 2)] }),
    );

    advance(game, 40);

    expect(monsterNamed(game, 'biter-1')).toMatchObject({ position: { x: 3.25, y: 2.5 }, action: { type: 'chasing' } });
  });

  it('stops flush against another monster in its way', () => {
    // The first biter walks left from x 8.5 until the hero is within its reach (its middle is below x 7.75), which it is
    // after 13 steps, at x 7.6875, and then it winds up. The second walks left from x 9.5 behind it, and stops with its
    // body touching the first one's: its middle is 0.5 farther right, at x 8.1875, which it reaches after 21 steps.
    const game = fieldGame([biterAt('first', 8, 3), { id: 'second', type: 'far-sighted', tile: { col: 9, row: 3 } }], {
      'far-sighted': { ...BITER, noticingDistance: 4 },
    });

    advance(game, 25);

    expect(monsterNamed(game, 'first')).toMatchObject({ position: { x: 7.6875, y: 3.5 }, action: { type: 'winding-up' } });
    expect(monsterNamed(game, 'second')).toMatchObject({ position: { x: 8.1875, y: 3.5 }, action: { type: 'chasing' } });
  });

  it('walks up to the hero, winds up and strikes: a whole attack, from noticing to the hit', () => {
    // In the arena, with the hero at (3.5, 3.5): the hero's body ends at x 3.75, and the biter's attack reaches the
    // hero once its body starts below x 4.5, so its middle is below x 4.75. From x 5.5 that takes 13 steps, to x 4.6875.
    const game = newGameWithMonsters(biterAt('biter-1', 5, 3));

    advance(game, 13);
    expect(monsterNamed(game, 'biter-1')).toMatchObject({ position: { x: 4.6875, y: 3.5 }, action: { type: 'chasing' } });

    game.step();
    const zone = { minX: 3.6875, minY: 2.5, maxX: 5.6875, maxY: 4.5 };
    expect(monsterAction(game, 'biter-1')).toEqual({ type: 'winding-up', progress: 0, zone });

    expect(advance(game, 29)).toEqual([]);
    expect(game.step()).toEqual([
      { type: 'monster-attacked', monsterId: 'biter-1', zone },
      { type: 'hero-hit', monsterId: 'biter-1', damage: 5, health: 5 },
    ]);
    expect(monsterNamed(game, 'biter-1').position).toEqual({ x: 4.6875, y: 3.5 });
  });
});
