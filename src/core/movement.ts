import { areaOf, isSolid } from './content';
import type { Area, Content } from './content';
import {
  boxAround,
  EPSILON,
  overlapsHorizontally,
  overlapsVertically,
  tileBox,
  travelledBetween,
  unitVector,
} from './geometry';
import type { Box, Direction, Point } from './geometry';
import { interactableObstacles } from './interactables';
import { livingMonsters, monsterBody } from './state';
import type { PlayState } from './state';

/**
 * Walks the hero one fixed step in the given direction, stopping flush against whatever is in the way. When what stops
 * it is the corner of something that does not move, and its middle is over the gap beside it, the rest of the step
 * slides it clear of the corner (see `slideRoundCorner`). A step that a monster cuts short, before anything that does
 * not move would have, is not slid: it is the monster that stops the hero, and the hero stays flush against it.
 */
export function walkHero(state: PlayState, content: Content, direction: Direction | undefined): void {
  if (direction === undefined) {
    return;
  }
  const area = areaOf(content, state.areaId);
  const { size, speedPerStep } = content.hero;
  const monsters = livingMonsters(state).map((monster) => monsterBody(monster, content));
  const fixtures = interactableObstacles(state, content);
  const here = state.hero.position;
  const ahead = moveBody(area, here, size, direction, speedPerStep, [...monsters, ...fixtures]);
  const unspent = speedPerStep - travelledBetween(here, ahead);
  const clearOfMonsters = moveBody(area, here, size, direction, speedPerStep, fixtures);
  const cutByMonster = travelledBetween(here, clearOfMonsters) > travelledBetween(here, ahead) + EPSILON;
  state.hero.position =
    unspent > EPSILON && !cutByMonster
      ? slideRoundCorner(area, ahead, size, direction, unspent, fixtures, monsters)
      : ahead;
}

/** The two ways that a body walking in a direction can be nudged sideways. */
const SIDEWAYS: Readonly<Record<Direction, readonly [Direction, Direction]>> = {
  up: ['left', 'right'],
  down: ['left', 'right'],
  left: ['up', 'down'],
  right: ['up', 'down'],
};

/**
 * How far the hero's middle may be over the corner that stops it, in shares of its width, for it to be helped round
 * it: half, so that its middle is over the gap and not over the thing.
 */
const SLIDE_LIMIT = 0.5;

/**
 * Where the hero ends up when its step was cut short by `unspent` and the things that stopped it are corners it can
 * slide round: nudged sideways, by no more than what is left of the step, toward the side where it clears them all by
 * the least. The rest of the step goes into the slide and nowhere else, and the hero is not turned. Where there is no
 * such side, because it is over the thing and not over the gap beside it, or nothing that stands still stopped it, it
 * stays where it is. Solid terrain and the `fixtures`, the boxes of the interactables that stop a walker, are corners
 * alike. The living `monsters` are not: they move, so the hero is not helped round them, but the slide stops flush
 * against them as it does against everything solid, and never ends with the hero overlapping any of them.
 */
function slideRoundCorner(
  area: Area,
  position: Point,
  size: number,
  direction: Direction,
  unspent: number,
  fixtures: readonly Box[],
  monsters: readonly Box[],
): Point {
  const body = boxAround(position, size);
  const inTheWay = [...solidTilesAround(area, body, unspent), ...fixtures].filter((box) => {
    const gap = gapAhead(body, direction, box);
    return gap !== undefined && gap < unspent;
  });
  if (inTheWay.length === 0) {
    return position;
  }
  const [side, shift] = SIDEWAYS[direction]
    .map((candidate) => [candidate, shiftToClear(body, candidate, inTheWay)] as const)
    .reduce((nearest, candidate) => (candidate[1] < nearest[1] ? candidate : nearest));
  if (shift > size * SLIDE_LIMIT + EPSILON) {
    return position;
  }
  return moveBody(area, position, size, side, Math.min(shift, unspent), [...monsters, ...fixtures]);
}

/** How far a body has to move to one side to be clear of every one of the boxes. */
function shiftToClear(body: Box, side: Direction, boxes: readonly Box[]): number {
  switch (side) {
    case 'left':
      return body.maxX - Math.min(...boxes.map((box) => box.minX));
    case 'right':
      return Math.max(...boxes.map((box) => box.maxX)) - body.minX;
    case 'up':
      return body.maxY - Math.min(...boxes.map((box) => box.minY));
    case 'down':
      return Math.max(...boxes.map((box) => box.maxY)) - body.minY;
  }
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
