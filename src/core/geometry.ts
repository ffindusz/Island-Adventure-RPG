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

/** The box of a tile, in tile units like the other bodies. */
export function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}

/** A tile as an error message names it. */
export function describeTile(tile: Tile): string {
  return `(col ${tile.col}, row ${tile.row})`;
}

/** A tile as the key of a Set or a Map. */
export function tileKey(tile: Tile): string {
  return `${tile.col},${tile.row}`;
}

/** A square body of the given width, centred on a point. */
export function boxAround(center: Point, size: number): Box {
  const half = size / 2;
  return { minX: center.x - half, minY: center.y - half, maxX: center.x + half, maxY: center.y + half };
}

/** The box grown by `margin` on every side. */
export function expandBox(box: Box, margin: number): Box {
  return { minX: box.minX - margin, minY: box.minY - margin, maxX: box.maxX + margin, maxY: box.maxY + margin };
}

/** The middle of a box. */
export function centerOfBox(box: Box): Point {
  return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
}

/** How far a body went that moved straight from one position to another: along one axis, so the differences add up. */
export function travelledBetween(from: Point, to: Point): number {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
}

/**
 * The ground right in front of a body of `size` centred on `position`, facing a direction: `reach` deep beyond the
 * body and `width` wide, centred on the body.
 */
export function zoneInFront(position: Point, size: number, direction: Direction, reach: number, width: number): Box {
  const body = boxAround(position, size);
  const halfWidth = width / 2;
  switch (direction) {
    case 'right':
      return { minX: body.maxX, minY: position.y - halfWidth, maxX: body.maxX + reach, maxY: position.y + halfWidth };
    case 'left':
      return { minX: body.minX - reach, minY: position.y - halfWidth, maxX: body.minX, maxY: position.y + halfWidth };
    case 'down':
      return { minX: position.x - halfWidth, minY: body.maxY, maxX: position.x + halfWidth, maxY: body.maxY + reach };
    case 'up':
      return { minX: position.x - halfWidth, minY: body.minY - reach, maxX: position.x + halfWidth, maxY: body.minY };
  }
}

/** Overlaps smaller than this are rounding noise: boxes that touch edge to edge are not overlapping. */
export const EPSILON = 1e-9;

/** True when the boxes share some area. Boxes that only touch along an edge do not overlap. */
export function overlaps(a: Box, b: Box): boolean {
  return overlapsHorizontally(a, b) && overlapsVertically(a, b);
}

/** True when the boxes share some of their horizontal extent: they are in the same column of space. */
export function overlapsHorizontally(a: Box, b: Box): boolean {
  return a.minX < b.maxX - EPSILON && a.maxX > b.minX + EPSILON;
}

/** True when the boxes share some of their vertical extent: they are in the same row of space. */
export function overlapsVertically(a: Box, b: Box): boolean {
  return a.minY < b.maxY - EPSILON && a.maxY > b.minY + EPSILON;
}

const UNIT_VECTORS: Readonly<Record<Direction, Point>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function unitVector(direction: Direction): Point {
  return UNIT_VECTORS[direction];
}
