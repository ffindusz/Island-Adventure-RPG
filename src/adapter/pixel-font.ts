import type Phaser from 'phaser';

// The tiny bitmap font and bitmap drawing that the HUD and the overlay share. Text objects blur at this canvas size,
// so letters, digits and pictures are a few rectangles each, which stays sharp at every zoom.

export type Graphics = Phaser.GameObjects.Graphics;

/** A bitmap is rows of '#' (drawn) and '.' (left empty). */
export type Bitmap = readonly string[];

/** Every pixel of a bitmap is this many canvas pixels wide and tall, so they stay readable on a small canvas. */
export const SCALE = 2;

const GLYPH_WIDTH = 3;
const GLYPH_HEIGHT = 5;

/** The height of a line of text, in canvas pixels. */
export const TEXT_HEIGHT = GLYPH_HEIGHT * SCALE;

const GLYPHS: Readonly<Record<string, Bitmap>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '###', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '.': ['...', '...', '...', '...', '.#.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
};

export function bitmapWidth(bitmap: Bitmap): number {
  return Math.max(...bitmap.map((row) => row.length)) * SCALE;
}

export function bitmapHeight(bitmap: Bitmap): number {
  return bitmap.length * SCALE;
}

export function textWidthOf(text: string): number {
  return text.length * (GLYPH_WIDTH + 1) * SCALE - SCALE;
}

export function drawBitmap(graphics: Graphics, bitmap: Bitmap, x: number, y: number, colour: number): void {
  graphics.fillStyle(colour);
  bitmap.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column += 1) {
      if (row[column] === '#') {
        graphics.fillRect(x + column * SCALE, y + rowIndex * SCALE, SCALE, SCALE);
      }
    }
  });
}

/** Draws letters (as capitals), digits and the few marks the font has. Any other character is left blank. */
export function drawText(graphics: Graphics, text: string, x: number, y: number, colour: number): void {
  let left = x;
  for (const character of text) {
    const glyph = GLYPHS[character.toUpperCase()];
    if (glyph !== undefined) {
      drawBitmap(graphics, glyph, left, y, colour);
    }
    left += (GLYPH_WIDTH + 1) * SCALE;
  }
}
