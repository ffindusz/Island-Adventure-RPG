import { gameContent } from '../src/content';
import type { ConsumableId, GearSlot } from '../src/core';
import { buildAt, gearFrom, heroAtEntrance, pointsFor, SPENDS, type Spend } from './fight-table';
import { AREA_IDS, type AreaId, experienceBefore, findsOf, monstersOnRoute, MOST_NEARBY } from './main-route';
import { markdownTable } from './markdown-table';
import { gameAtTheGuardian, heroAt, levelOf, maxHealthOf, statsOf } from './profile-heroes';

// What the route gives a hero to fight with, for the balance pass: the steps its Gear makes, and the Healing Potions and
// Ammunition that lie along it against what the fights of the route take. Nothing is a number of its own: every one
// is read from the content or measured through the core.

/** How many arrows of every one shot are taken to land: a player who aims is not a marksman. An assumption of the pass. */
export const ARROWS_PER_HIT = 2;

/** The pieces of Gear of a slot in the content, from the weakest to the strongest. */
export function ladderOf(slot: GearSlot): string[] {
  return Object.entries(gameContent.gear)
    .filter(([, piece]) => piece.slot === slot)
    .sort(([, one], [, other]) => one.bonus - other.bonus)
    .map(([id]) => id);
}

/** The Adventure Area where a piece of Gear lies, in a chest or on the ground: undefined for what the hero begins with. */
export function areaOfGear(piece: string): AreaId | undefined {
  return AREA_IDS.find((id) => findsOf(id).some((find) => find.kind === 'gear' && find.gear === piece));
}

/** The Attack or Defense the core reports for a hero of a build with this Gear, in the hand or the armor of the slot. */
function statOf(slot: GearSlot, level: number, spend: Spend, equipped: Readonly<Partial<Record<GearSlot, string>>>): number {
  const hero = heroAt(level, pointsFor(spend, level - 1), equipped, 0);
  const stats = statsOf(gameAtTheGuardian(hero), slot === 'ranged-weapon' ? 'ranged-weapon' : 'melee-weapon');
  return slot === 'armor' ? stats.defense : stats.attack;
}

/** What one piece of Gear does for a hero of a build, at the Level it has where the piece lies, over the piece below it. */
export interface Step {
  readonly piece: string;
  readonly slot: GearSlot;
  /** The piece below it in its slot, or undefined for the first of a slot the hero begins without. */
  readonly over: string | undefined;
  readonly area: AreaId;
  readonly level: number;
  readonly spend: Spend;
  /** The Attack or Defense of the slot with the piece below it, or undefined with nothing in the slot. */
  readonly before: number | undefined;
  readonly after: number;
}

/** Every piece of Gear that lies in the world, as a step over the piece below it, for each of the three spends. */
export function steps(): Step[] {
  const all: Step[] = [];
  for (const slot of ['melee-weapon', 'armor', 'ranged-weapon'] as const) {
    const ladder = ladderOf(slot);
    ladder.forEach((piece, index) => {
      const area = areaOfGear(piece);
      if (area === undefined) {
        return;
      }
      const level = levelOf(experienceBefore(area));
      const over = ladder[index - 1];
      for (const spend of SPENDS) {
        const held = (id: string | undefined) => ({ ...gameContent.hero.startingGear, ...(id === undefined ? {} : { [slot]: id }) });
        all.push({
          piece,
          slot,
          over,
          area,
          level,
          spend,
          before: over === undefined ? undefined : statOf(slot, level, spend, held(over)),
          after: statOf(slot, level, spend, held(piece)),
        });
      }
    });
  }
  return all;
}

/** A step is noticeable when it raises the stat by at least a fifth: whole numbers, so no rounding decides it. */
export function isNoticeable(step: Step): boolean {
  return step.before === undefined || (step.after - step.before) * 5 >= step.before;
}

