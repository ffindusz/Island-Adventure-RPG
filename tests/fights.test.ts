import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { fightTable, gearBefore, gearFrom, renderFightTable, SPENDS } from './fight-table';
import { AREA_IDS, MOST_NEARBY } from './main-route';
import { type HeroProfile, MAIN_ROUTE_GEAR, POTIONS_SPARED } from './profile-heroes';
import {
  areaOfGear,
  arrowLedger,
  isNoticeable,
  potionLedger,
  renderArrowLedger,
  renderDrops,
  renderPotionLedger,
  renderSteps,
  steps,
} from './route-supplies';

// The balance of the fights and of what the route gives a hero to fight with, against the shipped content: the ticket's
// "most fights approachable, a few demanding; upgrades that are noticeable steps; supplies enough with no grinding".
// The fights are played through the core as a player who does not dodge plays them (tests/duel.ts), which is the plain
// cost of a fight and what the potions are for; the limits of that are written in docs/balance.md.

/** The tougher variants, the one fight of each of the last three areas that is meant to be demanding. */
const TOUGHER_VARIANTS = ['raider-veteran', 'cave-bear', 'castle-knight'];

describe('the fights of the adventure', () => {
  it('are approachable, but for the tougher variants, which a hero cannot walk through without Healing Potions', () => {
    const table = fightTable();
    const demanding = table.filter((row) => row.demanding).map((row) => row.type);
    expect(demanding.sort()).toEqual([...TOUGHER_VARIANTS].sort());
    expect(demanding.length).toBeLessThanOrEqual(table.length / 4);
  }, 60_000);

  it('cost a hero a potion only where they are demanding', () => {
    for (const row of fightTable()) {
      const potions = row.builds.map((build) => build.potionsDrunk);
      if (row.demanding) {
        expect(Math.max(...potions), `${row.type} calls for a potion of some build`).toBeGreaterThan(0);
      } else {
        expect(potions, `${row.type} calls for no potion of any build`).toEqual(potions.map(() => 0));
      }
    }
  }, 60_000);

  it('cost a hero the hit that the table gives for the monster every time it lands one, in the fights the hero wins', () => {
    let landed = 0;
    for (const row of fightTable()) {
      for (const { spend, result, damagePerHit } of row.builds) {
        if (result.outcome === 'won') {
          expect(result.healthLost, `${row.type} against a hero ${spend}: ${result.hits} hits of ${damagePerHit}`).toBe(
            result.hits * damagePerHit,
          );
          landed += result.hits;
        }
      }
    }
    expect(landed).toBeGreaterThan(0);
  }, 60_000);

  it('are in the table, every ordinary monster type of the content once: run this file with --silent=false to print it', () => {
    const table = fightTable();
    const types = Object.entries(gameContent.monsterTypes)
      .filter(([, type]) => type.behavior !== 'guardian')
      .map(([id]) => id);
    expect(table.map((row) => row.type).sort()).toEqual(types.sort());
    const rendered = renderFightTable(table);
    console.log(rendered);
    expect(rendered.split('\n')).toHaveLength(types.length + 2);
  }, 60_000);
});

describe('the Gear of the adventure', () => {
  it('makes a noticeable step at every piece: a fifth more of the Attack or Defense it raises, at the Level it is found', () => {
    const found = steps();
    expect(found.length).toBeGreaterThan(0);
    for (const step of found) {
      expect(
        isNoticeable(step),
        `${step.piece} over ${step.over ?? 'nothing'} for a hero ${step.spend} at Level ${step.level}: ${step.before} to ${step.after}`,
      ).toBe(true);
    }
  }, 60_000);

  it('lies, within four tiles of the route, as the Knight Mail, the Short Bow and the sword the hero began with', () => {
    expect(gearFrom(AREA_IDS)).toEqual(MAIN_ROUTE_GEAR);
    expect(MOST_NEARBY).toBe(4);
  }, 60_000);

  it('makes the armor better on the way: in the mountain and again in the castle', () => {
    const bonusOf = (equipped: HeroProfile['equipped']): number => gameContent.gear[equipped.armor ?? '']?.bonus ?? 0;
    const atMountain = bonusOf(gearBefore('mountain'));
    const atCave = bonusOf(gearBefore('cave'));
    const atGuardian = bonusOf(gearFrom(AREA_IDS));
    expect(atCave).toBeGreaterThan(atMountain);
    expect(atGuardian).toBeGreaterThan(atCave);
  }, 60_000);
});

describe('the supplies along the route', () => {
  it('leave a hero that spends its points on Attack or on a split short of no Healing Potion, and the Guardian its share', () => {
    for (const spend of ['all in Attack', 'split'] as const) {
      const ledger = potionLedger(spend);
      for (const row of ledger) {
        expect(row.left, `${spend} in ${row.area}: ${row.needed} needed, ${row.found} found, ${row.carried} carried`).toBeGreaterThanOrEqual(0);
      }
      expect(ledger[ledger.length - 1]?.left, `${spend} at the Guardian`).toBeGreaterThanOrEqual(POTIONS_SPARED);
    }
  }, 60_000);

  it('leave even a hero that spends all on Health and never dodges short of none, if it takes every potion without a door', () => {
    for (const spend of SPENDS) {
      for (const row of potionLedger(spend, Infinity)) {
        expect(row.left, `${spend} in ${row.area}: ${row.needed} needed, ${row.found} found, ${row.carried} carried`).toBeGreaterThanOrEqual(0);
      }
    }
  }, 60_000);

  it('hold arrows near the route, in every area with a ranged monster, for the shots that take them off, twice over', () => {
    for (const spend of SPENDS) {
      const met = arrowLedger(spend).filter((row) => row.ranged > 0);
      expect(met.length).toBeGreaterThan(0);
      for (const row of met) {
        expect(row.attack, `${spend} in ${row.area} has a bow by the ranged monster`).toBeGreaterThan(0);
        expect(row.found, `${spend} in ${row.area}: ${row.shots} shots`).toBeGreaterThanOrEqual(row.needed);
      }
    }
  }, 60_000);
});

describe('the Gear and supplies tables of docs/balance.md', () => {
  it('have a line for every piece of Gear in the world and for every build in every area: run this file with --silent=false to print them', () => {
    const rendered = [renderSteps(), renderPotionLedger(), renderPotionLedger(Infinity), renderArrowLedger(), renderDrops()];
    console.log(rendered.join('\n\n'));
    const piecesInTheWorld = Object.keys(gameContent.gear).filter((piece) => areaOfGear(piece) !== undefined).length;
    const lines = rendered.map((text) => text.split('\n').length - 2);
    const perBuild = SPENDS.length * AREA_IDS.length;
    expect(lines).toEqual([piecesInTheWorld, perBuild, perBuild, perBuild, AREA_IDS.length]);
  }, 60_000);
});
