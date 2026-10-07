import { areaOf } from './content';
import type { Content, ChaserMonsterType } from './content';
import { expandBox, overlaps } from './geometry';
import type { Direction, Point } from './geometry';
import { hurtHero } from './hero-damage';
import { interactableObstacles } from './interactables';
import type { GameEvent } from './interface';
import { moveBody } from './movement';
import { heroBody, livingMonsters, monsterBody } from './state';
import type { MonsterAction, MonsterState, PlayState } from './state';

// The chaser: notices the hero, walks up to it, winds up a telegraphed attack and strikes. Both the noticing
// distance and the reach are measured from the monster's body, as a square around it.

type WindingUp = Extract<MonsterAction, { type: 'winding-up' }>;

/** One fixed step of a chaser. */
export function stepChaser(
  monster: MonsterState,
  type: ChaserMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  const action = monster.action;
  if (action.type === 'winding-up') {
    action.elapsed += 1;
    return action.elapsed >= action.length ? strike(monster, action, type, state, content) : [];
  }
  if (action.type === 'recovering') {
    action.stepsLeft -= 1;
    if (action.stepsLeft > 0) {
      return [];
    }
  }
  const body = monsterBody(monster, content);
  const hero = heroBody(state, content);
  const zone = expandBox(body, type.reach);
  if (overlaps(hero, zone)) {
    monster.action = { type: 'winding-up', zone, elapsed: 0, length: type.windUpSteps };
  } else if (overlaps(hero, expandBox(body, type.noticingDistance))) {
    monster.action = { type: 'chasing' };
    approach(monster, type, state, content);
  } else {
    monster.action = { type: 'idle' };
  }
  return [];
}

/** One step toward the hero, along the direction in which the two are farther apart. Monsters do not pass through anything. */
function approach(monster: MonsterState, type: ChaserMonsterType, state: PlayState, content: Content): void {
  const others = livingMonsters(state).filter((other) => other !== monster);
  monster.position = moveBody(
    areaOf(content, state.areaId),
    monster.position,
    type.size,
    directionToward(monster.position, state.hero.position),
    type.speedPerStep,
    [
      heroBody(state, content),
      ...others.map((other) => monsterBody(other, content)),
      ...interactableObstacles(state, content),
    ],
  );
}

/** The direction, of the four, that most closes the distance to a point: across if it is as far across as it is down. */
function directionToward(from: Point, to: Point): Direction {
  const across = to.x - from.x;
  const down = to.y - from.y;
  if (Math.abs(across) >= Math.abs(down)) {
    return across >= 0 ? 'right' : 'left';
  }
  return down > 0 ? 'down' : 'up';
}

/** The wind-up is over: the attack lands on what is in the zone that was telegraphed, which may be nothing. */
function strike(
  monster: MonsterState,
  windUp: WindingUp,
  type: ChaserMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  monster.action = { type: 'recovering', stepsLeft: type.recoverySteps };
  const events: GameEvent[] = [{ type: 'monster-attacked', monsterId: monster.id, zone: windUp.zone }];
  if (overlaps(heroBody(state, content), windUp.zone)) {
    events.push(...hurtHero(state, content, monster.id, type.damage));
  }
  return events;
}
