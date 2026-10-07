import { areaOf } from './content';
import type { Area, Content } from './content';
import type { AutomapAreaView, AutomapPageView } from './interface';
import { areaStateOf } from './state';
import type { PlayState } from './state';

// The Automap: what the hero has explored of each Adventure Area. Exploring is recording. Wherever the hero is put or
// walks to, the terrain within the reveal distance of its tile is revealed, and revealed terrain stays revealed: the
// record is kept per area in the state, and neither defeat nor leaving an area takes anything from it.

/**
 * Reveals the terrain around the hero: every tile of its Adventure Area whose middle is within the reveal distance of
 * the middle of the hero's tile. Nothing blocks the view, so walls and water are revealed like ground.
 */
export function revealAroundHero(state: PlayState, content: Content): void {
  const area = areaOf(content, state.areaId);
  const revealed = areaStateOf(state, area.id).revealed;
  const distance = content.automapRevealDistance;
  const heroCol = Math.floor(state.hero.position.x);
  const heroRow = Math.floor(state.hero.position.y);
  const reach = Math.floor(distance);
  for (let row = Math.max(0, heroRow - reach); row <= Math.min(area.height - 1, heroRow + reach); row++) {
    const line = revealed[row];
    if (line === undefined) {
      continue;
    }
    for (let col = Math.max(0, heroCol - reach); col <= Math.min(area.width - 1, heroCol + reach); col++) {
      if ((col - heroCol) ** 2 + (row - heroRow) ** 2 <= distance ** 2) {
        line[col] = true;
      }
    }
  }
}

/** The Automap page: every Adventure Area of the content, in order, with the terrain the hero has revealed of each. */
export function automapPage(state: PlayState, content: Content): AutomapPageView {
  return {
    id: 'automap',
    areas: Object.values(content.areas).map((area) => automapArea(state, area)),
  };
}

function automapArea(state: PlayState, area: Area): AutomapAreaView {
  const revealed = areaStateOf(state, area.id).revealed;
  const terrain = area.terrain.map((line, row) =>
    line.map((kind, col) => (revealed[row]?.[col] === true ? kind : null)),
  );
  const discovered = terrain.some((line) => line.some((kind) => kind !== null));
  return {
    id: area.id,
    name: discovered ? area.name : null,
    width: area.width,
    height: area.height,
    current: area.id === state.areaId,
    discovered,
    hero: area.id === state.areaId ? { ...state.hero.position } : null,
    terrain,
  };
}
