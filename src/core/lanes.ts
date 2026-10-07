import { areaOf } from './content';
import type { Content } from './content';
import { zoneInFront } from './geometry';
import type { Box, Direction, Point } from './geometry';
import { interactableObstacles } from './interactables';
import { moveBody } from './movement';
import type { PlayState } from './state';

/**
 * The lane in front of a body: the strip it sweeps when it goes in a direction, as wide as the body, from its front
 * edge to where solid terrain or a chest stops it, or to `range` tiles if nothing does first. Monsters and the hero
 * are not counted: they move, and a lane that showed where they stand now would be out of date at once. The lane has
 * no area when something stands right in front of the body.
 */
export function laneAhead(
  state: PlayState,
  content: Content,
  position: Point,
  size: number,
  direction: Direction,
  range: number,
): Box {
  const end = moveBody(
    areaOf(content, state.areaId),
    position,
    size,
    direction,
    range,
    interactableObstacles(state, content),
  );
  const length = Math.abs(end.x - position.x) + Math.abs(end.y - position.y);
  return zoneInFront(position, size, direction, length, size);
}
