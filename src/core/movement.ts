import { areaOf, isSolid } from './content';
import type { Area, Content } from './content';
import { boxAround, EPSILON, overlapsHorizontally, overlapsVertically, tileBox, unitVector } from './geometry';
import type { Box, Direction, Point } from './geometry';
import { interactableObstacles } from './interactables';
import { livingMonsters, monsterBody } from './state';
import type { PlayState } from './state';

/** Walks the hero one fixed step in the given direction, stopping flush against whatever is in the way. */
export function walkHero(state: PlayState, content: Content, direction: Direction | undefined): void {
  if (direction === undefined) {
    return;
  }
  state.hero.position = moveBody(
    areaOf(content, state.areaId),
    state.hero.position,
    content.hero.size,
    direction,
    content.hero.speedPerStep,
    [
      ...livingMonsters(state).map((monster) => monsterBody(monster, content)),
      ...interactableObstacles(state, content),
    ],
  );
}

/**
 * Where a body ends up after moving up to `distance` in a direction. It stops flush against solid terrain, or against
 * any of the `obstacles`, if it meets one on the way. Hero and monsters move by the same rule.
 */
export function moveBody(
  area: Area,
  position: Point,
  size: number,
  direction: Direction,
  distance: number,
  obstacles: readonly Box[],
): Point {
  const body = boxAround(position, size);
  const blockers = [...solidTilesAround(area, body, distance), ...obstacles];
  const travel = travelBeforeObstacle(body, direction, distance, blockers);
  const vector = unitVector(direction);
  return { x: position.x + vector.x * travel, y: position.y + vector.y * travel };
}

/** The boxes of the solid tiles that a body could reach within `reach`. Tiles beyond the map count as solid. */
function solidTilesAround(area: Area, body: Box, reach: number): Box[] {
  const tiles: Box[] = [];
  for (let row = Math.floor(body.minY - reach); row <= Math.floor(body.maxY + reach); row++) {
    for (let col = Math.floor(body.minX - reach); col <= Math.floor(body.maxX + reach); col++) {
      if (isSolid(area, { col, row })) {
        tiles.push(tileBox({ col, row }));
      }
    }
  }
  return tiles;
}

/** How far a body can move in a direction, up to `distance`, before it meets the first obstacle in its way. */
function travelBeforeObstacle(body: Box, direction: Direction, distance: number, obstacles: readonly Box[]): number {
  let travel = distance;
  for (const obstacle of obstacles) {
    const gap = gapAhead(body, direction, obstacle);
    if (gap !== undefined) {
      travel = Math.min(travel, gap);
    }
  }
  return travel;
}

/** The free space between a body and an obstacle that lies in its way, or undefined if the obstacle is not in the way. */
export function gapAhead(body: Box, direction: Direction, obstacle: Box): number | undefined {
  switch (direction) {
    case 'right':
      return overlapsVertically(body, obstacle) && obstacle.minX >= body.maxX - EPSILON
        ? Math.max(0, obstacle.minX - body.maxX)
        : undefined;
    case 'left':
      return overlapsVertically(body, obstacle) && obstacle.maxX <= body.minX + EPSILON
        ? Math.max(0, body.minX - obstacle.maxX)
        : undefined;
    case 'down':
      return overlapsHorizontally(body, obstacle) && obstacle.minY >= body.maxY - EPSILON
        ? Math.max(0, obstacle.minY - body.maxY)
        : undefined;
    case 'up':
      return overlapsHorizontally(body, obstacle) && obstacle.maxY <= body.minY + EPSILON
        ? Math.max(0, body.minY - obstacle.maxY)
        : undefined;
  }
}
