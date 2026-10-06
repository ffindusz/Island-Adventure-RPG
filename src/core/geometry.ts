export type Direction = 'up' | 'down' | 'left' | 'right';

/** A position in tile units: x grows to the right, y grows downward. An entity's position is the centre of its body. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned rectangle in tile units. */
export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** A tile of an Adventure Area, counted from the top-left corner. */
export interface Tile {
  readonly col: number;
  readonly row: number;
}

/** The middle of a tile. */
export function centerOf(tile: Tile): Point {
  return { x: tile.col + 0.5, y: tile.row + 0.5 };
}
