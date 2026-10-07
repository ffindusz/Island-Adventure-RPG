import { checkConnections, loadEntrances, loadExits } from './connections';
import { CONSUMABLE_IDS, GEAR_SLOTS, STAT_IDS } from './definitions';
import type {
  AreaDefinition,
  ChaserMonsterDefinition,
  ChestContents,
  ChestDefinition,
  ConsumableId,
  ContentDefinition,
  DropDefinition,
  GearDefinition,
  GearSlot,
  HealingPotionDefinition,
  InteractableDefinition,
  MeleeWeaponDefinition,
  MilestoneDefinition,
  MilestoneReward,
  MonsterPlacement,
  MonsterTypeDefinition,
  PickupDefinition,
  ProgressionDefinition,
  RangedWeaponDefinition,
} from './definitions';
import type { Box, Tile } from './geometry';
import { msToSteps, STEP_MS, STEPS_PER_SECOND } from './time';
import { zoneBox } from './zones';

// Content as the rules use it: checked once when the game is created, with the lookups prepared and
// durations and speeds converted to fixed steps. This is where new kinds of content get validated.

/** Used when the content does not set a minimum damage: a hit always takes at least 1 Health. */
const DEFAULT_MINIMUM_DAMAGE = 1;

/** Used when the content does not set how long area text stays on the screen. */
const DEFAULT_AREA_TEXT_MS = 4000;

/** A milestone as the rules use it: its zone is a box in tile units, like the bodies it is compared with. */
export interface Milestone {
  readonly id: string;
  readonly zone: Box;
  readonly reward: MilestoneReward;
}

/** A chest as the rules use it: its body is the box of the tile it fills, in tile units like the other bodies. */
export interface Chest {
  readonly kind: 'chest';
  readonly id: string;
  readonly body: Box;
  readonly contents: ChestContents;
}

/** A pickup as the rules use it: its body is the box of the tile it lies on, which the hero's body has to overlap. */
export interface Pickup {
  readonly kind: 'pickup';
  readonly id: string;
  readonly body: Box;
  readonly consumable: ConsumableId;
  readonly amount: number;
}

/** An interactable as the rules use it, one member for each kind. */
export type Interactable = Chest | Pickup;

/** An entrance as the rules use it: the hero arrives standing at the centre of its tile. */
export interface Entrance {
  readonly id: string;
  readonly tile: Tile;
}

/** An exit as the rules use it: its zone is a box in tile units, like the bodies it is compared with. */
export interface Exit {
  readonly id: string;
  readonly zone: Box;
  readonly to: { readonly areaId: string; readonly entranceId: string };
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
  readonly interactables: readonly Interactable[];
  /** Where the hero can arrive: at least one. */
  readonly entrances: readonly Entrance[];
  /** Where the hero can leave: the exits, each leading to an entrance of another area. */
  readonly exits: readonly Exit[];
  /** A short text shown the first time the hero enters, or null for none. */
  readonly text: string | null;
}

/** A stationary monster type as the rules use it. */
export interface StationaryMonsterType {
  readonly behavior: 'stationary';
  readonly health: number;
  readonly size: number;
  readonly experience: number;
  /** Never absent: a type without a drop table has an empty one. */
  readonly drops: readonly DropDefinition[];
}

export interface ChaserMonsterType {
  readonly behavior: 'chaser';
  readonly health: number;
  readonly size: number;
  readonly experience: number;
  /** Never absent: a type without a drop table has an empty one. */
  readonly drops: readonly DropDefinition[];
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

/** The hero's Ranged Weapon as the rules use it. */
export interface RangedWeapon {
  /** Tiles an arrow flies in one fixed step. */
  readonly arrowSpeedPerStep: number;
  /** Tiles an arrow flies from the hero's centre before it falls. */
  readonly range: number;
  /** Width and height of an arrow's body, in tiles. */
  readonly arrowSize: number;
}

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
    readonly rangedWeapon: RangedWeapon;
    /** Tiles beyond the hero's body, in front of it, within which it interacts. */
    readonly interactionReach: number;
    readonly startingGear: Readonly<Partial<Record<GearSlot, string>>>;
  };
  readonly progression: ProgressionDefinition;
  /** The least damage a hit does to the hero, however high its Defense. */
  readonly minimumDamage: number;
  readonly healingPotion: HealingPotionDefinition;
  readonly gear: Readonly<Record<string, GearDefinition>>;
  readonly monsterTypes: Readonly<Record<string, MonsterType>>;
  readonly areas: Readonly<Record<string, Area>>;
  /** How many fixed steps the text of an Adventure Area stays on the screen. */
  readonly areaTextSteps: number;
  readonly start: { readonly areaId: string; readonly tile: Tile };
}

