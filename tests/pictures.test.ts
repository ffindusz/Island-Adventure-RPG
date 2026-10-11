import { describe, expect, it } from 'vitest';
import { colourGap, LEAST_COLOUR_GAP } from './pictures';

// The tests that keep the colours of the pictures apart ask how far two colours lie from each other. The numbers here are
// worked by hand: a colour is given as 0xRRGGBB, and the gap is the straight line between the two in the cube of red,
// green and blue, 0 to 255 along each edge.

describe('how far apart two colours lie, for the tests that keep the colours of the pictures apart', () => {
  it('is nothing between a colour and itself', () => {
    expect(colourGap(0x000000, 0x000000)).toBe(0);
    expect(colourGap(0x4a7c59, 0x4a7c59)).toBe(0);
  });

  it.each([
    ['red', 0x320000],
    ['green', 0x003200],
    ['blue', 0x000032],
  ])('is the difference of the one channel that differs, 0x32 or 50 here in %s', (_channel, other) => {
    expect(colourGap(0x000000, other)).toBeCloseTo(50, 9);
    expect(colourGap(other, 0x000000)).toBeCloseTo(50, 9);
  });

  it('is the straight line through the cube, not the sum of the channels', () => {
    // 3 in red and 4 in green make 5; 2 in red, 3 in green and 6 in blue make 7, since 4 + 9 + 36 is 49.
    expect(colourGap(0x030400, 0x000000)).toBeCloseTo(5, 9);
    expect(colourGap(0x102030, 0x122336)).toBeCloseTo(7, 9);
    expect(colourGap(0x122336, 0x102030)).toBeCloseTo(7, 9);
  });

  it('is longest between black and white, 255 apart in each of the three channels', () => {
    expect(colourGap(0x000000, 0xffffff)).toBeCloseTo(255 * Math.sqrt(3), 9);
  });

  it('asks 50 of two colours that count as set apart', () => {
    expect(LEAST_COLOUR_GAP).toBe(50);
  });
});