/** How many of a consumable lie within this many steps of the route of an area, with every door and gate shut. */
export function lyingNear(area: AreaId, consumable: ConsumableId, nearest = MOST_NEARBY): number {
  return findsOf(area).reduce(
    (total, find) =>
      find.kind === 'consumable' && find.consumable === consumable && find.detour !== undefined && find.detour <= nearest
        ? total + find.amount
        : total,
    0,
  );
}

/** What the monsters met on the route of an area leave behind, in the long run: each drop's chance times its amount. */
export function expectedDrops(area: AreaId, consumable: ConsumableId): number {
  return monstersOnRoute(area).reduce(
    (total, placement) =>
      total +
      (gameContent.monsterTypes[placement.type]?.drops ?? []).reduce(
        (sum, drop) => (drop.consumable === consumable ? sum + drop.chance * drop.amount : sum),
        0,
      ),
    0,
  );
}

/**
 * The Healing Potions a hero needs to come out of fights that take this much Health from it, from the Health it has in
 * hand: the fewest that leave it with 1 Health or more, drunk as late as possible so that none is wasted above the
 * maximum. None while the damage is below the Health in hand. Walking in at full Health is the case where the Health in
 * hand is the maximum.
 */
export function potionsFor(damage: number, health: number, restores = gameContent.healingPotion.restores): number {
  return damage < health ? 0 : Math.floor((damage - health) / restores) + 1;
}

/** What the fights of the route of an area ask of a hero, and what lies near the route to meet them. */
export interface Stretch {
  /** The hero's maximum Health in the area: its Stat Points on Health spent. */
  readonly maxHealth: number;
  /** The Health that every fight of the route in the area takes, with no dodging. */
  readonly damage: number;
  /** The potions lying within reach of the route in the area. */
  readonly found: number;
}

/** What a hero has on walking into a stretch of the route and on leaving it, in Health and in Healing Potions. */
export interface Supplies {
  /**
   * The Health the hero walks in with: what it left the area before with, plus the gain in its maximum Health since (a
   * Stat Point put in Health adds to the Health in hand what it adds to the maximum), and its maximum in the first
   * area. A Checkpoint gives no Health back, so nothing refills it on the way in.
   */
  readonly healthIn: number;
  /** The potions the hero drinks to come out of the fights of the area from the Health it walked in with. */
  readonly needed: number;
  /** The Health it has on leaving the area: what it walked in with, less the fights, plus the potions drunk. */
  readonly healthOut: number;
  /** The potions the hero carried in from the areas before. */
  readonly carried: number;
  /** The potions it has on leaving the area: negative when it ran short. */
  readonly left: number;
}

/**
 * The supplies of a hero that walks the stretches of a route in order and never dodges, a Healing Potion restoring this
 * much. A shortage is counted, not suffered: the Health on leaving is that of a hero that had the potions it needed,
 * and the potions it lacked are a negative number that the ones found later pay off.
 */
export function suppliesAlong<T extends Stretch>(
  route: readonly T[],
  restores = gameContent.healingPotion.restores,
): (T & Supplies)[] {
  const walked: (T & Supplies)[] = [];
  let before: Pick<Stretch & Supplies, 'maxHealth' | 'healthOut' | 'left'> | undefined;
  for (const stretch of route) {
    const healthIn = before === undefined ? stretch.maxHealth : before.healthOut + stretch.maxHealth - before.maxHealth;
    const needed = potionsFor(stretch.damage, healthIn, restores);
    const healthOut = healthIn + needed * restores - stretch.damage;
    const carried = before?.left ?? 0;
    const left = carried + stretch.found - needed;
    walked.push({ ...stretch, healthIn, needed, healthOut, carried, left });
    before = { maxHealth: stretch.maxHealth, healthOut, left };
  }
  return walked;
}

/** The Healing Potions of one area for one build: what the fights of its route take, and what the hero has to meet it. */
export interface PotionLedger extends Stretch, Supplies {
  readonly area: AreaId;
  readonly spend: Spend;
}

