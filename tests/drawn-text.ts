import { drawText } from '../src/adapter/pixel-font';
import type { Graphics } from '../src/adapter/pixel-font';

// What the pixel font draws, found by drawing: the font silently skips a character it has no letter for, so the only
// honest way to ask whether it draws one is to draw it.

/** How many rectangles the pixel font draws for the text: none for a space, and none for a character it does not have. */
export function rectanglesDrawnFor(text: string): number {
  let rectangles = 0;
  const graphics = {
    fillStyle: () => graphics,
    fillRect: () => {
      rectangles += 1;
      return graphics;
    },
  } as unknown as Graphics;
  drawText(graphics, text, 0, 0, 0xffffff);
  return rectangles;
}

/** The characters of the text that the pixel font leaves blank, in order: a space is a gap, not a lack. */
export function charactersTheFontLacks(text: string): string[] {
  return [...text].filter((character) => character !== ' ' && rectanglesDrawnFor(character) === 0);
}
