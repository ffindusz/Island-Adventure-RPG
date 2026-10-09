import type { Content, ChaserMonsterType } from './content';
import { expandBox, overlaps } from './geometry';
import { hurtHero } from './hero-damage';
import type { GameEvent } from './interface';
import { directionToward, walkMonster } from './monster-movement';
import { heroBody, monsterBody } from './state';
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
    const direction = directionToward(monster.position, state.hero.position);
    walkMonster(monster, type.size, direction, type.speedPerStep, state, content);
  } else {
    monster.action = { type: 'idle' };
  }
  return [];
}

/** What a strike needs of a monster type: the damage that lands, and how long the monster rests afterwards. */
export interface StrikeNumbers {
  readonly damage: number;
  readonly recoverySteps: number;
}

/** The wind-up is over: the attack lands on what is in the zone that was telegraphed, which may be nothing. */
export function strike(
  monster: MonsterState,
  windUp: WindingUp,
  type: StrikeNumbers,
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
