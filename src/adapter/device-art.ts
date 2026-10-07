import type Phaser from 'phaser';
import type { DoorView, KeyView } from '../core';
import { TILE_SIZE } from './config';

// The placeholder look of the devices of the light puzzles: the key, the door, and (below them, as the kinds are
// built) the gate, the lever and the sign. Each is a small picture of letters, one palette colour per pixel and `.` for
// a clear one, drawn with rectangles on the tile where it stands. Ticket 23 makes the final art; art.ts calls the draw
// functions below for these kinds.

type Graphics = Phaser.GameObjects.Graphics;

const OUTLINE = 0x141b1b;
const GOLD = 0xf2c94c;
const GOLD_SHADE = 0xb8892b;
const WOOD = 0x9a6a33;
const WOOD_LIGHT = 0xb98544;
const WOOD_DARK = 0x5e3b1b;

const PALETTE: Readonly<Record<string, number>> = {
  A: OUTLINE,
  Y: GOLD,
  S: GOLD_SHADE,
  W: WOOD,
  L: WOOD_LIGHT,
  D: WOOD_DARK,
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

/** A shut door: three planks held by two braces, and a gold lock, which is the colour of the key. A whole tile. */
const DOOR_SHUT_ROWS: readonly string[] = [
  'AAAAAAAAAAAAAAAA',
  'ALWWWDLWWWDLWWWA',
  'ALWWWDLWWWDLWWWA',
  'ADDDDDDDDDDDDDDA',
  'ALWWWDLWWWDLWWWA',
  'ALWWWAAAAAALWWWA',
  'ALWWWAYYYYALWWWA',
  'ALWWWAYAAYALWWWA',
  'ALWWWAYAAYALWWWA',
  'ALWWWASSSSALWWWA',
  'ALWWWAAAAAALWWWA',
  'ALWWWDLWWWDLWWWA',
  'ADDDDDDDDDDDDDDA',
  'ALWWWDLWWWDLWWWA',
  'ALWWWDLWWWDLWWWA',
  'AAAAAAAAAAAAAAAA',
];

/** An open door: the frame, and the leaf swung back against one post, with the lock showing on its edge. A whole tile. */
const DOOR_OPEN_ROWS: readonly string[] = [
  'AAAAAAAAAAAAAAAA',
  'ADDDDDDDDDDDDDDA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLY..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
  'ADLW..........DA',
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

/** Draws a picture centred on a tile's centre, given in tiles. */
function drawCentred(graphics: Graphics, rows: readonly string[], centre: { x: number; y: number }): void {
  const first = rows[0] ?? '';
  const x = Math.round(centre.x * TILE_SIZE - first.length / 2);
  const y = Math.round(centre.y * TILE_SIZE - rows.length / 2);
  drawPixels(graphics, rows, x, y);
}

/** Draws a key where it lies, centred on its tile. A key the hero has taken is not in the view, so it is not drawn. */
export function drawKey(graphics: Graphics, key: KeyView): void {
  drawCentred(graphics, KEY_ROWS, key.position);
}

/** Draws a door on the tile it fills, shut or open. */
export function drawDoor(graphics: Graphics, door: DoorView): void {
  drawCentred(graphics, door.open ? DOOR_OPEN_ROWS : DOOR_SHUT_ROWS, door.position);
}
