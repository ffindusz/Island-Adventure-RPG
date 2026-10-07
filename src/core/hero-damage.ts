import type { Content } from './content';
import type { GameEvent } from './interface';
import type { PlayState } from './state';

/** The hero takes damage from a monster's attack. Returns what happened, in order. */
export function hurtHero(state: PlayState, _content: Content, monsterId: string, damage: number): GameEvent[] {
  state.hero.health = Math.max(0, state.hero.health - damage);
  return [{ type: 'hero-hit', monsterId, damage, health: state.hero.health }];
}
