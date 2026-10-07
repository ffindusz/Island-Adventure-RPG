import type { Area } from './content';

/** The screen's size in tiles. An Adventure Area larger than this scrolls with a camera that follows the hero. */
export const SCREEN_TILES = { wide: 20, high: 12 } as const;

/**
 * The tiles at the top left of the screen that the in-play HUD covers. The camera stops at a map's corner, and a map
 * that fits the screen shows all of it, so these are the map's own top-left tiles whatever its size, and a hero
 * standing on one would be hidden. Content that asks for it (`checkCoveredCorner`) keeps them solid in every area.
 */
export const COVERED_CORNER = { cols: 6, rows: 3 } as const;

/** Throws an Error naming the first walkable tile in the covered corner of an Adventure Area, whatever the area's size. */
export function checkCoveredCorners(areas: Readonly<Record<string, Area>>): void {
  for (const area of Object.values(areas)) {
    for (let row = 0; row < COVERED_CORNER.rows; row += 1) {
      for (let col = 0; col < COVERED_CORNER.cols; col += 1) {
        if (area.solid[row]?.[col] === false) {
          throw new Error(
            `Area "${area.id}" has the HUD over its top-left ${COVERED_CORNER.cols} by ${COVERED_CORNER.rows} tiles, but the tile (col ${col}, row ${row}) in them is walkable: make them solid`,
          );
        }
      }
    }
  }
}
