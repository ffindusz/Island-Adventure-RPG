import { arrowSizeOf } from './arrows';
import { areaOf, monsterTypeOf } from './content';
import type { Content, Interactable } from './content';
import { automapPage } from './automap';
import { isActive } from './checkpoints';
import { STAT_IDS } from './definitions';
import { heldKeys } from './devices';
import { carriedGear } from './gear';
import { centerOfBox } from './geometry';
import type { GameView, InteractableView, LevelUpView, MonsterActionView, PageView } from './interface';
import {
  experienceProgress,
  heroAttack,
  heroDefense,
  heroLevel,
  heroMaxHealth,
  heroStat,
  highestLevel,
  unassignedStatPoints,
} from './stats';
import { interactableStateOf, livingMonsters } from './state';
import type { GameState, MonsterAction, PlayState } from './state';

/** Builds a fresh view of the state. Only the terrain grid is shared, because it never changes. */
export function buildView(state: GameState, content: Content): GameView {
  if (state.phase === 'title') {
    return { phase: 'title' };
  }
  const area = areaOf(content, state.areaId);
  return {
    phase: 'playing',
    area: { id: area.id, name: area.name, width: area.width, height: area.height, terrain: area.terrain },
    exits: area.exits.map((exit) => ({ id: exit.id, zone: { ...exit.zone } })),
    checkpoints: area.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      position: centerOfBox(checkpoint.body),
      size: checkpoint.body.maxX - checkpoint.body.minX,
      active: isActive(state, area.id, checkpoint),
    })),
    areaText: state.areaText?.text ?? null,
    hero: {
      position: { x: state.hero.position.x, y: state.hero.position.y },
      size: content.hero.size,
      facing: state.hero.facing,
      health: state.hero.health,
      maxHealth: heroMaxHealth(state, content),
      activeWeapon: state.hero.activeWeapon,
      consumables: { ...state.hero.consumables },
    },
    progress: { level: heroLevel(state, content), experience: experienceProgress(state, content) ?? null },
    monsters: livingMonsters(state).map((monster) => {
      const type = monsterTypeOf(content, monster.type);
      return {
        id: monster.id,
        type: monster.type,
        position: { x: monster.position.x, y: monster.position.y },
        size: type.size,
        health: monster.health,
        maxHealth: type.health,
        action: actionView(monster.action),
      };
    }),
    arrows: state.arrows
      .filter((arrow) => arrow.areaId === state.areaId)
      .map((arrow) => ({
        position: { x: arrow.position.x, y: arrow.position.y },
        direction: arrow.direction,
        size: arrowSizeOf(arrow, content),
        shooter: arrow.shotBy === undefined ? 'hero' : 'monster',
      })),
    interactables: area.interactables.flatMap((interactable) => interactableView(interactable, state) ?? []),
    page: pageView(state, content),
    levelUp: levelUpView(state, content),
  };
}

/** What shows an interactable: nothing for a pickup or a key the hero has taken, since it no longer lies there. */
function interactableView(interactable: Interactable, state: PlayState): InteractableView | null {
  switch (interactable.kind) {
    case 'chest':
      return {
        kind: 'chest',
        id: interactable.id,
        position: centerOfBox(interactable.body),
        size: interactable.body.maxX - interactable.body.minX,
        opened: interactableStateOf(state, interactable).opened,
        holds: interactable.contents.kind === 'gear' ? 'gear' : interactable.contents.consumable,
      };
    case 'pickup':
      return interactableStateOf(state, interactable).collected
        ? null
        : {
            kind: 'pickup',
            id: interactable.id,
            position: centerOfBox(interactable.body),
            size: interactable.body.maxX - interactable.body.minX,
            consumable: interactable.consumable,
          };
    case 'key':
      return interactableStateOf(state, interactable).collected
        ? null
        : {
            kind: 'key',
            id: interactable.id,
            position: centerOfBox(interactable.body),
            size: interactable.body.maxX - interactable.body.minX,
          };
    case 'door':
      return {
        kind: 'door',
        id: interactable.id,
        position: centerOfBox(interactable.body),
        size: interactable.body.maxX - interactable.body.minX,
        open: interactableStateOf(state, interactable).open,
      };
    case 'gate':
      return {
        kind: 'gate',
        id: interactable.id,
        position: centerOfBox(interactable.body),
        size: interactable.body.maxX - interactable.body.minX,
        open: interactableStateOf(state, interactable).open,
      };
    case 'lever':
      return {
        kind: 'lever',
        id: interactable.id,
        position: centerOfBox(interactable.body),
        size: interactable.body.maxX - interactable.body.minX,
        pulled: interactableStateOf(state, interactable).pulled,
      };
    case 'sign':
      return {
        kind: 'sign',
        id: interactable.id,
        position: centerOfBox(interactable.body),
        size: interactable.body.maxX - interactable.body.minX,
      };
    case 'vessel':
      return {
        kind: 'vessel',
        id: interactable.id,
        position: centerOfBox(interactable.body),
        size: interactable.body.maxX - interactable.body.minX,
        prepared: interactableStateOf(state, interactable).prepared,
      };
  }
}

function pageView(state: PlayState, content: Content): PageView | null {
  switch (state.page) {
    case null:
      return null;
    case 'stats':
      return {
        id: 'stats',
        level: heroLevel(state, content),
        maxLevel: highestLevel(content),
        experience: experienceProgress(state, content) ?? null,
        health: state.hero.health,
        maxHealth: heroMaxHealth(state, content),
        attack: heroAttack(state, content),
        defense: heroDefense(state, content),
      };
    case 'inventory':
      return {
        id: 'inventory',
        gear: carriedGear(state, content),
        consumables: { ...state.hero.consumables },
        keys: heldKeys(state, content),
        attack: heroAttack(state, content),
        defense: heroDefense(state, content),
      };
    case 'automap':
      return automapPage(state, content);
  }
}

function levelUpView(state: PlayState, content: Content): LevelUpView | null {
  const points = unassignedStatPoints(state, content);
  if (points === 0) {
    return null;
  }
  return {
    level: heroLevel(state, content) - points + 1,
    points,
    options: STAT_IDS.map((stat) => ({
      stat,
      value: heroStat(state, content, stat),
      gain: content.progression.statPointValue[stat],
    })),
  };
}

function actionView(action: MonsterAction): MonsterActionView {
  switch (action.type) {
    case 'winding-up':
      return { type: 'winding-up', progress: action.elapsed / action.length, zone: { ...action.zone } };
    case 'dashing':
      return { type: 'dashing', direction: action.direction };
    case 'idle':
    case 'chasing':
    case 'recovering':
      return { type: action.type };
  }
}
