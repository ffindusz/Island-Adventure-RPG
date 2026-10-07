import type { TileRect } from './definitions';
import type { Box } from './geometry';

/**
 * The box a block of whole tiles covers, in tile units like the bodies it is compared with. `what` names the zone in the
 * message of the Error thrown when it is not whole tiles, or reaches outside a map `width` by `height` tiles.
 */
export function zoneBox(what: string, zone: TileRect, width: number, height: number): Box {
  const named = `${what} (col ${zone.col}, row ${zone.row}, ${zone.width} wide, ${zone.height} high)`;
  if (![zone.col, zone.row, zone.width, zone.height].every(Number.isInteger) || zone.width < 1 || zone.height < 1) {
    throw new Error(`${named} must be whole tiles, at least one wide and one high`);
  }
  if (zone.col < 0 || zone.row < 0 || zone.col + zone.width > width || zone.row + zone.height > height) {
    throw new Error(`${named} reaches outside the map`);
  }
  return { minX: zone.col, minY: zone.row, maxX: zone.col + zone.width, maxY: zone.row + zone.height };
}
