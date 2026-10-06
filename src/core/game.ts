import { loadContent } from './content';
import type { Game, GameOptions } from './interface';
import { newPlayState } from './state';
import type { GameState } from './state';
import { buildView } from './view';

export function createGame(options: GameOptions): Game {
  const content = loadContent(options.content);
  let state: GameState = { phase: 'title' };

  return {
    send(command) {
      switch (command.type) {
        case 'new-game':
          state = newPlayState(content);
          return [];
        default:
          return [];
      }
    },
    step: () => [],
    view: () => buildView(state, content),
    snapshot: () => {
      throw new Error('There is nothing to save at the title');
    },
  };
}
