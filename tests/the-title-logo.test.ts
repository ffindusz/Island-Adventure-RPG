import { describe, expect, it } from 'vitest';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../src/adapter/config';
import { scaledRects, textBitmap, textWidthOf, TEXT_HEIGHT } from '../src/adapter/pixel-font';
import type { Bitmap, Rect } from '../src/adapter/pixel-font';
import {
  GAME_TITLE,
  LOGO_EXTRUSION_OFFSETS,
  LOGO_OUTLINE_OFFSETS,
  logoLayout,
  paintedBounds,
  windowTop,
} from '../src/adapter/title-layout';

// The big name on the title screen is the project's own letters, each pixel of them a whole number of canvas pixels, with
// a brown extrusion and a dark outline, and the menu window sits in the room that is left under it. What can go wrong
// without anybody seeing it fail: a scale that is not a whole number blurs the letters; a name that is too wide is cut
// at the screen's edge; and a window, once its rows grow (a message about the saved game, the audio line), slides up
// over the name.

type Pixel = readonly [number, number];

/** The canvas pixels the rectangles cover. A pixel covered twice is a mistake of the rectangles. */
function pixelsOf(rects: readonly Rect[]): Pixel[] {
  const seen = new Set<string>();
  const pixels: Pixel[] = [];
  for (const rect of rects) {
    for (let y = rect.top; y < rect.top + rect.height; y += 1) {
      for (let x = rect.left; x < rect.left + rect.width; x += 1) {
        const at = `${x},${y}`;
        if (seen.has(at)) {
          throw new Error(`The pixel ${at} is covered by two rectangles.`);
        }
        seen.add(at);
        pixels.push([x, y]);
      }
    }
  }
  return pixels;
}

/** The pixels a bitmap would have if every one of its pixels were `scale` by `scale`. */
function scaledPixels(bitmap: Bitmap, scale: number): Pixel[] {
  const pixels: Pixel[] = [];
  bitmap.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '#') {
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            pixels.push([x * scale + dx, y * scale + dy]);
          }
        }
      }
    });
  });
  return pixels;
}

const keyOf = ([x, y]: Pixel): string => `${x},${y}`;

function sorted(pixels: readonly Pixel[]): string[] {
  return pixels.map(keyOf).sort();
}

describe('the text as one bitmap', () => {
  it('is the letter itself for one letter', () => {
    expect(textBitmap('A')).toEqual(['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']);
  });

  it('puts the letters one advance apart, a column of gap between them', () => {
    const one = textBitmap('A');
    expect(textBitmap('AA')).toEqual(one.map((row) => `${row}.${row}`));
  });

  it('is as wide as the width the font reports and as high as a line of text', () => {
    for (const text of ['I', 'ISLAND ADVENTURE', 'A B', 'NEW GAME']) {
      const bitmap = textBitmap(text);
      expect(bitmap).toHaveLength(TEXT_HEIGHT);
      expect(bitmap.every((row) => row.length === textWidthOf(text))).toBe(true);
    }
  });

  it('leaves a space and a character the font lacks blank, as the font does, and draws lower case as capitals', () => {
    expect(textBitmap('A;A')).toEqual(textBitmap('A A'));
    expect(textBitmap('a')).toEqual(textBitmap('A'));
    expect(textBitmap(' ')).toEqual(Array.from({ length: TEXT_HEIGHT }, () => '.....'));
  });

  it('is a line of text high and no pixel wide for no text', () => {
    expect(textBitmap('')).toEqual(Array.from({ length: TEXT_HEIGHT }, () => ''));
  });
});

describe('scaling a bitmap into rectangles', () => {
  it.each([1, 2, 3, 4])('makes every pixel of the title a square %i canvas pixels a side, and no more', (scale) => {
    const bitmap = textBitmap(GAME_TITLE);
    expect(sorted(pixelsOf(scaledRects(bitmap, scale)))).toEqual(sorted(scaledPixels(bitmap, scale)));
  });

  it('draws a vertical bar as one rectangle', () => {
    expect(scaledRects(['#', '#', '#'], 2)).toEqual([{ left: 0, top: 0, width: 2, height: 6 }]);
  });

  it('keeps two bars that are not one under the other apart', () => {
    expect(scaledRects(['#.', '.#'], 3)).toEqual([
      { left: 0, top: 0, width: 3, height: 3 },
      { left: 3, top: 3, width: 3, height: 3 },
    ]);
  });

  it.each([0, -1, -3, 1.5, 2.5, Number.NaN, Number.POSITIVE_INFINITY])('refuses the scale %s, which is not a whole number of pixels', (scale) => {
    expect(() => scaledRects(['#'], scale)).toThrow(RangeError);
  });
});

