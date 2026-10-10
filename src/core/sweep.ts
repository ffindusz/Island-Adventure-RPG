import type { Area } from './content';
import { boxAround, EPSILON, overlaps, travelledBetween, unitVector } from './geometry';
import type { Box, Direction, Point } from './geometry';
import { gapAhead, moveBody } from './movement';

/** How a body that moves toward a target got on: where it ended up, how far it went, and whether it reached the target. */
export interface Sweep {
  readonly end: Point;
  readonly travelled: number;
  /** The body is flush against the target, or overlapped it from the start: they touch. */
  readonly reachedTarget: boolean;
}

/**
 * Moves a body up to `distance` in a direction. It stops flush against solid terrain and the `blockers`, and against
 * the `target`, which counts as reached when the body touches it: a target can walk into a body that stands still.
 * The target does not block in any other way, so a body that does not reach it goes past it.
 */
export function sweepToward(
  area: Area,
  position: Point,
  size: number,
  direction: Direction,
  distance: number,
  blockers: readonly Box[],
  target: Box,
): Sweep {
  const body = boxAround(position, size);
  const unblocked = moveBody(area, position, size, direction, distance, blockers);
  const clear = travelledBetween(position, unblocked);
  const gap = overlaps(body, target) ? 0 : (gapAhead(body, direction, target) ?? Infinity);
  const travelled = Math.min(clear, gap);
  const vector = unitVector(direction);
  return {
    end: { x: position.x + vector.x * travelled, y: position.y + vector.y * travelled },
    travelled,
    reachedTarget: gap <= clear + EPSILON,
  };
}
