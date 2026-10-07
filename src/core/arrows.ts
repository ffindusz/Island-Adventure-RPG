import { areaOf } from './content';
import type { Content } from './content';
import { boxAround, EPSILON, overlaps } from './geometry';
import type { Box, Direction } from './geometry';
import { interactableObstacles } from './interactables';
import type { GameEvent, RandomSource } from './interface';
import { hurtMonster } from './monster-damage';
import { gapAhead, moveBody } from './movement';
import { livingMonsters, monsterBody } from './state';
import type { ArrowState, MonsterState, PlayState } from './state';
import { heroAttack } from './stats';

/**
 * The hero shoots with the Ranged Weapon: an arrow leaves the hero's centre in the direction it faces, and costs one
 * Ammunition. Without any, the hero is told so and nothing else happens: no arrow, and no cooldown either. Like a
 * strike, a shot waits for the attack cooldown, and starts it.
 */
export function heroShoots(state: PlayState, content: Content): GameEvent[] {
  if (state.hero.attackCooldown > 0) {
    return [];
  }
  if (state.hero.consumables.ammunition < 1) {
    return [{ type: 'out-of-ammunition' }];
  }
  state.hero.consumables.ammunition -= 1;
  state.hero.attackCooldown = content.hero.attackCooldownSteps;
  const direction = state.hero.facing;
  state.arrows.push({
    areaId: state.areaId,
    position: { ...state.hero.position },
    direction,
    rangeLeft: content.hero.rangedWeapon.range,
  });
  return [{ type: 'hero-shot', direction }];
}

/**
 * Flies every arrow one fixed step. An arrow hurts the first monster it reaches on the way and is gone. Otherwise it
 * flies on until solid terrain or a chest stops it, or its range is spent, and then it is gone. Arrows of an Adventure
 * Area the hero has left are gone too: an arrow only flies in the area it was shot in, and the hero is in one.
 */
export function flyArrows(state: PlayState, content: Content, random: RandomSource): GameEvent[] {
  const area = areaOf(content, state.areaId);
  const { arrowSpeedPerStep, arrowSize } = content.hero.rangedWeapon;
  const obstacles = interactableObstacles(state, content);
  const events: GameEvent[] = [];
  const stillFlying: ArrowState[] = [];
  for (const arrow of state.arrows) {
    if (arrow.areaId !== state.areaId) {
      continue;
    }
    const distance = Math.min(arrowSpeedPerStep, arrow.rangeLeft);
    const end = moveBody(area, arrow.position, arrowSize, arrow.direction, distance, obstacles);
    const travelled = Math.abs(end.x - arrow.position.x) + Math.abs(end.y - arrow.position.y);
    const body = boxAround(arrow.position, arrowSize);
    const target = firstMonsterReached(state, content, body, arrow.direction, travelled);
    if (target !== undefined) {
      events.push(...hurtMonster(state, content, target, heroAttack(state, content, 'ranged-weapon'), random));
      continue;
    }
    arrow.position = end;
    arrow.rangeLeft -= travelled;
    const stopped = travelled < distance - EPSILON;
    if (!stopped && arrow.rangeLeft > EPSILON) {
      stillFlying.push(arrow);
    }
  }
  state.arrows = stillFlying;
  return events;
}

/**
 * The living monster that an arrow with this body reaches first when it flies `reach` in its direction: the one it
 * already touches, or else the nearest one ahead of it. A monster can walk into the arrow, so touching counts.
 */
function firstMonsterReached(
  state: PlayState,
  content: Content,
  body: Box,
  direction: Direction,
  reach: number,
): MonsterState | undefined {
  let first: MonsterState | undefined;
  let firstGap = Infinity;
  for (const monster of livingMonsters(state)) {
    const target = monsterBody(monster, content);
    const gap = overlaps(body, target) ? 0 : gapAhead(body, direction, target);
    if (gap !== undefined && gap <= reach + EPSILON && gap < firstGap) {
      first = monster;
      firstGap = gap;
    }
  }
  return first;
}
