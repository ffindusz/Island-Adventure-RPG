import { grantConsumable } from './consumables';
import { monsterTypeOf } from './content';
import type { Content } from './content';
import type { GameEvent, RandomSource } from './interface';
import type { MonsterState, PlayState } from './state';

/**
 * What a defeated monster leaves behind. Every entry of its type's drop table is rolled once, in order, and the roll
 * is made whatever the entry's chance is, so tuning a chance never shifts the rolls that follow. An entry is left when
 * its roll is below its chance, and the hero takes it at once. A type without a table asks for no roll at all.
 */
export function rollDrops(
  state: PlayState,
  content: Content,
  monster: MonsterState,
  random: RandomSource,
): GameEvent[] {
  const events: GameEvent[] = [];
  for (const drop of monsterTypeOf(content, monster.type).drops) {
    if (random() < drop.chance) {
      events.push(...grantConsumable(state, drop.consumable, drop.amount));
    }
  }
  return events;
}
