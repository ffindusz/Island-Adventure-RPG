import type Phaser from 'phaser';
import type { KeyView } from '../core';
import { TILE_SIZE } from './config';

// The placeholder look of the devices of the light puzzles: the key, and (below it, as the kinds are built) the door,
// the gate, the lever and the sign. Each is a small picture of letters, one palette colour per pixel and `.` for a clear
// one, drawn with rectangles on the tile where it stands. Ticket 23 makes the final art; art.ts calls the draw functions
// below for these kinds.

type Graphics = Phaser.GameObjects.Graphics;

const OUTLINE = 0x141b1b;
const GOLD = 0xf2c94c;
const GOLD_SHADE = 0xb8892b;

const PALETTE: Readonly<Record<string, number>> = {
  A: OUTLINE,
  Y: GOLD,
  S: GOLD_SHADE,
};

/** A key lying on its tile: a ring with a hole, a shaft and a tooth. 12 by 7 pixels. */
const KEY_ROWS: readonly string[] = [
  '..AAAA......',
  '.AYYYYA.....',
  'AYYAAYYAAAAA',
  'AYYAAYYYYYYA',
  'AYYAAYYAASAA',
  '.AYYYYA..ASA',
  '..AAAA....AA',
];

/** Draws the rows with their top left corner at x, y: a run of one letter along a row is one rectangle. */
function drawPixels(graphics: Graphics, rows: readonly string[], x: number, y: number): void {
  rows.forEach((row, rowIndex) => {
    for (const run of row.matchAll(/([^.])\1*/g)) {
      graphics.fillStyle(PALETTE[run[1] ?? ''] ?? OUTLINE);
      graphics.fillRect(x + run.index, y + rowIndex, run[0].length, 1);
    }
  });
}

/** Draws a key where it lies, centred on its tile. A key the hero has taken is not in the view, so it is not drawn. */
export function drawKey(graphics: Graphics, key: KeyView): void {
  const first = KEY_ROWS[0] ?? '';
  const x = Math.round(key.position.x * TILE_SIZE - first.length / 2);
  const y = Math.round(key.position.y * TILE_SIZE - KEY_ROWS.length / 2);
  drawPixels(graphics, KEY_ROWS, x, y);
}
