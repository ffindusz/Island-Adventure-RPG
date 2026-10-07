import { flyArrows } from './arrows';
import { stepMonsters } from './behaviors';
import { coolDownHero } from './combat';
import { loadContent } from './content';
import { equipGear } from './gear';
import type { Direction } from './geometry';
import { heroInteracts } from './interactables';
import type { Game, GameOptions } from './interface';
import { reachMilestones } from './milestones';
import { walkHero } from './movement';
import { closePage, openPage } from './pages';
import { isPaused } from './pause';
import { collectPickups } from './pickups';
import { useHealingPotion } from './potions';
import { assignStatPoint } from './progression';
import { newPlayState, SNAPSHOT_VERSION, copyState } from './state';
import type { GameState } from './state';
import { buildView } from './view';
import { heroAttacks, switchWeapon } from './weapons';

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
          return state.phase === 'playing' && !isPaused(state, content)
            ? heroAttacks(state, content, options.random)
            : [];
        case 'interact':
          return state.phase === 'playing' && !isPaused(state, content) ? heroInteracts(state, content) : [];
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
        case 'equip':
          return state.phase === 'playing' ? equipGear(state, content, command.gearId) : [];
        case 'use-healing-potion':
          return state.phase === 'playing' ? useHealingPotion(state, content) : [];
        case 'switch-weapon':
          return state.phase === 'playing' && !isPaused(state, content) ? switchWeapon(state) : [];
      }
    },
    step() {
      if (state.phase !== 'playing' || isPaused(state, content)) {
        return [];
      }
      coolDownHero(state);
      walkHero(state, content, held.at(-1));
      // The hero is where it walked to when it reaches a milestone or takes a pickup. Then the arrows fly, and then the
      // monsters act.
      const milestoneEvents = reachMilestones(state, content);
      const pickupEvents = collectPickups(state, content);
      const arrowEvents = flyArrows(state, content, options.random);
      const monsterEvents = stepMonsters(state, content);
      if (monsterEvents.some((event) => event.type === 'hero-defeated')) {
        // Defeat sends the hero back and the monsters back to where they began: the arrows of that life do not fly on.
        state.arrows = [];
      }
      return [...milestoneEvents, ...pickupEvents, ...arrowEvents, ...monsterEvents];
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
