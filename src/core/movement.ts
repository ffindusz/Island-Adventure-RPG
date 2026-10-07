import { areaOf } from './content';
import type { Area, Content } from './content';
import { boxAround, EPSILON, overlapsHorizontally, overlapsVertically, unitVector } from './geometry';
import type { Box, Direction } from './geometry';
import { livingMonsters, monsterBody } from './state';
import type { PlayState } from './state';

/** Walks the hero one fixed step in the given direction, stopping flush against whatever is in the way. */
export function walkHero(state: PlayState, content: Content, direction: Direction | undefined): void {
  if (direction === undefined) {
    return;
  }
  const area = areaOf(content, state.areaId);
  const body = boxAround(state.hero.position, content.hero.size);
  const step = content.hero.speedPerStep;
  const obstacles = [
    ...solidTilesAround(area, body, step),
    ...livingMonsters(state).map((monster) => monsterBody(monster, content)),
  ];
  const travel = travelBeforeObstacle(body, direction, step, obstacles);
  const vector = unitVector(direction);
  state.hero.position = {
    x: state.hero.position.x + vector.x * travel,
    y: state.hero.position.y + vector.y * travel,
  };
}

/** The boxes of the solid tiles that a body could reach within `reach`. Tiles beyond the map count as solid. */
function solidTilesAround(area: Area, body: Box, reach: number): Box[] {
  const tiles: Box[] = [];
  for (let row = Math.floor(body.minY - reach); row <= Math.floor(body.maxY + reach); row++) {
    for (let col = Math.floor(body.minX - reach); col <= Math.floor(body.maxX + reach); col++) {
      if (area.solid[row]?.[col] ?? true) {
        tiles.push({ minX: col, minY: row, maxX: col + 1, maxY: row + 1 });
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
function gapAhead(body: Box, direction: Direction, obstacle: Box): number | undefined {
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
