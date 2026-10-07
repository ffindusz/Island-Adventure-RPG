import { STAT_IDS } from './definitions';
import type {
  AreaDefinition,
  ChaserMonsterDefinition,
  ContentDefinition,
  GearDefinition,
  GearSlot,
  MeleeWeaponDefinition,
  MilestoneDefinition,
  MilestoneReward,
  MonsterPlacement,
  MonsterTypeDefinition,
  ProgressionDefinition,
  StationaryMonsterDefinition,
  TileRect,
} from './definitions';
import type { Box, Tile } from './geometry';
import { msToSteps, STEP_MS, STEPS_PER_SECOND } from './time';

// Content as the rules use it: checked once when the game is created, with the lookups prepared and
// durations and speeds converted to fixed steps. This is where new kinds of content get validated.

/** Used when the content does not set a minimum damage: a hit always takes at least 1 Health. */
const DEFAULT_MINIMUM_DAMAGE = 1;

/** A milestone as the rules use it: its zone is a box in tile units, like the bodies it is compared with. */
export interface Milestone {
  readonly id: string;
  readonly zone: Box;
  readonly reward: MilestoneReward;
}

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
  readonly milestones: readonly Milestone[];
}

export type StationaryMonsterType = StationaryMonsterDefinition;

export interface ChaserMonsterType {
  readonly behavior: 'chaser';
  readonly health: number;
  readonly size: number;
  readonly experience: number;
  readonly damage: number;
  /** Tiles walked in one fixed step. */
  readonly speedPerStep: number;
  readonly noticingDistance: number;
  readonly reach: number;
  readonly windUpSteps: number;
  readonly recoverySteps: number;
}

/** A monster type as the rules use it, one member for each behavior. */
export type MonsterType = StationaryMonsterType | ChaserMonsterType;

export interface Content {
  readonly hero: {
    readonly size: number;
    /** Tiles walked in one fixed step. */
    readonly speedPerStep: number;
    readonly health: number;
    readonly defense: number;
    readonly attack: number;
    readonly attackCooldownSteps: number;
    readonly meleeWeapon: MeleeWeaponDefinition;
    readonly startingGear: Readonly<Partial<Record<GearSlot, string>>>;
  };
  readonly progression: ProgressionDefinition;
  /** The least damage a hit does to the hero, however high its Defense. */
  readonly minimumDamage: number;
  readonly gear: Readonly<Record<string, GearDefinition>>;
  readonly monsterTypes: Readonly<Record<string, MonsterType>>;
  readonly areas: Readonly<Record<string, Area>>;
  readonly start: { readonly areaId: string; readonly tile: Tile };
}

/** Throws an Error that says what is wrong when the definition does not make sense. */
export function loadContent(definition: ContentDefinition): Content {
  requireMoreThanZero("The hero's health", definition.hero.health);
  requireZeroOrMore("The hero's defense", definition.hero.defense);
  const minimumDamage = definition.minimumDamage ?? DEFAULT_MINIMUM_DAMAGE;
  requireZeroOrMore('The minimum damage', minimumDamage);
  const progression = loadProgression(definition.progression);
  const monsterTypes: Record<string, MonsterType> = {};
  for (const [name, monsterType] of Object.entries(definition.monsterTypes)) {
    monsterTypes[name] = loadMonsterType(name, monsterType);
  }
  const areas: Record<string, Area> = {};
  const usedIds = { monsters: new Set<string>(), milestones: new Set<string>() };
  for (const area of definition.areas) {
    if (areas[area.id] !== undefined) {
      throw new Error(`Area id "${area.id}" is used more than once`);
    }
    areas[area.id] = loadArea(area, definition, usedIds);
  }
  const startArea = areas[definition.start.area];
  if (startArea === undefined) {
    throw new Error(`The start is in unknown area "${definition.start.area}"`);
  }
  if (isSolid(startArea, definition.start.tile)) {
    throw new Error(
      `The start tile ${describeTile(definition.start.tile)} of area "${startArea.id}" is ${NOT_WALKABLE}`,
    );
  }
  return {
    hero: {
      size: definition.hero.size,
      speedPerStep: definition.hero.speedTilesPerSecond / STEPS_PER_SECOND,
      health: definition.hero.health,
      defense: definition.hero.defense,
      attack: definition.hero.attack,
      attackCooldownSteps: msToSteps(definition.hero.attackCooldownMs),
      meleeWeapon: definition.hero.meleeWeapon,
      startingGear: { ...definition.hero.startingGear },
    },
    progression,
    minimumDamage,
    gear: { ...definition.gear },
    monsterTypes,
    areas,
    start: { areaId: definition.start.area, tile: definition.start.tile },
  };
}

