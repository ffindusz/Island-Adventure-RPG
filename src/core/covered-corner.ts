import type { Area } from './content';

/** The screen's size in tiles. An Adventure Area larger than this scrolls with a camera that follows the hero. */
export const SCREEN_TILES = { wide: 20, high: 12 } as const;

/**
 * The tiles at the top left of the screen that the in-play HUD covers. In a scrolling Adventure Area the camera stops
 * at the map's corner, so these are the map's own top-left tiles, and a hero standing on one would be hidden.
 */
export const COVERED_CORNER = { cols: 6, rows: 3 } as const;

/**
 * Throws an Error naming the first walkable tile in the covered corner of an Adventure Area that scrolls. An area
 * exactly the size of the screen never scrolls, and a smaller one sits in the middle of it, so neither is checked.
 */
export function checkCoveredCorners(areas: Readonly<Record<string, Area>>): void {
  for (const area of Object.values(areas)) {
    if (area.width <= SCREEN_TILES.wide && area.height <= SCREEN_TILES.high) {
      continue;
    }
    for (let row = 0; row < COVERED_CORNER.rows; row += 1) {
      for (let col = 0; col < COVERED_CORNER.cols; col += 1) {
        if (area.solid[row]?.[col] === false) {
          throw new Error(
            `Area "${area.id}" is larger than the screen, so the HUD covers its top-left ${COVERED_CORNER.cols} by ${COVERED_CORNER.rows} tiles, but the tile (col ${col}, row ${row}) in them is walkable: make them solid`,
          );
        }
      }
    }
  }
}