/** Throws an Error that says what is wrong when the definition does not make sense. */
export function loadContent(definition: ContentDefinition): Content {
  requireMoreThanZero("The hero's health", definition.hero.health);
  requireZeroOrMore("The hero's defense", definition.hero.defense);
  requireMoreThanZero("The hero's interaction reach", definition.hero.interactionReach);
  const rangedWeapon = loadRangedWeapon(definition.hero.rangedWeapon, definition.hero.size);
  const minimumDamage = definition.minimumDamage ?? DEFAULT_MINIMUM_DAMAGE;
  requireZeroOrMore('The minimum damage', minimumDamage);
  const areaTextMs = definition.areaTextMs ?? DEFAULT_AREA_TEXT_MS;
  if (!(areaTextMs >= STEP_MS)) {
    throw new Error(
      `The area text duration must be at least one fixed step (${STEP_MS.toFixed(1)} ms), but it is ${areaTextMs}`,
    );
  }
  const progression = loadProgression(definition.progression);
  requireMoreThanZero('The Health a Healing Potion restores', definition.healingPotion.restores);
  const monsterTypes: Record<string, MonsterType> = {};
  for (const [name, monsterType] of Object.entries(definition.monsterTypes)) {
    monsterTypes[name] = loadMonsterType(name, monsterType);
  }
  const gear = loadGear(definition.gear);
  const usedIds: UsedIds = {
    monsters: new Set<string>(),
    milestones: new Set<string>(),
    interactables: new Set<string>(),
    gear: new Map<string, string>(),
  };
  const startingGear = loadStartingGear(definition.hero.startingGear, gear, usedIds);
  const areas: Record<string, Area> = {};
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
  checkConnections(areas, definition.hero.size);
  return {
    hero: {
      size: definition.hero.size,
      speedPerStep: definition.hero.speedTilesPerSecond / STEPS_PER_SECOND,
      health: definition.hero.health,
      defense: definition.hero.defense,
      attack: definition.hero.attack,
      attackCooldownSteps: msToSteps(definition.hero.attackCooldownMs),
      meleeWeapon: definition.hero.meleeWeapon,
      rangedWeapon,
      interactionReach: definition.hero.interactionReach,
      startingGear,
    },
    progression,
    minimumDamage,
    healingPotion: { restores: definition.healingPotion.restores },
    gear,
    monsterTypes,
    areas,
    areaTextSteps: msToSteps(areaTextMs),
    start: { areaId: definition.start.area, tile: definition.start.tile },
  };
}

/**
 * An arrow starts at the hero's centre, so it must fit in the hero's body, which is never inside solid terrain or a
 * chest: that is what keeps an arrow from ever starting inside something it should be stopped by.
 */
