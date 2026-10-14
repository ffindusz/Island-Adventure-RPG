import { gameContent } from '../src/content';
import type { GearSlot, StatId } from '../src/core';
import { duel, type DuelResult, hitOf } from './duel';
import { AREA_IDS, type AreaId, areaOf, experienceBefore, findsOf, MOST_NEARBY, monstersOnRoute } from './main-route';
import { markdownTable } from './markdown-table';
import { heroAt, levelOf, type HeroProfile, type Points } from './profile-heroes';
import { damageOf } from './routes';

// The fights of the adventure, one monster type at a time, for the balance pass: what a hero who has gone the route
// meets it with, and what a plain fight against it costs. Everything is read from the content and measured through the
// core, so a number of the content that moves moves the table with it.

/** A fight is demanding when the hero loses this share of its Health or more in it: what Healing Potions are for. */
export const DEMANDING_SHARE = 0.5;

/** Enough Healing Potions for any fight of the table: the hero drinks what it needs and the table counts them. */
const AMPLE_POTIONS = 20;

/** The ways the table spends the Stat Points of a hero: all on Health, all on Attack, and a split of the two and Defense. */
export const SPENDS = ['all in Health', 'all in Attack', 'split'] as const;
export type Spend = (typeof SPENDS)[number];

/** The Stat Points spent as the spend says, for a hero with this many. The split deals them out Attack, Health, Defense. */
export function pointsFor(spend: Spend, spent: number): Points {
  if (spend === 'all in Health') {
    return { health: spent, attack: 0, defense: 0 };
  }
  if (spend === 'all in Attack') {
    return { health: 0, attack: spent, defense: 0 };
  }
  const dealt: Record<StatId, number> = { health: 0, attack: 0, defense: 0 };
  const order: readonly StatId[] = ['attack', 'health', 'defense'];
  for (let point = 0; point < spent; point += 1) {
    dealt[order[point % order.length] ?? 'attack'] += 1;
  }
  return dealt;
}

/**
 * The best Gear of each slot a hero has after the areas given: what it began with and what lies within `nearest` steps
 * of the route in those areas. The hero does not look for what is farther off, nor behind a door.
 */
export function gearFrom(areas: readonly AreaId[], nearest = MOST_NEARBY): HeroProfile['equipped'] {
  const best: Partial<Record<GearSlot, string>> = { ...gameContent.hero.startingGear };
  for (const area of areas) {
    for (const find of findsOf(area)) {
      const piece = find.kind === 'gear' ? gameContent.gear[find.gear] : undefined;
      if (find.kind !== 'gear' || piece === undefined || find.detour === undefined || find.detour > nearest) {
        continue;
      }
      const heldId = best[piece.slot];
      const held = heldId === undefined ? undefined : gameContent.gear[heldId];
      if (held === undefined || piece.bonus > held.bonus) {
        best[piece.slot] = find.gear;
      }
    }
  }
  return best;
}

/** The Gear a hero has on coming into an area: what lies near the route in the areas before it. */
export function gearBefore(id: AreaId, nearest = MOST_NEARBY): HeroProfile['equipped'] {
  return gearFrom(AREA_IDS.slice(0, AREA_IDS.indexOf(id)), nearest);
}

/** The hero of a build as it comes into an area: the Level the route has earned by then, with the Gear within reach. */
export function heroAtEntrance(area: AreaId, spend: Spend, potions = 0): HeroProfile {
  const level = levelOf(experienceBefore(area));
  return heroAt(level, pointsFor(spend, level - 1), gearBefore(area), potions);
}

/** What one build of the hero makes of one fight. */
export interface Build {
  readonly spend: Spend;
  readonly points: Points;
  /** The fight with no potion to drink: the hero wins or is defeated. */
  readonly result: DuelResult;
  /** How many blows the hero needs to defeat the monster: those it strikes in the fight it wins, as the core reports them. */
  readonly hitsToKill: number;
  /** What one hit of the monster takes from the hero, after Defense, as the core reports it to a hero who takes one. */
  readonly damagePerHit: number;
  /** How many hits of the monster the hero's whole Health takes. */
  readonly hitsToDie: number;
  /** The share of the hero's Health the fight took: all of it when the hero was defeated. */
  readonly lostShare: number;
  /** All the Health the fight takes from a hero who drinks a Healing Potion at half its Health or less and so is not defeated. */
  readonly damageTaken: number;
  /** The Healing Potions that hero drinks. */
  readonly potionsDrunk: number;
  /** How long that fight lasts, in steps: the one the hero wins, with potions to spare. */
  readonly fightSteps: number;
}

const builds = new Map<string, Build>();

/** The fight of a hero of a build, as it comes into an area, with a monster type of the content. */
export function buildAt(typeId: string, area: AreaId, spend: Spend): Build {
  const key = `${typeId}@${area}/${spend}`;
  const known = builds.get(key);
  if (known !== undefined) {
    return known;
  }
  const bare = heroAtEntrance(area, spend);
  const result = duel(typeId, bare);
  const supplied = duel(typeId, heroAtEntrance(area, spend, AMPLE_POTIONS));
  if (supplied.outcome !== 'won') {
    throw new Error(`A hero with ${AMPLE_POTIONS} Healing Potions does not win against a ${typeId}: ${supplied.outcome}`);
  }
  const damagePerHit = hitOf(typeId, bare);
  const build: Build = {
    spend,
    points: bare.points,
    result,
    hitsToKill: supplied.blows,
    damagePerHit,
    hitsToDie: Math.ceil(result.maxHealth / damagePerHit),
    lostShare: result.healthLost / result.maxHealth,
    damageTaken: supplied.healthLost,
    potionsDrunk: supplied.potionsUsed,
    fightSteps: supplied.steps,
  };
  builds.set(key, build);
  return build;
}

