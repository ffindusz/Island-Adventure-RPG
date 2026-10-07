import { areaOf, monsterTypeOf } from './content';
import type { Content } from './content';
import type { GameView, MonsterActionView, PageView } from './interface';
import { experienceProgress, heroAttack, heroDefense, heroLevel, heroMaxHealth, highestLevel } from './stats';
import { livingMonsters } from './state';
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
      maxHealth: heroMaxHealth(content),
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
    page: pageView(state, content),
  };
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
        maxHealth: heroMaxHealth(content),
        attack: heroAttack(content),
        defense: heroDefense(content),
      };
  }
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