function loadRangedWeapon(definition: RangedWeaponDefinition, heroSize: number): RangedWeapon {
  requireMoreThanZero("The hero's arrow speed", definition.arrowSpeedTilesPerSecond);
  requireMoreThanZero("The hero's arrow range", definition.range);
  requireMoreThanZero("The hero's arrow size", definition.arrowSize);
  if (definition.arrowSize > heroSize) {
    throw new Error(
      `The hero's arrow size must be at most the hero's size of ${heroSize}, but it is ${definition.arrowSize}`,
    );
  }
  return {
    arrowSpeedPerStep: definition.arrowSpeedTilesPerSecond / STEPS_PER_SECOND,
    range: definition.range,
    arrowSize: definition.arrowSize,
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
  const drops = loadDrops(name, definition.drops ?? []);
  switch (definition.behavior) {
    case 'stationary':
      return {
        behavior: 'stationary',
        health: definition.health,
        size: definition.size,
        experience: definition.experience,
        drops,
      };
    case 'chaser':
      return loadChaser(name, definition, drops);
    default:
      return refuseBehavior(name, definition);
  }
}

function loadDrops(name: string, definitions: readonly DropDefinition[]): readonly DropDefinition[] {
  return definitions.map((drop, index) => {
    const field = (fieldName: string) => `Monster type "${name}": drops[${index}]${fieldName}`;
    if (!isConsumableId(drop.consumable)) {
      throw new Error(`${field('')} gives unknown consumable "${String(drop.consumable)}"`);
    }
    if (!(drop.chance >= 0 && drop.chance <= 1)) {
      throw new Error(`${field('.chance')} must be from 0 to 1, but it is ${drop.chance}`);
    }
    requireWholeNumberOfOneOrMore(field('.amount'), drop.amount);
    return { consumable: drop.consumable, chance: drop.chance, amount: drop.amount };
  });
}

/** Only content that got past the compiler gets here. Its parameter type makes a behavior without a case a compile error. */
function refuseBehavior(name: string, definition: never): never {
  const { behavior } = definition as { behavior?: unknown };
  throw new Error(`Monster type "${name}" has unknown behavior "${String(behavior)}"`);
}

function loadChaser(
  name: string,
  definition: ChaserMonsterDefinition,
  drops: readonly DropDefinition[],
): ChaserMonsterType {
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
    drops,
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

function requireWholeNumberOfOneOrMore(what: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${what} must be a whole number of 1 or more, but it is ${value}`);
  }
}

/** What has been used so far across all Adventure Areas: ids that must be unique, and who gives each piece of Gear. */
interface UsedIds {
  readonly monsters: Set<string>;
  readonly milestones: Set<string>;
  readonly interactables: Set<string>;
  /** Each piece of Gear that is given somewhere, with who gives it: the hero carries each piece at most once. */
  readonly gear: Map<string, string>;
}

function loadGear(definition: ContentDefinition['gear']): Content['gear'] {
  for (const [id, piece] of Object.entries(definition)) {
    if (!isGearSlot(piece.slot)) {
      throw new Error(`Gear "${id}" has unknown slot "${String(piece.slot)}"`);
    }
    if (piece.name.trim() === '') {
      throw new Error(`Gear "${id}" has no name`);
    }
    requireZeroOrMore(`Gear "${id}": bonus`, piece.bonus);
  }
  return { ...definition };
}

/** Content read from a file could name a slot that does not exist, and the compiler would not notice. */
function isGearSlot(slot: string): slot is GearSlot {
  return (GEAR_SLOTS as readonly string[]).includes(slot);
}

function loadStartingGear(
  startingGear: ContentDefinition['hero']['startingGear'],
  gear: Content['gear'],
  usedIds: UsedIds,
): Content['hero']['startingGear'] {
  for (const [slot, id] of Object.entries(startingGear)) {
    if (!isGearSlot(slot)) {
      throw new Error(`The hero starts with Gear for unknown slot "${slot}"`);
    }
    if (id === undefined) {
      continue;
    }
    const piece = gear[id];
    if (piece === undefined) {
      throw new Error(`The hero starts with unknown Gear "${id}"`);
    }
    if (piece.slot !== slot) {
      throw new Error(
        `The hero's starting Gear for slot "${slot}" is "${id}", which belongs in slot "${piece.slot}"`,
      );
    }
    claimGear(usedIds, id, "the hero's starting Gear");
  }
  return { ...startingGear };
}

