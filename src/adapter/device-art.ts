import type Phaser from 'phaser';
import type { DoorView, GateView, KeyView, LeverView } from '../core';
import { TILE_SIZE } from './config';

// The placeholder look of the devices of the light puzzles: the key, the door, the gate and the lever, and (below
// them, as the kinds are built) the sign. Each is a small picture of letters, one palette colour per pixel and `.` for
// a clear one, drawn with rectangles on the tile where it stands. Ticket 23 makes the final art; art.ts calls the draw
// functions below for these kinds.

type Graphics = Phaser.GameObjects.Graphics;

const OUTLINE = 0x141b1b;
const GOLD = 0xf2c94c;
const GOLD_SHADE = 0xb8892b;
const WOOD = 0x9a6a33;
const WOOD_LIGHT = 0xb98544;
const WOOD_DARK = 0x5e3b1b;
const IRON = 0x8b95a0;
const IRON_LIGHT = 0xb6bec7;
const IRON_DARK = 0x4d555e;
const RED = 0xc0392b;
const RED_LIGHT = 0xe8695a;

const PALETTE: Readonly<Record<string, number>> = {
  A: OUTLINE,
  Y: GOLD,
  S: GOLD_SHADE,
  W: WOOD,
  L: WOOD_LIGHT,
  D: WOOD_DARK,
  I: IRON,
  J: IRON_LIGHT,
  K: IRON_DARK,
  R: RED,
  Q: RED_LIGHT,
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

/** A shut gate: five iron bars between a top rail, a crossbar and a bottom rail. A whole tile. */
const GATE_SHUT_ROWS: readonly string[] = [
  'AAAAAAAAAAAAAAAA',
  'AKKKKKKKKKKKKKKA',
  'AIIIIIIIIIIIIIIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.JI.JI.JI.JIA',
  'AKKKKKKKKKKKKKKA',
  'AIIIIIIIIIIIIIIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.JI.JI.JI.JIA',
  'AKKKKKKKKKKKKKKA',
  'AIIIIIIIIIIIIIIA',
  'AAAAAAAAAAAAAAAA',
];

/** An open gate: the top rail, the bars drawn up into it, and the two posts, with the way between them clear. */
const GATE_OPEN_ROWS: readonly string[] = [
  'AAAAAAAAAAAAAAAA',
  'AKKKKKKKKKKKKKKA',
  'AIIIIIIIIIIIIIIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.JI.JI.JI.JIA',
  'AJI.AA.AA.AA.JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AJI..........JIA',
  'AAA..........AAA',
];

/** A lever at rest: a red knob on a stick that leans left, on an iron plate. A whole tile. */
const LEVER_RESTING_ROWS: readonly string[] = [
  '................',
  '................',
  '.AAAA...........',
  'AQRRRA..........',
  'ARRRRA..........',
  'ARRRRA..........',
  '.AAAA...........',
  '..AJIA..........',
  '...AJIA.........',
  '....AJIA........',
  '.....AJIA.......',
  '......AJIA......',
  '.AAAAAAAAAAAAAA.',
  '.AKKKKKKKKKKKKA.',
  '.AIIIIIIIIIIIIA.',
  '.AAAAAAAAAAAAAA.',
];

/** A pulled lever: the stick leans the other way, as a mirror shows it. */
const LEVER_PULLED_ROWS: readonly string[] = LEVER_RESTING_ROWS.map((row) => [...row].reverse().join(''));

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

/** Draws a gate on the tile it fills, shut or open. */
export function drawGate(graphics: Graphics, gate: GateView): void {
  drawCentred(graphics, gate.open ? GATE_OPEN_ROWS : GATE_SHUT_ROWS, gate.position);
}

/** Draws a lever on the tile it stands on, at rest or pulled. */
export function drawLever(graphics: Graphics, lever: LeverView): void {
  drawCentred(graphics, lever.pulled ? LEVER_PULLED_ROWS : LEVER_RESTING_ROWS, lever.position);
}
