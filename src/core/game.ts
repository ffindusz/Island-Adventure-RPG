import { stepMonsters } from './behaviors';
import { coolDownHero, heroStrikes } from './combat';
import { loadContent } from './content';
import type { Direction } from './geometry';
import type { Game, GameOptions } from './interface';
import { walkHero } from './movement';
import { closePage, openPage } from './pages';
import { isPaused } from './pause';
import { assignStatPoint } from './progression';
import { newPlayState, SNAPSHOT_VERSION, copyState } from './state';
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
        case 'continue':
          state = copyState(command.snapshot.state);
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
          return state.phase === 'playing' && !isPaused(state, content) ? heroStrikes(state, content) : [];
        case 'open-page':
          if (state.phase === 'playing') {
            openPage(state, content, command.page);
          }
          return [];
        case 'close-page':
          if (state.phase === 'playing') {
            closePage(state, command.page);
          }
          return [];
        case 'assign-stat-point':
          if (state.phase === 'playing') {
            assignStatPoint(state, content, command.stat);
          }
          return [];
      }
    },
    step() {
      if (state.phase !== 'playing' || isPaused(state, content)) {
        return [];
      }
      coolDownHero(state);
      walkHero(state, content, held.at(-1));
      return stepMonsters(state, content);
    },
    view: () => buildView(state, content),
    snapshot: () => {
      if (state.phase !== 'playing') {
        throw new Error('There is nothing to save at the title');
      }
      return { version: SNAPSHOT_VERSION, state: copyState(state) };
    },
  };
}