function loadProgression(definition: ProgressionDefinition): ProgressionDefinition {
  const { levelThresholds } = definition;
  if (levelThresholds.length === 0) {
    throw new Error('The Level thresholds must give the Experience for at least Level 2');
  }
  levelThresholds.forEach((experience, index) => {
    const level = index + 2;
    const before = levelThresholds[index - 1];
    if (before === undefined) {
      requireMoreThanZero(`The Experience for Level ${level}`, experience);
    } else if (!(experience > before)) {
      throw new Error(
        `The Experience for Level ${level} must be more than the ${before} of Level ${level - 1}, but it is ${experience}`,
      );
    }
  });
  for (const stat of STAT_IDS) {
    requireMoreThanZero(`The value of a Stat Point in ${stat}`, definition.statPointValue[stat]);
  }
  const { health, attack, defense } = definition.statPointValue;
  return { levelThresholds: [...levelThresholds], statPointValue: { health, attack, defense } };
}

function loadMonsterType(name: string, definition: MonsterTypeDefinition): MonsterType {
  requireZeroOrMore(`Monster type "${name}": experience`, definition.experience);
  switch (definition.behavior) {
    case 'stationary':
      return {
        behavior: 'stationary',
        health: definition.health,
        size: definition.size,
        experience: definition.experience,
      };
    case 'chaser':
      return loadChaser(name, definition);
    default:
      return refuseBehavior(name, definition);
  }
}

/** Only content that got past the compiler gets here. Its parameter type makes a behavior without a case a compile error. */
function refuseBehavior(name: string, definition: never): never {
  const { behavior } = definition as { behavior?: unknown };
  throw new Error(`Monster type "${name}" has unknown behavior "${String(behavior)}"`);
}

function loadChaser(name: string, definition: ChaserMonsterDefinition): ChaserMonsterType {
  const field = (fieldName: string) => `Monster type "${name}": ${fieldName}`;
  requireMoreThanZero(field('damage'), definition.damage);
  requireZeroOrMore(field('speedTilesPerSecond'), definition.speedTilesPerSecond);
  requireZeroOrMore(field('noticingDistance'), definition.noticingDistance);
  requireMoreThanZero(field('reach'), definition.reach);
  requireZeroOrMore(field('recoveryMs'), definition.recoveryMs);
  if (!(definition.windUpMs >= STEP_MS)) {
    throw new Error(
      `${field('windUpMs')} must be at least one fixed step (${STEP_MS.toFixed(1)} ms), but it is ${definition.windUpMs}`,
    );
  }
  return {
    behavior: 'chaser',
    health: definition.health,
    size: definition.size,
    experience: definition.experience,
    damage: definition.damage,
    speedPerStep: definition.speedTilesPerSecond / STEPS_PER_SECOND,
    noticingDistance: definition.noticingDistance,
    reach: definition.reach,
    windUpSteps: msToSteps(definition.windUpMs),
    recoverySteps: msToSteps(definition.recoveryMs),
  };
}

// These also refuse NaN, which no comparison with a number is true for.
function requireMoreThanZero(what: string, value: number): void {
  if (!(value > 0)) {
    throw new Error(`${what} must be more than 0, but it is ${value}`);
  }
}

function requireZeroOrMore(what: string, value: number): void {
  if (!(value >= 0)) {
    throw new Error(`${what} must be 0 or more, but it is ${value}`);
  }
}

