import { describe, expect, it } from 'vitest';
import { gameContent } from '../src/content';
import type { AreaDefinition, Tile } from '../src/core';
import { face, playingView } from './fixtures';
import {
  directionBetween,
  isInZone,
  keyOf,
  neighboursOf,
  openTilesOf,
  quietGameOf,
  routeBetween,
  walkRoute,
} from './routes';

// The shipwreck coast, where the adventure begins: what the first area has to be to teach the game. Like the other
// tests of the shipped content, these read the map and the lists of the content and walk the hero over them with the
// core's own movement, so that moving a tile or a chest never breaks them unless the coast stops being what it is for.

const COAST = 'shipwreck-coast';

/** A monster that the hero's basic sword takes down in three hits at most is weak. */
const WEAK_HEALTH = 3;
/** The side path is a walk, not a step aside: this many tiles from the way out to the spot beside its chest. */
const LEAST_DETOUR = 6;

function definitionOf(id: string): AreaDefinition {
  const area = gameContent.areas.find((candidate) => candidate.id === id);
  if (area === undefined) {
    throw new Error(`The shipped content has no Adventure Area "${id}"`);
  }
  return area;
}

const coast = definitionOf(COAST);
const isOpen = openTilesOf(gameContent, coast);
const start = gameContent.start.tile;
const wayOut = coast.exits ?? [];
const isWayOut = (tile: Tile): boolean => wayOut.some(({ zone }) => isInZone(zone, tile));
/** The way from where the hero begins to the exit, over open ground only: there is no puzzle on the coast. */
const mainRoute = routeBetween(isOpen, start, isWayOut);
const interactables = coast.interactables ?? [];
const chests = interactables.flatMap((item) => (item.kind === 'chest' ? [item] : []));
const pickups = interactables.flatMap((item) => (item.kind === 'pickup' ? [item] : []));
const gearChests = chests.flatMap(({ id, tile, contents }) =>
  contents.kind === 'gear' ? [{ id, tile, gear: contents.gear }] : [],
);

/** How many tiles of walking lie between the main route and the spot beside a chest, or null when it cannot be reached. */
function detourToChest(chest: Tile): number | null {
  const onRoute = new Set((mainRoute ?? []).map(keyOf));
  const back = routeBetween(isOpen, chest, (tile) => onRoute.has(keyOf(tile)));
  return back === null ? null : back.length - 2;
}

/** The chest of Gear at the end of the side path, a good walk from the way out. */
function chestOfTheSidePath() {
  const found = gearChests.find((chest) => (detourToChest(chest.tile) ?? 0) >= LEAST_DETOUR);
  if (found === undefined) {
    throw new Error(`The coast has no chest of Gear at least ${LEAST_DETOUR} tiles off the way out`);
  }
  return found;
}

describe('the way along the shipwreck coast', () => {
  it('leads from where the hero begins to the exit over open ground, with no chest in the way', () => {
    expect(mainRoute).not.toBeNull();
  });

  it('lets the hero walk it into the next area', () => {
    const game = quietGameOf(gameContent);

    const events = walkRoute(game, mainRoute ?? []);

    expect(events).toContainEqual({ type: 'area-changed', areaId: wayOut[0]?.to.area });
    expect(playingView(game).area.id).toBe(wayOut[0]?.to.area);
  });

  it('has one milestone, which no way out of the coast goes round', () => {
    expect(coast.milestones).toHaveLength(1);
    const [milestone] = coast.milestones ?? [];

    const goingRound = routeBetween(
      (tile) => isOpen(tile) && !(milestone !== undefined && isInZone(milestone.zone, tile)),
      start,
      isWayOut,
    );

    expect(goingRound).toBeNull();
  });

  it('gives the milestone to a hero who walks the main route', () => {
    const [milestone] = coast.milestones ?? [];

    const events = walkRoute(quietGameOf(gameContent), mainRoute ?? []);

    expect(events).toContainEqual({ type: 'milestone-reached', milestoneId: milestone?.id });
  });

  it('lies by a wreck: wreckage, solid like rock, close to where the hero begins', () => {
    const wreckageSymbols = Object.entries(gameContent.terrain).filter(([, terrain]) => terrain.kind === 'wreckage');
    expect(wreckageSymbols, 'the terrain has wreckage').not.toEqual([]);
    expect(wreckageSymbols.every(([, terrain]) => terrain.solid)).toBe(true);

    const symbols = new Set(wreckageSymbols.map(([symbol]) => symbol));
    const wreck = coast.layout.flatMap((line, row) =>
      [...line].flatMap((symbol, col) => (symbols.has(symbol) ? [{ col, row }] : [])),
    );

    expect(wreck.length).toBeGreaterThanOrEqual(8);
    expect(wreck.some((tile) => Math.abs(tile.col - start.col) + Math.abs(tile.row - start.row) <= 6)).toBe(true);
  });
});

