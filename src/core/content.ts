import type {
  AreaDefinition,
  ContentDefinition,
  MeleeWeaponDefinition,
  MonsterPlacement,
  MonsterTypeDefinition,
} from './definitions';
import type { Tile } from './geometry';
import { msToSteps, STEPS_PER_SECOND } from './time';

// Content as the rules use it: checked once when the game is created, with the lookups prepared and
// durations and speeds converted to fixed steps. This is where new kinds of content get validated.

export interface Area {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** The kind of terrain on each tile, indexed [row][col]. */
  readonly terrain: readonly (readonly string[])[];
  /** Whether each tile is solid, indexed [row][col]. */
  readonly solid: readonly (readonly boolean[])[];
  readonly monsters: readonly MonsterPlacement[];
}

export interface Content {
  readonly hero: {
    readonly size: number;
    /** Tiles walked in one fixed step. */
    readonly speedPerStep: number;
    readonly attack: number;
    readonly attackCooldownSteps: number;
    readonly meleeWeapon: MeleeWeaponDefinition;
  };
  readonly monsterTypes: Readonly<Record<string, MonsterTypeDefinition>>;
  readonly areas: Readonly<Record<string, Area>>;
  readonly start: { readonly areaId: string; readonly tile: Tile };
}

/** Throws an Error that says what is wrong when the definition does not make sense. */
export function loadContent(definition: ContentDefinition): Content {
  const areas: Record<string, Area> = {};
  const monsterIds = new Set<string>();
  for (const area of definition.areas) {
    if (areas[area.id] !== undefined) {
      throw new Error(`Area id "${area.id}" is used more than once`);
    }
    areas[area.id] = loadArea(area, definition, monsterIds);
  }
  if (areas[definition.start.area] === undefined) {
    throw new Error(`The start is in unknown area "${definition.start.area}"`);
  }
  return {
    hero: {
      size: definition.hero.size,
      speedPerStep: definition.hero.speedTilesPerSecond / STEPS_PER_SECOND,
      attack: definition.hero.attack,
      attackCooldownSteps: msToSteps(definition.hero.attackCooldownMs),
      meleeWeapon: definition.hero.meleeWeapon,
    },
    monsterTypes: definition.monsterTypes,
    areas,
    start: { areaId: definition.start.area, tile: definition.start.tile },
  };
}

function loadArea(area: AreaDefinition, definition: ContentDefinition, monsterIds: Set<string>): Area {
  const firstRowWidth = Array.from(area.layout[0] ?? '').length;
  const tiles = area.layout.map((row, rowIndex) => {
    const symbols = Array.from(row);
    if (symbols.length !== firstRowWidth) {
      throw new Error(
        `Area "${area.id}": row ${rowIndex} is ${symbols.length} tiles wide, but the first row is ${firstRowWidth} tiles wide`,
      );
    }
    return symbols.map((symbol) => {
      const terrain = definition.terrain[symbol];
      if (terrain === undefined) {
        throw new Error(
          `Area "${area.id}": row ${rowIndex} uses terrain symbol "${symbol}", which the legend does not define`,
        );
      }
      return terrain;
    });
  });
  for (const monster of area.monsters) {
    if (definition.monsterTypes[monster.type] === undefined) {
      throw new Error(`Area "${area.id}": monster "${monster.id}" has unknown type "${monster.type}"`);
    }
    if (monsterIds.has(monster.id)) {
      throw new Error(`Monster id "${monster.id}" is used more than once`);
    }
    monsterIds.add(monster.id);
  }
  return {
    id: area.id,
    name: area.name,
    width: tiles[0]?.length ?? 0,
    height: tiles.length,
    terrain: tiles.map((row) => row.map((terrain) => terrain.kind)),
    solid: tiles.map((row) => row.map((terrain) => terrain.solid)),
    monsters: area.monsters,
  };
}

/** These lookups cannot fail for content that loaded; they fail loudly for a snapshot that does not fit it. */
export function areaOf(content: Content, areaId: string): Area {
  const area = content.areas[areaId];
  if (area === undefined) {
    throw new Error(`Unknown area "${areaId}"`);
  }
  return area;
}

export function monsterTypeOf(content: Content, type: string): MonsterTypeDefinition {
  const found = content.monsterTypes[type];
  if (found === undefined) {
    throw new Error(`Unknown monster type "${type}"`);
  }
  return found;
}
