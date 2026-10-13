import { ageAreaText, crossExits, dismissAreaText, enterArea } from './areas';
import { flyArrows } from './arrows';
import { revealAroundHero } from './automap';
import { stepMonsters } from './behaviors';
import { coolDownHero } from './combat';
import { activateCheckpoints, touchedCheckpoints } from './checkpoints';
import { loadContent } from './content';
import { cancelDeparture, sailHome } from './departure';
import { collectKeys } from './devices';
import { equipGear } from './gear';
import type { Direction } from './geometry';
import { heroInteracts } from './interactables';
import type { Game, GameEvent, GameOptions } from './interface';
import { reachMilestones } from './milestones';
import { walkHero } from './movement';
import { closePage, openPage, togglePage } from './pages';
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
        case 'new-game': {
          state = newPlayState(content);
          held = [];
          revealAroundHero(state, content);
          const opening: GameEvent[] = content.opening === null ? [] : [{ type: 'opening', lines: content.opening }];
          return [...opening, ...enterArea(state, content)];
        }
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
          return state.phase === 'playing' ? openPage(state, content, command.page) : [];
        case 'close-page':
          return state.phase === 'playing' ? closePage(state, command.page) : [];
        case 'toggle-page':
          return state.phase === 'playing' ? togglePage(state, content, command.page) : [];
        case 'assign-stat-point':
          return state.phase === 'playing' ? assignStatPoint(state, content, command.stat) : [];
        case 'equip':
          return state.phase === 'playing' ? equipGear(state, content, command.gearId) : [];
        case 'use-healing-potion':
          return state.phase === 'playing' ? useHealingPotion(state, content) : [];
        case 'switch-weapon':
          return state.phase === 'playing' && !isPaused(state, content) ? switchWeapon(state) : [];
        case 'cancel-departure':
          if (state.phase === 'playing') {
            cancelDeparture(state);
          }
          return [];
        case 'confirm-departure': {
          if (state.phase !== 'playing' || state.departure === null) {
            return [];
          }
          // The game is over: it is at the title, as it was before the first new game.
          const events = sailHome(content);
          state = { phase: 'title' };
          return events;
        }
        case 'dismiss-area-text':
          if (state.phase === 'playing') {
            dismissAreaText(state);
          }
          return [];
      }
    },
    step() {
      if (state.phase !== 'playing' || isPaused(state, content)) {
        return [];
      }
      ageAreaText(state);
      coolDownHero(state);
      const touchedBefore = touchedCheckpoints(state, content);
      walkHero(state, content, held.at(-1));
      revealAroundHero(state, content);
      // The hero is where it walked to when it reaches a milestone, takes a pickup or comes onto a Checkpoint: the
      // pickups come first, so that a Checkpoint is activated with them taken. Then the arrows fly, a hero that
      // walked into an exit goes through it, and otherwise the monsters act.
      const milestoneEvents = reachMilestones(state, content);
      const pickupEvents = [...collectPickups(state, content), ...collectKeys(state, content)];
      const checkpointEvents = activateCheckpoints(state, content, touchedBefore);
      const arrowEvents = flyArrows(state, content, options.random);
      if (arrowEvents.some((event) => event.type === 'hero-defeated')) {
        // A projectile defeated the hero: the step ends there, as it does when a monster's hit does. The monsters are new
        // ones, and they first act in the next step. A Checkpoint the hero came onto in this step was activated before
        // the hit, and the hero is back on it.
        return [...milestoneEvents, ...pickupEvents, ...checkpointEvents, ...arrowEvents];
      }
      // The step ends when the hero crosses: the arrows have flown their last in the area it leaves, and the
      // monsters of the area it arrives in first act in the next step.
      const areaEvents = crossExits(state, content);
      if (areaEvents.length > 0) {
        // The hero is on the entrance, and a Checkpoint there is activated though the hero did not walk onto it.
        const arrivalEvents = activateCheckpoints(state, content, []);
        return [...milestoneEvents, ...pickupEvents, ...checkpointEvents, ...arrowEvents, ...areaEvents, ...arrivalEvents];
      }
      const monsterEvents = stepMonsters(state, content);
      return [...milestoneEvents, ...pickupEvents, ...checkpointEvents, ...arrowEvents, ...monsterEvents];
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
