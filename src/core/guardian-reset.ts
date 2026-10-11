import { areaOf } from './content';
import type { Area, Content } from './content';
import { monsterTypeOf } from './monster-content';
import { freshMonster } from './state';
import type { MonsterState, PlayState } from './state';

// A Guardian is fought once and never renewed like the ordinary monsters. One that has not fallen is put back as the
// content places it whenever the hero is defeated or leaves its Adventure Area, so every try begins from the start. One
// that has fallen stays fallen, and so does the gate that its fall opened.

function isGuardian(monster: MonsterState, content: Content): boolean {
  return monsterTypeOf(content, monster.type).behavior === 'guardian';
}

/**
 * The monsters of `area` after the hero's defeat: every ordinary monster is a new one, as the content places it, and every
 * Guardian is as it is, which is for `resetGuardians` to put back when it has not fallen.
 */
export function renewedMonsters(area: Area, monsters: readonly MonsterState[], content: Content): MonsterState[] {
  return area.monsters.map((placement) => {
    const before = monsters.find((monster) => monster.id === placement.id);
    return before !== undefined && isGuardian(before, content) ? before : freshMonster(placement, content);
  });
}

/**
 * Puts every Guardian that has not fallen back as the content places it: full Health, its starting tile, doing nothing,
 * at its first pattern. It does so in every Adventure Area, whichever the hero is in.
 */
export function resetGuardians(state: PlayState, content: Content): void {
  for (const [areaId, world] of Object.entries(state.areas)) {
    const area = areaOf(content, areaId);
    world.monsters = world.monsters.map((monster) => {
      if (monster.health <= 0 || !isGuardian(monster, content)) {
        return monster;
      }
      const placement = area.monsters.find((candidate) => candidate.id === monster.id);
      if (placement === undefined) {
        throw new Error(`Area "${areaId}" places no monster "${monster.id}"`);
      }
      return freshMonster(placement, content);
    });
  }
}
