import type { Content } from './content';
import { openGatesOfGuardian } from './devices';
import { rollDrops } from './drops';
import type { GameEvent, RandomSource } from './interface';
import { monsterTypeOf } from './monster-content';
import { gainExperience } from './progression';
import type { MonsterState, PlayState } from './state';

/**
 * The hero hurts a monster, with a strike or an arrow alike. Returns what happened, in order: the hit, and when the
 * monster's Health reaches zero, its defeat, the fall of a Guardian after it with the gate its defeat opens open
 * already, the Experience the hero earns for it, and what it drops.
 */
export function hurtMonster(
  state: PlayState,
  content: Content,
  monster: MonsterState,
  damage: number,
  random: RandomSource,
): GameEvent[] {
  monster.health = Math.max(0, monster.health - damage);
  const events: GameEvent[] = [{ type: 'monster-hit', monsterId: monster.id, damage, health: monster.health }];
  if (monster.health === 0) {
    const type = monsterTypeOf(content, monster.type);
    events.push({ type: 'monster-defeated', monsterId: monster.id });
    if (type.behavior === 'guardian') {
      openGatesOfGuardian(state, content, monster.id);
      events.push({ type: 'guardian-defeated', monsterId: monster.id });
    }
    events.push(...gainExperience(state, content, type.experience));
    events.push(...rollDrops(state, content, monster, random));
  }
  return events;
}