/**
 * The potions of a build, area by area along the route, counting what lies within this many steps of it. The hero walks
 * into the first area at full Health and carries its Health from one area to the next.
 */
export function potionLedger(spend: Spend, nearest = MOST_NEARBY): PotionLedger[] {
  return suppliesAlong(
    AREA_IDS.map((area) => ({
      area,
      spend,
      maxHealth: maxHealthOf(heroAtEntrance(area, spend).points),
      damage: monstersOnRoute(area).reduce(
        (total, placement) => total + buildAt(placement.type, area, spend).damageTaken,
        0,
      ),
      found: lyingNear(area, 'healing-potion', nearest),
    })),
  );
}

/** The arrows to take every ranged monster of the route of an area off from a distance, at a hit in so many. */
export interface ArrowLedger {
  readonly area: AreaId;
  readonly spend: Spend;
  /** The arrow's Attack: the hero's with the bow it has by then, or 0 with none. */
  readonly attack: number;
  /** How many ranged monsters stand on the route of the area. */
  readonly ranged: number;
  readonly shots: number;
  readonly needed: number;
  readonly found: number;
}

/** The best Ranged Weapon that lies in these areas, near the route or behind a door: what a hero who goes for it holds. */
function bestBowIn(areas: readonly AreaId[]): string | undefined {
  const lying = new Set(areas.flatMap((area) => findsOf(area).flatMap((find) => (find.kind === 'gear' ? [find.gear] : []))));
  return ladderOf('ranged-weapon')
    .filter((piece) => lying.has(piece))
    .at(-1);
}

/**
 * The arrows of a build, area by area. The hero of the main route has no bow, and so needs no arrow: the arrows along the
 * route are for the player who goes through the door of the cabin for the Long Bow, the only bow of the game. That hero
 * holds the bow from the area where it lies on, a bow found in an area counting there, as the arrows beside it do.
 */
export function arrowLedger(spend: Spend, nearest = MOST_NEARBY, takesTheBow = true): ArrowLedger[] {
  return AREA_IDS.map((area): ArrowLedger => {
    const level = levelOf(experienceBefore(area));
    const areasSoFar = AREA_IDS.slice(0, AREA_IDS.indexOf(area) + 1);
    const bow = takesTheBow ? bestBowIn(areasSoFar) : undefined;
    const nearby = gearFrom(areasSoFar, nearest);
    const equipped: Readonly<Partial<Record<GearSlot, string>>> = bow === undefined ? nearby : { ...nearby, 'ranged-weapon': bow };
    const attack = equipped['ranged-weapon'] === undefined ? 0 : statOf('ranged-weapon', level, spend, equipped);
    const ranged = monstersOnRoute(area).filter((placement) => gameContent.monsterTypes[placement.type]?.behavior === 'ranged');
    const shots = ranged.reduce((total, placement) => {
      const health = gameContent.monsterTypes[placement.type]?.health ?? 0;
      return attack > 0 ? total + Math.ceil(health / attack) : total;
    }, 0);
    return { area, spend, attack, ranged: ranged.length, shots, needed: shots * ARROWS_PER_HIT, found: lyingNear(area, 'ammunition', nearest) };
  });
}

/** The Gear steps as a Markdown table, a line to a piece of Gear that lies in the world: for docs/balance.md. */
export function renderSteps(): string {
  const found = steps();
  const pieces = [...new Set(found.map((step) => step.piece))];
  const rows = pieces.map((piece) => {
    const mine = found.filter((step) => step.piece === piece);
    const cell = (spend: Spend): string => {
      const step = mine.find((candidate) => candidate.spend === spend);
      if (step === undefined) {
        return '';
      }
      const gain = step.before === undefined ? 'new' : `+${Math.round(((step.after - step.before) * 100) / step.before)}%`;
      return `${step.before ?? 'none'} to ${step.after} (${gain})`;
    };
    return [piece, mine[0]?.over ?? 'nothing', mine[0]?.area ?? '', mine[0]?.level ?? '', ...SPENDS.map(cell)];
  });
  return markdownTable(['Piece', 'Over', 'Found in', 'Level', ...SPENDS], rows);
}

