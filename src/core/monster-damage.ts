import type { Content } from './content';
import { monsterTypeOf } from './content';
import { rollDrops } from './drops';
import type { GameEvent, RandomSource } from './interface';
import { gainExperience } from './progression';
import type { MonsterState, PlayState } from './state';

/**
 * The hero hurts a monster, with a strike or an arrow alike. Returns what happened, in order: the hit, and when the
 * monster's Health reaches zero, its defeat, the Experience the hero earns for it, and what it drops.
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
    events.push({ type: 'monster-defeated', monsterId: monster.id });
    events.push(...gainExperience(state, content, monsterTypeOf(content, monster.type).experience));
    events.push(...rollDrops(state, content, monster, random));
  }
  return events;
}
