import { describe, expect, it } from 'vitest';
import { scrollFor } from '../src/adapter/camera';
import { TILE_SIZE, VIEW_HEIGHT, VIEW_TILES_HIGH, VIEW_TILES_WIDE, VIEW_WIDTH } from '../src/adapter/config';

// The camera is the adapter's business: the Game core's interface says nothing about it. Where it looks is a pure
// function of where the hero is and how big the Adventure Area is, so it is tested without a browser.

/** An area larger than the screen in both directions. */
const BIG = { width: VIEW_TILES_WIDE + 10, height: VIEW_TILES_HIGH + 8 };

describe('the camera', () => {
  it('follows the hero, keeping it in the middle of the screen', () => {
    const scroll = scrollFor({ x: 15, y: 10 }, BIG);

    expect(scroll).toEqual({ x: 15 * TILE_SIZE - VIEW_WIDTH / 2, y: 10 * TILE_SIZE - VIEW_HEIGHT / 2 });
  });

  it('stops at the top left of the map, so that no empty space shows beyond it', () => {
    expect(scrollFor({ x: 0.5, y: 0.5 }, BIG)).toEqual({ x: 0, y: 0 });
  });

  it('stops at the bottom right of the map, so that no empty space shows beyond it', () => {
    const scroll = scrollFor({ x: BIG.width - 0.5, y: BIG.height - 0.5 }, BIG);

    expect(scroll).toEqual({ x: BIG.width * TILE_SIZE - VIEW_WIDTH, y: BIG.height * TILE_SIZE - VIEW_HEIGHT });
  });

  it('never scrolls an area that is exactly the size of the screen', () => {
    const area = { width: VIEW_TILES_WIDE, height: VIEW_TILES_HIGH };

    expect(scrollFor({ x: 1.5, y: 1.5 }, area)).toEqual({ x: 0, y: 0 });
    expect(scrollFor({ x: area.width - 1.5, y: area.height - 1.5 }, area)).toEqual({ x: 0, y: 0 });
  });

  it.each([
    { width: 10, height: 8 },
    { width: 11, height: 7 },
  ])('centres an area of $width by $height tiles, which is smaller than the screen', (area) => {
    const scroll = scrollFor({ x: 2, y: 2 }, area);

    const leftGap = -scroll.x;
    const topGap = -scroll.y;
    const rightGap = VIEW_WIDTH - (leftGap + area.width * TILE_SIZE);
    const bottomGap = VIEW_HEIGHT - (topGap + area.height * TILE_SIZE);
    expect(leftGap).toBeGreaterThan(0);
    expect(topGap).toBeGreaterThan(0);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);
    expect(Math.abs(topGap - bottomGap)).toBeLessThanOrEqual(1);
  });

  it('follows the hero along the direction an area is larger than the screen and centres it along the other', () => {
    // 30 tiles wide, 8 high. The hero is at 15 tiles, which is 240 pixels, 160 of them to the middle of a screen 320
    // pixels wide. The area is 128 pixels high in a screen of 192, so 64 pixels are left over, 32 above and 32 below.
    const wideAndShort = { width: VIEW_TILES_WIDE + 10, height: 8 };

    expect(scrollFor({ x: 15, y: 3 }, wideAndShort)).toEqual({ x: 80, y: -32 });
  });

  it('moves by whole pixels only, so that the pixel art stays crisp', () => {
    const scroll = scrollFor({ x: 10.1234, y: 7.7777 }, BIG);

    expect(Number.isInteger(scroll.x)).toBe(true);
    expect(Number.isInteger(scroll.y)).toBe(true);
  });
});
