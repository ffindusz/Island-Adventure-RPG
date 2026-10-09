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
