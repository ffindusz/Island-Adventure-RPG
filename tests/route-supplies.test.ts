import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { SPENDS } from './fight-table';
import { type PotionLedger, potionLedger, potionsFor, renderPotionLedger, suppliesAlong } from './route-supplies';

// The ledger of the Healing Potions along the route, worked by hand on small routes and then held against the shipped
// content. A Checkpoint gives no Health back (spec story 115), so a hero walks into each area with the Health it left
// the one before with, and the potions it needs there are counted from that Health, not from its maximum.

/** What a Healing Potion restores on the small routes below: the content's own number is not what they are about. */
const RESTORES = 5;

describe('the potions a hero needs along a small route, worked by hand', () => {
  it('walks into the second area with the Health it left the first with, and needs two potions where a full Health needed none', () => {
    const route = [
      { maxHealth: 10, damage: 7, found: 1 },
      { maxHealth: 10, damage: 9, found: 0 },
    ];

    expect(suppliesAlong(route, RESTORES)).toMatchObject([
      { healthIn: 10, needed: 0, healthOut: 3, carried: 0, left: 1 },
      { healthIn: 3, needed: 2, healthOut: 4, carried: 1, left: -1 },
    ]);
    expect(
      route.map(({ damage, maxHealth }) => potionsFor(damage, maxHealth, RESTORES)),
      'the old rule, which walked in at full Health every time',
    ).toEqual([0, 0]);
  });

  it('adds the gain in maximum Health to the Health it walks in with, as the core does when a Stat Point goes to Health', () => {
    const route = [
      { maxHealth: 10, damage: 4, found: 0 },
      { maxHealth: 14, damage: 8, found: 0 },
    ];

    expect(suppliesAlong(route, RESTORES)).toMatchObject([
      { healthIn: 10, needed: 0, healthOut: 6, carried: 0, left: 0 },
      { healthIn: 10, needed: 0, healthOut: 2, carried: 0, left: 0 },
    ]);
  });

  it('needs no potion for fights that take less than the Health in hand, and carries what is left into the next area', () => {
    const route = [
      { maxHealth: 12, damage: 2, found: 2 },
      { maxHealth: 12, damage: 9, found: 0 },
    ];

    expect(suppliesAlong(route, RESTORES)).toMatchObject([
      { healthIn: 12, needed: 0, healthOut: 10, carried: 0, left: 2 },
      { healthIn: 10, needed: 0, healthOut: 1, carried: 2, left: 2 },
    ]);
  });

  it('carries the potions on from area to area, and a shortage as a negative number that the potions found later pay off', () => {
    const route = [
      { maxHealth: 10, damage: 12, found: 0 },
      { maxHealth: 10, damage: 3, found: 2 },
      { maxHealth: 12, damage: 6, found: 1 },
    ];

    expect(suppliesAlong(route, RESTORES)).toMatchObject([
      { healthIn: 10, needed: 1, healthOut: 3, carried: 0, left: -1 },
      { healthIn: 3, needed: 1, healthOut: 5, carried: -1, left: 0 },
      { healthIn: 7, needed: 0, healthOut: 1, carried: 0, left: 1 },
    ]);
  });

  it.each([
    { health: 10, damage: 9, potions: 0, why: 'it is left with 1 Health, alive' },
    { health: 10, damage: 10, potions: 1, why: 'with none it is left with no Health, defeated' },
    { health: 10, damage: 14, potions: 1, why: 'one brings it through, to 1 Health, and a second would be drunk too early' },
    { health: 10, damage: 15, potions: 2, why: 'one is not enough: 10 and 5 are 15, and the fights take 15' },
    { health: 3, damage: 7, potions: 1, why: 'what counts is the Health in hand, and the maximum of 10 would need none' },
    { health: 3, damage: 9, potions: 2, why: 'the second area of the first example' },
    { health: 12, damage: 2, potions: 0, why: 'far short of the Health in hand, it needs none, and never a negative number' },
  ])('needs $potions potion(s) for fights of $damage from $health Health: $why', ({ health, damage, potions }) => {
    expect(potionsFor(damage, health, RESTORES)).toBe(potions);
  });
});

describe('the ledger of the shipped route', () => {
  const restores = gameContent.healingPotion.restores;
  const ledgers = (): PotionLedger[][] => SPENDS.flatMap((spend) => [potionLedger(spend), potionLedger(spend, Infinity)]);

  it('walks into the first area at full Health and into every other with the Health the area before left it with, plus the gain in maximum Health', () => {
    for (const ledger of ledgers()) {
      ledger.forEach((row, index) => {
        const before = ledger[index - 1];
        const expected = before === undefined ? row.maxHealth : before.healthOut + row.maxHealth - before.maxHealth;
        expect(row.healthIn, `${row.spend} in ${row.area}, after ${before?.area ?? 'the start'}`).toBe(expected);
      });
    }
  }, 60_000);

  it('needs, in every area, the fewest potions that bring the hero through its fights from the Health it walks in with', () => {
    for (const ledger of ledgers()) {
      for (const row of ledger) {
        const healthWith = (potions: number): number => row.healthIn + potions * restores - row.damage;
        const where = `${row.spend} in ${row.area}: ${row.damage} damage from ${row.healthIn}`;
        expect(healthWith(row.needed), `${where}, ${row.needed} potions`).toBeGreaterThanOrEqual(1);
        if (row.needed > 0) {
          expect(healthWith(row.needed - 1), `${where}, one potion fewer`).toBeLessThan(1);
        }
        expect(row.healthOut, `${where}, on leaving`).toBe(healthWith(row.needed));
      }
    }
  }, 60_000);

  it('carries the potions from area to area: those left by the area before, and those found, less those needed', () => {
    for (const ledger of ledgers()) {
      ledger.forEach((row, index) => {
        const where = `${row.spend} in ${row.area}`;
        expect(row.carried, `${where}, carried in`).toBe(ledger[index - 1]?.left ?? 0);
        expect(row.left, `${where}, left`).toBe(row.carried + row.found - row.needed);
      });
    }
  }, 60_000);

  it('prints the Health walked in with and the Health on leaving beside the potions, a line to a build in an area', () => {
    const [head, , ...lines] = renderPotionLedger().split('\n');
    const printed = SPENDS.flatMap((spend) =>
      potionLedger(spend).map(
        (row) =>
          `| ${[row.spend, row.area, row.maxHealth, row.healthIn, row.damage, row.needed, row.healthOut, row.found, row.carried, row.left].join(' | ')} |`,
      ),
    );

    expect(head).toBe('| Build | Area | Max Health | Health in | Damage | Needed | Health out | Found | Carried in | Left |');
    expect(lines).toEqual(printed);
  }, 60_000);
});
