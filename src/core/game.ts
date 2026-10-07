import { heroStrikes } from './combat';
import { loadContent } from './content';
import type { Direction } from './geometry';
import type { Game, GameOptions } from './interface';
import { walkHero } from './movement';
import { newPlayState } from './state';
import type { GameState } from './state';
import { buildView } from './view';

export function createGame(options: GameOptions): Game {
  const content = loadContent(options.content);
  let state: GameState = { phase: 'title' };
  // Direction keys that are down, the latest pressed last. Input, not game state: it is never saved.
  let held: Direction[] = [];

  return {
    send(command) {
      switch (command.type) {
        case 'new-game':
          state = newPlayState(content);
          held = [];
          return [];
        case 'move':
          held = [...held.filter((direction) => direction !== command.direction), command.direction];
          if (state.phase === 'playing') {
            state.hero.facing = command.direction;
          }
          return [];
        case 'stop':
          held = held.filter((direction) => direction !== command.direction);
          if (state.phase === 'playing') {
            state.hero.facing = held.at(-1) ?? state.hero.facing;
          }
          return [];
        case 'attack':
          return state.phase === 'playing' ? heroStrikes(state, content) : [];
        default:
          return [];
      }
    },
    step() {
      if (state.phase === 'playing') {
        walkHero(state, content, held.at(-1));
      }
      return [];
    },
    view: () => buildView(state, content),
    snapshot: () => {
      throw new Error('There is nothing to save at the title');
    },
  };
}
