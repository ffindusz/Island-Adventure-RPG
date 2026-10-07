import { SCREEN_TILES } from '../core';

/**
 * The tile size, in canvas pixels. It is the only place the number lives: the Game core measures everything in
 * tiles, and the adapter multiplies by this to draw.
 */
export const TILE_SIZE = 16;

/**
 * The canvas shows this many tiles. An area exactly this size is all on screen; a larger one scrolls with the camera
 * that follows the hero (camera.ts), and a smaller one sits in the middle of the screen. The numbers come from the
 * Game core, so that tests of the content and the adapter agree on what one screen is.
 */
export const VIEW_TILES_WIDE = SCREEN_TILES.wide;
export const VIEW_TILES_HIGH = SCREEN_TILES.high;

export const VIEW_WIDTH = VIEW_TILES_WIDE * TILE_SIZE;
export const VIEW_HEIGHT = VIEW_TILES_HIGH * TILE_SIZE;
