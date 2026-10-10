import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import type { AreaDefinition, GuardianPatternDefinition, MonsterTypeDefinition } from '../src/core';
import { isWithinAwareness } from './routes';

// What must hold for the monsters the game ships with. The rules of the charger and the ranged attacker are tested on
// purpose-built content (charger*.test.ts, ranged-*.test.ts, projectile.test.ts), so that changing what ships never
// breaks them: these only guard the promises the placeholder content makes while it is tuned and replaced. The
// Guardian's rules are tested on purpose-built content too (guardian-*.test.ts), and its numbers and its place in
// the-guardian.test.ts.

const BEHAVIORS = ['chaser', 'charger', 'ranged', 'guardian'] as const;

const { hero } = gameContent;

function areaNamed(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

function typeNamed(name: string): MonsterTypeDefinition {
  const type = gameContent.monsterTypes[name];
  if (type === undefined) {
    throw new Error(`The shipped content has no monster type "${name}"`);
  }
  return type;
}

// The places where the hero is put down: it starts, arrives, or, defeated, comes back to a Checkpoint among new monsters.
const SPOTS = gameContent.areas.flatMap((area) => [
  ...(area.entrances ?? []).map((entrance) => ({
    area: area.id,
    what: `the entrance ${entrance.id}`,
    tile: entrance.tile,
  })),
  ...(area.checkpoints ?? []).map((checkpoint) => ({
    area: area.id,
    what: `the Checkpoint ${checkpoint.id}`,
    tile: checkpoint.tile,
  })),
  ...(gameContent.start.area === area.id ? [{ area: area.id, what: 'the start', tile: gameContent.start.tile }] : []),
]);

const CHARGERS = Object.entries(gameContent.monsterTypes).flatMap(([name, type]) =>
  type.behavior === 'charger' ? [{ name, type }] : [],
);
const SHOOTERS = Object.entries(gameContent.monsterTypes).flatMap(([name, type]) =>
  type.behavior === 'ranged' ? [{ name, type }] : [],
);
const GUARDIAN_PATTERNS = Object.entries(gameContent.monsterTypes).flatMap(([name, type]) =>
  type.behavior === 'guardian' ? type.patterns.map((pattern) => ({ name, kind: pattern.kind, size: type.size, pattern })) : [],
);

/** How long the hero takes to walk from the worst place in what a pattern is aimed at to just out of it. */
function secondsToStepOutOfPattern(pattern: GuardianPatternDefinition, guardianSize: number): number {
  switch (pattern.kind) {
    case 'sweep':
      return pattern.reach / hero.speedTilesPerSecond;
    case 'charge':
      return secondsToStepOutOf(guardianSize);
    case 'smite':
      return secondsToStepOutOf(pattern.size);
  }
}

/** How long the hero takes to walk from the middle of a lane or line of fire of `width` to just out of it. */
function secondsToStepOutOf(width: number): number {
  return (width + hero.size) / 2 / hero.speedTilesPerSecond;
}

describe('the monsters the game ships with', () => {
  it('has a monster of each behavior somewhere in the game', () => {
    const placed = gameContent.areas.flatMap((area) => area.monsters.map((monster) => typeNamed(monster.type).behavior));

    for (const behavior of BEHAVIORS) {
      expect(placed, `the game has no ${behavior}`).toContain(behavior);
    }
  });

  it.each(SPOTS)('keeps every monster from noticing a hero who stands on $what of $area', ({ area, tile }) => {
    const noticing = areaNamed(area)
      .monsters.filter((monster) => isWithinAwareness(typeNamed(monster.type), monster.tile, hero.size, tile))
      .map((monster) => monster.id);

    expect(noticing).toEqual([]);
  });

  it.each(CHARGERS)('lets the hero step out of the lane of a $name during the wind-up, with time to spare', ({ type }) => {
    expect(secondsToStepOutOf(type.size)).toBeLessThanOrEqual(type.windUpMs / 1000 / 2);
  });

  it.each(SHOOTERS)('lets the hero step out of the line of fire of a $name during the wind-up, with time to spare', ({ type }) => {
    expect(secondsToStepOutOf(type.projectile.size)).toBeLessThanOrEqual(type.windUpMs / 1000 / 2);
  });

  it.each(SHOOTERS)('fires projectiles of a $name slower than the hero walks, so that it can sidestep one', ({ type }) => {
    expect(type.projectile.speedTilesPerSecond).toBeLessThan(hero.speedTilesPerSecond);
  });

  it.each([...CHARGERS, ...SHOOTERS])('lets the hero hit a $name freely for a while after it has attacked', ({ type }) => {
    expect(type.recoveryMs).toBeGreaterThan(0);
  });

  it.each(GUARDIAN_PATTERNS)(
    'lets the hero step out of the $kind of the $name during the wind-up, with time to spare',
    ({ pattern, size }) => {
      expect(secondsToStepOutOfPattern(pattern, size)).toBeLessThanOrEqual(pattern.windUpMs / 1000 / 2);
    },
  );

  it.each(GUARDIAN_PATTERNS)(
    'lets the hero strike the $name twice at least, freely, after its $kind: the recovery lasts two cooldowns of an attack',
    ({ pattern }) => {
      expect(pattern.recoveryMs).toBeGreaterThanOrEqual(2 * hero.attackCooldownMs);
    },
  );
});
