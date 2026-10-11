import type { Content } from './content';
import type {
  ChaserMonsterDefinition,
  ChargerMonsterDefinition,
  DropDefinition,
  GuardianMonsterDefinition,
  GuardianPatternDefinition,
  MonsterTypeDefinition,
  RangedMonsterDefinition,
} from './definitions';
import { isConsumableId, requireMoreThanZero, requireWholeNumberOfOneOrMore, requireZeroOrMore } from './requirements';
import { msToSteps, STEP_MS, STEPS_PER_SECOND } from './time';

// Loading the monster types: what the rules need of each behavior, checked once when the game is created, with
// durations and speeds converted to fixed steps. content.ts calls loadMonsterType for each type of the definition;
// what a behavior does in a fixed step is in behaviors.ts.

/** What every monster type has, whatever its behavior, as the rules use it. */
interface MonsterTypeBase {
  readonly health: number;
  readonly size: number;
  readonly experience: number;
  /** Never absent: a type without a drop table has an empty one. */
  readonly drops: readonly DropDefinition[];
}

/** A stationary monster type as the rules use it. */
export interface StationaryMonsterType extends MonsterTypeBase {
  readonly behavior: 'stationary';
}

export interface ChaserMonsterType extends MonsterTypeBase {
  readonly behavior: 'chaser';
  readonly damage: number;
  /** Tiles walked in one fixed step. */
  readonly speedPerStep: number;
  readonly noticingDistance: number;
  readonly reach: number;
  readonly windUpSteps: number;
  readonly recoverySteps: number;
}

export interface ChargerMonsterType extends MonsterTypeBase {
  readonly behavior: 'charger';
  readonly damage: number;
  /** Tiles walked in one fixed step to line up with the hero. */
  readonly speedPerStep: number;
  readonly noticingDistance: number;
  readonly windUpSteps: number;
  /** Tiles dashed in one fixed step. */
  readonly dashSpeedPerStep: number;
  /** The farthest the dash goes, in tiles. */
  readonly dashRange: number;
  readonly recoverySteps: number;
}

/** How the projectile of a ranged attacker flies and what it does, as the rules use it. */
export interface MonsterProjectile {
  readonly damage: number;
  /** Tiles it flies in one fixed step. */
  readonly speedPerStep: number;
  /** Tiles it flies from the shooter's centre before it falls. */
  readonly range: number;
  readonly size: number;
}

export interface RangedMonsterType extends MonsterTypeBase {
  readonly behavior: 'ranged';
  readonly noticingDistance: number;
  readonly windUpSteps: number;
  readonly recoverySteps: number;
  readonly projectile: MonsterProjectile;
  /** How it keeps its distance from the hero, or null when it stands still. */
  readonly keepsDistance: {
    readonly preferredDistance: number;
    /** Tiles walked in one fixed step. */
    readonly speedPerStep: number;
  } | null;
}

/** What every pattern of a Guardian has, as the rules use it. */
interface GuardianPatternBase {
  readonly damage: number;
  readonly windUpSteps: number;
  readonly recoverySteps: number;
}

export interface GuardianSweep extends GuardianPatternBase {
  readonly kind: 'sweep';
  readonly reach: number;
}

export interface GuardianCharge extends GuardianPatternBase {
  readonly kind: 'charge';
  /** Tiles dashed in one fixed step. */
  readonly dashSpeedPerStep: number;
  readonly dashRange: number;
}

export interface GuardianSmite extends GuardianPatternBase {
  readonly kind: 'smite';
  readonly size: number;
  readonly range: number;
}

export type GuardianPattern = GuardianSweep | GuardianCharge | GuardianSmite;

export interface GuardianMonsterType extends MonsterTypeBase {
  readonly behavior: 'guardian';
  /** Tiles walked in one fixed step toward the hero. */
  readonly speedPerStep: number;
  readonly noticingDistance: number;
  /** In the order of the turns. */
  readonly patterns: readonly GuardianPattern[];
}

/** A monster type as the rules use it, one member for each behavior. */
export type MonsterType =
  | StationaryMonsterType
  | ChaserMonsterType
  | ChargerMonsterType
  | RangedMonsterType
  | GuardianMonsterType;

/** Like `areaOf`, it cannot fail for content that loaded; it fails loudly for a snapshot that does not fit it. */
export function monsterTypeOf(content: Pick<Content, 'monsterTypes'>, type: string): MonsterType {
  const found = content.monsterTypes[type];
  if (found === undefined) {
    throw new Error(`Unknown monster type "${type}"`);
  }
  return found;
}

