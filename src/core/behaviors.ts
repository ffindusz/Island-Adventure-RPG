import type { Content, MonsterType } from './content';
import { monsterTypeOf } from './content';
import { stepChaser } from './chaser';
import { stepCharger } from './charger';
import { stepGuardian } from './guardian';
import type { GameEvent } from './interface';
import { stepRanged } from './ranged';
import type { MonsterState, PlayState } from './state';
import { livingMonsters } from './state';

// Monster behaviors. A monster type names its behavior in the content, and the behavior is what the monster does in
// each fixed step. Several monster types can share one behavior, each with its own numbers.
//
// To add a behavior:
//   1. add its definition to MonsterTypeDefinition (definitions.ts) and its loaded form to MonsterType (content.ts),
//      and have loadMonsterType in content.ts convert and check the one from the other;
//   2. write a function that takes the monster, its type, the state and the content, changes the monster and the
//      hero through the state, and returns the events that happened;
//   3. add it to BEHAVIORS below. The compiler refuses a behavior that is missing from the registry.

/** What one kind of monster does in one fixed step. Returns what happened, in order. */
export type Behavior<T extends MonsterType> = (
  monster: MonsterState,
  type: T,
  state: PlayState,
  content: Content,
) => GameEvent[];

const BEHAVIORS: { readonly [B in MonsterType['behavior']]: Behavior<Extract<MonsterType, { behavior: B }>> } = {
  stationary: () => [],
  chaser: stepChaser,
  charger: stepCharger,
  ranged: stepRanged,
  guardian: stepGuardian,
};

/** Lets every living monster of the current Adventure Area act for one fixed step. Returns what happened, in order. */
export function stepMonsters(state: PlayState, content: Content): GameEvent[] {
  const events: GameEvent[] = [];
  for (const monster of livingMonsters(state)) {
    const happened = stepMonster(monster, monsterTypeOf(content, monster.type), state, content);
    events.push(...happened);
    if (happened.some((event) => event.type === 'hero-defeated')) {
      // The hero is back at its return point and the monsters are new ones: the rest of this list is out of date.
      break;
    }
  }
  return events;
}

function stepMonster(monster: MonsterState, type: MonsterType, state: PlayState, content: Content): GameEvent[] {
  // The registry is keyed by behavior, so the entry for this type's behavior is made for exactly this kind of type.
  const behavior = BEHAVIORS[type.behavior] as Behavior<MonsterType>;
  return behavior(monster, type, state, content);
}
