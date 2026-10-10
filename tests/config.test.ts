import { describe, expect, it } from 'vitest';
import { FACING_STEP, px, TILE_SIZE } from '../src/adapter/config';
import { advance, newGame, playingView } from './fixtures';

describe('px', () => {
  it('gives the pixels that whole tiles are', () => {
    expect(px(0)).toBe(0);
    expect(px(3)).toBe(3 * TILE_SIZE);
    expect(px(-2)).toBe(-2 * TILE_SIZE);
  });

  it('rounds a part of a pixel to the nearest whole pixel, so that a shape lands on pixels', () => {
    expect(px(0.4 / TILE_SIZE)).toBe(0);
    expect(px(0.6 / TILE_SIZE)).toBe(1);
    expect(px(5.4 / TILE_SIZE)).toBe(5);
    expect(px(5.6 / TILE_SIZE)).toBe(6);
  });
});

describe('FACING_STEP', () => {
  // The adapter cannot import the Game core's own table (its index exports only types), so the Game core is walked.
  it.each(['up', 'down', 'left', 'right'] as const)('is one step the way the Game core moves a hero walking %s', (direction) => {
    const game = newGame();
    const before = playingView(game).hero.position;

    game.send({ type: 'move', direction });
    advance(game, 8);

    const after = playingView(game).hero.position;
    const moved = { x: after.x - before.x, y: after.y - before.y };
    const length = Math.hypot(moved.x, moved.y);
    const step = FACING_STEP[direction];
    expect({ x: moved.x / length, y: moved.y / length }).toEqual(step);
    expect(Math.hypot(step.x, step.y)).toBe(1);
  });
});
