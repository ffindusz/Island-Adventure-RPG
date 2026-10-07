import { areaOf } from './content';
import type { Content, ChargerMonsterType } from './content';
import { EPSILON, expandBox, overlaps } from './geometry';
import type { Direction } from './geometry';
import { hurtHero } from './hero-damage';
import { interactableObstacles } from './interactables';
import type { GameEvent } from './interface';
import { laneAhead, laneLength } from './lanes';
import { directionToward, walkMonster } from './monster-movement';
import { heroBody, livingMonsters, monsterBody } from './state';
import type { MonsterAction, MonsterState, PlayState } from './state';
import { sweepToward } from './sweep';

// The charger: notices the hero, winds up with the lane of its dash shown, and dashes along that lane. The noticing
// distance is measured from the monster's body, as a square around it.

type WindingUp = Extract<MonsterAction, { type: 'winding-up' }>;
type Dashing = Extract<MonsterAction, { type: 'dashing' }>;

/** One fixed step of a charger. */
export function stepCharger(
  monster: MonsterState,
  type: ChargerMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  const action = monster.action;
  if (action.type === 'winding-up') {
    action.elapsed += 1;
    return action.elapsed >= action.length ? launchDash(monster, action) : [];
  }
  if (action.type === 'dashing') {
    return dash(monster, action, type, state, content);
  }
  if (action.type === 'recovering') {
    action.stepsLeft -= 1;
    if (action.stepsLeft > 0) {
      return [];
    }
  }
  const body = monsterBody(monster, content);
  const hero = heroBody(state, content);
  if (!overlaps(hero, expandBox(body, type.noticingDistance))) {
    monster.action = { type: 'idle' };
    return [];
  }
  const direction = directionToward(monster.position, state.hero.position);
  const lane = laneAhead(state, content, monster.position, type.size, direction, type.dashRange);
  if (overlaps(hero, lane)) {
    monster.action = { type: 'winding-up', zone: lane, elapsed: 0, length: type.windUpSteps, direction };
  } else {
    lineUp(monster, type, direction, state, content);
  }
  return [];
}

/**
 * The hero is noticed but not in the lane. The charger walks sideways until the lane is on the hero, or, once it is
 * level with the hero, toward it, until the lane reaches. A charger that does not walk waits for the hero to step in.
 */
function lineUp(
  monster: MonsterState,
  type: ChargerMonsterType,
  direction: Direction,
  state: PlayState,
  content: Content,
): void {
  if (type.speedPerStep === 0) {
    monster.action = { type: 'idle' };
    return;
  }
  monster.action = { type: 'chasing' };
  const lanesRunAcross = direction === 'left' || direction === 'right';
  const sideways = lanesRunAcross
    ? state.hero.position.y - monster.position.y
    : state.hero.position.x - monster.position.x;
  if (Math.abs(sideways) <= EPSILON) {
    walkMonster(monster, type.size, direction, type.speedPerStep, state, content);
  } else {
    const toward = lanesRunAcross ? (sideways > 0 ? 'down' : 'up') : sideways > 0 ? 'right' : 'left';
    walkMonster(monster, type.size, toward, Math.min(type.speedPerStep, Math.abs(sideways)), state, content);
  }
}

/** The wind-up is over: the dash is launched along the lane that was telegraphed, and the lane flashes. */
function launchDash(monster: MonsterState, windUp: WindingUp): GameEvent[] {
  const { direction, zone } = windUp;
  if (direction === undefined) {
    throw new Error(`Charger "${monster.id}" wound up with no direction to dash in`);
  }
  monster.action = { type: 'dashing', direction: 'right', rangeLeft: laneLength(zone, direction) };
  return [{ type: 'monster-attacked', monsterId: monster.id, zone }];
}

/**
 * One step of the dash. The charger runs on along its lane until it reaches the hero, which hurts the hero once, or
 * is stopped by solid terrain, a chest or another monster, or comes to the end of the lane. Then it recovers.
 */
function dash(
  monster: MonsterState,
  dashing: Dashing,
  type: ChargerMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  const distance = Math.min(type.dashSpeedPerStep, dashing.rangeLeft);
  const blockers = [
    ...livingMonsters(state)
      .filter((other) => other !== monster)
      .map((other) => monsterBody(other, content)),
    ...interactableObstacles(state, content),
  ];
  const sweep = sweepToward(
    areaOf(content, state.areaId),
    monster.position,
    type.size,
    dashing.direction,
    distance,
    blockers,
    heroBody(state, content),
  );
  monster.position = sweep.end;
  dashing.rangeLeft -= sweep.travelled;
  const stopped = sweep.travelled < distance - EPSILON || dashing.rangeLeft <= EPSILON;
  if (sweep.reachedTarget || stopped) {
    monster.action = { type: 'recovering', stepsLeft: type.recoverySteps };
  }
  return sweep.reachedTarget ? hurtHero(state, content, monster.id, type.damage) : [];
}
