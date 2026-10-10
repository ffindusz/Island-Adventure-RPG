import type Phaser from 'phaser';

// The tiny bitmap font and bitmap drawing that the HUD and the overlay share. Text objects blur at this canvas size,
// so letters, digits and pictures are a few rectangles each, which stays sharp at every zoom. A letter is 5 pixels wide
// and 7 high, one canvas pixel per bitmap pixel, the size of a pixel in the art around it.

export type Graphics = Phaser.GameObjects.Graphics;

/** A bitmap is rows of '#' (drawn) and '.' (left empty). */
export type Bitmap = readonly string[];

const GLYPH_WIDTH = 5;
const GLYPH_HEIGHT = 7;
/** The gap between one letter and the next, in canvas pixels. */
const LETTER_GAP = 1;
/** From the left edge of one letter to the left edge of the next. Every letter has the same room, 'I' and '.' too. */
const ADVANCE = GLYPH_WIDTH + LETTER_GAP;

/** The height of a line of text, in canvas pixels. */
export const TEXT_HEIGHT = GLYPH_HEIGHT;

const GLYPHS: Readonly<Record<string, Bitmap>> = {
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
};

export function bitmapWidth(bitmap: Bitmap): number {
  return Math.max(...bitmap.map((row) => row.length));
}

export function bitmapHeight(bitmap: Bitmap): number {
  return bitmap.length;
}

export function textWidthOf(text: string): number {
  return text.length === 0 ? 0 : text.length * ADVANCE - LETTER_GAP;
}

/** Draws the '#' of the bitmap, a run of them along a row as one rectangle, with the bitmap's top left at x, y. */
export function drawBitmap(graphics: Graphics, bitmap: Bitmap, x: number, y: number, colour: number): void {
  graphics.fillStyle(colour);
  bitmap.forEach((row, rowIndex) => {
    for (const run of row.matchAll(/#+/g)) {
      graphics.fillRect(x + run.index, y + rowIndex, run[0].length, 1);
    }
  });
}

/** The letter the font has for the character, if it has one. Lower case is drawn as its capital. */
function glyphFor(character: string): Bitmap | undefined {
  return GLYPHS[character.toUpperCase()];
}

/**
 * The characters of the text that `drawText` would leave blank, in the order they come. A space is not one of them: it
 * has no letter on purpose, and is only a gap.
 */
export function undrawableIn(text: string): string[] {
  return [...text].filter((character) => character !== ' ' && glyphFor(character) === undefined);
}

/** Draws letters (as capitals), digits and the few marks the font has. Any other character is left blank. */
export function drawText(graphics: Graphics, text: string, x: number, y: number, colour: number): void {
  let left = x;
  for (const character of text) {
    const glyph = glyphFor(character);
    if (glyph !== undefined) {
      drawBitmap(graphics, glyph, left, y, colour);
    }
    left += ADVANCE;
  }
}

/** A rectangle of canvas pixels: the corner at its top left, and its size. */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const BLANK_ROW = '.'.repeat(GLYPH_WIDTH);

/** A rectangle that `scaledRects` is still making taller. */
type Growing = { -readonly [Field in keyof Rect]: Rect[Field] };

/** The text as one bitmap, its letters one advance apart as `drawText` lays them out: blank where the font has no letter. */
export function textBitmap(text: string): Bitmap {
  const letters = [...text].map((character) => glyphFor(character) ?? []);
  return Array.from({ length: GLYPH_HEIGHT }, (_, row) => letters.map((glyph) => glyph[row] ?? BLANK_ROW).join('.'));
}

/**
 * The rectangles that draw the bitmap with each of its pixels `scale` canvas pixels wide and high, a run of pixels along
 * a row as one rectangle and the same run on the rows under it joined to it. The scale is a whole number: anything
 * between would put the edge of a pixel inside a canvas pixel, and the letters would blur.
 */
export function scaledRects(bitmap: Bitmap, scale: number): Rect[] {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new RangeError(`A bitmap is drawn at a whole number of canvas pixels per pixel, not ${scale}.`);
  }
  const rects: Growing[] = [];
  let open = new Map<string, Growing>();
  bitmap.forEach((row, rowIndex) => {
    const next = new Map<string, Growing>();
    for (const run of row.matchAll(/#+/g)) {
      const key = `${run.index}:${run[0].length}`;
      let rect = open.get(key);
      if (rect === undefined) {
        rect = { left: run.index * scale, top: rowIndex * scale, width: run[0].length * scale, height: 0 };
        rects.push(rect);
      }
      rect.height += scale;
      next.set(key, rect);
    }
    open = next;
  });
  return rects;
}

/** Draws the bitmap with each pixel `scale` canvas pixels across, its top left at x, y. */
export function drawScaledBitmap(graphics: Graphics, bitmap: Bitmap, x: number, y: number, colour: number, scale: number): void {
  graphics.fillStyle(colour);
  for (const rect of scaledRects(bitmap, scale)) {
    graphics.fillRect(x + rect.left, y + rect.top, rect.width, rect.height);
  }
}