/** The start of every message about a field of one monster type: `Monster type "boar": ` and then the field. */
function monsterField(name: string): (fieldName: string) => string {
  return (fieldName) => `Monster type "${name}": ${fieldName}`;
}

export function loadMonsterType(name: string, definition: MonsterTypeDefinition): MonsterType {
  const field = monsterField(name);
  // What every behavior has in common is checked once, here; a monster without Health or a body cannot be fought.
  requireMoreThanZero(field('health'), definition.health);
  requireMoreThanZero(field('size'), definition.size);
  requireZeroOrMore(field('experience'), definition.experience);
  const base: MonsterTypeBase = {
    health: definition.health,
    size: definition.size,
    experience: definition.experience,
    drops: loadDrops(name, definition.drops ?? []),
  };
  switch (definition.behavior) {
    case 'stationary':
      return { behavior: 'stationary', ...base };
    case 'chaser':
      return loadChaser(name, definition, base);
    case 'charger':
      return loadCharger(name, definition, base);
    case 'ranged':
      return loadRanged(name, definition, base);
    case 'guardian':
      return loadGuardian(name, definition, base);
    default:
      return refuseBehavior(name, definition);
  }
}

function loadDrops(name: string, definitions: readonly DropDefinition[]): readonly DropDefinition[] {
  const monster = monsterField(name);
  return definitions.map((drop, index) => {
    const field = (fieldName: string) => monster(`drops[${index}]${fieldName}`);
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
  base: MonsterTypeBase,
): ChaserMonsterType {
  const field = monsterField(name);
  requireMoreThanZero(field('damage'), definition.damage);
  requireZeroOrMore(field('speedTilesPerSecond'), definition.speedTilesPerSecond);
  requireZeroOrMore(field('noticingDistance'), definition.noticingDistance);
  requireMoreThanZero(field('reach'), definition.reach);
  requireZeroOrMore(field('recoveryMs'), definition.recoveryMs);
  requireAtLeastOneStep(field('windUpMs'), definition.windUpMs);
  return {
    behavior: 'chaser',
    ...base,
    damage: definition.damage,
    speedPerStep: definition.speedTilesPerSecond / STEPS_PER_SECOND,
    noticingDistance: definition.noticingDistance,
    reach: definition.reach,
    windUpSteps: msToSteps(definition.windUpMs),
    recoverySteps: msToSteps(definition.recoveryMs),
  };
}

function loadCharger(
  name: string,
  definition: ChargerMonsterDefinition,
  base: MonsterTypeBase,
): ChargerMonsterType {
  const field = monsterField(name);
  requireMoreThanZero(field('damage'), definition.damage);
  requireZeroOrMore(field('speedTilesPerSecond'), definition.speedTilesPerSecond);
  requireZeroOrMore(field('noticingDistance'), definition.noticingDistance);
  requireAtLeastOneStep(field('windUpMs'), definition.windUpMs);
  requireMoreThanZero(field('dashSpeedTilesPerSecond'), definition.dashSpeedTilesPerSecond);
  requireMoreThanZero(field('dashRange'), definition.dashRange);
  requireZeroOrMore(field('recoveryMs'), definition.recoveryMs);
  return {
    behavior: 'charger',
    ...base,
    damage: definition.damage,
    speedPerStep: definition.speedTilesPerSecond / STEPS_PER_SECOND,
    noticingDistance: definition.noticingDistance,
    windUpSteps: msToSteps(definition.windUpMs),
    dashSpeedPerStep: definition.dashSpeedTilesPerSecond / STEPS_PER_SECOND,
    dashRange: definition.dashRange,
    recoverySteps: msToSteps(definition.recoveryMs),
  };
}

function loadRanged(
  name: string,
  definition: RangedMonsterDefinition,
  base: MonsterTypeBase,
): RangedMonsterType {
  const field = monsterField(name);
  requireZeroOrMore(field('noticingDistance'), definition.noticingDistance);
  requireAtLeastOneStep(field('windUpMs'), definition.windUpMs);
  requireZeroOrMore(field('recoveryMs'), definition.recoveryMs);
  const { projectile, keepsDistance } = definition;
  requireMoreThanZero(field('projectile.damage'), projectile.damage);
  requireMoreThanZero(field('projectile.speedTilesPerSecond'), projectile.speedTilesPerSecond);
  requireMoreThanZero(field('projectile.range'), projectile.range);
  requireMoreThanZero(field('projectile.size'), projectile.size);
  // It leaves from the shooter's centre, so a larger one would begin inside whatever the shooter stands against.
  if (projectile.size > definition.size) {
    throw new Error(
      `${field('projectile.size')} must be at most the monster's size of ${definition.size}, but it is ${projectile.size}`,
    );
  }
  if (keepsDistance !== undefined) {
    requireZeroOrMore(field('keepsDistance.preferredDistance'), keepsDistance.preferredDistance);
    requireMoreThanZero(field('keepsDistance.speedTilesPerSecond'), keepsDistance.speedTilesPerSecond);
  }
  return {
    behavior: 'ranged',
    ...base,
    noticingDistance: definition.noticingDistance,
    windUpSteps: msToSteps(definition.windUpMs),
    recoverySteps: msToSteps(definition.recoveryMs),
    projectile: {
      damage: projectile.damage,
      speedPerStep: projectile.speedTilesPerSecond / STEPS_PER_SECOND,
      range: projectile.range,
      size: projectile.size,
    },
    keepsDistance:
      keepsDistance === undefined
        ? null
        : {
            preferredDistance: keepsDistance.preferredDistance,
            speedPerStep: keepsDistance.speedTilesPerSecond / STEPS_PER_SECOND,
          },
  };
}

function loadGuardian(
  name: string,
  definition: GuardianMonsterDefinition,
  base: MonsterTypeBase,
): GuardianMonsterType {
  const field = monsterField(name);
  requireZeroOrMore(field('speedTilesPerSecond'), definition.speedTilesPerSecond);
  requireZeroOrMore(field('noticingDistance'), definition.noticingDistance);
  const { patterns } = definition;
  if (patterns.length < 2) {
    throw new Error(`${field('patterns')} must hold at least two patterns, but it holds ${patterns.length}`);
  }
  const kinds = new Set(patterns.map((pattern) => pattern.kind));
  if (kinds.size < 2) {
    throw new Error(
      `${field('patterns')} must hold at least two different kinds of pattern, but all are ${[...kinds].join(', ')}`,
    );
  }
  return {
    behavior: 'guardian',
    ...base,
    speedPerStep: definition.speedTilesPerSecond / STEPS_PER_SECOND,
    noticingDistance: definition.noticingDistance,
    patterns: patterns.map((pattern, index) => loadGuardianPattern(name, index, pattern)),
  };
}

function loadGuardianPattern(name: string, index: number, definition: GuardianPatternDefinition): GuardianPattern {
  const monster = monsterField(name);
  const field = (fieldName: string) => monster(`patterns[${index}].${fieldName}`);
  requireMoreThanZero(field('damage'), definition.damage);
  requireAtLeastOneStep(field('windUpMs'), definition.windUpMs);
  // Unlike the other behaviors, which may attack again at once: the hero must always have a moment to hit this one freely.
  requireAtLeastOneStep(field('recoveryMs'), definition.recoveryMs);
  const common = {
    damage: definition.damage,
    windUpSteps: msToSteps(definition.windUpMs),
    recoverySteps: msToSteps(definition.recoveryMs),
  };
  switch (definition.kind) {
    case 'sweep':
      requireMoreThanZero(field('reach'), definition.reach);
      return { kind: 'sweep', ...common, reach: definition.reach };
    case 'charge':
      requireMoreThanZero(field('dashSpeedTilesPerSecond'), definition.dashSpeedTilesPerSecond);
      requireMoreThanZero(field('dashRange'), definition.dashRange);
      return {
        kind: 'charge',
        ...common,
        dashSpeedPerStep: definition.dashSpeedTilesPerSecond / STEPS_PER_SECOND,
        dashRange: definition.dashRange,
      };
    case 'smite':
      requireMoreThanZero(field('size'), definition.size);
      requireMoreThanZero(field('range'), definition.range);
      return { kind: 'smite', ...common, size: definition.size, range: definition.range };
    default:
      return refusePattern(name, index, definition);
  }
}

/** Only content that got past the compiler gets here. Its parameter type makes a kind of pattern without a case a compile error. */
function refusePattern(name: string, index: number, definition: never): never {
  const { kind } = definition as { kind?: unknown };
  throw new Error(`Monster type "${name}": patterns[${index}] has unknown kind "${String(kind)}"`);
}

/** A wind-up shorter than one fixed step would be over before it showed: the telegraph needs at least one. */
function requireAtLeastOneStep(what: string, ms: number): void {
  if (!(ms >= STEP_MS)) {
    throw new Error(`${what} must be at least one fixed step (${STEP_MS.toFixed(1)} ms), but it is ${ms}`);
  }
}