export interface FightRow {
  readonly type: string;
  readonly area: AreaId;
  /** Whether the monster is one the route walks past: otherwise it stands off the route, in a side path. */
  readonly onRoute: boolean;
  readonly level: number;
  readonly gear: HeroProfile['equipped'];
  readonly health: number;
  readonly experience: number;
  /** What one hit of it does before Defense: a hit of its own, or of its shot. */
  readonly damage: number;
  readonly builds: readonly Build[];
  /** The build the fight costs most: the one that lost the largest share of its Health. */
  readonly worst: Build;
  readonly demanding: boolean;
}

/** The ordinary monsters, by type: the Guardian has a fight of its own. */
export const ORDINARY_TYPES = Object.entries(gameContent.monsterTypes).flatMap(([id, type]) =>
  type.behavior === 'guardian' ? [] : [id],
);

/** The first area of the adventure, in its order, that has this monster type: on the route if any area has it there. */
export function firstMeeting(type: string): { readonly area: AreaId; readonly onRoute: boolean } {
  const onRoute = AREA_IDS.find((id) => monstersOnRoute(id).some((placement) => placement.type === type));
  if (onRoute !== undefined) {
    return { area: onRoute, onRoute: true };
  }
  const anywhere = AREA_IDS.find((id) => areaOf(id).monsters.some((placement) => placement.type === type));
  if (anywhere === undefined) {
    throw new Error(`No Adventure Area has a monster of type "${type}"`);
  }
  return { area: anywhere, onRoute: false };
}

/** The row of the table for a monster type: the fight at the area where the type is first met. */
export function rowOf(typeId: string): FightRow {
  const type = gameContent.monsterTypes[typeId];
  if (type === undefined) {
    throw new Error(`The content has no monster type "${typeId}"`);
  }
  const { area, onRoute } = firstMeeting(typeId);
  const all = SPENDS.map((spend) => buildAt(typeId, area, spend));
  const worst = all.reduce((most, build) => (build.lostShare > most.lostShare ? build : most));
  return {
    type: typeId,
    area,
    onRoute,
    level: levelOf(experienceBefore(area)),
    gear: gearBefore(area),
    health: type.health,
    experience: type.experience,
    damage: damageOf(type),
    builds: all,
    worst,
    demanding: worst.lostShare >= DEMANDING_SHARE,
  };
}

/** Every ordinary monster type of the content, in the order of the adventure and then of the content. */
export function fightTable(): FightRow[] {
  return ORDINARY_TYPES.map(rowOf).sort((one, other) => AREA_IDS.indexOf(one.area) - AREA_IDS.indexOf(other.area));
}

function gearNames(equipped: HeroProfile['equipped']): string {
  return (['melee-weapon', 'armor'] as const)
    .map((slot) => gameContent.gear[equipped[slot] ?? '']?.name ?? 'none')
    .join(' + ');
}

/** What a fight takes from a build with no potion to drink: the Health lost of its maximum, or that it was defeated. */
function healthLostBy(build: Build): string {
  return build.result.outcome === 'won' ? `${build.result.healthLost} of ${build.result.maxHealth}` : 'defeated';
}

/** The table as the balance document shows it. */
export function renderFightTable(table: readonly FightRow[]): string {
  const head = [
    '| Monster | Area | Level | Gear | Health | Hit | Worst build | Attack | Defense | Max Health | Blows to kill | Hit after Defense | Hits to die | Health lost | Potions | Fight | XP |',
    '| --- | --- | ---: | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |',
  ];
  const body = table.map((row) => {
    const { worst } = row;
    return [
      row.type,
      `${row.area}${row.onRoute ? '' : ' (off the route)'}`,
      row.level,
      gearNames(row.gear),
      row.health,
      row.damage,
      worst.spend,
      worst.result.attack,
      worst.result.defense,
      worst.result.maxHealth,
      worst.hitsToKill,
      worst.damagePerHit,
      worst.hitsToDie,
      healthLostBy(worst),
      worst.potionsDrunk,
      row.demanding ? 'demanding' : 'approachable',
      row.experience,
    ];
  });
  return [...head, ...body.map((cells) => `| ${cells.join(' | ')} |`)].join('\n');
}

/** What each demanding fight costs each build, as the balance document shows it: the Health lost, and the potions drunk. */
export function renderDemandingFights(table: readonly FightRow[]): string {
  const cost = (build: Build): string => {
    const potions = build.potionsDrunk === 0 ? 'no potion' : `${build.potionsDrunk} ${build.potionsDrunk === 1 ? 'potion' : 'potions'}`;
    return `${healthLostBy(build)}, ${potions}`;
  };
  return markdownTable(
    ['Monster', ...SPENDS],
    table.filter((row) => row.demanding).map((row) => [row.type, ...row.builds.map(cost)]),
  );
}
