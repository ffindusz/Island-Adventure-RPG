import { areaOf } from './content';
import type { Content } from './content';
import { expandBox, overlaps } from './geometry';
import type { Box, Direction, Point } from './geometry';
import { interactableObstacles } from './interactables';
import { moveBody } from './movement';
import { heroBody, livingMonsters, monsterBody } from './state';
import type { MonsterState, PlayState, Recovering, WindingUp } from './state';

// What the behaviors have in common: how a monster notices the hero, winds up, rests and walks.

/** Whether the hero is within the noticing distance of a monster: measured from its body, as a square around it. */
export function noticesHero(
  monster: MonsterState,
  type: { readonly noticingDistance: number },
  state: PlayState,
  content: Content,
): boolean {
  return overlaps(heroBody(state, content), expandBox(monsterBody(monster, content), type.noticingDistance));
}

/** One step of a wind-up. Returns whether it is over: the attack comes now. */
export function windUpEnds(windUp: WindingUp): boolean {
  windUp.elapsed += 1;
  return windUp.elapsed >= windUp.length;
}

/** One step of the rest after an attack. Returns whether the monster still rests: it acts again once it does not. */
export function stillRecovering(recovery: Recovering): boolean {
  recovery.stepsLeft -= 1;
  return recovery.stepsLeft > 0;
}

/** The direction, of the four, that most closes the distance to a point: across if it is as far across as it is down. */
export function directionToward(from: Point, to: Point): Direction {
  const across = to.x - from.x;
  const down = to.y - from.y;
  if (Math.abs(across) >= Math.abs(down)) {
    return across >= 0 ? 'right' : 'left';
  }
  return down > 0 ? 'down' : 'up';
}

/** What stops a monster, besides the hero and solid terrain: the other living monsters, chests and the like. */
export function blockersOf(monster: MonsterState, state: PlayState, content: Content): Box[] {
  return [
    ...livingMonsters(state)
      .filter((other) => other !== monster)
      .map((other) => monsterBody(other, content)),
    ...interactableObstacles(state, content),
  ];
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
  monster.position = moveBody(areaOf(content, state.areaId), monster.position, size, direction, distance, [
    heroBody(state, content),
    ...blockersOf(monster, state, content),
  ]);
}
