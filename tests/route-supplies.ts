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

/** The Healing Potions a hero needs to come out of fights that take this much Health from it, if it starts at full Health. */
export function potionsFor(damage: number, maxHealth: number): number {
  const restores = gameContent.healingPotion.restores;
  return damage < maxHealth ? 0 : Math.floor((damage - maxHealth) / restores) + 1;
}

/** The Healing Potions of one area for one build: what the fights of its route take, and what the hero has to meet it. */
export interface PotionLedger {
  readonly area: AreaId;
  readonly spend: Spend;
  readonly maxHealth: number;
  /** The Health that every fight of the route in the area takes, with no dodging: the hero begins the area at full Health. */
  readonly damage: number;
  /** The potions the hero drinks to come out of them. */
  readonly needed: number;
  /** The potions lying within reach of the route in the area. */
  readonly found: number;
  /** The potions the hero carried in from the areas before. */
  readonly carried: number;
  /** The potions it has on leaving the area: negative when it ran short. */
  readonly left: number;
}

/** The potions of a build, area by area along the route, counting what lies within this many steps of it. */
export function potionLedger(spend: Spend, nearest = MOST_NEARBY): PotionLedger[] {
  const ledger: PotionLedger[] = [];
  let carried = 0;
  for (const area of AREA_IDS) {
    const maxHealth = maxHealthOf(heroAtEntrance(area, spend).points);
    const damage = monstersOnRoute(area).reduce(
      (total, placement) => total + buildAt(placement.type, area, spend).damageTaken,
      0,
    );
    const needed = potionsFor(damage, maxHealth);
    const found = lyingNear(area, 'healing-potion', nearest);
    const left = carried + found - needed;
    ledger.push({ area, spend, maxHealth, damage, needed, found, carried, left });
    carried = left;
  }
  return ledger;
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

/** The potion ledgers of the three builds as a Markdown table, for the potions within this many steps of the route. */
export function renderPotionLedger(nearest = MOST_NEARBY): string {
  const rows = SPENDS.flatMap((spend) =>
    potionLedger(spend, nearest).map((row) => [
      spend,
      row.area,
      row.maxHealth,
      row.damage,
      row.needed,
      row.found,
      row.carried,
      row.left,
    ]),
  );
  return markdownTable(['Build', 'Area', 'Max Health', 'Damage', 'Needed', 'Found', 'Carried in', 'Left'], rows);
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
