import type { Content } from './content';
import type { GameEvent } from './interface';
import type { PlayState } from './state';
import { heroDefense } from './stats';

/** The hero takes a hit of `damage` before Defense. Returns what happened, in order. */
export function hurtHero(state: PlayState, content: Content, monsterId: string, damage: number): GameEvent[] {
  const received = Math.max(content.minimumDamage, damage - heroDefense(content));
  state.hero.health = Math.max(0, state.hero.health - received);
  return [{ type: 'hero-hit', monsterId, damage: received, health: state.hero.health }];
}
