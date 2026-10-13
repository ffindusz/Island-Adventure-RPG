import { describe, expect, it } from 'vitest';
import { DRINK_AT_SHARE, fightTheGuardian, type FightResult } from './dodging-bot';
import { GUARDIAN_HEROES, guardianTable, PLAYS, renderGuardianTable } from './guardian-table';
import {
  gameAtTheGuardian,
  type HeroProfile,
  heroAt,
  INTENDED_LEVEL,
  MAIN_ROUTE_GEAR,
  mainRouteHero,
  OPTIONAL_GEAR,
  POTIONS_SPARED,
  SPLITS,
  underLeveledHero,
} from './profile-heroes';

// The Guardian's fight, played by the dodging bot (dodging-bot.ts) at the Game core's interface: the real core, the
// shipped content, a hero put at the arena's gateway as a save would put it there. The bot has two settings that stand
// for what a person is and a program is not: how long it takes to act on a telegraph (`reactionMs`) and how many
// telegraphs go unseen (`missEvery`: one in this many, so 2 is every other one, 0 none). What these tests pin are the
// relations the fight is to have, and the numbers that come out of them are written up in docs/balance.md.

function fight(hero: HeroProfile, reactionMs: number, missEvery: number): FightResult {
  return fightTheGuardian(gameAtTheGuardian(hero), { reactionMs, missEvery, drinkAtShare: DRINK_AT_SHARE });
}

function damageOf(result: FightResult): number {
  return result.telegraphs.reduce((sum, { damage }) => sum + damage, 0);
}

const ANSWERED_WITHIN_MS = [150, 250, 450, 600];

describe('the telegraphs of the Guardian', () => {
  it.each(Object.entries(SPLITS))(
    'leave a hero with the Stat Points %s unhurt, if it answers each within 600 ms and has no potion to lean on',
    (split, points) => {
      for (const reactionMs of ANSWERED_WITHIN_MS) {
        const result = fight(mainRouteHero(points, 0), reactionMs, 0);
        expect(result.outcome, `${split} at ${reactionMs} ms`).toBe('won');
        expect(damageOf(result), `${split} at ${reactionMs} ms`).toBe(0);
      }
    },
  );

  it('leave the hero with the best Gear of the side paths just as unhurt', () => {
    for (const reactionMs of ANSWERED_WITHIN_MS) {
      const result = fight(heroAt(INTENDED_LEVEL, SPLITS.balanced, OPTIONAL_GEAR, 0), reactionMs, 0);
      expect(result.outcome).toBe('won');
      expect(damageOf(result)).toBe(0);
    }
  });

  it('are what protects the hero: every pattern hits a hero who stands in front of it and never answers', () => {
    const result = fight(mainRouteHero(SPLITS.balanced, POTIONS_SPARED), 250, 1);
    const patternsThatHit = new Set(result.telegraphs.filter(({ damage }) => damage > 0).map(({ pattern }) => pattern));
    expect([...patternsThatHit].sort()).toEqual(['charge', 'smite', 'sweep']);
  });
});

describe('the Guardian with the Levels and Gear of the route', () => {
  it.each(Object.entries(SPLITS))(
    'falls to a hero with the Stat Points %s that misses one telegraph in three, with the potions of the fixture (POTIONS_SPARED)',
    (split, points) => {
      for (const reactionMs of [250, 450]) {
        const result = fight(mainRouteHero(points, POTIONS_SPARED), reactionMs, 3);
        expect(result.outcome, `${split} at ${reactionMs} ms`).toBe('won');
        expect(result.healthLeft, `${split} at ${reactionMs} ms`).toBeGreaterThan(0);
      }
    },
  );

  it.each([
    ['balanced', SPLITS.balanced],
    ['mostly Attack', SPLITS['mostly Attack']],
    ['all in Attack', SPLITS['all in Attack']],
  ] as const)(
    'is easier for a hero with the Stat Points %s who also took the Katana: fewer blows, and never more damage',
    (split, points) => {
      let mainDamage = 0;
      let optionalDamage = 0;
      for (const missEvery of [0, 6, 4, 3, 2]) {
        const main = fight(heroAt(INTENDED_LEVEL, points, MAIN_ROUTE_GEAR, 0), 250, missEvery);
        const optional = fight(heroAt(INTENDED_LEVEL, points, OPTIONAL_GEAR, 0), 250, missEvery);
        expect(main.outcome, `${split}, one in ${missEvery}`).toBe('won');
        expect(optional.outcome, `${split}, one in ${missEvery}`).toBe('won');
        expect(optional.blows, `${split}, one in ${missEvery}`).toBeLessThan(main.blows);
        expect(damageOf(optional), `${split}, one in ${missEvery}`).toBeLessThanOrEqual(damageOf(main));
        mainDamage += damageOf(main);
        optionalDamage += damageOf(optional);
      }
      expect(optionalDamage).toBeLessThan(mainDamage);
    },
  );
});

describe('the Guardian against a hero well below the intended Level', () => {
  it('is no pushover: at Level 3 the hero does not win on Health alone where the hero of the route does', () => {
    const intended = fight(mainRouteHero(SPLITS.balanced, 0), 250, 2);
    const underLeveled = fight(underLeveledHero(0), 250, 2);
    expect(intended.outcome).toBe('won');
    expect(underLeveled.outcome).toBe('defeated');
  });

  it('costs it more potions to win, where the hero of the route needs fewer', () => {
    const intended = fight(mainRouteHero(SPLITS.balanced, POTIONS_SPARED), 250, 2);
    const underLeveled = fight(underLeveledHero(POTIONS_SPARED), 250, 2);
    expect(intended.outcome).toBe('won');
    expect(underLeveled.outcome).toBe('won');
    expect(underLeveled.potionsDrunk).toBeGreaterThan(intended.potionsDrunk);
  });
});

describe('the table of docs/balance.md', () => {
  it('has a line for every hero and every way of playing, each fought to its end: run this file with --silent=false to print it', () => {
    const table = guardianTable();
    expect(table).toHaveLength(GUARDIAN_HEROES.length * PLAYS.length);
    for (const row of table) {
      expect(row.result.outcome, `${row.hero}, ${row.play}`).not.toBe('timed-out');
    }
    const rendered = renderGuardianTable(table);
    console.log(rendered);
    expect(rendered.split('\n')).toHaveLength(table.length + 2);
  }, 60_000);
});
