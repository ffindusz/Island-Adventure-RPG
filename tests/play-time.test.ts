import { beforeAll, describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import { STEP_MS } from '../src/core';
import { AREA_IDS, type AreaId, areaOf, monstersOnRoute, routeOf, wayInOf } from './main-route';
import {
  errandsOf,
  estimate,
  guardianAttempt,
  type Guesses,
  measureAdventure,
  type Measured,
  offRouteFights,
  routeFights,
  routeSecondsOf,
  wordsIn,
} from './play-time';
import { FIRST_GEAR, gameWithHero, heroAt, QUIET } from './profile-heroes';
import { distanceBetween, noticingOf, walkRoute } from './routes';

// A small adventure of round numbers, so that every figure below is worked out by hand and not by the code it checks.
const SMALL: Measured = {
  routeSeconds: 100,
  fightSeconds: 50,
  offRouteFightSeconds: 20,
  nearErrandSeconds: 10,
  farErrandSeconds: 40,
  puzzles: 2,
  levelUps: 5,
  areas: 5,
  nearGear: 2,
  farGear: 2,
  words: 400,
  hardFights: [
    { approachSeconds: 10, fightSeconds: 20 },
    { approachSeconds: 20, fightSeconds: 30 },
  ],
  guardian: { approachSeconds: 4, fightSeconds: 30, vesselSeconds: 6 },
};

const ROUND: Guesses = {
  wandering: 2,
  fightCare: 2,
  sideShare: 0.5,
  puzzleSeconds: 60,
  wordsPerMinute: 200,
  pageSeconds: 10,
  defeatsPerHardFight: 1,
  guardianAttempts: 3,
  setupSeconds: 30,
};

describe('the estimate of the play time', () => {
  const { seconds, total } = estimate(SMALL, ROUND);

  it.each([
    ['setup', 30], // the guess itself
    ['reading', 120], // 400 words at 200 a minute: two minutes
    ['walking', 200], // 100 s of route, doubled for a first visit
    ['fights', 120], // (50 s of plain fights and half of the 20 s off the route), doubled for care
    ['side finds', 30], // the 10 s near the route, and half of the 40 s farther off
    ['puzzles', 60], // half of the 2 puzzles, 60 s each
    ['pages', 130], // 5 level-ups, 5 areas, the 2 near pieces of Gear and half of the 2 far ones: 13 visits of 10 s
    ['defeats', 130], // one defeat in each hard fight: (10 + 2 x 20) and (20 + 2 x 30)
    ['Guardian', 198], // 3 attempts of (4 + 2 x 30), and the 6 s on to the vessel
  ] as const)('%s takes %i seconds', (component, expected) => {
    expect(seconds[component]).toBe(expected);
  });

  it('adds up the parts and leaves nothing out', () => {
    expect(total).toBe(1018);
  });
});

describe('the basis measured from the content', () => {
  let measured: Measured;
  beforeAll(() => {
    measured = measureAdventure();
  }, 60_000);
  const cooldownSeconds = gameContent.hero.attackCooldownMs / 1000;

  it('walks each route in the time that the core takes, to within a tile', () => {
    // A walk ends when the hero crosses into the next area, up to a tile before the centre of the last tile.
    const oneTileSeconds = 1 / gameContent.hero.speedTilesPerSecond;
    for (const id of AREA_IDS) {
      const wayIn = wayInOf(id);
      const hero = heroAt(1, { health: 0, attack: 0, defense: 0 }, FIRST_GEAR, 0);
      const game = gameWithHero(QUIET, hero, {
        areaId: id,
        position: { x: wayIn.col + 0.5, y: wayIn.row + 0.5 },
        facing: 'right',
      });
      let steps = 0;
      walkRoute(game, routeOf(id), () => {
        steps += 1;
        return true;
      });
      expect(Math.abs(routeSecondsOf(id) - (steps * STEP_MS) / 1000), id).toBeLessThanOrEqual(oneTileSeconds);
    }
  });

  it('sums the walk of the five routes', () => {
    expect(measured.routeSeconds).toBeCloseTo(AREA_IDS.reduce((sum, id) => sum + routeSecondsOf(id), 0), 9);
  });

  it('lets a plain fight last as long as its blows take, and a second more to close in', () => {
    const fights = [...routeFights(), ...offRouteFights()];
    expect(fights.length).toBeGreaterThan(0);
    for (const fight of fights) {
      const label = `${fight.type} in ${fight.area}`;
      expect(fight.seconds, label).toBeGreaterThanOrEqual((fight.hitsToKill - 1) * cooldownSeconds);
      expect(fight.seconds, label).toBeLessThanOrEqual(fight.hitsToKill * cooldownSeconds + 1);
    }
  });

  it('counts every ordinary monster once, on the route or off it', () => {
    const ordinary = gameContent.areas
      .flatMap((area) => area.monsters)
      .filter((placement) => gameContent.monsterTypes[placement.type]?.behavior !== 'guardian');
    expect(routeFights().length + offRouteFights().length).toBe(ordinary.length);
  });

  it('adds up the fights of the route and those off it', () => {
    const seconds = (fights: readonly { readonly seconds: number }[]): number =>
      fights.reduce((sum, fight) => sum + fight.seconds, 0);
    expect(measured.fightSeconds).toBeCloseTo(seconds(routeFights()), 9);
    expect(measured.offRouteFightSeconds).toBeCloseTo(seconds(offRouteFights()), 9);
  });

  it('retries each demanding fight from the way in, up to where its monster first notices the hero', () => {
    const demanding: readonly (readonly [AreaId, string])[] = [
      ['mountain', 'raider-veteran'],
      ['cave', 'cave-bear'],
      ['castle', 'castle-knight'],
    ];
    expect(measured.hardFights).toHaveLength(demanding.length);
    demanding.forEach(([area, type], index) => {
      const label = `${type} in the ${area}`;
      const retry = measured.hardFights[index];
      const placement = monstersOnRoute(area).find((one) => one.type === type);
      const plain = routeFights().find((one) => one.area === area && one.type === type);
      if (retry === undefined || placement === undefined || plain === undefined) {
        throw new Error(`${label} is not a fight of the route`);
      }
      const route = routeOf(area);
      const noticing = noticingOf(gameContent, placement);
      const noticesAt = (tileIndex: number): boolean => {
        const tile = route[tileIndex];
        return tile !== undefined && distanceBetween(tile, placement.tile) <= noticing;
      };
      const tileIndex = Math.round(retry.approachSeconds * gameContent.hero.speedTilesPerSecond);
      expect(noticesAt(tileIndex), label).toBe(true);
      expect(noticesAt(tileIndex - 1), label).toBe(false);
      expect(retry.fightSeconds, label).toBeCloseTo(plain.seconds, 9);
    });
  });

  it('takes the Guardian as one fight that is won, and lasts as long as its blows take', () => {
    const attempt = guardianAttempt();
    expect(attempt.outcome).toBe('won');
    expect((attempt.steps * STEP_MS) / 1000).toBeGreaterThanOrEqual((attempt.blows - 1) * cooldownSeconds);
    expect(measured.guardian.fightSeconds).toBeCloseTo((attempt.steps * STEP_MS) / 1000, 9);
  });

  it('walks from the Checkpoint to the Guardian, and from the Guardian to the vessel', () => {
    const castle = areaOf('castle');
    const checkpoint = castle.checkpoints?.find(({ id }) => id === 'guardian-checkpoint');
    const guardian = castle.monsters.find(({ id }) => id === 'arena-guardian');
    const vessel = castle.interactables?.find(({ id }) => id === 'old-vessel');
    if (checkpoint === undefined || guardian === undefined || vessel === undefined) {
      throw new Error('The castle has no Guardian Checkpoint, Guardian or vessel under their names');
    }
    // The three stand in one row, so each walk is the difference of two columns.
    expect(new Set([checkpoint.tile.row, guardian.tile.row, vessel.tile.row]).size).toBe(1);
    const speed = gameContent.hero.speedTilesPerSecond;
    expect(measured.guardian.approachSeconds).toBeCloseTo((guardian.tile.col - checkpoint.tile.col) / speed, 9);
    expect(measured.guardian.vesselSeconds).toBeCloseTo((vessel.tile.col - guardian.tile.col) / speed, 9);
  });

  it('goes to what lies a tile off the route at once, and to what lies far off at a longer walk', () => {
    // On the coast, the potion chest and the beach potion lie a tile off the route and the steel sword's chest 11.
    const speed = gameContent.hero.speedTilesPerSecond;
    const coast = errandsOf('shipwreck-coast');
    expect(coast.nearSeconds).toBeCloseTo((2 * (1 + 1)) / speed, 9);
    expect(coast.farSeconds).toBeCloseTo((2 * 11) / speed, 9);
    expect(coast).toMatchObject({ puzzles: 0, nearGear: 0, farGear: 1 });
  });

  it('counts what the content has: the level-ups, the areas, the Gear and the puzzles', () => {
    const interactables = gameContent.areas.flatMap((area) => area.interactables ?? []);
    expect(measured.levelUps).toBe(gameContent.progression.levelThresholds.length);
    expect(measured.areas).toBe(gameContent.areas.length);
    expect(measured.nearGear + measured.farGear).toBe(
      Object.keys(gameContent.gear).length - Object.keys(gameContent.hero.startingGear).length,
    );
    expect(measured.puzzles).toBe(interactables.filter(({ kind }) => kind === 'key' || kind === 'lever').length);
  });

  it('counts the words by their white space, so that a link is one word', () => {
    expect(wordsIn(['A storm broke the ship.', 'Go\non!'])).toBe(7);
    expect(wordsIn(['See https://example.org/a-b now', '  '])).toBe(3);
  });

  it('shows the player some words to read', () => {
    expect(measured.words).toBeGreaterThan(wordsIn(gameContent.opening ?? []) + wordsIn(gameContent.ending ?? []));
  });
});
