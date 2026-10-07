import type { Content, ChaserMonsterType } from './content';
import { expandBox, overlaps } from './geometry';
import { hurtHero } from './hero-damage';
import type { GameEvent } from './interface';
import { heroBody, monsterBody } from './state';
import type { MonsterAction, MonsterState, PlayState } from './state';

// The chaser: notices the hero, walks up to it, winds up a telegraphed attack and strikes.

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
  const zone = expandBox(monsterBody(monster, content), type.reach);
  if (overlaps(heroBody(state, content), zone)) {
    monster.action = { type: 'winding-up', zone, elapsed: 0, length: type.windUpSteps };
  }
  return [];
}

/** The wind-up is over: the attack lands on what is in the zone that was telegraphed, which may be nothing. */
function strike(
  monster: MonsterState,
  windUp: WindingUp,
  type: ChaserMonsterType,
  state: PlayState,
  content: Content,
): GameEvent[] {
  monster.action = { type: 'idle' };
  const events: GameEvent[] = [{ type: 'monster-attacked', monsterId: monster.id, zone: windUp.zone }];
  if (overlaps(heroBody(state, content), windUp.zone)) {
    events.push(...hurtHero(state, content, monster.id, type.damage));
  }
  return events;
}