/** Records that `giver` gives the hero the piece of Gear, and refuses a piece that something else already gives. */
function claimGear(usedIds: UsedIds, gearId: string, giver: string): void {
  const firstGiver = usedIds.gear.get(gearId);
  if (firstGiver !== undefined) {
    throw new Error(`Gear "${gearId}" is given more than once: by ${firstGiver} and by ${giver}`);
  }
  usedIds.gear.set(gearId, giver);
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
  const isWalkable = (tile: Tile) => tiles[tile.row]?.[tile.col]?.solid === false;
  const loaded: Omit<Area, 'interactables'> = {
    id: area.id,
    name: area.name,
    width,
    height,
    terrain: tiles.map((row) => row.map((terrain) => terrain.kind)),
    solid: tiles.map((row) => row.map((terrain) => terrain.solid)),
    monsters: area.monsters,
    milestones: (area.milestones ?? []).map((milestone) => loadMilestone(area.id, milestone, width, height, usedIds)),
    entrances: loadEntrances(area, isWalkable),
    exits: loadExits(area, width, height),
    text: loadAreaText(area),
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
  return { ...loaded, interactables: loadInteractables(area, definition, loaded, usedIds) };
}

/** The text of an Adventure Area, or null when it has none. */
function loadAreaText(area: AreaDefinition): string | null {
  if (area.text === undefined) {
    return null;
  }
  if (area.text.trim() === '') {
    throw new Error(`Area "${area.id}": the area text is blank`);
  }
  return area.text;
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
  const zone = zoneBox(`Area "${areaId}": the zone of milestone "${milestone.id}"`, milestone.zone, width, height);
  requireZeroOrMore(`Milestone "${milestone.id}": experience`, milestone.reward.experience);
  return { id: milestone.id, zone, reward: milestone.reward };
}

/**
 * The interactables of an Adventure Area. Each stands alone on a walkable tile: not where the hero or a monster
 * starts, and not where another interactable stands. `loaded` is the area as far as it is loaded: its monsters are
 * checked.
 */
function loadInteractables(
  area: AreaDefinition,
  definition: ContentDefinition,
  loaded: Omit<Area, 'interactables'>,
  usedIds: UsedIds,
): Interactable[] {
  const occupied = new Map<string, string>();
  for (const monster of area.monsters) {
    occupied.set(tileKey(monster.tile), `where monster "${monster.id}" starts`);
  }
  if (definition.start.area === area.id) {
    occupied.set(tileKey(definition.start.tile), 'where the hero starts');
  }
  return (area.interactables ?? []).map((interactable) => {
    const what = `${interactable.kind} "${interactable.id}"`;
    if (usedIds.interactables.has(interactable.id)) {
      throw new Error(`Interactable id "${interactable.id}" is used more than once`);
    }
    usedIds.interactables.add(interactable.id);
    const { tile } = interactable;
    const placed = `Area "${area.id}": ${what} is placed at ${describeTile(tile)}`;
    if (isSolid(loaded, tile)) {
      throw new Error(`${placed}, which is ${NOT_WALKABLE}`);
    }
    const taken = occupied.get(tileKey(tile));
    if (taken !== undefined) {
      throw new Error(`${placed}, ${taken}`);
    }
    occupied.set(tileKey(tile), `where ${what} already stands`);
    return loadInteractable(area.id, interactable, definition.gear, usedIds);
  });
}

function tileKey(tile: Tile): string {
  return `${tile.col},${tile.row}`;
}

/** One case for each kind of interactable: it checks the definition and converts it into the form the rules use. */
function loadInteractable(
  areaId: string,
  definition: InteractableDefinition,
  gear: ContentDefinition['gear'],
  usedIds: UsedIds,
): Interactable {
  const { id, kind } = definition;
  switch (kind) {
    case 'chest':
      return loadChest(areaId, definition, gear, usedIds);
    case 'pickup':
      return loadPickup(areaId, definition);
    default:
      return refuseKind(areaId, id, kind);
  }
}

/** Only content that got past the compiler gets here. A kind without a case is a compile error. */
function refuseKind(areaId: string, id: string, kind: never): never {
  throw new Error(`Area "${areaId}": interactable "${id}" has unknown kind "${String(kind)}"`);
}

function loadChest(
  areaId: string,
  definition: ChestDefinition,
  gear: ContentDefinition['gear'],
  usedIds: UsedIds,
): Chest {
  return {
    kind: 'chest',
    id: definition.id,
    body: tileBox(definition.tile),
    contents: loadChestContents(areaId, definition, gear, usedIds),
  };
}

function loadPickup(areaId: string, definition: PickupDefinition): Pickup {
  const what = `Area "${areaId}": pickup "${definition.id}"`;
  if (!isConsumableId(definition.consumable)) {
    throw new Error(`${what} holds unknown consumable "${String(definition.consumable)}"`);
  }
  requireWholeNumberOfOneOrMore(`${what}: amount`, definition.amount);
  return {
    kind: 'pickup',
    id: definition.id,
    body: tileBox(definition.tile),
    consumable: definition.consumable,
    amount: definition.amount,
  };
}

/** The box of a tile, in tile units like the other bodies. */
function tileBox({ col, row }: Tile): Box {
  return { minX: col, minY: row, maxX: col + 1, maxY: row + 1 };
}

/** One case for each kind of chest contents. */
function loadChestContents(
  areaId: string,
  definition: ChestDefinition,
  gear: ContentDefinition['gear'],
  usedIds: UsedIds,
): ChestContents {
  const { contents } = definition;
  const { kind } = contents;
  const what = `Area "${areaId}": chest "${definition.id}"`;
  switch (kind) {
    case 'gear':
      if (gear[contents.gear] === undefined) {
        throw new Error(`${what} holds unknown Gear "${contents.gear}"`);
      }
      claimGear(usedIds, contents.gear, `chest "${definition.id}"`);
      return { kind: 'gear', gear: contents.gear };
    case 'consumable':
      if (!isConsumableId(contents.consumable)) {
        throw new Error(`${what} holds unknown consumable "${String(contents.consumable)}"`);
      }
      requireWholeNumberOfOneOrMore(`${what}: amount`, contents.amount);
      return { kind: 'consumable', consumable: contents.consumable, amount: contents.amount };
    default:
      return refuseContents(what, kind);
  }
}

/** Content read from a file could name a consumable that does not exist, and the compiler would not notice. */
function isConsumableId(id: string): id is ConsumableId {
  return (CONSUMABLE_IDS as readonly string[]).includes(id);
}

function refuseContents(what: string, kind: never): never {
  throw new Error(`${what} holds unknown contents "${String(kind)}"`);
}

const NOT_WALKABLE = 'solid terrain or outside the map';

function describeTile(tile: Tile): string {
  return `(col ${tile.col}, row ${tile.row})`;
}

/** Whether a tile blocks movement. Tiles beyond the map count as solid. */
export function isSolid(area: Pick<Area, 'solid'>, tile: Tile): boolean {
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