/**
 * The potion ledgers of the three builds as a Markdown table, for the potions within this many steps of the route. Max
 * Health, Health in and Health out are Health; the rest, but the Build and the Area, are damage and Healing Potions.
 */
export function renderPotionLedger(nearest = MOST_NEARBY): string {
  const rows = SPENDS.flatMap((spend) =>
    potionLedger(spend, nearest).map((row) => [
      spend,
      row.area,
      row.maxHealth,
      row.healthIn,
      row.damage,
      row.needed,
      row.healthOut,
      row.found,
      row.carried,
      row.left,
    ]),
  );
  return markdownTable(
    ['Build', 'Area', 'Max Health', 'Health in', 'Damage', 'Needed', 'Health out', 'Found', 'Carried in', 'Left'],
    rows,
  );
}

/** The arrow ledgers of the three builds as a Markdown table, for a hero that took the Long Bow from the cabin. */
export function renderArrowLedger(): string {
  const rows = SPENDS.flatMap((spend) =>
    arrowLedger(spend).map((row) => [spend, row.area, row.attack, row.ranged, row.shots, row.needed, row.found]),
  );
  return markdownTable(
    ['Build', 'Area', 'Arrow Attack', 'Ranged monsters', 'Shots', 'Arrows needed', 'Arrows near'],
    rows,
  );
}

/** The numbers of one build along the route, a cell of the summary tables: the areas from the coast to the castle, a shortage in bold. */
function perArea(values: readonly number[]): string {
  return values.map((value) => (value < 0 ? `**${value}**` : `${value}`)).join(', ');
}

/**
 * The potion ledgers as docs/balance.md sums them up: a line to a build, each cell listing the areas, with the potions
 * near the route and then with every potion that lies without a door.
 */
export function renderPotionSummary(): string {
  const rows = SPENDS.map((spend) => {
    const near = potionLedger(spend);
    const everywhere = potionLedger(spend, Infinity);
    return [
      spend,
      perArea(near.map((row) => row.maxHealth)),
      perArea(near.map((row) => row.healthIn)),
      perArea(near.map((row) => row.damage)),
      perArea(near.map((row) => row.needed)),
      perArea(near.map((row) => row.healthOut)),
      perArea(near.map((row) => row.left)),
      perArea(everywhere.map((row) => row.left)),
    ];
  });
  return markdownTable(
    [
      'Build',
      'Max Health',
      'Health walked in with',
      'Damage',
      'Needed',
      'Health on leaving',
      'Left on leaving, with the potions near the route',
      'Left, with every potion that lies without a door',
    ],
    rows,
  );
}

/** The arrow ledgers as docs/balance.md sums them up: a line to a build, each cell listing the areas. */
export function renderArrowSummary(): string {
  const rows = SPENDS.map((spend) => {
    const ledger = arrowLedger(spend);
    return [
      spend,
      perArea(ledger.map((row) => row.attack)),
      perArea(ledger.map((row) => row.needed)),
      perArea(ledger.map((row) => row.found)),
    ];
  });
  return markdownTable(['Build', 'Arrow Attack', 'Arrows needed', 'Arrows near the route'], rows);
}

/** What the monsters of the route of each area drop in the long run, as a Markdown table. */
export function renderDrops(): string {
  return markdownTable(
    ['Area', 'Potions', 'Arrows'],
    AREA_IDS.map((area) => [
      area,
      expectedDrops(area, 'healing-potion').toFixed(2),
      expectedDrops(area, 'ammunition').toFixed(2),
    ]),
  );
}