/** The ids used so far, which are unique across all Adventure Areas. */
interface UsedIds {
  readonly monsters: Set<string>;
  readonly milestones: Set<string>;
}

function loadArea(area: AreaDefinition, definition: ContentDefinition, usedIds: UsedIds): Area {
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
  const width = tiles[0]?.length ?? 0;
  const height = tiles.length;
  const loaded: Area = {
    id: area.id,
    name: area.name,
    width,
    height,
    terrain: tiles.map((row) => row.map((terrain) => terrain.kind)),
    solid: tiles.map((row) => row.map((terrain) => terrain.solid)),
    monsters: area.monsters,
    milestones: (area.milestones ?? []).map((milestone) => loadMilestone(area.id, milestone, width, height, usedIds)),
  };
  for (const monster of area.monsters) {
    if (definition.monsterTypes[monster.type] === undefined) {
      throw new Error(`Area "${area.id}": monster "${monster.id}" has unknown type "${monster.type}"`);
    }
    if (usedIds.monsters.has(monster.id)) {
      throw new Error(`Monster id "${monster.id}" is used more than once`);
    }
    if (isSolid(loaded, monster.tile)) {
      throw new Error(
        `Area "${area.id}": monster "${monster.id}" is placed at ${describeTile(monster.tile)}, which is ${NOT_WALKABLE}`,
      );
    }
    usedIds.monsters.add(monster.id);
  }
  return loaded;
}

/** `width` and `height` are the size of the map of the Adventure Area, in tiles. */
function loadMilestone(
  areaId: string,
  milestone: MilestoneDefinition,
  width: number,
  height: number,
  usedIds: UsedIds,
): Milestone {
  if (usedIds.milestones.has(milestone.id)) {
    throw new Error(`Milestone id "${milestone.id}" is used more than once`);
  }
  usedIds.milestones.add(milestone.id);
  const { zone } = milestone;
  const what = `Area "${areaId}": the zone of milestone "${milestone.id}" ${describeZone(zone)}`;
  if (![zone.col, zone.row, zone.width, zone.height].every(Number.isInteger) || zone.width < 1 || zone.height < 1) {
    throw new Error(`${what} must be whole tiles, at least one wide and one high`);
  }
  if (zone.col < 0 || zone.row < 0 || zone.col + zone.width > width || zone.row + zone.height > height) {
    throw new Error(`${what} reaches outside the map`);
  }
  requireZeroOrMore(`Milestone "${milestone.id}": experience`, milestone.reward.experience);
  return {
    id: milestone.id,
    zone: { minX: zone.col, minY: zone.row, maxX: zone.col + zone.width, maxY: zone.row + zone.height },
    reward: milestone.reward,
  };
}

function describeZone(zone: TileRect): string {
  return `(col ${zone.col}, row ${zone.row}, ${zone.width} wide, ${zone.height} high)`;
}

const NOT_WALKABLE = 'solid terrain or outside the map';

function describeTile(tile: Tile): string {
  return `(col ${tile.col}, row ${tile.row})`;
}

/** Whether a tile blocks movement. Tiles beyond the map count as solid. */
export function isSolid(area: Area, tile: Tile): boolean {
  return area.solid[tile.row]?.[tile.col] ?? true;
}

/** These lookups cannot fail for content that loaded; they fail loudly for a snapshot that does not fit it. */
export function areaOf(content: Content, areaId: string): Area {
  const area = content.areas[areaId];
  if (area === undefined) {
    throw new Error(`Unknown area "${areaId}"`);
  }
  return area;
}

export function monsterTypeOf(content: Content, type: string): MonsterType {
  const found = content.monsterTypes[type];
  if (found === undefined) {
    throw new Error(`Unknown monster type "${type}"`);
  }
  return found;
}

export function gearOf(content: Content, id: string): GearDefinition {
  const found = content.gear[id];
  if (found === undefined) {
    throw new Error(`Unknown Gear "${id}"`);
  }
  return found;
}
