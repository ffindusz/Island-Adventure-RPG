import { areaOf, monsterTypeOf } from './content';
import type { Content, Interactable } from './content';
import { STAT_IDS } from './definitions';
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
    hero: {
      position: { x: state.hero.position.x, y: state.hero.position.y },
      size: content.hero.size,
      facing: state.hero.facing,
      health: state.hero.health,
      maxHealth: heroMaxHealth(state, content),
      activeWeapon: state.hero.activeWeapon,
    },
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
    interactables: area.interactables.map((interactable) => interactableView(interactable, state)),
    page: pageView(state, content),
    levelUp: levelUpView(state, content),
  };
}

function interactableView(interactable: Interactable, state: PlayState): InteractableView {
  switch (interactable.kind) {
    case 'chest':
      return {
        kind: 'chest',
        id: interactable.id,
        position: centerOfBox(interactable.body),
        size: interactable.body.maxX - interactable.body.minX,
        opened: interactableStateOf(state, interactable.id).opened,
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
        attack: heroAttack(state, content),
        defense: heroDefense(state, content),
      };
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
    case 'idle':
    case 'chasing':
    case 'recovering':
      return { type: action.type };
  }
}
