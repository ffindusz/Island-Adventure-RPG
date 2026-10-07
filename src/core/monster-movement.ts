import { areaOf } from './content';
import type { Content } from './content';
import type { Direction, Point } from './geometry';
import { interactableObstacles } from './interactables';
import { moveBody } from './movement';
import { heroBody, livingMonsters, monsterBody } from './state';
import type { MonsterState, PlayState } from './state';

// What the behaviors have in common when a monster walks.

/** The direction, of the four, that most closes the distance to a point: across if it is as far across as it is down. */
export function directionToward(from: Point, to: Point): Direction {
  const across = to.x - from.x;
  const down = to.y - from.y;
  if (Math.abs(across) >= Math.abs(down)) {
    return across >= 0 ? 'right' : 'left';
  }
  return down > 0 ? 'down' : 'up';
}

/** One step of `distance` in a direction. Monsters do not pass through the hero, each other, chests or solid terrain. */
export function walkMonster(
  monster: MonsterState,
  size: number,
  direction: Direction,
  distance: number,
  state: PlayState,
  content: Content,
): void {
  const others = livingMonsters(state).filter((other) => other !== monster);
  monster.position = moveBody(areaOf(content, state.areaId), monster.position, size, direction, distance, [
    heroBody(state, content),
    ...others.map((other) => monsterBody(other, content)),
    ...interactableObstacles(state, content),
  ]);
}