describe('the logo across the top of the title screen', () => {
  it('is a whole number of times the font, two, three or four, the biggest that leaves room at both sides', () => {
    const logo = logoLayout();
    expect([2, 3, 4]).toContain(logo.scale);
    const margin = (VIEW_WIDTH - logo.width) / 2;
    expect(margin).toBeGreaterThanOrEqual(8);
    expect(textWidthOf(GAME_TITLE) * (logo.scale + 1) + 16).toBeGreaterThan(VIEW_WIDTH);
  });

  // The font is 6 pixels a letter less the 1 pixel gap after the last, and 7 high: two letters are 11 wide, eight are 47.
  // A scale fits when the name and 12 pixels at each side lie across the screen.
  it.each([
    ['AB', 320, 4, 44, 28, 138],
    ['ABCDEFGH', 212, 4, 188, 28, 12],
    ['ABCDEFGH', 211, 3, 141, 21, 35],
    ['ABCDEFGH', 200, 3, 141, 21, 29],
    ['ABCDEFGH', 150, 2, 94, 14, 28],
  ])('has the size and place worked out by hand for %s across %i pixels: scale %i, %i by %i, %i from the left', (text, viewWidth, scale, width, height, left) => {
    expect(logoLayout(text, viewWidth)).toMatchObject({ scale, width, height, left });
  });

  it('is on whole pixels, in the middle of the screen', () => {
    const logo = logoLayout();
    expect(Number.isInteger(logo.left) && Number.isInteger(logo.top)).toBe(true);
    expect(Math.abs(logo.left - (VIEW_WIDTH - logo.width - logo.left))).toBeLessThanOrEqual(1);
  });

  it.each([214, 240, 280, 320, 400, 480, 640])('picks a whole scale that fits across %i pixels', (width) => {
    const logo = logoLayout(GAME_TITLE, width);
    expect(Number.isInteger(logo.scale)).toBe(true);
    expect(logo.scale).toBeGreaterThanOrEqual(2);
    expect(logo.scale).toBeLessThanOrEqual(4);
    expect(logo.left).toBeGreaterThanOrEqual(8);
    expect(logo.left + logo.width).toBeLessThanOrEqual(width - 8);
    expect(Number.isInteger(logo.left)).toBe(true);
  });

  it('is refused, not cut off, on a screen too narrow for it', () => {
    expect(() => logoLayout(GAME_TITLE, 200)).toThrow(RangeError);
  });

  it('is painted inside the screen: the letters, their extrusion and their outline', () => {
    const bounds = paintedBounds(logoLayout());
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(VIEW_WIDTH);
    expect(bounds.bottom).toBeLessThanOrEqual(VIEW_HEIGHT);
  });

  describe('painted as the title screen paints it', () => {
    /** The pixels of the letters, and of each pass of the paint, with the logo's own offset on the screen. */
    function painted() {
      const logo = logoLayout();
      const face = pixelsOf(scaledRects(textBitmap(GAME_TITLE), logo.scale));
      const shifted = (offsets: readonly { x: number; y: number }[]): Pixel[] =>
        offsets.flatMap((offset) => face.map(([x, y]): Pixel => [x + offset.x, y + offset.y]));
      const everything = [...shifted(LOGO_OUTLINE_OFFSETS), ...shifted(LOGO_EXTRUSION_OFFSETS), ...face].map(
        ([x, y]): Pixel => [x + logo.left, y + logo.top],
      );
      return { logo, face, shifted, everything };
    }

    it('stays within the bounds the window is placed by, which reach as low as the paint does', () => {
      const { logo, everything } = painted();
      const bounds = paintedBounds(logo);
      const extent = (values: readonly number[]): [number, number] =>
        values.reduce<[number, number]>(([low, high], value) => [Math.min(low, value), Math.max(high, value)], [Infinity, -Infinity]);
      const [leftmost, rightmost] = extent(everything.map(([x]) => x));
      const [highest, lowest] = extent(everything.map(([, y]) => y));
      expect(leftmost).toBeGreaterThanOrEqual(bounds.left);
      expect(rightmost + 1).toBeLessThanOrEqual(bounds.right);
      expect(highest).toBe(bounds.top);
      expect(lowest + 1).toBe(bounds.bottom);
    });

    it('has an outline that closes round the letters and their extrusion', () => {
      const { face, shifted } = painted();
      const outline = new Set(shifted(LOGO_OUTLINE_OFFSETS).map(keyOf));
      const solid = new Set([...face, ...shifted(LOGO_EXTRUSION_OFFSETS)].map(keyOf));
      const open: string[] = [];
      for (const key of solid) {
        const [x, y] = key.split(',').map(Number) as [number, number];
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const next = `${x + dx},${y + dy}`;
            if (!solid.has(next) && !outline.has(next)) {
              open.push(next);
            }
          }
        }
      }
      expect(open).toEqual([]);
    });
  });
});

describe('the menu window under the logo', () => {
  const bounds = paintedBounds(logoLayout());

  it('is on a whole pixel, clear of the logo and above the foot of the screen, for every height the room holds', () => {
    const heights = Array.from({ length: 113 }, (_, at) => 40 + at);
    const misplaced = heights.filter((height) => {
      const top = windowTop(height);
      return !Number.isInteger(top) || top < bounds.bottom + 1 || top + height > VIEW_HEIGHT - 1;
    });
    expect(misplaced).toEqual([]);
  });

  it('is in the middle of the room between the logo and the foot of the screen', () => {
    for (const height of [60, 80, 95, 104, 115, 130]) {
      const top = windowTop(height);
      const above = top - bounds.bottom;
      const below = VIEW_HEIGHT - (top + height);
      expect(Math.abs(above - below)).toBeLessThanOrEqual(5);
    }
  });

  it('moves up as the window grows and stays clear of the logo when it grows beyond the room', () => {
    expect(windowTop(80)).toBeGreaterThan(windowTop(115));
    for (const height of [150, 160, 180, 192, 240]) {
      expect(windowTop(height)).toBeGreaterThanOrEqual(bounds.bottom + 1);
    }
  });
});
