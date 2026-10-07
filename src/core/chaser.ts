import type { Content, ChaserMonsterType } from './content';
import { expandBox, overlaps } from './geometry';
import type { GameEvent } from './interface';
import { heroBody, monsterBody } from './state';
import type { MonsterState, PlayState } from './state';

// The chaser: notices the hero, walks up to it, winds up a telegraphed attack and strikes.

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
    return [];
  }
  const zone = expandBox(monsterBody(monster, content), type.reach);
  if (overlaps(heroBody(state, content), zone)) {
    monster.action = { type: 'winding-up', zone, elapsed: 0, length: type.windUpSteps };
  }
  return [];
}
