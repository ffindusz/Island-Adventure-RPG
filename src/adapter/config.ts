import type { Direction, Point } from '../core';

/**
 * The tile size, in canvas pixels. It is the only place the number lives: the Game core measures everything in
 * tiles, and the adapter multiplies by this to draw.
 */
export const TILE_SIZE = 16;

/** Tiles to whole canvas pixels, so every shape lands exactly on pixels and stays crisp. */
export function px(tiles: number): number {
  return Math.round(tiles * TILE_SIZE);
}

/**
 * The canvas shows this many tiles. An area exactly this size is all on screen; a larger one scrolls with the camera
 * that follows the hero (camera.ts), and a smaller one sits in the middle of the screen. The numbers live here and
 * nowhere else, so that tests of the content and the adapter agree on what one screen is; the core knows no screen.
 */
export const VIEW_TILES_WIDE = 20;
export const VIEW_TILES_HIGH = 12;

export const VIEW_WIDTH = VIEW_TILES_WIDE * TILE_SIZE;
export const VIEW_HEIGHT = VIEW_TILES_HIGH * TILE_SIZE;

/**
 * One step in each direction on the screen: up is towards the smaller y. The Game core has the same table, but its index
 * exports only types, so the adapter has this one, and tests/config.test.ts walks the Game core to keep the two the same.
 */
export const FACING_STEP: Readonly<Record<Direction, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * The column of each direction in a sheet of a character, the same in every row of it: the hero's sheet and the monsters'
 * (docs/assets/compose-art.py makes them so) have one column for each way the character faces.
 */
export const FACING_COLUMN: Readonly<Record<Direction, number>> = { down: 0, up: 1, left: 2, right: 3 };
export const SHEET_COLUMNS = 4;