describe('what the hero finds on the shipwreck coast', () => {
  it('has a chest of Gear at the end of a side path, which the hero reaches by walking and opens', () => {
    const chest = chestOfTheSidePath();
    const route = routeBetween(isOpen, start, (tile) =>
      neighboursOf(tile).some((next) => keyOf(next) === keyOf(chest.tile)),
    );
    expect(route, 'the hero can walk to a spot beside the chest').not.toBeNull();
    const game = quietGameOf(gameContent);

    walkRoute(game, route ?? []);
    face(game, directionBetween(route?.at(-1) ?? chest.tile, chest.tile));
    const events = game.send({ type: 'interact' });

    expect(events).toContainEqual({ type: 'chest-opened', chestId: chest.id });
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'pickup', item: expect.objectContaining({ kind: 'gear', id: chest.gear }) }),
    );
  });

  it('has a Healing Potion on the ground, which the hero takes by walking over it', () => {
    const potion = pickups.find((pickup) => pickup.consumable === 'healing-potion');
    expect(potion, 'the coast has a Healing Potion pickup').toBeDefined();
    const route = routeBetween(isOpen, start, (tile) => keyOf(tile) === keyOf(potion?.tile ?? start));

    const events = walkRoute(quietGameOf(gameContent), route ?? []);

    expect(events).toContainEqual({
      type: 'pickup',
      item: { kind: 'consumable', id: 'healing-potion', amount: potion?.amount },
    });
  });

  it('has neither a bow nor Ammunition, in a chest, on the ground or dropped: the first bow is in the woods', () => {
    const bows = gearChests.filter(({ gear }) => gameContent.gear[gear]?.slot === 'ranged-weapon');
    const arrows = interactables.filter((item) =>
      item.kind === 'chest'
        ? item.contents.kind === 'consumable' && item.contents.consumable === 'ammunition'
        : item.consumable === 'ammunition',
    );
    const dropped = coast.monsters
      .flatMap((monster) => gameContent.monsterTypes[monster.type]?.drops ?? [])
      .filter((drop) => drop.consumable === 'ammunition');

    expect(bows.map((chest) => chest.id)).toEqual([]);
    expect(arrows.map((item) => item.id)).toEqual([]);
    expect(dropped).toEqual([]);
  });
});

describe('the monsters of the shipwreck coast', () => {
  it('are a few weak ones of the basic behavior: the coast teaches the controls, no boar and no spitter', () => {
    const types = coast.monsters.map((monster) => gameContent.monsterTypes[monster.type]);

    expect(coast.monsters.length).toBeGreaterThanOrEqual(2);
    expect(coast.monsters.length).toBeLessThanOrEqual(4);
    expect(types.map((type) => type?.behavior)).toEqual(types.map(() => 'chaser'));
    expect(types.every((type) => type !== undefined && type.health <= WEAK_HEALTH)).toBe(true);
  });
});

describe('the Experience of the shipwreck coast', () => {
  const [levelTwo = 0, levelThree = 0] = gameContent.progression.levelThresholds;
  const experienceOf = (monster: { readonly type: string }): number =>
    gameContent.monsterTypes[monster.type]?.experience ?? 0;
  const noticingOf = (monster: { readonly type: string }): number => {
    const type = gameContent.monsterTypes[monster.type];
    return type !== undefined && 'noticingDistance' in type ? type.noticingDistance : 0;
  };
  const milestonesExperience = (coast.milestones ?? []).reduce((total, { reward }) => total + reward.experience, 0);
  /** A monster notices a hero in the square round its body that its noticing distance makes, so a hero on the way out meets it when a tile of the way lies in that square. */
  const metOnTheWay = coast.monsters.filter((monster) =>
    (mainRoute ?? []).some(
      (tile) =>
        Math.max(Math.abs(tile.col - monster.tile.col), Math.abs(tile.row - monster.tile.row)) <= noticingOf(monster),
    ),
  );

  it('gives a hero who fights what it meets on the way out, and passes the milestone, the Experience of Level 2', () => {
    const earned = metOnTheWay.reduce((total, monster) => total + experienceOf(monster), 0) + milestonesExperience;

    expect(earned).toBeGreaterThanOrEqual(levelTwo);
  });

  it('does not give a hero who clears the whole coast the Experience of Level 3: nobody has to grind', () => {
    const everything = coast.monsters.reduce((total, monster) => total + experienceOf(monster), 0) + milestonesExperience;

    expect(everything).toBeLessThan(levelThree);
  });
});

describe('the text of the shipwreck coast', () => {
  it('is a short line, not a page', () => {
    expect(coast.text).toBeTypeOf('string');
    expect(coast.text?.length).toBeLessThanOrEqual(60);
  });
});
